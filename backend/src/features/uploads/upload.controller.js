const uploadService = require('./upload.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');

const controller = {
  async upload(req, res, next) {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
      const upload = await uploadService.upload(req.file, req.user._id);
      sendSuccess(res, { upload }, 'File uploaded successfully', 201);
    } catch (err) { next(err); }
  },

  // All uploads across all users (for Knowledge Library, Chat context, etc.)
  async getUploads(req, res, next) {
    try {
      const { data, pagination } = await uploadService.getUploads(req.query);
      sendPaginated(res, data, pagination);
    } catch (err) { next(err); }
  },

  // Only the current user's own uploads (for My Contributions page)
  async getMyUploads(req, res, next) {
    try {
      const { data, pagination } = await uploadService.getMyUploads(req.user._id, req.query);
      sendPaginated(res, data, pagination);
    } catch (err) { next(err); }
  },

  async analyzeUpload(req, res, next) {
    try {
      const result = await uploadService.analyzeUpload(req.params.id, req.user._id);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async getUpload(req, res, next) {
    try {
      const upload = await uploadService.getUploadById(req.params.id);
      sendSuccess(res, { upload });
    } catch (err) { next(err); }
  },
};

module.exports = controller;
