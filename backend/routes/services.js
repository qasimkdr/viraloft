// backend/routes/services.js
const express = require('express');
const { protect } = require('../middleware/auth');
const { getServices } = require('../utils/apiClient');

const router = express.Router();

/**
 * GET /api/services  (protected)
 * Query:
 *  - q: search text (optional)
 *  - category: exact category match (optional)
 *  - offset: number (default 0)
 *  - limit: number (default 50; max 200)
 *
 * Adds 20% markup -> returns field `markupRate` (per 1000).
 */
router.get('/', protect, async (req, res) => {
  try {
    const {
      q = '',
      category = '',
      offset = 0,
      limit = 50,
    } = req.query;

    const all = await getServices();

    // Ensure we have an array to work with
    const services = Array.isArray(all) ? all : [];

    // filter by category
    let filtered = services;
    if (category) {
      const c = String(category).toLowerCase();
      filtered = filtered.filter((s) => String(s.category || '').toLowerCase() === c);
    }

    // filter by query (case-insensitive for both fields)
    if (q) {
      const needle = String(q).toLowerCase();
      filtered = filtered.filter((s) =>
        String(s.name || '').toLowerCase().includes(needle) ||
        String(s.service || '').toLowerCase().includes(needle)
      );
    }

    // apply +20% markup and keep original rate too
    const withMarkup = filtered.map((s) => {
      const rate = Number(s.rate || 0);
      const markupRate = Number((rate * 1.2).toFixed(3)); // per 1000
      return { ...s, rate, markupRate };
    });

    // paging
    const off = Math.max(0, parseInt(offset, 10) || 0);
    const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    const slice = withMarkup.slice(off, off + lim);

    res.json(slice);
  } catch (err) {
    console.error('GET /api/services error:', err.message);
    res.status(502).json({ message: 'Failed to fetch services' });
  }
});

/**
 * GET /api/services/public  (no auth)
 * Same filters + adds 20% markup.
 * Exposes only safe/public fields.
 */
router.get('/public', async (req, res) => {
  try {
    const { q = '', category = '', offset = 0, limit = 50 } = req.query;
    const all = await getServices();
    let filtered = Array.isArray(all) ? all : [];

    if (category) {
      const c = String(category).toLowerCase();
      filtered = filtered.filter(s => String(s.category || '').toLowerCase() === c);
    }
    if (q) {
      const needle = String(q).toLowerCase();
      filtered = filtered.filter(s =>
        String(s.name || '').toLowerCase().includes(needle) ||
        String(s.service || '').toLowerCase().includes(needle)
      );
    }

    const withMarkup = filtered.map(s => {
      const rate = Number(s.rate || 0);
      const markupRate = Number((rate * 1.2).toFixed(3)); // per 1000
      return {
        service: s.service,
        name: s.name,
        category: s.category,
        type: s.type,
        min: s.min,
        max: s.max,
        markupRate,
      };
    });

    const off = Math.max(0, parseInt(offset, 10) || 0);
    const lim = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
    res.json(withMarkup.slice(off, off + lim));
  } catch (err) {
    console.error('GET /api/services/public error:', err.message);
    res.status(502).json({ message: 'Failed to fetch services' });
  }
});

module.exports = router;
