// backend/models/Ticket.js
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: { type: String, required: true },
  },
  {
    _id: false,
    timestamps: { createdAt: true, updatedAt: false }, // -> message.createdAt
  }
);

const ticketSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    subject: { type: String, required: true },
    messages: [messageSchema],

    status: {
      type: String,
      enum: ['open', 'pending', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },
    priority: {
      type: String,
      enum: ['low', 'normal', 'high', 'urgent'],
      default: 'normal',
      index: true,
    },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    // unread badge for the receiving party (simple global flag)
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true } // -> ticket.createdAt / ticket.updatedAt
);

module.exports = mongoose.model('Ticket', ticketSchema);
