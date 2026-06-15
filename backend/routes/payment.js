const express = require('express');
const router = express.Router();
const {
  getPaymentConfig,
  savePaymentConfig,
  createRazorpayOrder,
  verifyRazorpayPayment
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// Config routes (Admin only)
router.get('/config', protect, authorize('admin'), getPaymentConfig);
router.post('/config', protect, authorize('admin'), savePaymentConfig);

// Checkout routes (Vendor only)
router.post('/create-order', protect, authorize('vendor'), createRazorpayOrder);
router.post('/verify', protect, authorize('vendor'), verifyRazorpayPayment);

module.exports = router;
