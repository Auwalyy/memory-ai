const router = require('express').Router();
const { query } = require('express-validator');
const analyticsService = require('./analytics.service');
const { authenticate, authorize } = require('../../middleware/auth');
const validate = require('../../middleware/validate');
const { sendSuccess } = require('../../utils/response');
const { ROLES } = require('../../config/constants');

router.use(authenticate);

// GET /api/v1/analytics — aggregate evaluation metrics (no personal data)
router.get('/', async (req, res, next) => {
  try {
    sendSuccess(res, await analyticsService.overview());
  } catch (err) { next(err); }
});

// GET /api/v1/analytics/export?format=csv|json — per-session validation records
router.get(
  '/export',
  authorize(ROLES.ADMIN, ROLES.MODERATOR),
  [query('format').optional().isIn(['csv', 'json']).withMessage('format must be csv or json')],
  validate,
  async (req, res, next) => {
    try {
      const records = await analyticsService.exportRecords();
      const stamp = new Date().toISOString().slice(0, 10);
      if (req.query.format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="memoryai-validation-${stamp}.csv"`);
        return res.send(analyticsService.toCSV(records));
      }
      res.setHeader('Content-Disposition', `attachment; filename="memoryai-validation-${stamp}.json"`);
      res.json({ generatedAt: new Date().toISOString(), count: records.length, records });
    } catch (err) { next(err); }
  }
);

module.exports = router;
