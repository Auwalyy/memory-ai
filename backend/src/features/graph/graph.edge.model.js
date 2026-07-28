const mongoose = require('mongoose');

const RELATIONSHIP_TYPES = [
  'BELONGS_TO', 'MENTIONS', 'SIMILAR_TO', 'SAME_THEME', 'SAME_MORAL',
  'LOCATED_IN', 'PART_OF', 'RELATED_TO', 'INSPIRED_BY', 'REFERENCES',
  'USES', 'CELEBRATED_IN',
];

const knowledgeEdgeSchema = new mongoose.Schema(
  {
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeNode', required: true },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeNode', required: true },
    relationship: { type: String, enum: RELATIONSHIP_TYPES, required: true },
    strength: { type: Number, default: 0.5, min: 0, max: 1 }, // 0–1 confidence
    description: { type: String, maxlength: 200 },
    // Dedup: prevent duplicate directed edges of same type
    fingerprint: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

knowledgeEdgeSchema.index({ from: 1, relationship: 1 });
knowledgeEdgeSchema.index({ to: 1, relationship: 1 });
knowledgeEdgeSchema.index({ from: 1, to: 1 });

module.exports = mongoose.model('KnowledgeEdge', knowledgeEdgeSchema);
module.exports.RELATIONSHIP_TYPES = RELATIONSHIP_TYPES;
