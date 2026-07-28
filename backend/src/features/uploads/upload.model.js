const mongoose = require('mongoose');
const { UPLOAD_TYPES, ANALYSIS_STATUS } = require('../../config/constants');

const uploadSchema = new mongoose.Schema(
  {
    uploader: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    uploadType: { type: String, enum: Object.values(UPLOAD_TYPES), required: true },
    fileUrl: { type: String, required: true },
    cloudinaryPublicId: String,
    fileSizeBytes: Number,
    extractedText: String,
    ocrConfidence: Number,
    analysisStatus: {
      type: String,
      enum: Object.values(ANALYSIS_STATUS),
      default: ANALYSIS_STATUS.PENDING,
    },
    linkedStory: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },

    // AI Ingestion Pipeline results (Feature 1)
    ingestion: {
      detectedLanguage: String,
      contentType: String,
      summaries: {
        short: String,
        medium: String,
        detailed: String,
      },
      entities: {
        people: [String],
        communities: [String],
        places: [String],
        languages: [String],
        animals: [String],
        foods: [String],
        festivals: [String],
        historicalEvents: [String],
        medicinalPlants: [String],
        traditions: [String],
        artifacts: [String],
        keywords: [String],
      },
      aiUnderstanding: {
        mainTheme: String,
        subThemes: [String],
        moralLessons: [String],
        culturalMeaning: String,
        historicalContext: String,
        educationalValue: String,
        difficultyLevel: String,
        targetAudience: String,
      },
      metadata: {
        title: String,
        slug: String,
        tags: [String],
        category: String,
        estimatedReadingTime: String,
        relatedTopics: [String],
      },
      embedding: { type: [Number], select: false },
      completedAt: Date,
    },
  },
  { timestamps: true }
);

uploadSchema.index({ uploader: 1, createdAt: -1 });

module.exports = mongoose.model('Upload', uploadSchema);
