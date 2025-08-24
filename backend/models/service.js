// backend/models/Service.js
const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    category: { type: String, index: true },
    rate: { type: Number, required: true }, // per 1000 or per unit
    min: { type: Number, default: 0 },
    max: { type: Number, default: 0 },
    active: { type: Boolean, default: true, index: true },
    provider: { type: String }, // optional: which upstream panel
    // add any fields you already had
  },
  { timestamps: true }
);

module.exports = mongoose.model('Service', serviceSchema);
