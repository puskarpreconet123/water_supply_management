const Razorpay = require('razorpay');
const crypto = require('crypto');
const RazorpayConfig = require('../models/RazorpayConfig');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const VendorSubscription = require('../models/VendorSubscription');
const User = require('../models/User');
const Payment = require('../models/Payment');
const VendorCustomer = require('../models/VendorCustomer');

// @desc    Get Razorpay config details (keys)
// @route   GET /api/v1/payment/config
// @access  Private (Admin only)
exports.getPaymentConfig = async (req, res) => {
  try {
    const config = await RazorpayConfig.findOne();
    if (!config) {
      return res.status(200).json({
        success: true,
        data: {
          keyId: '',
          hasSecret: false
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        keyId: config.keyId,
        hasSecret: !!config.keySecret
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Save/Update Razorpay config details (keys)
// @route   POST /api/v1/payment/config
// @access  Private (Admin only)
exports.savePaymentConfig = async (req, res) => {
  try {
    const { keyId, keySecret } = req.body;

    if (!keyId || !keySecret) {
      return res.status(400).json({ success: false, message: 'Please provide both Key ID and Key Secret' });
    }

    let config = await RazorpayConfig.findOne();
    if (config) {
      config.keyId = keyId;
      config.keySecret = keySecret;
      config.updatedAt = Date.now();
      await config.save();
    } else {
      config = await RazorpayConfig.create({
        keyId,
        keySecret
      });
    }

    res.status(200).json({
      success: true,
      message: 'Payment settings saved successfully',
      data: {
        keyId: config.keyId,
        hasSecret: true
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Razorpay Order
// @route   POST /api/v1/payment/create-order
// @access  Private (Vendor only)
exports.createRazorpayOrder = async (req, res) => {
  try {
    const { planId } = req.body;

    if (!planId) {
      return res.status(400).json({ success: false, message: 'Please provide planId' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found or inactive' });
    }

    const config = await RazorpayConfig.findOne();
    if (!config || !config.keyId || !config.keySecret) {
      return res.status(400).json({ success: false, message: 'Payment gateway not configured by Administrator yet' });
    }

    const rzp = new Razorpay({
      key_id: config.keyId,
      key_secret: config.keySecret
    });

    const options = {
      amount: plan.price * 100, // amount in paisa
      currency: 'INR',
      receipt: `rcpt_plan_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };

    const order = await rzp.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: config.keyId // return keyId for frontend overlay
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Razorpay Payment and Assign Subscription
// @route   POST /api/v1/payment/verify
// @access  Private (Vendor only)
exports.verifyRazorpayPayment = async (req, res) => {
  try {
    const { planId, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!planId || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Please provide all verification details' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }

    const config = await RazorpayConfig.findOne();
    if (!config || !config.keySecret) {
      return res.status(400).json({ success: false, message: 'Payment config error' });
    }

    // Cryptographic signature check
    const hmac = crypto.createHmac('sha256', config.keySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Cryptographic signature verification failed' });
    }

    // Assign the new subscription to the vendor
    const vendorId = req.user._id;
    const startDate = new Date();
    const endDate = new Date();

    if (plan.duration === 'monthly') {
      endDate.setDate(startDate.getDate() + 30);
    } else if (plan.duration === 'quarterly') {
      endDate.setDate(startDate.getDate() + 90);
    } else if (plan.duration === 'yearly') {
      endDate.setDate(startDate.getDate() + 365);
    }

    // Deactivate previous subscriptions
    await VendorSubscription.updateMany(
      { vendorId, isActive: true },
      { isActive: false }
    );

    // Create new active subscription record
    const sub = await VendorSubscription.create({
      vendorId,
      planId,
      startDate,
      endDate,
      isActive: true
    });

    res.status(200).json({
      success: true,
      message: 'Payment verified and plan activated successfully!',
      data: sub
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Razorpay Order from Customer to Vendor
// @route   POST /api/v1/payment/customer/create-order
// @access  Private (Customer only)
exports.createCustomerOrder = async (req, res) => {
  try {
    const { vendorId, amount } = req.body;

    if (!vendorId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Please provide vendorId and a valid amount greater than 0' });
    }

    // Find vendor and retrieve their Razorpay credentials
    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (!vendor.razorpayKeyId || !vendor.razorpayKeySecret) {
      return res.status(400).json({ success: false, message: 'This vendor does not support online payments at this moment.' });
    }

    // Verify customer is connected to vendor
    const relation = await VendorCustomer.findOne({ vendorId, customerId: req.user._id });
    if (!relation) {
      return res.status(400).json({ success: false, message: 'You are not linked to this vendor' });
    }

    const rzp = new Razorpay({
      key_id: vendor.razorpayKeyId,
      key_secret: vendor.razorpayKeySecret
    });

    const options = {
      amount: Math.round(amount * 100), // amount in paisa
      currency: 'INR',
      receipt: `rcpt_cust_${Date.now()}_${Math.floor(Math.random() * 1000)}`
    };

    const order = await rzp.orders.create(options);

    res.status(200).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: vendor.razorpayKeyId // return vendor's keyId for frontend overlay
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Customer payment and log collection
// @route   POST /api/v1/payment/customer/verify
// @access  Private (Customer only)
exports.verifyCustomerPayment = async (req, res) => {
  try {
    const { vendorId, amount, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

    if (!vendorId || !amount || !razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Please provide all verification details' });
    }

    // Find vendor keys
    const vendor = await User.findById(vendorId);
    if (!vendor || !vendor.razorpayKeySecret) {
      return res.status(400).json({ success: false, message: 'Vendor payment config error' });
    }

    // Cryptographic signature check
    const hmac = crypto.createHmac('sha256', vendor.razorpayKeySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Signature verification failed' });
    }

    // Log the payment in the DB
    const payment = await Payment.create({
      vendorId,
      customerId: req.user._id,
      amount: Number(amount),
      paymentMethod: 'online',
      notes: `Razorpay Payment ID: ${razorpay_payment_id}`
    });

    // Deduct amount from user outstanding balance
    const relation = await VendorCustomer.findOne({ vendorId, customerId: req.user._id });
    if (relation) {
      relation.balance -= Number(amount);
      await relation.save();
    }

    res.status(200).json({
      success: true,
      message: 'Payment verified and outstanding balance updated!',
      data: payment
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

