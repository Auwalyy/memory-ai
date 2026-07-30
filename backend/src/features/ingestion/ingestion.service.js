const Upload = require('../uploads/upload.model');
const gemmaService = require('../../core/ai/gemma.service');
const { embedText } = require('../../core/embeddings/embedding.service');
const graphService = require('../graph/graph.service');
const { ANALYSIS_STATUS } = require('../../config/constants');
const logger = require('../../utils/logger');

// In-memory SSE client registry: uploadId -> res[]
const _sseClients = new Map();
// Mutex: prevent concurrent runs for the same upload
const _running = new Set();

const ingestionService = {
  registerSSE(uploadId, res) {
    const id = uploadId.toString();
    if (!_sseClients.has(id)) _sseClients.set(id, []);
    _sseClients.get(id).push(res);
    return () => {
      const list = _sseClients.get(id) || [];
      const idx = list.indexOf(res);
      if (idx !== -1) list.splice(idx, 1);
    };
  },

  _emit(uploadId, step, label, progress, data = {}) {
    const id = uploadId.toString();
    const payload = JSON.stringify({ step, label, progress, ...data });
    for (const res of _sseClients.get(id) || []) {
      try { res.write(`data: ${payload}\n\n`); } catch (_) {}
    }
  },

  /**
   * Run the full 8-step ingestion pipeline for an upload.
   * @param {string} uploadId
   * @param {string|null} outputLanguage - language for AI output (hausa/yoruba/igbo/english/pidgin)
   */
  async run(uploadId, outputLanguage = null) {
    const id = uploadId.toString();

    if (_running.has(id)) {
      logger.info('Ingestion already running, skipping duplicate', { uploadId });
      return;
    }
    _running.add(id);

    const emit = (step, label, progress, data) =>
      this._emit(uploadId, step, label, progress, data);

    try {
      const upload = await Upload.findById(uploadId).lean();
      if (!upload) { _running.delete(id); return; }

      await Upload.updateOne({ _id: uploadId }, { $set: { analysisStatus: ANALYSIS_STATUS.PROCESSING } });

      const text = upload.extractedText || '';
      if (!text.trim()) {
        await Upload.updateOne({ _id: uploadId }, { $set: { analysisStatus: ANALYSIS_STATUS.COMPLETED } });
        emit(8, 'Completed', 100, { done: true });
        _running.delete(id);
        return;
      }

      // Step 1: Detect Language
      emit(1, 'Detecting Language...', 10);
      const langResult = await gemmaService.detectLanguage(text);
      const detectedLanguage = langResult?.language || 'english';
      // outputLanguage overrides the language used for AI output (summaries, analysis, etc.)
      const analysisLanguage = outputLanguage || detectedLanguage;
      await Upload.updateOne({ _id: uploadId }, {
        $set: {
          'ingestion.detectedLanguage': detectedLanguage,
          'ingestion.outputLanguage': analysisLanguage,
        },
      });

      // Step 2: Classify Content
      emit(2, 'Understanding Content...', 22);
      const classification = await gemmaService.classifyContent(text, detectedLanguage);
      const contentType = classification?.contentType || 'other';
      await Upload.updateOne({ _id: uploadId }, { $set: { 'ingestion.contentType': contentType } });

      // Step 3: Generate Summaries (in chosen output language)
      emit(3, 'Reading & Summarising...', 35);
      const summaries = await gemmaService.generateSummaries(text, analysisLanguage);
      await Upload.updateOne({ _id: uploadId }, { $set: { 'ingestion.summaries': summaries } });

      // Step 4: Extract Entities (in chosen output language)
      emit(4, 'Extracting Cultural Knowledge...', 50);
      const entities = await gemmaService.extractEntities(text, analysisLanguage);
      await Upload.updateOne({ _id: uploadId }, { $set: { 'ingestion.entities': entities } });

      // Step 5: AI Understanding (in chosen output language)
      emit(5, 'Understanding Culture & Context...', 63);
      const aiUnderstanding = await gemmaService.deepUnderstand(text, analysisLanguage);
      await Upload.updateOne({ _id: uploadId }, { $set: { 'ingestion.aiUnderstanding': aiUnderstanding } });

      // Step 6: Generate Metadata (in chosen output language)
      emit(6, 'Generating Metadata...', 75);
      const metadata = await gemmaService.generateMetadata(text, analysisLanguage, classification);
      await Upload.updateOne({ _id: uploadId }, { $set: { 'ingestion.metadata': metadata } });

      // Step 7: Generate Embeddings
      emit(7, 'Building Intelligence...', 87);
      const embeddingText = [metadata?.title, summaries?.short, (aiUnderstanding?.subThemes || []).join(' ')]
        .filter(Boolean).join(' ');
      const embedding = await embedText(embeddingText || text.slice(0, 500));
      if (embedding.length) {
        await Upload.updateOne({ _id: uploadId }, { $set: { 'ingestion.embedding': embedding } });
      }

      // Step 8: Persist final status + Build Graph
      emit(8, 'Building Knowledge Graph...', 95);
      await Upload.updateOne(
        { _id: uploadId },
        { $set: { analysisStatus: ANALYSIS_STATUS.COMPLETED, 'ingestion.completedAt': new Date() } }
      );

      graphService
        .buildFromIngestion({ detectedLanguage, summaries, entities, aiUnderstanding, metadata }, uploadId)
        .catch((e) => logger.warn('Graph build failed', { err: e.message }));

      emit(8, 'Completed', 100, {
        done: true,
        result: { detectedLanguage, outputLanguage: analysisLanguage, contentType, title: metadata?.title, summaries, aiUnderstanding, metadata },
      });

      logger.info('Ingestion pipeline completed', { uploadId, outputLanguage: analysisLanguage });
    } catch (err) {
      logger.error('Ingestion pipeline failed', { uploadId, err: err.message });
      await Upload.updateOne({ _id: uploadId }, { $set: { analysisStatus: ANALYSIS_STATUS.FAILED } }).catch(() => {});
      emit(8, 'Failed', 100, { done: true, error: err.message });
    } finally {
      _running.delete(id);
    }
  },
};

module.exports = ingestionService;
