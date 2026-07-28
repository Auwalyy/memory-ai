const router = require('express').Router();
const controller = require('./story.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { body, param } = require('express-validator');
const validate = require('../../middleware/validate');
const { LANGUAGES, KNOWLEDGE_TYPES } = require('../../config/constants');

const storyValidator = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 300 }),
  body('content').trim().notEmpty().withMessage('Content is required').isLength({ min: 50, max: 50000 }),
  body('language').notEmpty().withMessage('Language is required').isIn(Object.values(LANGUAGES)).withMessage('Invalid language'),
  body('knowledgeType').optional().isIn(Object.values(KNOWLEDGE_TYPES)).withMessage('Invalid knowledge type'),
];

const idParam = [param('id').isMongoId().withMessage('Invalid story ID')];

router.get('/', controller.getAll);
router.get('/mine', authenticate, controller.getMyStories);
router.post('/', authenticate, storyValidator, validate, controller.create);
router.get('/:id', idParam, validate, controller.getById);
router.patch('/:id/publish', authenticate, idParam, validate, controller.publish);
router.delete('/:id', authenticate, idParam, validate, controller.remove);

// Gemma-powered endpoints
router.get('/:id/educational', authenticate, idParam, validate, controller.getEducationalContent);
router.get('/:id/childrens-version', authenticate, idParam, validate, controller.getChildrensVersion);
router.get('/:id/cross-language', authenticate, idParam, validate, controller.getCrossLanguageConnections);
router.post('/:id/translate', authenticate, idParam, [body('targetLanguage').notEmpty()], validate, controller.translate);
router.get('/:id/podcast', authenticate, idParam, validate, controller.getPodcastScript);
router.get('/:id/recommendations', idParam, validate, controller.getRecommendations);

module.exports = router;
