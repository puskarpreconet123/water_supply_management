const express = require('express');
const router = express.Router();
const {
  getSubscription,
  addProduct,
  getProducts,
  updateProduct,
  addCustomer,
  getCustomers,
  updateProfile,
  updateCustomerLedger,
  getVendorPlans,
  deleteProduct
} = require('../controllers/vendorController');
const { protect, authorize, checkSubscription } = require('../middleware/auth');

router.use(protect);
router.use(authorize('vendor'));

router.get('/subscription', getSubscription);
router.post('/products', checkSubscription, addProduct);
router.get('/products', getProducts);
router.put('/products/:id', checkSubscription, updateProduct);
router.delete('/products/:id', checkSubscription, deleteProduct);
router.post('/customers', checkSubscription, addCustomer);
router.get('/customers', getCustomers);
router.put('/customers/:customerId', checkSubscription, updateCustomerLedger);
router.put('/profile', updateProfile);

// Allow vendor to view subscription plans
router.get('/plans', getVendorPlans);

module.exports = router;

