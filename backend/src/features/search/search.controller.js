const searchService = require('./search.service');
const { sendSuccess } = require('../../utils/response');

const controller = {
  async textSearch(req, res, next) {
    try {
      if (!req.query.q) return res.status(400).json({ success: false, message: 'Query parameter q is required' });
      const results = await searchService.textSearch(req.query.q, req.query);
      sendSuccess(res, results);
    } catch (err) { next(err); }
  },

  async semanticSearch(req, res, next) {
    try {
      if (!req.query.q) return res.status(400).json({ success: false, message: 'Query parameter q is required' });
      const stories = await searchService.semanticSearch(req.query.q, req.query);
      sendSuccess(res, { stories });
    } catch (err) { next(err); }
  },
};

module.exports = controller;
