const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../../config/constants');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.USER,
    },
    avatar: String,
    bio: { type: String, maxlength: 500 },
    language: { type: String, default: 'english' },
    isBlocked: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    refreshToken: { type: String, select: false },
    lastLoginAt: Date,
    contributionCount: { type: Number, default: 0 },
    // Personalization (Feature 1 & 2)
    preferredLanguage: { type: String, default: 'english' },
    interests: {
      type: [String],
      enum: ['history', 'folktales', 'proverbs', 'culture', 'education', 'medicine', 'agriculture', 'music'],
      default: [],
    },
    accessibility: {
      fontSize: { type: String, enum: ['normal', 'large', 'xlarge'], default: 'normal' },
      textToSpeech: { type: Boolean, default: false },
      theme: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// email already indexed via unique:true on the field — no duplicate needed
userSchema.index({ role: 1 });

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function () {
  const obj = this.toObject({ virtuals: false });
  delete obj.password;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
