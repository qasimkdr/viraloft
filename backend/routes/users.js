const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Get my profile (you already had this in your scaffold)
router.get('/profile', protect, async (req, res) => {
  res.json(req.user);
});

// Update my profile (optional pattern)
router.put('/profile', protect, async (req, res) => {
  const { username } = req.body;
  if (username) req.user.username = username;
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

module.exports = router;
