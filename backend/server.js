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

const authRoutes = require('./routes/auth');
const servicesRoutes = require('./routes/services');
const ordersRoutes = require('./routes/orders');
const ticketsRoutes = require('./routes/tickets');
const usersRoutes = require('./routes/users');
const staffRoutes = require('./routes/staff');
const adminRoutes = require('./routes/admin');
const siteRoutes = require('./routes/site');

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

const app = express();
app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    useDefaults: true,
    directives: {
      'default-src': ["'self'"],
      'img-src': ["'self'", 'data:', 'https:'],
      // AdSense requires Google scripts/frames. Inline script is permitted only
      // because admins can configure the official publisher snippet/slots.
      'script-src': ["'self'", "'unsafe-inline'", 'https://pagead2.googlesyndication.com', 'https://www.googletagservices.com'],
      'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      'font-src': ["'self'", 'data:', 'https://fonts.gstatic.com'],
      'connect-src': ["'self'", 'https:', 'https://pagead2.googlesyndication.com'],
      'frame-src': ["'self'", 'https://googleads.g.doubleclick.net', 'https://tpc.googlesyndication.com'],
      'object-src': ["'none'"],
      'frame-ancestors': ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
}));

const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean);
app.use(cors({ origin: corsOrigins.length ? corsOrigins : true, credentials: true }));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use(hpp());
app.use(xss());

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false });
app.use('/api', limiter);

app.use('/api/auth', authRoutes);
app.use('/api/services', servicesRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/site', siteRoutes);
// ads.txt must live at the site root for publisher verification.
app.get('/ads.txt', async (req, res, next) => {
  req.url = '/ads.txt';
  siteRoutes.handle(req, res, next);
});

app.get('/health', (_req, res) => res.json({ ok: true }));

if (process.env.NODE_ENV === 'production') {
  const distDir = path.join(__dirname, '../frontend/dist');
  app.use(express.static(distDir, { maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: status === 500 ? 'Internal server error' : (err.message || 'Something went wrong') });
});

const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  });

process.on('unhandledRejection', (err) => console.error('Unhandled promise rejection:', err));
