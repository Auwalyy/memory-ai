const router = require('express').Router();
const ingestionService = require('./ingestion.service');
const Upload = require('../uploads/upload.model');
const { authenticate } = require('../../middleware/auth');
const { sendSuccess } = require('../../utils/response');
const AppError = require('../../utils/AppError');

router.use(authenticate);

/**
 * GET /api/v1/ingestion/:uploadId/progress
 * Server-Sent Events stream — client listens for pipeline step updates.
 */
router.get('/:uploadId/progress', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const cleanup = ingestionService.registerSSE(req.params.uploadId, res);
  req.on('close', cleanup);
});

/**
 * POST /api/v1/ingestion/:uploadId/run
 * Trigger (or re-trigger) the ingestion pipeline for an upload.
 */
router.post('/:uploadId/run', async (req, res, next) => {
  try {
    const upload = await Upload.findOne({
      _id: req.params.uploadId,
      uploader: req.user._id,
    });
    if (!upload) throw new AppError('Upload not found', 404);
    if (!upload.extractedText) throw new AppError('No text available for ingestion', 400);

    const outputLanguage = req.body.outputLanguage || null;

    // Fire pipeline in background — respond immediately
    setImmediate(() => ingestionService.run(upload._id, outputLanguage));

    sendSuccess(res, { uploadId: upload._id, status: 'started' }, 'Ingestion pipeline started');
  } catch (err) { next(err); }
});

/**
 * GET /api/v1/ingestion/:uploadId/result
 * Fetch the stored ingestion result for a completed upload.
 */
router.get('/:uploadId/result', async (req, res, next) => {
  try {
    const upload = await Upload.findOne({
      _id: req.params.uploadId,
      uploader: req.user._id,
    }).lean();
    if (!upload) throw new AppError('Upload not found', 404);
    sendSuccess(res, {
      analysisStatus: upload.analysisStatus,
      ingestion: upload.ingestion || null,
    });
  } catch (err) { next(err); }
});

module.exports = router;
