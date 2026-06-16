const express = require('express');
const router = express.Router();
const {
  getConnectedVendors,
  getVendorDetails,
  updateProfile,
  requestPhoneChange,
  verifyPhoneChange
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('customer'));

router.get('/vendors', getConnectedVendors);
router.get('/vendors/:vendorId', getVendorDetails);
router.put('/profile', updateProfile);
router.post('/change-phone-request', requestPhoneChange);
router.put('/change-phone-verify', verifyPhoneChange);

module.exports = router;
