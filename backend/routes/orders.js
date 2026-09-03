const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const { getServices, addOrder, getOrderStatus } = require('../utils/apiClient'); // + getOrderStatus

const router = express.Router();

// -------- Helpers --------
const isValidUrl = (str) => { try { new URL(str); return true; } catch { return false; } };
const roundN = (n, dp = 6) => Number(Number(n).toFixed(dp));
const toNum = (v, d = 0) => { const n = Number(v); return Number.isFinite(n) ? n : d; };
const lc = (s) => String(s || '').toLowerCase();

/**
 * Heuristic: detect per-item/package/software services
 */
const isPerItemService = (svc) => {
  const min = toNum(svc?.min, 1);
  const max = toNum(svc?.max, 1000);
  if (min === 1 && max === 1) return true;

  const t = lc(svc?.type);
  const n = lc(svc?.name);
  const c = lc(svc?.category);

  if (t.includes('package') || t.includes('software') || t.includes('license')) return true;
  if (n.includes('package') || n.includes('software') || n.includes('license')) return true;
  if (c.includes('package') || c.includes('software') || c.includes('license')) return true;

  return false;
};

/**
 * Compute a priced quote with +20% commission.
 * Returns: { quantity, rateType, baseRateUSD, basePriceUSD, commissionUSD, totalUSD, perUnitUSD }
 */
const computeQuote = (svc, requestedQty) => {
  const min = toNum(svc?.min, 1);
  const max = toNum(svc?.max, 1000000);
  const qty = Math.min(Math.max(toNum(requestedQty, 1), min), max);

  const baseRateUSD = toNum(svc?.rate, NaN); // vendor rate (USD)
  if (!Number.isFinite(baseRateUSD)) {
    const err = new Error('Invalid service rate');
    err.status = 400;
    throw err;
  }

  const perItem = isPerItemService(svc);
  const rateType = perItem ? 'per_item' : 'per_1000';

  let basePriceUSD;
  if (perItem) {
    basePriceUSD = baseRateUSD * qty;          // per item/package
  } else {
    basePriceUSD = baseRateUSD * (qty / 1000); // per 1000 units
  }

  const commissionUSD = roundN(basePriceUSD * 0.20); // +20%
  const totalUSD = roundN(basePriceUSD + commissionUSD);
  const perUnitUSD = roundN(totalUSD / qty);

  return {
    quantity: qty,
    rateType,
    baseRateUSD,
    basePriceUSD: roundN(basePriceUSD),
    commissionUSD,
    totalUSD,
    perUnitUSD,
  };
};

// -------- Routes --------

/**
 * POST /api/orders/quote
 * Body: { serviceId: Number, quantity: Number }
 * -> Returns computed price (incl. +20%).
 */
router.post('/quote', protect, async (req, res) => {
  try {
    const serviceId = toNum(req.body?.serviceId, 0);
    const quantity = toNum(req.body?.quantity, 0);
    if (!serviceId || !quantity) {
      return res.status(400).json({ message: 'serviceId and quantity are required' });
    }

    const services = await getServices();
    const svc = Array.isArray(services)
      ? services.find((s) => toNum(s.service) === serviceId)
      : null;
    if (!svc) return res.status(404).json({ message: 'Service not found' });

    const q = computeQuote(svc, quantity); // clamps to min/max internally
    return res.json({
      serviceId,
      ...q,
      min: toNum(svc.min, 1),
      max: toNum(svc.max, 1000000),
    });
  } catch (err) {
    const code = err?.status || 500;
    console.error('QUOTE error:', err?.message || err);
    return res.status(code).json({ message: err?.message || 'Failed to generate quote' });
  }
});

/**
 * POST /api/orders
 * Body: { serviceId, quantity, link, comments }
 * - Validates inputs
 * - Computes price (+20%) using the same logic as /quote
 * - Ensures balance, places vendor order, stores our Order with charged price
 * - If vendor rejects, return clear reason and DO NOT deduct balance
 */
