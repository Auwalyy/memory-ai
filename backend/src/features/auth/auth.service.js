const jwt = require('jsonwebtoken');
const User = require('./user.model');
const AppError = require('../../utils/AppError');
const logger = require('../../utils/logger');

const signAccessToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });

const signRefreshToken = (id) =>
  jwt.sign({ id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  });

const authService = {
  async register({ name, email, password }) {
    const existing = await User.findOne({ email });
    if (existing) throw new AppError('Email already registered', 409);

    const user = await User.create({ name, email, password });
    logger.info('New user registered', { userId: user._id, email });
    return user.toSafeObject();
  },

  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      throw new AppError('Invalid email or password', 401);
    }
    if (user.isBlocked) throw new AppError('Account suspended', 403);

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshToken = refreshToken;
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    logger.info('User logged in', { userId: user._id });
    return { user: user.toSafeObject(), accessToken, refreshToken };
  },

  async refreshTokens(token) {
    if (!token) throw new AppError('Refresh token required', 401);

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user || user.refreshToken !== token) {
      throw new AppError('Invalid refresh token', 401);
    }

    const accessToken = signAccessToken(user._id);
    const refreshToken = signRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  },

  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  },
};

module.exports = authService;
