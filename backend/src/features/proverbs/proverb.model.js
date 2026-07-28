const mongoose = require('mongoose');
const { LANGUAGES } = require('../../config/constants');

const proverbSchema = new mongoose.Schema(
  {
    original: { type: String, required: true, trim: true },
    transliteration: String,
    englishTranslation: { type: String, required: true },
    meaning: { type: String, required: true },
    usage: String,
    language: { type: String, enum: Object.values(LANGUAGES), required: true },
    tribe: String,
    relatedProverbs: [String],
    contributor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    tags: [String],
    isVerified: { type: Boolean, default: false },
    embedding: { type: [Number], select: false },
  },
  { timestamps: true }
);

proverbSchema.index(
  { original: 'text', englishTranslation: 'text', meaning: 'text' },
  { language_override: 'search_language' }
);
proverbSchema.index({ language: 1 });

module.exports = mongoose.model('Proverb', proverbSchema);
