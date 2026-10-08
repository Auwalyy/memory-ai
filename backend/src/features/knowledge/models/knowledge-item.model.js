const mongoose = require('mongoose');
const { CONTRIBUTION_TYPES, CONTRIBUTION_LANGUAGES, VERIFICATION_STATUS } = require('../../../config/constants');

const stepMetaSchema = new mongoose.Schema({
  provider: String,
  model: String,
  durationMs: Number,
}, { _id: false });

/**
 * A structured, provenance-tracked unit of community knowledge produced from a
 * KnowledgeContribution by the N-ATLAS pipeline and verified by humans.
 */
const knowledgeItemSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 300 },
    knowledgeType: { type: String, enum: Object.values(CONTRIBUTION_TYPES), required: true },
    language: { type: String, enum: CONTRIBUTION_LANGUAGES, required: true },

    originalTranscript: { type: String, required: true, maxlength: 50000 },
    translation: { type: String, maxlength: 50000 },
    summary: { type: String, maxlength: 2000 },

    topics: [{ type: String, trim: true, lowercase: true }],
    entities: [{ _id: false, name: String, type: { type: String } }],
    people: [String],
    places: [String],
    culturalConcepts: [{ _id: false, term: String, meaning: String }],
    proverbs: [{ _id: false, text: String, translation: String, meaning: String }],
    keywords: [String],
    confidenceNotes: [String],

    // Provenance
    contribution: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeContribution', required: true },
    contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    isAnonymous: { type: Boolean, default: false },
    sourceType: { type: String, enum: ['community_voice', 'community_text'], default: 'community_voice' },
    audioUrl: String,
    audioDurationSec: Number,
    location: {
      community: String,
      town: String,
      state: String,
      label: String,
    },
    recordedAt: Date,

    // Verification
    verificationStatus: {
      type: String,
      enum: Object.values(VERIFICATION_STATUS),
      default: VERIFICATION_STATUS.AI_PROCESSED,
    },
    fidelityScore: { type: Number, min: 1, max: 5 }, // average of human ratings
    reviewCount: { type: Number, default: 0 },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedAt: Date,
    editedByContributorAt: Date,
    isWithdrawn: { type: Boolean, default: false },

    // N-ATLAS processing metadata
    natlas: {
      asr: stepMetaSchema,
      translation: stepMetaSchema,
      extraction: stepMetaSchema,
      processedAt: Date,
      totalDurationMs: Number,
      processingJob: { type: mongoose.Schema.Types.ObjectId, ref: 'ProcessingJob' },
      grounding: {
        checked: Boolean,
        removed: [{ _id: false, field: String, value: String }],
      },
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

knowledgeItemSchema.index(
  {
    title: 'text', originalTranscript: 'text', translation: 'text', summary: 'text',
    topics: 'text', keywords: 'text', places: 'text', 'culturalConcepts.term': 'text',
  },
  {
    // 'language' holds hausa/yoruba/igbo which MongoDB text search does not support
    language_override: 'search_language',
    default_language: 'none',
    weights: {
      title: 6, topics: 5, keywords: 5, places: 4, 'culturalConcepts.term': 4,
      summary: 3, translation: 2, originalTranscript: 2,
    },
    name: 'knowledge_text',
  }
);
knowledgeItemSchema.index({ verificationStatus: 1, isWithdrawn: 1, createdAt: -1 });
knowledgeItemSchema.index({ contributor: 1, createdAt: -1 });
knowledgeItemSchema.index({ language: 1, knowledgeType: 1 });
knowledgeItemSchema.index({ 'location.label': 1 });

module.exports = mongoose.model('KnowledgeItem', knowledgeItemSchema);
