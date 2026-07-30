const router = require('express').Router();
const gemmaService = require('../../core/ai/gemma.service');
const { authenticate } = require('../../middleware/auth');
const { sendSuccess } = require('../../utils/response');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');
const AppError = require('../../utils/AppError');

router.use(authenticate);

// Generate lesson plan from raw content
router.post(
  '/lesson',
  [body('content').trim().notEmpty().withMessage('Content is required')],
  validate,
  async (req, res, next) => {
    try {
      const story = {
        title: req.body.title || 'Indigenous Knowledge Content',
        content: req.body.content,
        language: req.body.language || 'english',
        analysis: { culturalContext: req.body.culturalContext || '' },
      };
      const lesson = await gemmaService.generateEducationalContent(story);
      sendSuccess(res, { lesson });
    } catch (err) {
      next(err);
    }
  }
);

// Generate children's story from raw content
router.post(
  '/childrens-story',
  [body('content').trim().notEmpty().withMessage('Content is required')],
  validate,
  async (req, res, next) => {
    try {
      const story = {
        content: req.body.content,
        language: req.body.language || 'english',
        analysis: { moralLesson: req.body.moralLesson || '' },
      };
      const childrensStory = await gemmaService.generateChildrensVersion(story);
      sendSuccess(res, { childrensStory });
    } catch (err) {
      next(err);
    }
  }
);

// Generate podcast script from raw content
router.post(
  '/podcast',
  [body('content').trim().notEmpty().withMessage('Content is required')],
  validate,
  async (req, res, next) => {
    try {
      const story = {
        title: req.body.title || 'Indigenous Knowledge',
        content: req.body.content,
        language: req.body.language || 'english',
        knowledgeType: req.body.knowledgeType || 'other',
        analysis: { themes: req.body.themes || [] },
      };
      const script = await gemmaService.generatePodcastScript(story);
      sendSuccess(res, { script });
    } catch (err) { next(err); }
  }
);

// Find cross-language connections from raw content
router.post(
  '/cross-language',
  [body('content').trim().notEmpty().withMessage('Content is required')],
  validate,
  async (req, res, next) => {
    try {
      const story = {
        content: req.body.content,
        language: req.body.language || 'english',
        knowledgeType: req.body.knowledgeType || 'other',
        analysis: { themes: req.body.themes || [] },
      };
      const connections = await gemmaService.findCrossLanguageConnections(story);
      sendSuccess(res, { connections });
    } catch (err) { next(err); }
  }
);

// Translate text with cultural context
router.post(
  '/translate-text',
  [body('text').trim().notEmpty().withMessage('Text is required'),
   body('targetLanguage').trim().notEmpty().withMessage('targetLanguage is required')],
  validate,
  async (req, res, next) => {
    try {
      const { text, targetLanguage, sourceLanguage = 'english' } = req.body;
      const result = await gemmaService.translateWithContext(text, sourceLanguage, targetLanguage);
      sendSuccess(res, { translation: result.translation, culturalNotes: result.culturalNotes });
    } catch (err) { next(err); }
  }
);

module.exports = router;
