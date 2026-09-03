const mongoose = require('mongoose');

/**
 * Order schema tracks purchases made by a user. Each order references the
 * user who placed it, the service purchased, the quantity ordered, the
 * destination link and the price charged to the user (with markup). The
 * optional apiOrderId field stores the identifier returned by the remote
 * SMM API so that status updates can be queried later.
 */
const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  serviceId: {
    type: Number,
    required: true,
  },
  serviceName: {
    type: String,
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  link: {
    type: String,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    default: 'Pending',
  },
  apiOrderId: {
    type: Number,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Order', orderSchema);