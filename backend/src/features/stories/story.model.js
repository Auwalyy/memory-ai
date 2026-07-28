const mongoose = require('mongoose');
const { LANGUAGES, KNOWLEDGE_TYPES, ANALYSIS_STATUS } = require('../../config/constants');

const characterSchema = new mongoose.Schema({
  name: String,
  role: String,
  significance: String,
}, { _id: false });

const storySchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
      maxlength: [300, 'Title cannot exceed 300 characters'],
    },
    content: {
      type: String,
      required: [true, 'Content is required'],
      maxlength: [50000, 'Content cannot exceed 50,000 characters'],
    },
    language: {
      type: String,
      enum: Object.values(LANGUAGES),
      required: true,
    },
    knowledgeType: {
      type: String,
      enum: Object.values(KNOWLEDGE_TYPES),
      default: KNOWLEDGE_TYPES.OTHER,
    },
    contributor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    isPublished: { type: Boolean, default: false },
    isFeatured: { type: Boolean, default: false },

    // Gemma analysis results
    analysis: {
      status: {
        type: String,
        enum: Object.values(ANALYSIS_STATUS),
        default: ANALYSIS_STATUS.PENDING,
      },
      summary: String,
      characters: [characterSchema],
      moralLesson: String,
      themes: [String],
      culturalContext: String,
      historicalPeriod: String,
      geographicOrigin: String,
      difficultTerms: [{ term: String, meaning: String, language: String }],
      relatedProverbs: [String],
      educationalValue: String,
      preservationNotes: String,
      analyzedAt: Date,
      error: String,
    },

    // Semantic search embedding
    embedding: {
      type: [Number],
      select: false,
    },

    tags: [{ type: String, lowercase: true, trim: true }],
    viewCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },

    // Source upload reference
    sourceUpload: { type: mongoose.Schema.Types.ObjectId, ref: 'Upload' },
    mediaUrl: String,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Text search index — language_override prevents MongoDB from treating
// the 'language' field as a text search language (hausa/yoruba/igbo are not
// MongoDB-supported text languages)
storySchema.index(
  { title: 'text', content: 'text', tags: 'text' },
  { language_override: 'search_language' }
);
storySchema.index({ language: 1, knowledgeType: 1 });
storySchema.index({ contributor: 1 });
storySchema.index({ isPublished: 1, createdAt: -1 });
storySchema.index({ tags: 1 });

module.exports = mongoose.model('Story', storySchema);
