const express = require('express');
const router = express.Router();
const {
  getConnectedVendors,
  getVendorDetails
} = require('../controllers/customerController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('customer'));

router.get('/vendors', getConnectedVendors);
router.get('/vendors/:vendorId', getVendorDetails);

module.exports = router;
