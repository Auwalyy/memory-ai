const router = require('express').Router();
const Story = require('../stories/story.model');
const Proverb = require('../proverbs/proverb.model');
const Upload = require('../uploads/upload.model');
const KnowledgeNode = require('../graph/graph.node.model');
const KnowledgeEdge = require('../graph/graph.edge.model');
const { sendSuccess } = require('../../utils/response');

// GET /api/v1/knowledge/stats
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

module.exports = router;
