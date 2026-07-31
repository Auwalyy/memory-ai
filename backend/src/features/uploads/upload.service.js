const Upload = require('./upload.model');
const { uploadBuffer } = require('../../core/storage/cloudinary.service');
const { extractTextFromImage } = require('../../core/ocr/ocr.service');
const { extractTextFromDocument } = require('../../core/ocr/document.service');
const gemmaService = require('../../core/ai/gemma.service');
const ingestionService = require('../ingestion/ingestion.service');
const { UPLOAD_TYPES, ANALYSIS_STATUS, ALLOWED_MIME_TYPES } = require('../../config/constants');
const AppError = require('../../utils/AppError');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const logger = require('../../utils/logger');

const detectUploadType = (mimeType) => {
  if (ALLOWED_MIME_TYPES.image.includes(mimeType)) return UPLOAD_TYPES.IMAGE;
  if (ALLOWED_MIME_TYPES.document.includes(mimeType)) return UPLOAD_TYPES.DOCUMENT;
  if (ALLOWED_MIME_TYPES.audio.includes(mimeType)) return UPLOAD_TYPES.AUDIO;
  return UPLOAD_TYPES.TEXT;
};

const uploadService = {
  async upload(file, userId) {
    const uploadType = detectUploadType(file.mimetype);

    // Upload to Cloudinary — if credentials not configured, store metadata only
    let url = null;
    let publicId = null;
    let bytes = file.size;

    const cloudinaryConfigured =
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
      process.env.CLOUDINARY_API_SECRET &&
      process.env.CLOUDINARY_API_SECRET !== 'your_api_secret';

    // Only upload images and audio to Cloudinary — documents/text stored locally
    const shouldUploadToCloud = cloudinaryConfigured && (
      uploadType === UPLOAD_TYPES.IMAGE || uploadType === UPLOAD_TYPES.AUDIO
    );

    if (shouldUploadToCloud) {
      const resourceType = uploadType === UPLOAD_TYPES.AUDIO ? 'video' : 'auto';
      const result = await uploadBuffer(file.buffer, { folder: uploadType, resourceType });
      url = result.url;
      publicId = result.publicId;
      bytes = result.bytes;
    } else {
      logger.info('Storing file locally (document/text or Cloudinary not configured)', { fileName: file.originalname });
      url = `local://${file.originalname}`;
    }

    // Extract text from image or document
    let extractedText = null;
    let ocrConfidence = null;

    if (uploadType === UPLOAD_TYPES.IMAGE) {
      try {
        const ocr = await extractTextFromImage(file.buffer);
        extractedText = ocr.text;
        ocrConfidence = ocr.confidence;
      } catch (err) {
        logger.warn('OCR failed', { err: err.message });
      }
    } else if (uploadType === UPLOAD_TYPES.DOCUMENT) {
      try {
        extractedText = await extractTextFromDocument(file.buffer, file.mimetype);
      } catch (err) {
        logger.warn('Document extraction failed', { err: err.message });
      }
    }

    const upload = await Upload.create({
      uploader: userId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      uploadType,
      fileUrl: url,
      cloudinaryPublicId: publicId,
      fileSizeBytes: bytes,
      extractedText,
      ocrConfidence,
      analysisStatus: extractedText ? ANALYSIS_STATUS.PENDING : ANALYSIS_STATUS.COMPLETED,
    });

    logger.info('File uploaded', { uploadId: upload._id, type: uploadType, userId });

    // Auto-trigger ingestion pipeline in background if text was extracted
    if (extractedText) {
      setImmediate(() =>
        ingestionService.run(upload._id).catch((e) =>
          logger.warn('Auto-ingestion failed', { uploadId: upload._id, err: e.message })
        )
      );
    }

    return upload;
  },

  async analyzeUpload(uploadId, userId) {
    // Any authenticated user can trigger analysis on any upload
    const upload = await Upload.findById(uploadId);
    if (!upload) throw new AppError('Upload not found', 404);
    if (!upload.extractedText) throw new AppError('No text available for analysis', 400);

    upload.analysisStatus = ANALYSIS_STATUS.PROCESSING;
    await upload.save();

    try {
      const analysis = await gemmaService.analyzeKnowledge(upload.extractedText);
      upload.analysisStatus = ANALYSIS_STATUS.COMPLETED;
      await upload.save();
      return { upload, analysis };
    } catch (err) {
      upload.analysisStatus = ANALYSIS_STATUS.FAILED;
      await upload.save();
      throw err;
    }
  },

  async getUploads(query) {
    const { page, limit, skip } = parsePagination(query);
    const [data, total] = await Promise.all([
      Upload.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('uploader', 'name username'),
      Upload.countDocuments({}),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  },

  async getMyUploads(userId, query) {
    const { page, limit, skip } = parsePagination(query);
    const [data, total] = await Promise.all([
      Upload.find({ uploader: userId }).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('uploader', 'name username'),
      Upload.countDocuments({ uploader: userId }),
    ]);
    return { data, pagination: buildPaginationMeta(total, page, limit) };
  },

  async getUploadById(uploadId) {
    const upload = await Upload.findById(uploadId).populate('uploader', 'name username');
    if (!upload) throw new AppError('Upload not found', 404);
    return upload;
  },
};

module.exports = uploadService;
