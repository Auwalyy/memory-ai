const router = require('express').Router();
const { authenticate, authorize } = require('../../middleware/auth');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const User = require('../auth/user.model');
const Story = require('../stories/story.model');
const Upload = require('../uploads/upload.model');
const { ROLES } = require('../../config/constants');

router.use(authenticate, authorize(ROLES.ADMIN, ROLES.MODERATOR));

// Dashboard stats
router.get('/stats', async (req, res, next) => {
  try {
    const [users, stories, uploads, publishedStories] = await Promise.all([
      User.countDocuments(),
      Story.countDocuments(),
      Upload.countDocuments(),
      Story.countDocuments({ isPublished: true }),
    ]);

    const languageBreakdown = await Story.aggregate([
      { $group: { _id: '$language', count: { $sum: 1 } } },
    ]);

    const typeBreakdown = await Story.aggregate([
      { $group: { _id: '$knowledgeType', count: { $sum: 1 } } },
    ]);

    sendSuccess(res, {
      users,
      stories,
      uploads,
      publishedStories,
      languageBreakdown,
      typeBreakdown,
    });
  } catch (err) { next(err); }
});

// List all users
router.get('/users', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [data, total] = await Promise.all([
      User.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);
    sendPaginated(res, data, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

// Block/unblock user
router.patch('/users/:id/block', authorize(ROLES.ADMIN), async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      [{ $set: { isBlocked: { $not: '$isBlocked' } } }],
      { new: true }
    );
    sendSuccess(res, { user }, `User ${user.isBlocked ? 'blocked' : 'unblocked'}`);
  } catch (err) { next(err); }
});

// Pending stories (unpublished)
router.get('/stories/pending', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [data, total] = await Promise.all([
      Story.find({ isPublished: false })
        .populate('contributor', 'name email')
        .sort({ createdAt: -1 }).skip(skip).limit(limit).select('-embedding'),
      Story.countDocuments({ isPublished: false }),
    ]);
    sendPaginated(res, data, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

// Approve story
router.patch('/stories/:id/approve', async (req, res, next) => {
  try {
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      { isPublished: true },
      { new: true }
    );
    sendSuccess(res, { story }, 'Story approved and published');
  } catch (err) { next(err); }
});

// Feature story
router.patch('/stories/:id/feature', async (req, res, next) => {
  try {
    const story = await Story.findByIdAndUpdate(
      req.params.id,
      [{ $set: { isFeatured: { $not: '$isFeatured' } } }],
      { new: true }
    );
    sendSuccess(res, { story }, `Story ${story.isFeatured ? 'featured' : 'unfeatured'}`);
  } catch (err) { next(err); }
});

module.exports = router;
