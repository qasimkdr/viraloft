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
const usersRoutes = require('./routes/users');
const staffRoutes = require('./routes/staff');
const adminRoutes = require('./routes/admin');

// ---- Fail fast on missing critical config (clear error instead of a
// silent 500 on every request) ----
const REQUIRED_ENV = ['MONGO_URI', 'JWT_SECRET'];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing required environment variable(s): ${missing.join(', ')}`);
  console.error('Copy backend/.env.example to backend/.env and fill in the values.');
  process.exit(1);
}
if (!process.env.SMM_API_URL || !process.env.SMM_API_KEY) {
  console.warn('[startup] SMM_API_URL / SMM_API_KEY not set — services/orders endpoints will return 503 until configured.');
}

// ---- App ----
const app = express();

// Behind a proxy (Render/Heroku/nginx) — enable this so rate limiting & req.ip work correctly
app.set('trust proxy', 1);

// ---- Security & perf middleware ----
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        'default-src': ["'self'"],
        'img-src': ["'self'", 'data:', 'https:'],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
        'connect-src': ["'self'", 'https:'],
        'object-src': ["'none'"],
        'frame-ancestors': ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  })
);

// CORS: reflect only an explicit allow-list in production. Falls back to
// allow-all in development so the Vite dev server keeps working out of the
// box. Set CORS_ORIGIN="https://yourdomain.com,https://admin.yourdomain.com"
// in production.
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitize & harden
app.use(mongoSanitize());
app.use(hpp());
app.use(xss());

// Basic rate limit for all /api routes (after trust proxy). Auth routes
// additionally have their own tighter limiter (see routes/auth.js).
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
app.use('/api/users', usersRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);

// Healthcheck
app.get('/health', (_req, res) => res.json({ ok: true }));

// ---- Serve SPA in production (optional but recommended) ----
if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distDir));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

// ---- 404 handler for unmatched /api routes ----
app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));

// ---- Centralized error handler (last) ----
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    message: status === 500 ? 'Internal server error' : (err.message || 'Something went wrong'),
  });
});

// ---- DB & Server ----
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

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

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
});
