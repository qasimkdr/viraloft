const express = require('express');
const { protect } = require('../middleware/auth');
const { permit } = require('../middleware/roles');
const Order = require('../models/Order');
const Ticket = require('../models/Ticket');

const router = express.Router();

// Apply authentication and role check to all staff routes. Both staff
// and admins can access these endpoints.
router.use(protect, permit('staff', 'admin'));

/**
 * List all orders that are not yet completed. Staff can use this
 * endpoint to see what needs to be processed. Each order includes
 * basic user info for context.
 */
router.get('/orders', async (req, res) => {
  const orders = await Order.find({ status: { $ne: 'Completed' } }).populate('user', 'username email');
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
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.status = status;
  await order.save();
  res.json(order);
});

/**
 * List all open tickets. Staff can use this to see support requests
 * awaiting a response. Tickets include the user who opened them.
 */
router.get('/tickets', async (req, res) => {
  const tickets = await Ticket.find({ status: 'open' }).populate('user', 'username email');
  res.json(tickets);
});

module.exports = router;