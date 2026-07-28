const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');
const User = require('../features/auth/user.model');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    // Also accept token as query param for SSE endpoints (EventSource can't set headers)
    const queryToken = req.query.token;

    let token;
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (queryToken) {
      token = queryToken;
    } else {
      return next(new AppError('Authentication required', 401));
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) return next(new AppError('User no longer exists', 401));
    if (user.isBlocked) return next(new AppError('Account suspended', 403));

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Restrict access to specific roles.
 * @param {...string} roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

module.exports = { authenticate, authorize };
