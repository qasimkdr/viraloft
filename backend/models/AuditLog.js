// backend/models/AuditLog.js
const mongoose = require('mongoose');

/**
 * Tracks sensitive admin/staff actions (balance changes, role changes,
 * account suspensions, order status overrides, etc.) so there is always a
 * trail of who did what to which account and when.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorRole: { type: String },

    action: { type: String, required: true, index: true }, // e.g. 'user.balance.credit', 'user.role.update'
    targetType: { type: String, default: null }, // 'User' | 'Order' | 'Ticket'
    targetId: { type: mongoose.Schema.Types.ObjectId, default: null },

    details: { type: mongoose.Schema.Types.Mixed, default: {} },

    ip: { type: String, default: null },
  },
  { timestamps: true }
);

auditLogSchema.statics.record = async function (
  { actor, action, targetType = null, targetId = null, details = {}, ip = null }
) {
  try {
    await this.create({
      actor: actor?._id || actor,
      actorRole: actor?.role,
      action,
      targetType,
      targetId,
      details,
      ip,
    });
  } catch (e) {
    // Never let audit logging failures break the actual request
    console.error('[audit] failed to record log:', e.message);
  }
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
