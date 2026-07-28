const mongoose = require('mongoose');

const bookmarkSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
  },
  { timestamps: true }
);

bookmarkSchema.index({ user: 1, story: 1 }, { unique: true });

module.exports = mongoose.model('Bookmark', bookmarkSchema);
