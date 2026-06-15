const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
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
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'online', 'other'],
    default: 'cash'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String,
    trim: true
  }
});

module.exports = mongoose.model('Payment', paymentSchema);
