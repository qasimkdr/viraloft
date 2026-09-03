const express = require('express');
const { protect } = require('../middleware/auth');
const { permit } = require('../middleware/roles');
const User = require('../models/User');

const router = express.Router();

// Get my profile
router.get('/profile', protect, async (req, res) => {
  res.json(req.user);
});

// Update my profile (username only, for now)
router.put('/profile', protect, async (req, res) => {
  const { username } = req.body;
  if (username) {
    if (String(username).trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }
    req.user.username = username;
  }
  await req.user.save();
  res.json(req.user);
});

// --- User Preferences (Currency) ---

// GET /api/users/prefs
router.get('/prefs', protect, async (req, res) => {
  res.json({ currency: req.user.currency || 'PKR' });
});

// PUT /api/users/prefs { currency }
router.put('/prefs', protect, async (req, res) => {
  const { currency } = req.body;
  const allowed = ['PKR', 'USD', 'AED', 'EUR'];
  if (!allowed.includes(currency)) {
    return res.status(400).json({ error: 'Unsupported currency' });
  }
  req.user.currency = currency;
  await req.user.save();
  res.json({ currency: req.user.currency });
});

/**
 * GET /api/users/search?q=
 * Staff/Admin only — lightweight lookup used by the support panel to find a
 * user by name, email, or ID (e.g. to reply/DM them, or jump to their
 * account in the admin panel).
 */
router.get('/search', protect, permit('admin', 'staff'), async (req, res) => {
  try {
    const q = String(req.query.q || '').trim();
    if (!q) return res.json([]);

    const isId = /^[a-f\d]{24}$/i.test(q);
    const find = isId
      ? { _id: q }
      : {
          $or: [
            { username: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } },
          ],
        };

    const users = await User.find(find).select('-password').limit(20);
    res.json(users);
  } catch (e) {
    res.status(500).json({ message: 'Search failed' });
  }
});

module.exports = router;
