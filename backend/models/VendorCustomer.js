const mongoose = require('mongoose');

const vendorCustomerSchema = new mongoose.Schema({
  vendorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  bottlesOutstanding: {
    type: Number,
    default: 0
  },
  balance: {
    type: Number,
    default: 0 // Positive: customer owes vendor, Negative: advance payment
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index so a customer can be linked to a vendor only once
vendorCustomerSchema.index({ vendorId: 1, customerId: 1 }, { unique: true });

module.exports = mongoose.model('VendorCustomer', vendorCustomerSchema);
