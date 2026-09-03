const express = require('express');
const { protect } = require('../middleware/auth');
const { permit } = require('../middleware/roles');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

const router = express.Router();

// Apply authentication and role check to all staff routes. Both staff
// and admins can access these endpoints.
router.use(protect, permit('staff', 'admin'));

/**
 * List all orders that are not yet completed/cancelled/failed. Staff can
 * use this endpoint to see what needs to be processed. Each order includes
 * basic user info for context.
 */
router.get('/orders', async (req, res) => {
  const orders = await Order.find({
    status: { $not: { $regex: '^(completed|success|cancel+ed|failed)$', $options: 'i' } },
  })
    .populate('user', 'username email')
    .sort({ createdAt: -1 });
  res.json(orders);
});

/**
 * Update the status of an order. Staff can mark orders as completed
 * or cancelled. This does not automatically communicate with the
 * remote API; for cancellations you may need to call the cancel
 * action separately via the utils/apiClient.
 */
router.put('/orders/:id', async (req, res) => {
  const { status } = req.body;
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
  res.json(refreshed);
});

/**
 * List all open/pending tickets. Staff can use this to see support
 * requests awaiting a response. Tickets include the user who opened them.
 * (For full filtering/pagination/assignment, use GET /api/tickets instead —
 * this endpoint is kept for backward compatibility.)
 */
router.get('/tickets', async (req, res) => {
  const tickets = await Ticket.find({ status: { $in: ['open', 'pending'] } })
    .populate('user', 'username email')
    .sort({ updatedAt: -1 });
  res.json(tickets);
});

/**
 * POST /api/staff/messages
 * Body: { userId, text, subject? }
 * Lets staff/admin proactively message a specific user (e.g. from the
 * "Direct Message a User" panel in Support). Implemented as a new support
 * ticket opened on the user's behalf and pre-assigned to the sender, so it
 * shows up in the normal ticket inbox for both sides.
 */
router.post('/messages', async (req, res) => {
  try {
    const { userId, text, subject = 'Message from Support' } = req.body || {};
    if (!userId || !text) {
      return res.status(400).json({ message: 'userId and text are required' });
    }
    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: 'User not found' });

    const ticket = await Ticket.create({
      user: target._id,
      subject,
      status: 'pending',
      priority: 'normal',
      assignedTo: req.user._id,
      isRead: true, // already "read" from staff's perspective; unread for the user
      messages: [{ sender: req.user._id, text }],
    });

    await AuditLog.record({
      actor: req.user,
      action: 'user.message.send',
      targetType: 'User',
      targetId: target._id,
      details: { ticketId: ticket._id, subject },
      ip: req.ip,
    });

    res.json({ message: 'Message sent', ticket });
  } catch (err) {
    console.error('STAFF MESSAGE error:', err);
    res.status(500).json({ message: 'Failed to send message' });
  }
});

module.exports = router;
