const cloudinary = require('cloudinary').v2;
const logger = require('../../utils/logger');
const AppError = require('../../utils/AppError');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer to Cloudinary.
 * @param {Buffer} buffer
 * @param {object} options
 * @returns {Promise<{url: string, publicId: string, format: string, bytes: number}>}
 */
const uploadBuffer = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: `memoryai/${options.folder || 'uploads'}`,
      resource_type: options.resourceType || 'auto',
      ...options,
    };

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        logger.error('Cloudinary upload failed', { error });
        return reject(new AppError('File upload failed', 500));
      }
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
        bytes: result.bytes,
      });
    });

    stream.end(buffer);
  });
};

/**
 * Delete a file from Cloudinary.
 */
const deleteFile = async (publicId, resourceType = 'image') => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    logger.warn('Cloudinary delete failed', { publicId, err: err.message });
  }
};

/**
 * True when real Cloudinary credentials (not the .env.example placeholders) are set.
 */
const isConfigured = () =>
  Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
  process.env.CLOUDINARY_CLOUD_NAME !== 'your_cloud_name' &&
  Boolean(process.env.CLOUDINARY_API_SECRET) &&
  process.env.CLOUDINARY_API_SECRET !== 'your_api_secret';

module.exports = { uploadBuffer, deleteFile, isConfigured };
