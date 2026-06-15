const Order = require('../models/Order');
const Payment = require('../models/Payment');
const VendorCustomer = require('../models/VendorCustomer');
const User = require('../models/User');
const Product = require('../models/Product');
const { generateReportPDF } = require('../utils/pdfGenerator');

// @desc    Create an Order
// @route   POST /api/v1/orders
// @access  Private (Vendor or Customer)
exports.createOrder = async (req, res) => {
  try {
    const { customerId, products, bottlesDelivered, bottlesReturned, status } = req.body;
    const isVendor = req.user.role === 'vendor';
    const vendorId = isVendor ? req.user._id : req.body.vendorId;

    if (!customerId || !products || products.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide customer and products' });
    }

    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Vendor ID is required' });
    }

    // Verify relationship
    const relation = await VendorCustomer.findOne({ vendorId, customerId });
    if (!relation) {
      return res.status(400).json({ success: false, message: 'Customer is not connected to this vendor' });
    }

    // Calculate total amount from products
    let totalAmount = 0;
    const orderProducts = [];

    for (const item of products) {
      const dbProduct = await Product.findById(item.productId);
      if (!dbProduct || !dbProduct.isActive) {
        return res.status(404).json({ success: false, message: `Product ${item.productId} not found or inactive` });
      }
      const itemPrice = dbProduct.price;
      const itemTotal = itemPrice * item.quantity;
      totalAmount += itemTotal;

      orderProducts.push({
        productId: dbProduct._id,
        name: dbProduct.name,
        quantity: item.quantity,
        price: itemPrice
      });
    }

    // Determine initial status: Vendors log delivered directly; Customers request as pending
    const orderStatus = isVendor ? (status || 'delivered') : 'pending';
    const finalDelivered = isVendor ? (bottlesDelivered || 0) : 0;
    const finalReturned = isVendor ? (bottlesReturned || 0) : 0;

    const order = await Order.create({
      vendorId,
      customerId,
      products: orderProducts,
      totalAmount,
      bottlesDelivered: finalDelivered,
      bottlesReturned: finalReturned,
      status: orderStatus,
      deliveryDate: orderStatus === 'delivered' ? new Date() : null
    });

    // If order was logged as delivered by the vendor, update customer ledger balances
    if (orderStatus === 'delivered') {
      relation.balance += totalAmount;
      relation.bottlesOutstanding += (finalDelivered - finalReturned);
      await relation.save();
    }

    res.status(201).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Order Status (e.g. Pending -> Delivered)
// @route   PUT /api/v1/orders/:id/status
// @access  Private (Vendor only)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { status, bottlesDelivered, bottlesReturned } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.vendorId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    if (order.status !== 'pending' && status !== 'cancelled') {
      return res.status(400).json({ success: false, message: 'Order is already processed' });
    }

    const prevStatus = order.status;
    order.status = status || order.status;
    
    if (order.status === 'delivered') {
      order.bottlesDelivered = bottlesDelivered !== undefined ? bottlesDelivered : 0;
      order.bottlesReturned = bottlesReturned !== undefined ? bottlesReturned : 0;
      order.deliveryDate = new Date();
    }

    await order.save();

    // If transitioned to delivered, update customer outstanding ledger
    if (prevStatus === 'pending' && order.status === 'delivered') {
      const relation = await VendorCustomer.findOne({
        vendorId: req.user._id,
        customerId: order.customerId
      });
      if (relation) {
        relation.balance += order.totalAmount;
        relation.bottlesOutstanding += (order.bottlesDelivered - order.bottlesReturned);
        await relation.save();
      }
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Record customer payment
// @route   POST /api/v1/orders/payments
// @access  Private (Vendor only)
exports.recordPayment = async (req, res) => {
  try {
    const { customerId, amount, paymentMethod, notes } = req.body;

    if (!customerId || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide customer and amount' });
    }

    const relation = await VendorCustomer.findOne({
      vendorId: req.user._id,
      customerId
    });

    if (!relation) {
      return res.status(400).json({ success: false, message: 'Customer not linked to vendor' });
    }

    // Save payment
    const payment = await Payment.create({
      vendorId: req.user._id,
      customerId,
      amount,
      paymentMethod: paymentMethod || 'cash',
      notes
    });

    // Deduct payment amount from user outstanding balance
    relation.balance -= amount;
    await relation.save();

    res.status(201).json({ success: true, data: payment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all orders of the vendor
// @route   GET /api/v1/orders
// @access  Private (Vendor/Customer)
exports.getOrders = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'vendor') {
      query.vendorId = req.user._id;
      if (req.query.customerId) {
        query.customerId = req.query.customerId;
      }
    } else if (req.user.role === 'customer') {
      query.customerId = req.user._id;
      if (req.query.vendorId) {
        query.vendorId = req.query.vendorId;
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const orders = await Order.find(query)
      .populate('customerId', 'name phone address')
      .populate('vendorId', 'name phone')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all payments logged
// @route   GET /api/v1/orders/payments
// @access  Private (Vendor/Customer)
exports.getPayments = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'vendor') {
      query.vendorId = req.user._id;
      if (req.query.customerId) {
        query.customerId = req.query.customerId;
      }
    } else if (req.user.role === 'customer') {
      query.customerId = req.user._id;
      if (req.query.vendorId) {
        query.vendorId = req.query.vendorId;
      }
    } else {
      return res.status(403).json({ success: false, message: 'Unauthorized access' });
    }

    const payments = await Payment.find(query)
      .populate('customerId', 'name phone address')
      .populate('vendorId', 'name phone')
      .sort({ paymentDate: -1 });

    res.status(200).json({ success: true, count: payments.length, data: payments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export Statement PDF
// @route   GET /api/v1/orders/pdf-report
// @access  Private (Vendor only)
exports.exportPDFReport = async (req, res) => {
  try {
    const { customerId } = req.query;
    const vendorId = req.user._id;

    const vendor = await User.findById(vendorId).select('-password');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found' });

    let customer = null;
    let stats = {};
    let orderQuery = { vendorId };
    let payQuery = { vendorId };

    if (customerId) {
      customer = await User.findById(customerId).select('-password');
      if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });
      
      const relation = await VendorCustomer.findOne({ vendorId, customerId });
      if (!relation) return res.status(400).json({ success: false, message: 'Customer not connected' });
      
      stats = {
        balance: relation.balance,
        bottlesOutstanding: relation.bottlesOutstanding
      };
      orderQuery.customerId = customerId;
      payQuery.customerId = customerId;
    } else {
      // Vendor aggregate stats
      const customerCount = await VendorCustomer.countDocuments({ vendorId });
      stats = { customerCount };
    }

    const orders = await Order.find(orderQuery)
      .populate('customerId', 'name phone')
      .sort({ createdAt: -1 });
    
    const payments = await Payment.find(payQuery)
      .populate('customerId', 'name phone')
      .sort({ paymentDate: -1 });

    // Stream PDF directly to client response
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=water_report_${customerId || 'general'}.pdf`);

    generateReportPDF(res, {
      vendor,
      customer,
      orders,
      payments,
      stats
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
};
