const router = require('express').Router();
const Story = require('../stories/story.model');
const Proverb = require('../proverbs/proverb.model');
const Upload = require('../uploads/upload.model');
const KnowledgeNode = require('../graph/graph.node.model');
const KnowledgeEdge = require('../graph/graph.edge.model');
const { body, query, param } = require('express-validator');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const { authenticate, optionalAuth } = require('../../middleware/auth');
const audioUpload = require('../../middleware/audioUpload');
const validate = require('../../middleware/validate');
const knowledgeService = require('./knowledge.service');
const knowledgeSearchService = require('./knowledge.search.service');
const knowledgeExploreService = require('./knowledge.explore.service');
const {
  CONTRIBUTION_TYPES, CONTRIBUTION_LANGUAGES, VERIFICATION_STATUS,
} = require('../../config/constants');

const TYPES = Object.values(CONTRIBUTION_TYPES);
const STATUSES = Object.values(VERIFICATION_STATUS);

const idParam = [param('id').isMongoId().withMessage('Invalid knowledge id')];

const optionalText = (field, max) =>
  body(field).optional({ values: 'falsy' }).isString().trim().isLength({ max }).withMessage(`${field} is too long`);

// GET /api/v1/knowledge/stats  (legacy story/proverb archive stats)
router.get('/stats', async (req, res, next) => {
  try {
    const [
      storyStats, proverbCount, uploadCount, topThemes,
      typeBreakdown, graphNodeCount, graphEdgeCount,
      recentActivity, analysisStats,
    ] = await Promise.all([
      Story.aggregate([
        { $group: { _id: '$language', count: { $sum: 1 }, totalViews: { $sum: '$viewCount' } } },
        { $sort: { count: -1 } },
      ]),
      Proverb.countDocuments(),
      Upload.countDocuments(),
      Story.aggregate([
        { $match: { 'analysis.themes': { $exists: true, $ne: [] } } },
        { $unwind: '$analysis.themes' },
        { $group: { _id: '$analysis.themes', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]),
      Story.aggregate([
        { $group: { _id: '$knowledgeType', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      KnowledgeNode.countDocuments(),
      KnowledgeEdge.countDocuments(),
      Story.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title language knowledgeType createdAt analysis.summary')
        .populate('contributor', 'name'),
      Story.aggregate([
        { $group: { _id: '$analysis.status', count: { $sum: 1 } } },
      ]),
    ]);

    const totalStories = storyStats.reduce((s, x) => s + x.count, 0);
    const totalViews = storyStats.reduce((s, x) => s + x.totalViews, 0);

    sendSuccess(res, {
      storyStats, proverbCount, uploadCount, topThemes,
      typeBreakdown, graphNodeCount, graphEdgeCount,
      recentActivity, analysisStats,
      totals: { stories: totalStories, views: totalViews },
    });
  } catch (err) {
    next(err);
  }
});

// ── NAIC voice knowledge (N-ATLAS pipeline) ─────────────────────────────────

// POST /api/v1/knowledge/upload — multipart: audio + metadata (+ consent)
router.post(
  '/upload',
  authenticate,
  audioUpload.single('audio'),
  [
    body('consent').equals('true').withMessage('Consent is required before a recording can be stored'),
    body('language').isIn(CONTRIBUTION_LANGUAGES).withMessage('Unsupported language'),
    body('knowledgeType').isIn(TYPES).withMessage('Unsupported knowledge type'),
    optionalText('community', 120),
    optionalText('town', 120),
    optionalText('state', 60),
    body('isAnonymous').optional().isIn(['true', 'false', true, false]),
    body('recordedAt').optional({ values: 'falsy' }).isISO8601().withMessage('recordedAt must be a date'),
    body('sessionId').optional({ values: 'falsy' }).isString().isLength({ max: 64 }),
    body('durationSec').optional({ values: 'falsy' }).isFloat({ min: 0, max: 7200 }),
    body('text').optional({ values: 'falsy' }).isString().trim().isLength({ min: 20, max: 20000 })
      .withMessage('Typed text must be between 20 and 20,000 characters'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const contribution = await knowledgeService.createContribution({
        user: req.user,
        file: req.file,
        body: req.body,
        publicBaseUrl: process.env.BACKEND_PUBLIC_URL || `${req.protocol}://${req.get('host')}`,
      });
      sendSuccess(res, { contribution }, 'Contribution received', 201);
    } catch (err) { next(err); }
  }
);

// POST /api/v1/knowledge/process — start the N-ATLAS pipeline
router.post(
  '/process',
  authenticate,
  [body('contributionId').isMongoId().withMessage('Invalid contribution id')],
  validate,
  async (req, res, next) => {
    try {
      const job = await knowledgeService.startProcessing(req.body.contributionId, req.user);
      sendSuccess(res, { job }, 'N-ATLAS processing started', 202);
    } catch (err) { next(err); }
  }
);

// GET /api/v1/knowledge/jobs/:id — poll pipeline progress
router.get('/jobs/:id', authenticate, idParam, validate, async (req, res, next) => {
  try {
    sendSuccess(res, await knowledgeService.getJob(req.params.id, req.user));
  } catch (err) { next(err); }
});

// GET /api/v1/knowledge/search?q=... — retrieval first, then optional N-ATLAS summary
router.get(
  '/search',
  optionalAuth,
  [
    query('q').isString().trim().isLength({ min: 2, max: 300 }).withMessage('Search query must be 2-300 characters'),
    query('language').optional({ values: 'falsy' }).isIn(CONTRIBUTION_LANGUAGES),
    query('answer').optional().isIn(['true', 'false']),
    query('answerLanguage').optional().isIn(CONTRIBUTION_LANGUAGES),
    query('limit').optional().isInt({ min: 1, max: 20 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await knowledgeSearchService.search({
        q: req.query.q,
        language: req.query.language,
        answer: req.query.answer !== 'false',
        answerLanguage: req.query.answerLanguage,
        limit: req.query.limit,
      });
      sendSuccess(res, result);
    } catch (err) { next(err); }
  }
);

// GET /api/v1/knowledge/explore — relationship tree
router.get(
  '/explore',
  [query('language').optional({ values: 'falsy' }).isIn(CONTRIBUTION_LANGUAGES)],
  validate,
  async (req, res, next) => {
    try {
      sendSuccess(res, await knowledgeExploreService.explore({ language: req.query.language }));
    } catch (err) { next(err); }
  }
);

// GET /api/v1/knowledge — library (published), ?mine=true for own items
router.get(
  '/',
  optionalAuth,
  [
    query('language').optional({ values: 'falsy' }).isIn(CONTRIBUTION_LANGUAGES),
    query('knowledgeType').optional({ values: 'falsy' }).isIn(TYPES),
    query('status').optional({ values: 'falsy' }).isIn(STATUSES),
    query('mine').optional().isIn(['true', 'false']),
    query(['q', 'location', 'topic', 'person', 'place']).optional({ values: 'falsy' }).isString().isLength({ max: 200 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { data, pagination } = await knowledgeService.list(req.query, req.user);
      sendPaginated(res, data, pagination);
    } catch (err) { next(err); }
  }
);

// GET /api/v1/knowledge/:id — item with provenance, reviews and permissions
router.get('/:id', optionalAuth, idParam, validate, async (req, res, next) => {
  try {
    sendSuccess(res, await knowledgeService.getById(req.params.id, req.user));
  } catch (err) { next(err); }
});

// POST /api/v1/knowledge/:id/review — contributor's Cultural Fidelity rating
router.post(
  '/:id/review',
  authenticate,
  idParam,
  [
    body('fidelityScore').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').toInt(),
    optionalText('correctionText', 5000),
    optionalText('userFeedback', 2000),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await knowledgeService.review(req.params.id, req.user, req.body);
      sendSuccess(res, result, 'Thank you — your review was saved', 201);
    } catch (err) { next(err); }
  }
);

// POST /api/v1/knowledge/:id/verify — moderator verification
router.post(
  '/:id/verify',
  authenticate,
  idParam,
  [
    body('decision').isIn(['verify', 'reject']).withMessage('decision must be verify or reject'),
    body('fidelityScore').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5').toInt(),
    optionalText('correctionText', 5000),
  ],
  validate,
  async (req, res, next) => {
    try {
      const result = await knowledgeService.verify(req.params.id, req.user, req.body);
      sendSuccess(res, result, req.body.decision === 'verify' ? 'Knowledge verified' : 'Returned to contributor');
    } catch (err) { next(err); }
  }
);

// PATCH /api/v1/knowledge/:id — contributor edits / corrections
router.patch(
  '/:id',
  authenticate,
  idParam,
  [
    body('title').optional().isString().trim().isLength({ min: 3, max: 300 }),
    body('originalTranscript').optional().isString().trim().isLength({ min: 1, max: 50000 }),
    optionalText('translation', 50000),
    optionalText('summary', 2000),
    body('knowledgeType').optional().isIn(TYPES),
    body('isAnonymous').optional().isBoolean().toBoolean(),
    body('location').optional().isObject(),
    body(['location.community', 'location.town']).optional().isString().trim().isLength({ max: 120 }),
    body('location.state').optional().isString().trim().isLength({ max: 60 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { title, originalTranscript, translation, summary, knowledgeType, isAnonymous, location } = req.body;
      const item = await knowledgeService.update(req.params.id, req.user, {
        title, originalTranscript, translation, summary, knowledgeType, isAnonymous,
        location: location && { community: location.community, town: location.town, state: location.state },
      });
      sendSuccess(res, { item }, 'Contribution updated');
    } catch (err) { next(err); }
  }
);

// POST /api/v1/knowledge/:id/withdraw — hide from the library
router.post('/:id/withdraw', authenticate, idParam, validate, async (req, res, next) => {
  try {
    const item = await knowledgeService.withdraw(req.params.id, req.user);
    sendSuccess(res, { item }, 'Contribution withdrawn from the library');
  } catch (err) { next(err); }
});

// DELETE /api/v1/knowledge/:id — permanently delete contribution and recording
router.delete('/:id', authenticate, idParam, validate, async (req, res, next) => {
  try {
    await knowledgeService.remove(req.params.id, req.user);
    sendSuccess(res, null, 'Contribution deleted');
  } catch (err) { next(err); }
});

module.exports = router;
