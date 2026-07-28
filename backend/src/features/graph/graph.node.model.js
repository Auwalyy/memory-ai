const mongoose = require('mongoose');

const NODE_TYPES = [
  'story', 'folktale', 'proverb', 'festival', 'community', 'language',
  'person', 'location', 'food', 'song', 'historical_event', 'tradition',
  'artifact', 'animal', 'plant', 'moral_lesson', 'theme', 'upload',
];

const knowledgeNodeSchema = new mongoose.Schema(
  {
    label: { type: String, required: true, trim: true },
    nodeType: { type: String, enum: NODE_TYPES, required: true },
    language: {
      type: String,
      enum: ['hausa', 'yoruba', 'igbo', 'english', 'pidgin', 'unknown'],
      default: 'unknown',
    },
    description: { type: String, maxlength: 500 },
    sourceRef: { type: mongoose.Schema.Types.ObjectId, refPath: 'sourceModel' },
    sourceModel: { type: String, enum: ['Upload', 'Story', 'Proverb'] },
    embedding: { type: [Number], select: false },
    tags: [{ type: String, lowercase: true, trim: true }],
    weight: { type: Number, default: 1 },
    // SHA-based dedup key: nodeType + normalised label
    fingerprint: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

knowledgeNodeSchema.index({ nodeType: 1 });
knowledgeNodeSchema.index({ language: 1 });
knowledgeNodeSchema.index(
  { label: 'text', description: 'text' },
  { language_override: 'search_language' }
);
knowledgeNodeSchema.index({ sourceRef: 1 });

module.exports = mongoose.model('KnowledgeNode', knowledgeNodeSchema);
module.exports.NODE_TYPES = NODE_TYPES;
