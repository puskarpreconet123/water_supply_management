const express = require('express');
const router = express.Router();
const {
  registerVendor,
  login,
  sendOtp,
  verifyOtp,
  registerCustomer,
  getMe
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register-vendor', registerVendor);
router.post('/login', login);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/register-customer', registerCustomer);
router.get('/me', protect, getMe);

module.exports = router;
