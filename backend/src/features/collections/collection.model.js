const mongoose = require('mongoose');

const collectionSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Collection name is required'],
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      maxlength: 1000,
    },
    coverImage: String,
    isPublic: {
      type: Boolean,
      default: false,
    },
    itemCount: {
      type: Number,
      default: 0,
    },
    tags: [{ type: String, lowercase: true }],
  },
  {
    timestamps: true,
  }
);

collectionSchema.index({ owner: 1, createdAt: -1 });
collectionSchema.index({ isPublic: 1 });

module.exports = mongoose.model('Collection', collectionSchema);
