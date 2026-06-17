const User = require('../models/User');
const Product = require('../models/Product');
const VendorCustomer = require('../models/VendorCustomer');
const VendorSubscription = require('../models/VendorSubscription');

// Helper function to check subscription status and limit
const checkSubscriptionStatus = async (vendorId) => {
  const activeSub = await VendorSubscription.findOne({
    vendorId,
    isActive: true,
    endDate: { $gte: new Date() }
  }).populate('planId');

  if (!activeSub) {
    return { active: false, error: 'No active subscription found. Please purchase a plan or contact Admin.' };
  }

  const customerCount = await VendorCustomer.countDocuments({ vendorId });
  const userLimit = activeSub.planId?.userLimit || 0;

  return {
    active: true,
    userLimit,
    customerCount,
    isLimitExceeded: customerCount >= userLimit,
    subscription: activeSub
  };
};

// @desc    Get Vendor Subscription details
// @route   GET /api/v1/vendor/subscription
// @access  Private (Vendor only)
exports.getSubscription = async (req, res) => {
  try {
    const status = await checkSubscriptionStatus(req.user._id);
    res.status(200).json({ success: true, status });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add a Product
// @route   POST /api/v1/vendor/products
// @access  Private (Vendor only)
exports.addProduct = async (req, res) => {
  try {
    const { name, price, description, imageUrl, quantity } = req.body;

    if (!name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Please provide name and price' });
    }

    // Check if subscription active
    const subStatus = await checkSubscriptionStatus(req.user._id);
    if (!subStatus.active) {
      return res.status(403).json({ success: false, message: subStatus.error });
    }

    const product = await Product.create({
      vendorId: req.user._id,
      name,
      price,
      description,
      quantity: quantity || '',
      imageUrl: imageUrl || 'https://images.unsplash.com/photo-1548839130-3fd96cd5bd4d?q=80&w=256' // standard nice water bottle image
    });

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all Vendor Products
// @route   GET /api/v1/vendor/products
// @access  Private (Vendor/Customer)
exports.getProducts = async (req, res) => {
  try {
    const vendorId = req.user.role === 'vendor' ? req.user._id : req.query.vendorId;
    if (!vendorId) {
      return res.status(400).json({ success: false, message: 'Please specify vendor ID' });
    }

    const products = await Product.find({ vendorId, isActive: true });
    res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update a Product
// @route   PUT /api/v1/vendor/products/:id
// @access  Private (Vendor only)
exports.updateProduct = async (req, res) => {
  try {
    const { name, price, description, imageUrl, isActive, quantity } = req.body;
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Make sure vendor owns the product
    if (product.vendorId.toString() !== req.user._id.toString()) {
      return res.status(401).json({ success: false, message: 'Not authorized' });
    }

    product = await Product.findByIdAndUpdate(
      req.params.id,
      { name, price, description, imageUrl, isActive, quantity },
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add (Connect) a customer by phone number
// @route   POST /api/v1/vendor/customers
// @access  Private (Vendor only)
exports.addCustomer = async (req, res) => {
  try {
    const { phone, name, address } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please provide customer phone number' });
    }

    if (!/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: 'Customer phone number must be exactly 10 digits' });
    }

    // 1. Verify active subscription and user limit
    const subStatus = await checkSubscriptionStatus(req.user._id);
    if (!subStatus.active) {
      return res.status(403).json({ success: false, message: subStatus.error });
    }
    if (subStatus.isLimitExceeded) {
      return res.status(403).json({
        success: false,
        message: `Your active plan limit of ${subStatus.userLimit} customers is reached. Please upgrade.`
      });
    }

    // 2. Find or create the Customer
    let customer = await User.findOne({ phone });

    if (customer) {
      if (customer.role !== 'customer') {
        return res.status(400).json({ success: false, message: 'Cannot add a user who is not a customer' });
      }
    } else {
      // Create new customer account automatically
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Phone number does not exist. Please provide customer name to register.'
        });
      }
      customer = await User.create({
        name,
        phone,
        address: address || '',
        addresses: address ? [address] : [],
        role: 'customer'
      });
    }

    // 3. Connect Vendor & Customer
    let relation = await VendorCustomer.findOne({
      vendorId: req.user._id,
      customerId: customer._id
    });

    if (relation) {
      return res.status(400).json({ success: false, message: 'Customer is already connected to you' });
    }

    relation = await VendorCustomer.create({
      vendorId: req.user._id,
      customerId: customer._id
    });

    res.status(201).json({
      success: true,
      message: 'Customer successfully added and linked',
      data: {
        relationId: relation._id,
        customer: {
          id: customer._id,
          name: customer.name,
          phone: customer.phone,
          address: customer.address
        },
        bottlesOutstanding: relation.bottlesOutstanding,
        balance: relation.balance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all connected customers
// @route   GET /api/v1/vendor/customers
// @access  Private (Vendor only)
exports.getCustomers = async (req, res) => {
  try {
    const relations = await VendorCustomer.find({ vendorId: req.user._id }).populate('customerId');

    const customerList = relations.map((rel) => {
      const cust = rel.customerId;
      return {
        relationId: rel._id,
        customerId: cust?._id,
        name: cust?.name || 'Deleted User',
        phone: cust?.phone || 'N/A',
        address: cust?.address || 'N/A',
        bottlesOutstanding: rel.bottlesOutstanding,
        balance: rel.balance,
        createdAt: rel.createdAt
      };
    });

    res.status(200).json({ success: true, count: customerList.length, data: customerList });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Vendor Profile & Settings
// @route   PUT /api/v1/vendor/profile
// @access  Private (Vendor only)
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, email, address, razorpayKeyId, razorpayKeySecret, password, deliverySlots } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    // Check if phone is being updated and is already taken
    if (phone && phone !== user.phone) {
      if (!/^\d{10}$/.test(phone)) {
        return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
      }
      const phoneExists = await User.findOne({ phone, _id: { $ne: user._id } });
      if (phoneExists) {
        return res.status(400).json({ success: false, message: 'Phone number is already in use by another user' });
      }
      user.phone = phone;
    }

    // Check if email is being updated and is already taken
    if (email && email !== user.email) {
      const emailExists = await User.findOne({ email: email.toLowerCase(), _id: { $ne: user._id } });
      if (emailExists) {
        return res.status(400).json({ success: false, message: 'Email is already in use by another user' });
      }
      user.email = email.toLowerCase();
    }

    if (name) user.name = name;
    if (address !== undefined) user.address = address;
    if (razorpayKeyId !== undefined) user.razorpayKeyId = razorpayKeyId;
    if (razorpayKeySecret !== undefined) user.razorpayKeySecret = razorpayKeySecret;
    if (deliverySlots !== undefined) user.deliverySlots = deliverySlots;

    if (password) {
      user.password = password; // pre-save hook will hash this automatically
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile settings updated successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.address,
        razorpayKeyId: user.razorpayKeyId,
        deliverySlots: user.deliverySlots,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update customer ledger (balance & outstanding bottles) manually
// @route   PUT /api/v1/vendor/customers/:customerId
// @access  Private (Vendor only)
exports.updateCustomerLedger = async (req, res) => {
  try {
    const { balance, bottlesOutstanding } = req.body;
    const { customerId } = req.params;
    const vendorId = req.user._id;

    // Find the relationship
    const relation = await VendorCustomer.findOne({ vendorId, customerId });
    if (!relation) {
      return res.status(404).json({ success: false, message: 'Customer relationship not found' });
    }

    if (balance !== undefined) {
      relation.balance = Number(balance);
    }
    if (bottlesOutstanding !== undefined) {
      relation.bottlesOutstanding = Number(bottlesOutstanding);
    }

    await relation.save();

    res.status(200).json({
      success: true,
      message: 'Customer ledger updated successfully',
      data: {
        relationId: relation._id,
        customerId: relation.customerId,
        balance: relation.balance,
        bottlesOutstanding: relation.bottlesOutstanding
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Subscription Plans for Vendors (Excludes free plans)
// @route   GET /api/v1/vendor/plans
// @access  Private (Vendor only)
exports.getVendorPlans = async (req, res) => {
  try {
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    const plans = await SubscriptionPlan.find({ isActive: true });
    // Filter out free plans and plans with price = 0
    const paidPlans = plans.filter(
      (plan) => plan.price > 0 && !(plan.name && plan.name.toLowerCase().includes('free'))
    );
    res.status(200).json({ success: true, data: paidPlans });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


