// backend/routes/admin.js
const express = require('express');
const { protect } = require('../middleware/auth');
const { permit } = require('../middleware/roles');
const User = require('../models/User');
const Order = require('../models/Order');

const router = express.Router();

// All admin endpoints require auth + role: admin OR staff
router.use(protect, permit('admin', 'staff'));

/** GET /api/admin/stats */
router.get('/stats', async (_req, res) => {
  try {
    const [totalOrders, completedOrders, pendingOrders, processing, failed, canceled] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: { $regex: '^(completed|success)$', $options: 'i' } }),
      Order.countDocuments({ status: { $regex: '^pending$', $options: 'i' } }),
      Order.countDocuments({ status: { $regex: '^processing$', $options: 'i' } }),
      Order.countDocuments({ status: { $regex: '^failed$', $options: 'i' } }),
      Order.countDocuments({ status: { $regex: '^(canceled|cancelled)$', $options: 'i' } }),
    ]);

    res.json({
      totalOrders,
      completedOrders,
      pendingOrders,
      processingOrders: processing,
      failedOrders: failed,
      canceledOrders: canceled,
    });
  } catch (err) {
    res.status(500).json({ message: 'Failed to load stats' });
  }
});

/** GET /api/admin/users  -> returns ARRAY (matches your AdminDashboard) */
router.get('/users', async (_req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load users' });
  }
});

/** GET /api/admin/users/:id */
router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load user' });
  }
});

/** PUT /api/admin/users/:id  (update balance/role) */
router.put('/users/:id', async (req, res) => {
  try {
    const { balance, role } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (balance !== undefined) {
      const num = Number(balance);
      if (Number.isNaN(num) || num < 0) {
        return res.status(400).json({ message: 'Invalid balance value' });
      }
      user.balance = num;
    }
    if (role !== undefined) {
      const allowedRoles = ['user', 'staff', 'admin'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' });
      }
      user.role = role;
    }

    await user.save();
    const sanitized = await User.findById(user._id).select('-password');
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

/** GET /api/admin/orders  -> returns ARRAY (matches your AdminDashboard) */
router.get('/orders', async (req, res) => {
  try {
    const { q = '', status = '' } = req.query;
    const find = {};
    if (status) find.status = { $regex: `^${status}$`, $options: 'i' };

    const items = await Order.find(find)
      .populate('user', 'username email')
      .sort({ createdAt: -1 });

    const needle = q.toString().trim().toLowerCase();
    const filtered = needle
      ? items.filter(o =>
          (o.user?.username || '').toLowerCase().includes(needle) ||
          (o.user?.email || '').toLowerCase().includes(needle) ||
          (o.serviceName || '').toLowerCase().includes(needle) ||
          String(o.apiOrderId || '').toLowerCase().includes(needle) ||
          String(o._id || '').toLowerCase().includes(needle)
        )
      : items;

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load orders' });
  }
});

/** PUT /api/admin/orders/:id/status */
router.put('/orders/:id/status', async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ['pending', 'processing', 'completed', 'failed', 'canceled', 'cancelled', 'success'];
    if (!status || !allowed.includes(String(status).toLowerCase())) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    order.status = status;
    await order.save();

    const refreshed = await Order.findById(order._id).populate('user', 'username email');
    res.json({ message: 'Order status updated', order: refreshed });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

module.exports = router;
