const Razorpay = require('razorpay');
const crypto = require('crypto');
const RazorpayConfig = require('../models/RazorpayConfig');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const VendorSubscription = require('../models/VendorSubscription');

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
      receipt: `receipt_plan_${plan._id}_${Date.now()}`
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
