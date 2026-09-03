// backend/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendVerificationCode } = require('../utils/mailer');

const router = express.Router();

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('Server misconfigured: JWT secret missing');
  }
  return jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function isStrongPassword(pw) {
  // At least 8 chars, one letter, one number. Kept simple/usable on
  // purpose (very long regex requirements just push people to reuse
  // passwords), but this blocks trivially weak passwords like "123456".
  return typeof pw === 'string' && pw.length >= 8 && /[A-Za-z]/.test(pw) && /[0-9]/.test(pw);
}

// Stricter rate limit specifically for auth endpoints (register/login/verify)
// to slow down credential-stuffing / brute-force attempts, on top of the
// global /api limiter in server.js.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { username, email, password, currency = 'PKR' } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }
    if (String(username).trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }
    if (!isStrongPassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters and include a letter and a number' });
    }

    const exists = await User.findOne({
      $or: [{ email: String(email).toLowerCase().trim() }, { username }],
    });
    if (exists) return res.status(400).json({ message: 'Username or email already exists' });

    const user = new User({
      username,
      email: String(email).toLowerCase().trim(),
      password,
      currency,
      emailVerified: false,
    });

    // create 6-digit code, 15 minutes expiry
    user.verificationCode = (Math.floor(100000 + Math.random() * 900000)).toString();
    user.verificationExpires = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    // send email (Brevo SMTP via utils/mailer.js)
    try {
      await sendVerificationCode({
        to: user.email,
        name: user.username,
        code: user.verificationCode,
      });
    } catch (e) {
      // you can still let the user continue verifying even if email fails
      console.error('Email send failed:', e.message);
    }

    // Return minimal info; do NOT log them in before verifying
    return res.json({
      message: 'Registered. Please verify your email.',
      userId: user._id,
      needsVerification: true,
    });
  } catch (e) {
    console.error('REGISTER error:', e);
    return res.status(500).json({ message: 'Registration failed' });
  }
});

// POST /api/auth/verify
router.post('/verify', authLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ message: 'email and code are required' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: 'Invalid email' });
    if (!user.verificationCode || !user.verificationExpires) {
      return res.status(400).json({ message: 'No verification pending' });
    }
    if (new Date() > new Date(user.verificationExpires)) {
      return res.status(400).json({ message: 'Verification code expired' });
    }
    if (String(code).trim() !== String(user.verificationCode)) {
      user.verificationAttempts = (user.verificationAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    user.emailVerified = true;
    user.verificationCode = undefined;
    user.verificationExpires = undefined;
    await user.save();

    const token = signToken(user);
    return res.json({
      message: 'Email verified',
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        balance: user.balance,
        currency: user.currency,
        emailVerified: user.emailVerified,
      },
    });
  } catch (e) {
    console.error('VERIFY error:', e);
    return res.status(500).json({ message: 'Verification failed' });
  }
});

// POST /api/auth/resend
router.post('/resend', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(400).json({ message: 'Invalid email' });
    if (user.emailVerified) return res.status(400).json({ message: 'Already verified' });

    user.verificationCode = (Math.floor(100000 + Math.random() * 900000)).toString();
    user.verificationExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    try {
      await sendVerificationCode({
        to: user.email,
        name: user.username,
        code: user.verificationCode,
      });
    } catch (e) {
      console.error('Resend email failed:', e.message);
    }

    return res.json({ message: 'Verification code resent' });
  } catch (e) {
    console.error('RESEND error:', e);
    return res.status(500).json({ message: 'Resend failed' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'email and password are required' });

    // Normalize email; explicitly select the password hash (because select:false).
    const user = await User.findOne({
      email: String(email).toLowerCase().trim(),
    }).select('+password');

    // Avoid user enumeration: same message for "not found" and "wrong password".
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    // Brute-force lockout check
    if (user.isLocked()) {
      const minsLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 60000);
      return res.status(423).json({
        message: `Too many failed attempts. Try again in ${minsLeft} minute(s).`,
      });
    }

    const ok = await user.matchPassword(password);
    if (!ok) {
      user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
      if (user.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
        user.failedLoginAttempts = 0;
      }
      await user.save();
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ message: 'This account has been banned. Contact support.' });
    }
    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'This account is suspended. Contact support.' });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ message: 'Email not verified', needsVerification: true });
    }

    // Successful login: reset lockout counters, record login metadata
    user.failedLoginAttempts = 0;
    user.lockUntil = null;
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    const token = signToken(user);
    // Re-fetch without password (or strip it)
    const safeUser = await User.findById(user._id).select('-password');

    return res.json({
      token,
      user: {
        _id: safeUser._id,
        username: safeUser.username,
        email: safeUser.email,
        role: safeUser.role,
        balance: safeUser.balance,
        currency: safeUser.currency,
        emailVerified: safeUser.emailVerified,
        status: safeUser.status,
      },
    });
  } catch (e) {
    console.error('LOGIN error:', e);
    return res.status(500).json({ message: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const u = await User.findById(req.user._id).select('-password');
    if (!u) return res.status(404).json({ message: 'User not found' });
    res.json(u);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load user' });
  }
});

// POST /api/auth/change-password (self-service, requires current password)
router.post('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'currentPassword and newPassword are required' });
    }
    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({ message: 'New password must be at least 8 characters and include a letter and a number' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const ok = await user.matchPassword(currentPassword);
    if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (e) {
    console.error('CHANGE PASSWORD error:', e);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

module.exports = router;
