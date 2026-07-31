const chatService = require('./chat.service');
const { sendSuccess, sendPaginated } = require('../../utils/response');

const controller = {
  async createSession(req, res, next) {
    try {
      const session = await chatService.createSession(req.user._id);
      sendSuccess(res, { session }, 'Chat session created', 201);
    } catch (err) { next(err); }
  },

  async sendMessage(req, res, next) {
    try {
      const result = await chatService.sendMessage(
        req.params.id, req.user._id, req.body.message,
        req.body.preferredLanguage || req.user.preferredLanguage || 'hausa',
        req.body.uploadId || null
      );
      sendSuccess(res, result);
    } catch (err) { next(err); }
  },

  async getSessions(req, res, next) {
    try {
      const { data, pagination } = await chatService.getSessions(req.user._id, req.query);
      sendPaginated(res, data, pagination);
    } catch (err) { next(err); }
  },

  async getSession(req, res, next) {
    try {
      const session = await chatService.getSession(req.params.id, req.user._id);
      sendSuccess(res, { session });
    } catch (err) { next(err); }
  },

  async deleteSession(req, res, next) {
    try {
      await chatService.deleteSession(req.params.id, req.user._id);
      sendSuccess(res, null, 'Session deleted');
    } catch (err) { next(err); }
  },
};

module.exports = controller;
