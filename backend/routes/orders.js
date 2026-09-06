const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Order = require('../models/Order');
const { getServices, addOrder, getOrderStatus } = require('../utils/apiClient');
const { computeQuote, round, toNumber } = require('../utils/pricing');

const router = express.Router();

const isValidUrl = (str) => { try { new URL(str); return true; } catch { return false; } };

/**
 * POST /api/orders/quote
 * Body: { serviceId, quantity }
 * Returns the authoritative server-side customer price including 20% commission.
 */
router.post('/quote', protect, async (req, res) => {
  try {
    const serviceId = toNumber(req.body?.serviceId, 0);
    const quantity = toNumber(req.body?.quantity, 0);
    if (!serviceId || !quantity) {
      return res.status(400).json({ message: 'serviceId and quantity are required' });
    }

    const services = await getServices();
    const svc = Array.isArray(services)
      ? services.find((service) => toNumber(service.service) === serviceId)
      : null;
    if (!svc) return res.status(404).json({ message: 'Service not found' });

    const quote = computeQuote(svc, quantity);
    return res.json({
      serviceId,
      ...quote,
      min: toNumber(svc.min, 1),
      max: toNumber(svc.max, 1000000),
    });
  } catch (err) {
    const code = err?.status || 500;
    console.error('QUOTE error:', err?.message || err);
    return res.status(code).json({ message: err?.message || 'Failed to generate quote' });
  }
});

/**
 * POST /api/orders
 * Validates the request, computes exactly the same +20% quote as /quote,
 * places the vendor order, then charges the customer only after acceptance.
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
      ? services.find((service) => Number(service.service) === Number(serviceId))
      : null;
    if (!svc) return res.status(400).json({ message: 'Service not found' });

    const min = toNumber(svc.min, 1);
    const max = toNumber(svc.max, 1000000);
    const qty = toNumber(quantity, 0);
    if (qty < min || qty > max) {
      return res.status(400).json({ message: `Quantity must be between ${min} and ${max}` });
    }

    const quote = computeQuote(svc, qty);
    const cost = quote.totalUSD;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (toNumber(user.balance) < cost) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

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

    const apiOrderId =
      apiResp?.order ??
      apiResp?.order_id ??
      apiResp?.data?.order ??
      apiResp?.data?.order_id ??
      null;

    if (!apiOrderId) {
      const vendorMsg = apiResp?.error || apiResp?.message || apiResp?.status || 'Unknown vendor error';
      return res.status(502).json({ message: 'Vendor rejected order', vendor: vendorMsg });
    }

    user.balance = round(toNumber(user.balance) - cost, 3);
    await user.save();

    const newOrder = new Order({
      user: req.user._id,
      serviceId: Number(serviceId),
      serviceName: svc.name,
      quantity: qty,
      link,
      price: round(cost, 3),
      status: 'Pending',
      apiOrderId,
    });
    await newOrder.save();

    return res.json({
      message: 'Order created',
      order: newOrder,
      quote,
    });
  } catch (err) {
    console.error('Create order error:', err);
    return res.status(err?.status || 500).json({ message: err?.message || 'Failed to create order' });
  }
});

/**
 * GET /api/orders?page=&limit=
 */
router.get('/', protect, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const rows = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    return res.json({ items, hasMore });
  } catch (err) {
    console.error('LIST orders error:', err);
    return res.status(500).json({ message: 'Failed to list orders' });
  }
});

/**
 * POST /api/orders/status/batch
 */
router.post('/status/batch', protect, async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids)
      ? req.body.ids.map((value) => String(value)).filter(Boolean)
      : [];

    if (ids.length === 0) {
      return res.status(400).json({ message: 'ids array required' });
    }

    const own = await Order.find({
      user: req.user._id,
      apiOrderId: { $in: ids },
    }).select('_id apiOrderId status');

    const ownSet = new Set(own.map((order) => String(order.apiOrderId)));
    const safeIds = ids.filter((id) => ownSet.has(id));
    if (safeIds.length === 0) return res.json({ results: {} });

    const results = {};
    const updates = [];

    for (const id of safeIds) {
      try {
        const vendor = await getOrderStatus(id);
        const vendorStatus = String(vendor?.status || '').trim();
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
      } catch (err) {
        results[id] = {
          ok: false,
          error: err?.response?.data?.message || err?.message || 'Status fetch failed',
        };
      }
    }

    if (updates.length) await Order.bulkWrite(updates, { ordered: false });
    return res.json({ results });
  } catch (err) {
    console.error('STATUS BATCH error:', err);
    return res.status(500).json({ message: 'Failed to refresh statuses' });
  }
});

module.exports = router;
