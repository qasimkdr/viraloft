// backend/routes/tickets.js
const express = require('express');
const { protect } = require('../middleware/auth');
const Ticket = require('../models/Ticket');

const router = express.Router();

const isStaff = (u) => {
  const r = String(u?.role || '').toLowerCase();
  return r === 'admin' || r === 'staff';
};

const toLower = (v) => (typeof v === 'string' ? v.toLowerCase() : v);

/**
 * Create ticket
 * Body: { subject, message, priority? }
 */
router.post('/', protect, async (req, res) => {
  const { subject, message, priority = 'normal' } = req.body || {};
  if (!subject || !message) {
    return res.status(400).json({ message: 'Subject and message are required' });
  }
  try {
    const t = await Ticket.create({
      user: req.user._id,
      subject,
      status: 'open',
      priority: toLower(priority) || 'normal',
      isRead: false, // unread for staff by default
      messages: [{ sender: req.user._id, text: message }],
    });
    res.json({ message: 'Ticket created', ticket: t });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to create ticket' });
  }
});

/**
 * List tickets with filters + pagination + stats
 * Query (staff):
 *  - scope=all|my
 *  - q, status, priority, assignedTo
 *  - page, limit
 * Query (user): scope forced to "my" (own tickets), other filters ignored
 *
 * Returns: { items, page, limit, total, hasMore, stats }
 */
router.get('/', protect, async (req, res) => {
  try {
    const staff = isStaff(req.user);

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;

    const scope = staff ? String(req.query.scope || 'all').toLowerCase() : 'my';
    const q = String(req.query.q || '').trim();
    const status = toLower(req.query.status || '');
    const priority = toLower(req.query.priority || '');
    const assignedTo = String(req.query.assignedTo || '').trim();

    // Base query
    const query = {};
    if (!staff) {
      query.user = req.user._id;
    } else if (scope === 'my') {
      query.assignedTo = req.user._id;
    }

    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (assignedTo) query.assignedTo = assignedTo;

    if (q) {
      query.$or = [
        { subject: { $regex: q, $options: 'i' } },
        { 'messages.text': { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      Ticket.find(query)
        .populate('user', 'username email')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Ticket.countDocuments(query),
    ]);

    // Stats across the same scope (but without status filter so badges make sense)
    const baseForStats = { ...query };
    delete baseForStats.status;

    const [openCount, pendingCount, resolvedCount, unreadCount, mineCount] = await Promise.all([
      Ticket.countDocuments({ ...baseForStats, status: 'open' }),
      Ticket.countDocuments({ ...baseForStats, status: 'pending' }),
      Ticket.countDocuments({ ...baseForStats, status: 'resolved' }),
      Ticket.countDocuments({ ...baseForStats, isRead: false }),
      staff ? Ticket.countDocuments({ ...baseForStats, assignedTo: req.user._id }) : Promise.resolve(0),
    ]);

    res.json({
      items,
      page,
      limit,
      total,
      hasMore: skip + items.length < total,
      stats: {
        total,
        open: openCount,
        pending: pendingCount,
        resolved: resolvedCount,
        unread: unreadCount,
        mine: mineCount,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load tickets' });
  }
});

/**
 * Get single ticket (owner or staff)
 */
router.get('/:id', protect, async (req, res) => {
  try {
    const t = await Ticket.findById(req.params.id).populate('user', 'username email');
    if (!t) return res.status(404).json({ message: 'Ticket not found' });

    const staff = isStaff(req.user);
    const owner = String(t.user?._id || t.user) === String(req.user._id);
    if (!staff && !owner) return res.status(403).json({ message: 'Forbidden' });

    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to load ticket' });
  }
});

/**
 * Add message (owner or staff)
 * Body: { text }
 */
router.post('/:id/message', protect, async (req, res) => {
  const { text } = req.body || {};
  if (!text) return res.status(400).json({ message: 'Message text required' });

  try {
    const t = await Ticket.findById(req.params.id);
    if (!t) return res.status(404).json({ message: 'Ticket not found' });

    const staff = isStaff(req.user);
    const owner = String(t.user) === String(req.user._id);
    if (!staff && !owner) return res.status(403).json({ message: 'Forbidden' });

    t.messages.push({ sender: req.user._id, text });
    t.isRead = false; // mark unread for the other party
    if (staff && t.status === 'open') t.status = 'pending';
    t.updatedAt = new Date();
    await t.save();

    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to add message' });
  }
});

/**
 * Update ticket (staff only)
 * Body: any of { status, priority, isRead, assignedTo }
 */
router.patch('/:id', protect, async (req, res) => {
  if (!isStaff(req.user)) return res.status(403).json({ message: 'Forbidden' });

  const updates = {};
  const allowedStatus = ['open', 'pending', 'resolved', 'closed'];
  const allowedPriority = ['low', 'normal', 'high', 'urgent'];

  if (req.body.status) {
    const s = toLower(req.body.status);
    if (!allowedStatus.includes(s)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    updates.status = s;
  }
  if (req.body.priority) {
    const p = toLower(req.body.priority);
    if (!allowedPriority.includes(p)) {
      return res.status(400).json({ message: 'Invalid priority' });
    }
    updates.priority = p;
  }
  if (typeof req.body.isRead !== 'undefined') {
    updates.isRead = !!req.body.isRead;
  }
  if (Object.prototype.hasOwnProperty.call(req.body, 'assignedTo')) {
    updates.assignedTo = req.body.assignedTo || null;
  }

  if (!Object.keys(updates).length) {
    return res.status(400).json({ message: 'No valid fields to update' });
  }

  try {
    updates.updatedAt = new Date();
    const t = await Ticket.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!t) return res.status(404).json({ message: 'Ticket not found' });
    res.json(t);
  } catch (err) {
    res.status(500).json({ message: err.message || 'Failed to update ticket' });
  }
});

module.exports = router;
