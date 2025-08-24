// backend/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    // Make the hash non-selectable by default (safer).
    // We will explicitly select it only when needed (login).
    password: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'staff'],
      default: 'user',
    },
    balance: {
      type: Number,
      default: 0,
    },
    currency: {
      type: String,
      enum: ['PKR', 'USD', 'AED', 'EUR'],
      default: 'PKR',
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },

    // --- Email verification ---
    emailVerified: { type: Boolean, default: false },
    verificationCode: { type: String, default: null },   // 6-digit code (short-lived)
    verificationExpires: { type: Date, default: null },  // expiry time
    verificationAttempts: { type: Number, default: 0 },  // throttle attempts
  },
  {
    // ensure virtuals & transforms apply to both JSON/Object
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.verificationCode;     // never leak codes
        return ret;
      },
    },
    toObject: {
      transform(doc, ret) {
        delete ret.password;
        delete ret.verificationCode;
        return ret;
      },
    },
  }
);

// Hash password if it was created/changed
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (e) {
    next(e);
  }
});

// Compare a candidate password with the stored hash
userSchema.methods.matchPassword = function (candidate) {
  // this.password is available only when selected explicitly
  return bcrypt.compare(candidate, this.password);
};

// Helper: set a new verification code + expiry (e.g., 15 minutes)
userSchema.methods.setVerificationCode = function (code, ttlMinutes = 15) {
  this.verificationCode = code;
  this.verificationExpires = new Date(Date.now() + ttlMinutes * 60 * 1000);
  this.verificationAttempts = 0;
};

// Helper: clear verification state (after success)
userSchema.methods.clearVerification = function () {
  this.emailVerified = true;
  this.verificationCode = null;
  this.verificationExpires = null;
  this.verificationAttempts = 0;
};

module.exports = mongoose.model('User', userSchema);
