// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware that protects routes requiring authentication. If the request
 * contains a valid JWT token in the Authorization header, the user is
 * attached to the request object and processing continues. Otherwise the
 * request is rejected with a 401 Unauthorized error.
 */
const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'Not authorized, user no longer exists' });
      }

      // Block suspended/banned accounts from doing anything further, even
      // if they still hold a valid, unexpired JWT.
      if (user.status === 'banned') {
        return res.status(403).json({ message: 'This account has been banned. Contact support.' });
      }
      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'This account is suspended. Contact support.' });
      }

      req.user = user;
      return next();
    } catch (error) {
      if (error?.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Session expired, please log in again' });
      }
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  return res.status(401).json({ message: 'Not authorized, no token' });
};

module.exports = { protect };
