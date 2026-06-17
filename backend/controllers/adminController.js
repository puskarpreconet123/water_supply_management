const User = require('../models/User');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const VendorSubscription = require('../models/VendorSubscription');
const VendorCustomer = require('../models/VendorCustomer');

// @desc    Create a Subscription Plan
// @route   POST /api/v1/admin/plans
// @access  Private (Admin only)
exports.createPlan = async (req, res) => {
  try {
    const { name, price, duration, userLimit } = req.body;

    if (!name || price === undefined || !duration || !userLimit) {
      return res.status(400).json({ success: false, message: 'Please provide all details' });
    }

    const plan = await SubscriptionPlan.create({
      name,
      price,
      duration,
      userLimit
    });

    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Subscription Plans
// @route   GET /api/v1/admin/plans
// @access  Public/Private
exports.getPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    res.status(200).json({ success: true, data: plans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all vendors with active subscriptions and user counts
// @route   GET /api/v1/admin/vendors
// @access  Private (Admin only)
exports.getVendors = async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor' }).select('-password');
    
    const vendorData = await Promise.all(
      vendors.map(async (vendor) => {
        // Find active subscription
        const activeSub = await VendorSubscription.findOne({
          vendorId: vendor._id,
          isActive: true,
          endDate: { $gte: new Date() }
        }).populate('planId');

        // Find customer count
        const customerCount = await VendorCustomer.countDocuments({ vendorId: vendor._id });

        return {
          _id: vendor._id,
          name: vendor.name,
          phone: vendor.phone,
          email: vendor.email,
          isActive: vendor.isActive,
          subscription: activeSub ? {
            planName: activeSub.planId?.name,
            userLimit: activeSub.planId?.userLimit,
            startDate: activeSub.startDate,
            endDate: activeSub.endDate
          } : null,
          customerCount
        };
      })
    );

    res.status(200).json({ success: true, data: vendorData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Assign subscription plan to a vendor
// @route   POST /api/v1/admin/assign-subscription
// @access  Private (Admin only)
exports.assignSubscription = async (req, res) => {
  try {
    const { vendorId, planId } = req.body;

    if (!vendorId || !planId) {
      return res.status(400).json({ success: false, message: 'Please provide vendorId and planId' });
    }

    const vendor = await User.findById(vendorId);
    if (!vendor || vendor.role !== 'vendor') {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    const plan = await SubscriptionPlan.findById(planId);
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: 'Active subscription plan not found' });
    }

    // Calculate end date based on duration
    const startDate = new Date();
    const endDate = new Date();
    if (plan.duration === 'monthly') {
      endDate.setDate(startDate.getDate() + 30);
    } else if (plan.duration === 'quarterly') {
      endDate.setDate(startDate.getDate() + 90);
    } else if (plan.duration === 'yearly') {
      endDate.setDate(startDate.getDate() + 365);
    }

    // Deactivate previous active subscriptions for this vendor
    await VendorSubscription.updateMany(
      { vendorId, isActive: true },
      { isActive: false }
    );

    // Create new subscription record
    const sub = await VendorSubscription.create({
      vendorId,
      planId,
      startDate,
      endDate,
      isActive: true
    });

    res.status(200).json({
      success: true,
      message: 'Subscription plan successfully assigned',
      data: sub
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a Subscription Plan
// @route   DELETE /api/v1/admin/plans/:id
// @access  Private (Admin only)
exports.deletePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({ success: false, message: 'Plan not found' });
    }

    // Check if any vendors are currently using this plan as active subscription
    const activeSubExists = await VendorSubscription.exists({ planId: plan._id, isActive: true });
    if (activeSubExists) {
      return res.status(400).json({ success: false, message: 'Cannot delete plan because it is currently active for one or more vendors' });
    }

    await SubscriptionPlan.findByIdAndDelete(req.params.id);

    res.status(200).json({ success: true, message: 'Subscription plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get system-wide stats for Admin Overview
// @route   GET /api/v1/admin/stats
// @access  Private (Admin only)
exports.getAdminStats = async (req, res) => {
  try {
    const vendorsCount = await User.countDocuments({ role: 'vendor' });
    const customersCount = await User.countDocuments({ role: 'customer' });
    const plansCount = await SubscriptionPlan.countDocuments();
    
    const activeSubscriptions = await VendorSubscription.find({
      isActive: true,
      endDate: { $gte: new Date() }
    }).populate('planId');

    const activeSubsCount = activeSubscriptions.length;
    
    const totalRevenue = activeSubscriptions.reduce((acc, curr) => {
      return acc + (curr.planId?.price || 0);
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        vendorsCount,
        customersCount,
        plansCount,
        activeSubsCount,
        totalRevenue
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


// @desc    Update Vendor Details (activate, deactivate, edit)
// @route   PUT /api/v1/admin/vendors/:id
// @access  Private (Admin only)
exports.updateVendor = async (req, res) => {
  try {
    const { name, phone, email, isActive } = req.body;
    let vendor = await User.findOne({ _id: req.params.id, role: 'vendor' });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    if (name) vendor.name = name;
    
    if (phone) {
      if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
      }
      const phoneExists = await User.findOne({ phone, _id: { $ne: vendor._id } });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'Phone number is already in use by another user' });
      }
      vendor.phone = phone;
    }

    if (email !== undefined) {
      if (email && email.trim() !== '') {
        const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: vendor._id } });
        if (emailExists) {
          return res.status(400).json({ success: false, message: 'Email is already in use by another user' });
        }
        vendor.email = email.toLowerCase();
      } else {
        vendor.email = undefined;
      }
    }

    if (isActive !== undefined) vendor.isActive = isActive;

    await vendor.save();

    res.status(200).json({ success: true, data: vendor });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a Vendor and cascade delete related data
// @route   DELETE /api/v1/admin/vendors/:id
// @access  Private (Admin only)
exports.deleteVendor = async (req, res) => {
  try {
    const vendor = await User.findOne({ _id: req.params.id, role: 'vendor' });

    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Delete associated orders
    const Order = require('../models/Order');
    await Order.deleteMany({ vendorId: vendor._id });

    // Delete associated products
    const Product = require('../models/Product');
    await Product.deleteMany({ vendorId: vendor._id });

    // Delete customer relationships
    await VendorCustomer.deleteMany({ vendorId: vendor._id });

    // Delete vendor subscriptions
    await VendorSubscription.deleteMany({ vendorId: vendor._id });

    // Delete the vendor user itself
    await User.findByIdAndDelete(vendor._id);

    res.status(200).json({ success: true, message: 'Vendor and all associated records deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete all Vendors and cascade delete related data
// @route   DELETE /api/v1/admin/vendors
// @access  Private (Admin only)
exports.deleteAllVendors = async (req, res) => {
  try {
    const vendors = await User.find({ role: 'vendor' });
    const vendorIds = vendors.map(v => v._id);

    // Delete associated orders
    const Order = require('../models/Order');
    await Order.deleteMany({ vendorId: { $in: vendorIds } });

    // Delete associated products
    const Product = require('../models/Product');
    await Product.deleteMany({ vendorId: { $in: vendorIds } });

    // Delete customer relationships
    await VendorCustomer.deleteMany({ vendorId: { $in: vendorIds } });

    // Delete vendor subscriptions
    await VendorSubscription.deleteMany({ vendorId: { $in: vendorIds } });

    // Delete all vendor users
    await User.deleteMany({ role: 'vendor' });

    res.status(200).json({ success: true, message: 'All vendors and associated records deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

