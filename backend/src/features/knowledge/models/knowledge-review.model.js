const mongoose = require('mongoose');

/**
 * A human judgement of how faithfully N-ATLAS represented a contribution.
 * Contributor reviews feed the Cultural Fidelity Score; moderator reviews
 * additionally move an item to VERIFIED.
 */
const knowledgeReviewSchema = new mongoose.Schema(
  {
    knowledgeItem: { type: mongoose.Schema.Types.ObjectId, ref: 'KnowledgeItem', required: true, index: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerRole: { type: String, enum: ['contributor', 'moderator'], required: true },
    fidelityScore: { type: Number, min: 1, max: 5, required: true },
    correctionText: { type: String, maxlength: 5000 },
    correctionRequired: { type: Boolean, default: false },
    userFeedback: { type: String, maxlength: 2000 },
    decision: { type: String, enum: ['reviewed', 'verified', 'rejected'], default: 'reviewed' },
    reviewedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('KnowledgeReview', knowledgeReviewSchema);
