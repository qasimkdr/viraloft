// backend/routes/services.js
const express = require('express');
const { protect } = require('../middleware/auth');
const { getServices } = require('../utils/apiClient');
const { priceService } = require('../utils/pricing');

const router = express.Router();

const safeStatus = (err) => (Number(err?.status) === 503 ? 503 : 502);
const normalizedCategory = (service) => String(service?.category || 'Other').trim() || 'Other';

const filterServices = (services, query = '', category = '') => {
  let filtered = Array.isArray(services) ? services : [];

  if (category && category !== 'All') {
    const target = String(category).trim().toLowerCase();
    filtered = filtered.filter((service) => normalizedCategory(service).toLowerCase() === target);
  }

  if (query) {
    const needle = String(query).trim().toLowerCase();
    filtered = filtered.filter((service) =>
      String(service?.name || '').toLowerCase().includes(needle) ||
      String(service?.service || '').toLowerCase().includes(needle) ||
      normalizedCategory(service).toLowerCase().includes(needle)
    );
  }

  return filtered;
};

const pageServices = (services, offset = 0, limit = 50) => {
  const off = Math.max(0, parseInt(offset, 10) || 0);
  const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
  return services.slice(off, off + lim);
};

const getCategories = (services) => [
  'All',
  ...Array.from(new Set((Array.isArray(services) ? services : []).map(normalizedCategory))).sort(),
];

/**
 * GET /api/services/categories (protected)
 * Returns all categories from one cached vendor catalog request.
 */
router.get('/categories', protect, async (req, res) => {
  try {
    const services = await getServices();
    return res.json(getCategories(services));
  } catch (err) {
    console.error('GET /api/services/categories error:', err.message);
    return res.status(safeStatus(err)).json({ message: err.message || 'Failed to fetch service categories' });
  }
});

/**
 * GET /api/services/public/categories (public)
 */
router.get('/public/categories', async (req, res) => {
  try {
    const services = await getServices();
    return res.json(getCategories(services));
  } catch (err) {
    console.error('GET /api/services/public/categories error:', err.message);
    return res.status(safeStatus(err)).json({ message: err.message || 'Failed to fetch service categories' });
  }
});

/**
 * GET /api/services (protected)
 * Every returned service contains `markupRate`, the authoritative customer
 * display rate with Viraloft's 20% commission already applied once.
 */
router.get('/', protect, async (req, res) => {
  try {
    const { q = '', category = '', offset = 0, limit = 50 } = req.query;
    const services = await getServices();
    const filtered = filterServices(services, q, category).map(priceService);
    return res.json(pageServices(filtered, offset, limit));
  } catch (err) {
    console.error('GET /api/services error:', err.message);
    return res.status(safeStatus(err)).json({ message: err.message || 'Failed to fetch services' });
  }
});

/**
 * GET /api/services/public (public)
 * Raw vendor cost is intentionally hidden. `markupRate` is the customer rate
 * after the same 20% commission used by order quotes and checkout.
 */
router.get('/public', async (req, res) => {
  try {
    const { q = '', category = '', offset = 0, limit = 50 } = req.query;
    const services = await getServices();
    const filtered = filterServices(services, q, category).map((service) => {
      const priced = priceService(service);
      return {
        service: priced.service,
        name: priced.name,
        category: normalizedCategory(priced),
        type: priced.type,
        min: priced.min,
        max: priced.max,
        markupRate: priced.markupRate,
        commissionPercent: priced.commissionPercent,
      };
    });

    return res.json(pageServices(filtered, offset, limit));
  } catch (err) {
    console.error('GET /api/services/public error:', err.message);
    return res.status(safeStatus(err)).json({ message: err.message || 'Failed to fetch services' });
  }
});

module.exports = router;
