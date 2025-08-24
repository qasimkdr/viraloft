// backend/middleware/roles.js

// Simple “permit” helper used by routes
module.exports.permit = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: insufficient privileges' });
      }
      next();
    } catch (e) {
      return res.status(500).json({ message: 'Role check failed' });
    }
  };
};

// Optional granular helpers (you already had these; kept for compatibility)
module.exports.requireStaff = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.role !== 'staff' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: staff only' });
  }
  next();
};

module.exports.requireAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: admin only' });
  }
  next();
};

module.exports.requireSelfOrStaff = (ownerIdGetter) => async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const ownerId = await ownerIdGetter(req);
    const isOwner = ownerId && ownerId.toString() === req.user._id.toString();
    const isStaff = req.user.role === 'staff' || req.user.role === 'admin';
    if (!isOwner && !isStaff) return res.status(403).json({ message: 'Forbidden' });
    next();
  } catch {
    return res.status(500).json({ message: 'Server error' });
  }
};

// Kept for callers that prefer requireRole([...])
module.exports.requireRole = (allowed = []) => {
  return (req, res, next) => {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
      if (!allowed.includes(req.user.role)) {
        return res.status(403).json({ message: 'Forbidden: insufficient privileges' });
      }
      next();
    } catch {
      return res.status(500).json({ message: 'Role check failed' });
    }
  };
};
