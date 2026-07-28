const router = require('express').Router();
const controller = require('./proverb.controller');
const { authenticate } = require('../../middleware/auth');
const { body } = require('express-validator');
const validate = require('../../middleware/validate');

const proverbValidator = [
  body('original').trim().notEmpty().withMessage('Original proverb text is required'),
  body('englishTranslation').trim().notEmpty().withMessage('English translation is required'),
  body('meaning').trim().notEmpty().withMessage('Meaning is required'),
  body('language').notEmpty().withMessage('Language is required'),
];

router.get('/', controller.getAll);
router.post('/', authenticate, proverbValidator, validate, controller.create);
router.post('/extract', authenticate, [body('text').notEmpty(), body('language').notEmpty()], validate, controller.extractFromText);
router.get('/:id', controller.getById);

module.exports = router;
