const express = require('express');
const router = express.Router();
const {
  getSubscription,
  addProduct,
  getProducts,
  updateProduct,
  addCustomer,
  getCustomers
} = require('../controllers/vendorController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);
router.use(authorize('vendor'));

router.get('/subscription', getSubscription);
router.post('/products', addProduct);
router.get('/products', getProducts);
router.put('/products/:id', updateProduct);
router.post('/customers', addCustomer);
router.get('/customers', getCustomers);

// Allow vendor to view subscription plans
const { getPlans } = require('../controllers/adminController');
router.get('/plans', getPlans);

module.exports = router;
