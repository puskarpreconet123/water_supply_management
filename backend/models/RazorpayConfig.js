const mongoose = require('mongoose');

const razorpayConfigSchema = new mongoose.Schema({
  keyId: {
    type: String,
    required: true,
    trim: true
  },
  keySecret: {
    type: String,
    required: true,
    trim: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('RazorpayConfig', razorpayConfigSchema);
