const mongoose = require('mongoose');
const { CONTRIBUTION_TYPES, CONTRIBUTION_LANGUAGES } = require('../../../config/constants');

const CONTRIBUTION_STATUS = ['PENDING', 'PROCESSING', 'AI_PROCESSED', 'FAILED', 'WITHDRAWN'];

const locationSchema = new mongoose.Schema({
  community: { type: String, trim: true, maxlength: 120 },
  town: { type: String, trim: true, maxlength: 120 },
  state: { type: String, trim: true, maxlength: 60 },
}, { _id: false });

/**
 * The raw intake record of a voice contribution: who gave it, with what
 * consent, and the original recording. N-ATLAS output lives on KnowledgeItem.
 */
const knowledgeContributionSchema = new mongoose.Schema(
  {
    contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isAnonymous: { type: Boolean, default: false },
    language: { type: String, enum: CONTRIBUTION_LANGUAGES, required: true },
    knowledgeType: { type: String, enum: Object.values(CONTRIBUTION_TYPES), required: true },
    location: locationSchema,
    recordedAt: { type: Date, default: Date.now },
    sessionId: { type: String, trim: true, maxlength: 64, index: true },

    consent: {
      given: { type: Boolean, required: true },
      statement: { type: String, required: true },
      givenAt: { type: Date, required: true },
    },

    audio: {
      url: String,
      storage: { type: String, enum: ['cloudinary', 'local'] },
      publicId: String,
      localPath: { type: String, select: false },
      mimeType: String,
      bytes: Number,
      durationSec: Number,
    },
    // Typed text, used only when the contributor cannot record audio
    submittedText: { type: String, maxlength: 20000 },

    status: { type: String, enum: CONTRIBUTION_STATUS, default: 'PENDING' },
    knowledgeItem: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeItem' },
    latestJob: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcessingJob' },
  },
  { timestamps: true }
);

knowledgeContributionSchema.index({ contributor: 1, createdAt: -1 });

module.exports = mongoose.model('KnowledgeContribution', knowledgeContributionSchema);
module.exports.CONTRIBUTION_STATUS = CONTRIBUTION_STATUS;
