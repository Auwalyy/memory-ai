const router = require('express').Router();
const graphService = require('./graph.service');
const { authenticate } = require('../../middleware/auth');
const { sendSuccess } = require('../../utils/response');
const AppError = require('../../utils/AppError');

router.use(authenticate);

// GET /api/v1/graph — full graph (filterable)
router.get('/', async (req, res, next) => {
  try {
    const { nodeType, language, search, limit } = req.query;
    const data = await graphService.getGraph({
      nodeType,
      language,
      search,
      limit: Math.min(parseInt(limit) || 200, 500),
    });
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

// GET /api/v1/graph/stats
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await graphService.getStats();
    sendSuccess(res, stats);
  } catch (err) { next(err); }
});

// GET /api/v1/graph/nodes/:id — node + neighbours
router.get('/nodes/:id', async (req, res, next) => {
  try {
    const data = await graphService.getNodeWithNeighbours(req.params.id);
    if (!data) throw new AppError('Node not found', 404);
    sendSuccess(res, data);
  } catch (err) { next(err); }
});

module.exports = router;
