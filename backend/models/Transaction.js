// backend/models/Transaction.js
const mongoose = require('mongoose');

/**
 * Records every change to a user's balance so admins (and the user) have a
 * full, auditable history: order charges, admin credits/debits, refunds, etc.
 */
const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: {
      type: String,
      enum: ['credit', 'debit'],
      required: true,
    },

    // Where the change came from
    source: {
      type: String,
      enum: ['admin_adjustment', 'order_charge', 'order_refund', 'other'],
      default: 'admin_adjustment',
    },

    amount: { type: Number, required: true }, // always positive; `type` gives direction
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },

    reason: { type: String, default: '' },

    // Who performed the action (admin), null for system-generated (order charges)
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transaction', transactionSchema);
