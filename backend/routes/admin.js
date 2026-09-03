// backend/routes/admin.js
const express = require('express');
const { protect } = require('../middleware/auth');
const { permit } = require('../middleware/roles');
const User = require('../models/User');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const Transaction = require('../models/Transaction');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// All admin endpoints require auth. Staff get read access to most of this
// panel (to help users); only admins can change balances, roles, account
// status, or create staff/admin accounts.
router.use(protect, permit('admin', 'staff'));
const adminOnly = permit('admin');

/** GET /api/admin/stats */
router.get('/stats', async (_req, res) => {
  try {
    const [
      totalOrders, completedOrders, pendingOrders, processing, failed, canceled,
      totalUsers, staffCount, adminCount, suspendedCount, bannedCount,
      openTickets, pendingTickets,
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: { $regex: '^(completed|success)$', $options: 'i' } }),
      Order.countDocuments({ status: { $regex: '^pending$', $options: 'i' } }),
      Order.countDocuments({ status: { $regex: '^processing$', $options: 'i' } }),
      Order.countDocuments({ status: { $regex: '^failed$', $options: 'i' } }),
      Order.countDocuments({ status: { $regex: '^(canceled|cancelled)$', $options: 'i' } }),
      User.countDocuments({}),
      User.countDocuments({ role: 'staff' }),
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ status: 'suspended' }),
      User.countDocuments({ status: 'banned' }),
      Ticket.countDocuments({ status: 'open' }),
      Ticket.countDocuments({ status: 'pending' }),
    ]);

    const revenueAgg = await Order.aggregate([
      { $match: { status: { $regex: '^(completed|success)$', $options: 'i' } } },
      { $group: { _id: null, total: { $sum: '$price' } } },
    ]);

    res.json({
      totalOrders,
      completedOrders,
      pendingOrders,
      processingOrders: processing,
      failedOrders: failed,
      canceledOrders: canceled,
      totalUsers,
      staffCount,
      adminCount,
      suspendedCount,
      bannedCount,
      openTickets,
      pendingTickets,
      totalRevenueUSD: revenueAgg[0]?.total || 0,
    });
  } catch (err) {
    console.error('STATS error:', err);
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

/**
 * GET /api/admin/users/:id/detail
 * Full 360° view of one account: profile, recent orders, recent tickets,
 * and recent balance transactions. This is what "check details of any
 * account — his orders, everything" resolves to in the admin panel.
 */
router.get('/users/:id/detail', async (req, res) => {
  try {
    const userId = req.params.id;
    const [user, orders, tickets, transactions, orderStats] = await Promise.all([
      User.findById(userId).select('-password'),
      Order.find({ user: userId }).sort({ createdAt: -1 }).limit(25),
      Ticket.find({ user: userId }).sort({ updatedAt: -1 }).limit(25),
      Transaction.find({ user: userId }).sort({ createdAt: -1 }).limit(50).populate('performedBy', 'username role'),
      Order.aggregate([
        { $match: { user: new (require('mongoose').Types.ObjectId)(userId) } },
        { $group: { _id: null, count: { $sum: 1 }, totalSpentUSD: { $sum: '$price' } } },
      ]),
    ]);

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json({
      user,
      orders,
      tickets,
      transactions,
      summary: {
        totalOrders: orderStats[0]?.count || 0,
        totalSpentUSD: orderStats[0]?.totalSpentUSD || 0,
      },
    });
  } catch (err) {
    console.error('USER DETAIL error:', err);
    res.status(500).json({ message: 'Failed to load account details' });
  }
});

/** PUT /api/admin/users/:id  (update balance/role) — ADMIN ONLY (legacy direct-set, kept for compatibility) */
router.put('/users/:id', adminOnly, async (req, res) => {
  try {
    const { balance, role } = req.body || {};
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (String(user._id) === String(req.user._id) && role && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot change your own role' });
    }

    const before = { balance: user.balance, role: user.role };

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

    await AuditLog.record({
      actor: req.user,
      action: 'user.update',
      targetType: 'User',
      targetId: user._id,
      details: { before, after: { balance: user.balance, role: user.role } },
      ip: req.ip,
    });

    const sanitized = await User.findById(user._id).select('-password');
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

/**
 * POST /api/admin/users/:id/balance
 * Body: { amount: number, type: 'credit'|'debit', reason: string }
 * ADMIN ONLY — the correct way to add/remove balance: keeps a full
 * transaction history + audit log entry instead of silently overwriting
 * the number.
 */
router.post('/users/:id/balance', adminOnly, async (req, res) => {
  try {
    const { amount, type, reason = '' } = req.body || {};
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }
    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({ message: 'type must be "credit" or "debit"' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const balanceBefore = Number(user.balance || 0);
    let balanceAfter;

    if (type === 'credit') {
      balanceAfter = Number((balanceBefore + num).toFixed(3));
    } else {
      if (num > balanceBefore) {
        return res.status(400).json({ message: 'Cannot debit more than the current balance' });
      }
      balanceAfter = Number((balanceBefore - num).toFixed(3));
    }

    user.balance = balanceAfter;
    await user.save();

    const tx = await Transaction.create({
      user: user._id,
      type,
      source: 'admin_adjustment',
      amount: num,
      balanceBefore,
      balanceAfter,
      reason,
      performedBy: req.user._id,
    });

    await AuditLog.record({
      actor: req.user,
      action: `user.balance.${type}`,
      targetType: 'User',
      targetId: user._id,
      details: { amount: num, reason, balanceBefore, balanceAfter },
      ip: req.ip,
    });

    const sanitized = await User.findById(user._id).select('-password');
    res.json({ message: 'Balance updated', user: sanitized, transaction: tx });
  } catch (err) {
    console.error('BALANCE ADJUST error:', err);
    res.status(500).json({ message: 'Failed to adjust balance' });
  }
});

/**
 * PUT /api/admin/users/:id/status
 * Body: { status: 'active'|'suspended'|'banned', reason? }
 * ADMIN ONLY — suspend/ban/reactivate an account.
 */
router.put('/users/:id/status', adminOnly, async (req, res) => {
  try {
    const { status, reason = '' } = req.body || {};
    const allowed = ['active', 'suspended', 'banned'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (String(user._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot change your own account status' });
    }
    if (user.role === 'admin' && status !== 'active') {
      return res.status(400).json({ message: 'Cannot suspend/ban another admin from this panel' });
    }

    const before = user.status;
    user.status = status;
    user.statusReason = reason || null;
    await user.save();

    await AuditLog.record({
      actor: req.user,
      action: 'user.status.update',
      targetType: 'User',
      targetId: user._id,
      details: { before, after: status, reason },
      ip: req.ip,
    });

    const sanitized = await User.findById(user._id).select('-password');
    res.json({ message: 'Account status updated', user: sanitized });
  } catch (err) {
    console.error('STATUS UPDATE error:', err);
    res.status(500).json({ message: 'Failed to update account status' });
  }
});

/**
 * POST /api/admin/staff
 * Body: { username, email, password, role: 'staff'|'admin' }
 * ADMIN ONLY — create a new staff/admin account directly (no email
 * verification flow needed since the admin is vouching for them).
 */
router.post('/staff', adminOnly, async (req, res) => {
  try {
    const { username, email, password, role = 'staff' } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email and password are required' });
    }
    if (!['staff', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'role must be "staff" or "admin"' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    const exists = await User.findOne({
      $or: [{ email: String(email).toLowerCase().trim() }, { username }],
    });
    if (exists) return res.status(400).json({ message: 'Username or email already exists' });

    const user = new User({
      username,
      email: String(email).toLowerCase().trim(),
      password,
      role,
      emailVerified: true, // admin-created accounts are trusted immediately
    });
    await user.save();

    await AuditLog.record({
      actor: req.user,
      action: 'staff.create',
      targetType: 'User',
      targetId: user._id,
      details: { username, email: user.email, role },
      ip: req.ip,
    });

    const sanitized = await User.findById(user._id).select('-password');
    res.json({ message: 'Account created', user: sanitized });
  } catch (err) {
    console.error('STAFF CREATE error:', err);
    res.status(500).json({ message: 'Failed to create account' });
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

    const before = order.status;
    order.status = status;
    await order.save();

    await AuditLog.record({
      actor: req.user,
      action: 'order.status.update',
      targetType: 'Order',
      targetId: order._id,
      details: { before, after: status },
      ip: req.ip,
    });

    const refreshed = await Order.findById(order._id).populate('user', 'username email');
    res.json({ message: 'Order status updated', order: refreshed });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update order status' });
  }
});

/**
 * GET /api/admin/audit-logs
 * ADMIN ONLY — recent sensitive actions taken across the panel.
 */
router.get('/audit-logs', adminOnly, async (req, res) => {
  try {
    const limit = Math.min(200, Math.max(1, parseInt(req.query.limit, 10) || 100));
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('actor', 'username role');
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to load audit logs' });
  }
});

module.exports = router;
