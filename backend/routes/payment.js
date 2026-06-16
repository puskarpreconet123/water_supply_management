const express = require('express');
const router = express.Router();
const {
  getPaymentConfig,
  savePaymentConfig,
  createRazorpayOrder,
  verifyRazorpayPayment,
  createCustomerOrder,
  verifyCustomerPayment
} = require('../controllers/paymentController');
const { protect, authorize } = require('../middleware/auth');

// Config routes (Admin only)
router.get('/config', protect, authorize('admin'), getPaymentConfig);
router.post('/config', protect, authorize('admin'), savePaymentConfig);

// Checkout routes (Vendor only)
router.post('/create-order', protect, authorize('vendor'), createRazorpayOrder);
router.post('/verify', protect, authorize('vendor'), verifyRazorpayPayment);

// Customer checkout to Vendor routes
router.post('/customer/create-order', protect, authorize('customer'), createCustomerOrder);
router.post('/customer/verify', protect, authorize('customer'), verifyCustomerPayment);

module.exports = router;
