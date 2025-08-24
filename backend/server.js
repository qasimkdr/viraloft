// backend/server.js
require('dotenv').config();

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');
const xss = require('xss-clean');
const mongoose = require('mongoose');

// ---- Route imports (each exactly once) ----
const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const ordersRoutes = require('./routes/orders');
const ticketsRoutes = require('./routes/tickets');

// If routes/admin.js doesn't exist, don't crash
let adminRoutes = null;
try {
  // optional
  // eslint-disable-next-line global-require
  adminRoutes = require('./routes/admin');
} catch (_) {
  adminRoutes = null;
}

// ---- App ----
const app = express();

// ---- Security & perf middleware ----
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({ origin: true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitize & harden
app.use(mongoSanitize());
app.use(hpp());
app.use(xss());

// Basic rate limit for all /api routes
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// ---- Mount routes (no duplicates) ----
app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/tickets', ticketsRoutes);
if (adminRoutes) app.use('/api/admin', adminRoutes);

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---- Serve SPA in production (optional but recommended) ----
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// ---- DB & Server ----
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error('Missing MONGO_URI in .env');
  process.exit(1);
}

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });
