const mongoose = require('mongoose');

const PIPELINE_STEPS = ['asr', 'translation', 'extraction', 'save', 'embedding'];

const stepSchema = new mongoose.Schema({
  name: { type: String, enum: PIPELINE_STEPS, required: true },
  status: { type: String, enum: ['pending', 'running', 'completed', 'failed', 'skipped'], default: 'pending' },
  provider: String,
  model: String,
  startedAt: Date,
  finishedAt: Date,
  durationMs: Number,
  error: String,
}, { _id: false });

/**
 * One run of the N-ATLAS pipeline over a contribution. Also the unit of the
 * real-world validation export (one row per session/job).
 */
const processingJobSchema = new mongoose.Schema(
  {
    contribution: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeContribution', required: true, index: true },
    knowledgeItem: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeItem' },
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sessionId: String,
    language: String,
    knowledgeType: String,
    status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued' },
    steps: {
      type: [stepSchema],
      default: () => PIPELINE_STEPS.map((name) => ({ name })),
    },
    transcriptionSuccess: Boolean,
    llmSuccess: Boolean,
    extractionSuccess: Boolean,
    startedAt: Date,
    finishedAt: Date,
    totalDurationMs: Number,
    error: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model('ProcessingJob', processingJobSchema);
module.exports.PIPELINE_STEPS = PIPELINE_STEPS;
