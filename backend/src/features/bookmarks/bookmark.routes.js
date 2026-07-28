const router = require('express').Router();
const Bookmark = require('./bookmark.model');
const Story = require('../stories/story.model');
const { authenticate } = require('../../middleware/auth');
const { sendSuccess, sendPaginated } = require('../../utils/response');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination');
const AppError = require('../../utils/AppError');

router.use(authenticate);

// Toggle bookmark
router.post('/:storyId', async (req, res, next) => {
  try {
    const existing = await Bookmark.findOne({ user: req.user._id, story: req.params.storyId });
    if (existing) {
      await existing.deleteOne();
      await Story.findByIdAndUpdate(req.params.storyId, { $inc: { bookmarkCount: -1 } });
      return sendSuccess(res, { bookmarked: false }, 'Bookmark removed');
    }
    await Bookmark.create({ user: req.user._id, story: req.params.storyId });
    await Story.findByIdAndUpdate(req.params.storyId, { $inc: { bookmarkCount: 1 } });
    sendSuccess(res, { bookmarked: true }, 'Bookmarked', 201);
  } catch (err) { next(err); }
});

// List bookmarks
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip } = parsePagination(req.query);
    const [data, total] = await Promise.all([
      Bookmark.find({ user: req.user._id })
        .populate({ path: 'story', select: '-embedding', populate: { path: 'contributor', select: 'name' } })
        .sort({ createdAt: -1 }).skip(skip).limit(limit),
      Bookmark.countDocuments({ user: req.user._id }),
    ]);
    sendPaginated(res, data, buildPaginationMeta(total, page, limit));
  } catch (err) { next(err); }
});

module.exports = router;
