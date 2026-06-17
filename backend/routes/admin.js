const express = require('express');
const router = express.Router();
const {
  createPlan,
  getPlans,
  getVendors,
  assignSubscription,
  deletePlan,
  getAdminStats,
  updateVendor,
  deleteVendor,
  deleteAllVendors
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('admin'));

router.get('/stats', getAdminStats);
router.post('/plans', createPlan);
router.get('/plans', getPlans);
router.delete('/plans/:id', deletePlan);

// Vendor Management Routes
router.get('/vendors', getVendors);
router.put('/vendors/:id', updateVendor);
router.delete('/vendors', deleteAllVendors);
router.delete('/vendors/:id', deleteVendor);

router.post('/assign-subscription', assignSubscription);

module.exports = router;

