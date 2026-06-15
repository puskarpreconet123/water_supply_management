const express = require('express');
const router = express.Router();
const {
  createOrder,
  updateOrderStatus,
  recordPayment,
  getOrders,
  getPayments,
  exportPDFReport
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// PDF Export (Vendor only)
router.get('/pdf-report', authorize('vendor'), exportPDFReport);

// Logging payments (Vendor only)
router.post('/payments', authorize('vendor'), recordPayment);

// Update status (Vendor only)
router.put('/:id/status', authorize('vendor'), updateOrderStatus);

// Orders List & Details (Vendor & Customer)
router.post('/', authorize('vendor', 'customer'), createOrder);
router.get('/', authorize('vendor', 'customer'), getOrders);
router.get('/payments', authorize('vendor', 'customer'), getPayments);

module.exports = router;
