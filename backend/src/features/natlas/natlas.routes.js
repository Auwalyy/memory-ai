const router = require('express').Router();
const { body } = require('express-validator');
const NAtlasService = require('../../core/natlas/natlas.service');
const { authenticate } = require('../../middleware/auth');
const audioUpload = require('../../middleware/audioUpload');
const validate = require('../../middleware/validate');
const { sendSuccess } = require('../../utils/response');
const AppError = require('../../utils/AppError');
const { CONTRIBUTION_LANGUAGES, CONTRIBUTION_TYPES } = require('../../config/constants');
const { baseMimeType } = require('../../core/storage/audio.storage');

/**
 * Direct, stateless access to N-ATLAS for testing and the judges' demo.
 * Nothing here is persisted — the archive flow is /knowledge/upload + /process.
 */

const toHttpError = (err) => {
  if (err.name !== 'NAtlasError') return err;
  if (err.code === 'NOT_CONFIGURED') return new AppError(`N-ATLAS is not configured on this server: ${err.message}`, 503);
  if (err.code === 'TIMEOUT') return new AppError('N-ATLAS took too long to respond. Please try again.', 504);
  return new AppError('N-ATLAS could not process this request. Please try again.', 502);
};

// GET /api/v1/natlas/status — which N-ATLAS components are configured (no secrets)
router.get('/status', (req, res) => {
  sendSuccess(res, NAtlasService.status());
});

router.use(authenticate);

// POST /api/v1/natlas/transcribe — multipart: audio, language
router.post(
  '/transcribe',
  audioUpload.single('audio'),
  [body('language').isIn(CONTRIBUTION_LANGUAGES).withMessage('Unsupported language')],
  validate,
  async (req, res, next) => {
    try {
      if (!req.file) throw new AppError('Audio file is required', 400);
      const result = await NAtlasService.transcribeAudio({
        buffer: req.file.buffer,
        mimeType: baseMimeType(req.file.mimetype),
        filename: req.file.originalname,
        language: req.body.language,
      });
      sendSuccess(res, result);
    } catch (err) { next(toHttpError(err)); }
  }
);

// POST /api/v1/natlas/process — transcript → translation + structured knowledge
router.post(
  '/process',
  [
    body('transcript').isString().trim().isLength({ min: 10, max: 20000 }).withMessage('Transcript must be 10-20,000 characters'),
    body('language').isIn(CONTRIBUTION_LANGUAGES).withMessage('Unsupported language'),
    body('knowledgeType').optional().isIn(Object.values(CONTRIBUTION_TYPES)),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { transcript, language, knowledgeType = 'other' } = req.body;
      const translated = await NAtlasService.translateKnowledge(transcript, language);
      const structured = await NAtlasService.generateStructuredKnowledge({
        transcript, translation: translated.translation, language, knowledgeType,
      });
      sendSuccess(res, {
        translation: translated.translation,
        knowledge: structured.knowledge,
        grounding: structured.grounding,
        meta: { translation: translated.meta, extraction: structured.meta },
      });
    } catch (err) { next(toHttpError(err)); }
  }
);

module.exports = router;
