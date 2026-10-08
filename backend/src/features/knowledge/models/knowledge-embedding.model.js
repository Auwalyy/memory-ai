const mongoose = require('mongoose');

/**
 * Semantic-search vector for a KnowledgeItem, kept out of the item document so
 * library queries never load large arrays.
 */
const knowledgeEmbeddingSchema = new mongoose.Schema(
  {
    knowledgeItem: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeItem', required: true, unique: true },
    vector: { type: [Number], required: true },
    model: String,
    dimensions: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeEmbedding', knowledgeEmbeddingSchema);