router.post('/', protect, async (req, res) => {
  const { serviceId, quantity, link, comments } = req.body;

  if (!serviceId || !quantity || !link) {
    return res.status(400).json({ message: 'serviceId, quantity, and link are required' });
  }
  if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
    return res.status(400).json({ message: 'Invalid quantity' });
  }
  if (!isValidUrl(link)) {
    return res.status(400).json({ message: 'Invalid link URL' });
  }

  try {
    const services = await getServices();
    const svc = Array.isArray(services)
      ? services.find((s) => Number(s.service) === Number(serviceId))
      : null;
    if (!svc) return res.status(400).json({ message: 'Service not found' });

    // Enforce min/max
    const min = toNum(svc.min, 1);
    const max = toNum(svc.max, 1000000);
    const qty = toNum(quantity, 0);
    if (qty < min || qty > max) {
      return res.status(400).json({ message: `Quantity must be between ${min} and ${max}` });
    }

    // Compute price with +20% commission (server-side)
    const quote = computeQuote(svc, qty);
    const cost = quote.totalUSD;

    // Fetch user and verify balance
    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (toNum(user.balance) < cost) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // ---- Place order with vendor and propagate their errors clearly ----
    let apiResp;
    try {
      apiResp = await addOrder(serviceId, qty, link, comments);
    } catch (vendorErr) {
      const vendorMsg =
        vendorErr?.response?.data?.message ||
        vendorErr?.response?.data?.error ||
        vendorErr?.message ||
        'Vendor request failed';
      return res.status(502).json({ message: 'Vendor request failed', vendor: vendorMsg });
    }

    // Try to pull an order id from various vendor shapes
    const apiOrderId =
      apiResp?.order ??
      apiResp?.order_id ??
      apiResp?.data?.order ??
      apiResp?.data?.order_id ??
      null;

    if (!apiOrderId) {
      const vendorMsg =
        apiResp?.error ||
        apiResp?.message ||
        apiResp?.status ||
        'Unknown vendor error';
      return res.status(502).json({ message: 'Vendor rejected order', vendor: vendorMsg });
    }

    // Deduct balance & save order only after vendor accepted
    user.balance = roundN(toNum(user.balance) - cost, 3);
    await user.save();

    const newOrder = new Order({
      user: req.user._id,
      serviceId: Number(serviceId),
      serviceName: svc.name,
      quantity: qty,
      link,
      price: roundN(cost, 3),   // store the actual charged amount (incl. commission)
      status: 'Pending',
      apiOrderId,
    });
    await newOrder.save();

    res.json({
      message: 'Order created',
      order: newOrder,
      quote, // optional: FE can show the same numbers it confirmed
    });
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ message: 'Failed to create order' });
  }
});

/**
 * GET /api/orders?page=&limit=
 * Returns paginated orders for current user:
 * { items: Order[], hasMore: boolean }
 */
router.get('/', protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    // fetch limit+1 to detect more
    const rows = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;

    res.json({ items, hasMore });
  } catch (err) {
    console.error('LIST orders error:', err);
    res.status(500).json({ message: 'Failed to list orders' });
  }
});

/**
 * POST /api/orders/status/batch
 * Body: { ids: string[] }   // vendor order IDs (apiOrderId)
 * - Only checks orders owned by the current user
 * - Returns { results: { [apiOrderId]: { ok, status?, error? } } }
 * - Also updates our DB 'status' field for those orders
 */
router.post('/status/batch', protect, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((s) => String(s)).filter(Boolean)
      : [];

    if (ids.length === 0) {
      return res.status(400).json({ message: 'ids array required' });
    }

    // Restrict to user's own orders
    const own = await Order.find({
      user: req.user._id,
      apiOrderId: { $in: ids },
    }).select('_id apiOrderId status');

    const ownSet = new Set(own.map((o) => String(o.apiOrderId)));
    const safeIds = ids.filter((id) => ownSet.has(id));
    if (safeIds.length === 0) {
      return res.json({ results: {} });
    }

    const results = {};
    const updates = [];

    for (const id of safeIds) {
      try {
        const v = await getOrderStatus(id); // implement in utils/apiClient
        const vendorStatus = String(v?.status || '').trim();
        if (vendorStatus) {
          results[id] = { ok: true, status: vendorStatus };
          updates.push({
            updateOne: {
              filter: { user: req.user._id, apiOrderId: id },
              update: { $set: { status: vendorStatus } },
            },
          });
        } else {
          results[id] = { ok: false, error: 'No status in vendor response' };
        }
      } catch (e) {
        results[id] = {
          ok: false,
          error: e?.response?.data?.message || e?.message || 'Status fetch failed',
        };
      }
    }

    if (updates.length) {
      await Order.bulkWrite(updates, { ordered: false });
    }

    return res.json({ results });
  } catch (err) {
    console.error('STATUS BATCH error:', err);
    return res.status(500).json({ message: 'Failed to refresh statuses' });
  }
});

module.exports = router;
