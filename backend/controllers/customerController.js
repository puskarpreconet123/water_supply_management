const User = require('../models/User');
const VendorCustomer = require('../models/VendorCustomer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Otp = require('../models/Otp');

const validatePhone = (phone) => {
  return /^\d{10}$/.test(phone);
};

// @desc    Get all vendors connected to the customer
// @route   GET /api/v1/customer/vendors
// @access  Private (Customer only)
exports.getConnectedVendors = async (req, res) => {
  try {
    const relations = await VendorCustomer.find({ customerId: req.user._id })
      .populate('vendorId', 'name phone email');

    const vendorConnections = relations.map((rel) => {
      const vendor = rel.vendorId;
      return {
        relationId: rel._id,
        vendorId: vendor?._id,
        name: vendor?.name || 'Deleted Vendor',
        phone: vendor?.phone || 'N/A',
        email: vendor?.email || 'N/A',
        bottlesOutstanding: rel.bottlesOutstanding,
        balance: rel.balance
      };
    });

    res.status(200).json({ success: true, count: vendorConnections.length, data: vendorConnections });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get details, products, and logs for a connected vendor
// @route   GET /api/v1/customer/vendors/:vendorId
// @access  Private (Customer only)
exports.getVendorDetails = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const customerId = req.user._id;

    // Check relationship
    const relation = await VendorCustomer.findOne({ vendorId, customerId })
      .populate('vendorId', 'name phone email razorpayKeyId deliverySlots');
      
    if (!relation) {
      return res.status(403).json({
        success: false,
        message: 'You are not connected to this vendor. Cannot view products.'
      });
    }

    // Retrieve active products for this vendor
    const products = await Product.find({ vendorId, isActive: true });

    // Retrieve customer's orders from this vendor
    const orders = await Order.find({ vendorId, customerId }).sort({ createdAt: -1 });

    // Retrieve customer's payments to this vendor
    const payments = await Payment.find({ vendorId, customerId }).sort({ paymentDate: -1 });

    res.status(200).json({
      success: true,
      data: {
        vendor: {
          id: relation.vendorId?._id,
          name: relation.vendorId?.name,
          phone: relation.vendorId?.phone,
          email: relation.vendorId?.email,
          razorpayKeyId: relation.vendorId?.razorpayKeyId || '',
          deliverySlots: relation.vendorId?.deliverySlots || []
        },
        bottlesOutstanding: relation.bottlesOutstanding,
        balance: relation.balance,
        products,
        orders,
        payments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update Customer Profile & Settings
// @route   PUT /api/v1/customer/profile
// @access  Private (Customer only)
exports.updateProfile = async (req, res) => {
  try {
    const { name, phone, email, address, addresses, password } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
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
    
    if (addresses !== undefined) {
      if (!Array.isArray(addresses)) {
        return res.status(400).json({ success: false, message: 'Addresses must be an array' });
      }
      if (addresses.length > 5) {
        return res.status(400).json({ success: false, message: 'You can save at most 5 addresses' });
      }
      // Deduplicate addresses (case-insensitive)
      const uniqueAddresses = [];
      const seen = new Set();
      for (const addr of addresses) {
        const trimmed = addr.trim();
        if (trimmed) {
          const lower = trimmed.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            uniqueAddresses.push(trimmed);
          }
        }
      }
      user.addresses = uniqueAddresses;
    }

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
        addresses: user.addresses || [],
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request a phone number change (sends OTP to new number)
// @route   POST /api/v1/customer/change-phone-request
// @access  Private (Customer only)
exports.requestPhoneChange = async (req, res) => {
  try {
    const { newPhone } = req.body;

    if (!newPhone) {
      return res.status(400).json({ success: false, message: 'Please provide the new phone number' });
    }

    if (!validatePhone(newPhone)) {
      return res.status(400).json({ success: false, message: 'New phone number must be exactly 10 digits' });
    }

    // Check if newPhone already exists in database
    const userExists = await User.findOne({ phone: newPhone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'This phone number is already registered to another account' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Delete any previous OTPs for this phone number
    await Otp.deleteMany({ phone: newPhone });

    // Save to Database
    await Otp.create({ phone: newPhone, otp });

    console.log(`[SMS-PROVIDER PLACEHOLDER] Generated OTP for new number ${newPhone}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully to the new phone number',
      otp: process.env.NODE_ENV === 'production' ? undefined : otp
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify OTP and update phone number
// @route   PUT /api/v1/customer/change-phone-verify
// @access  Private (Customer only)
exports.verifyPhoneChange = async (req, res) => {
  try {
    const { newPhone, otp } = req.body;

    if (!newPhone || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide new phone and OTP' });
    }

    if (!validatePhone(newPhone)) {
      return res.status(400).json({ success: false, message: 'New phone number must be exactly 10 digits' });
    }

    // Verify OTP matches
    const otpRecord = await Otp.findOne({ phone: newPhone, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Delete OTP
    await Otp.deleteOne({ _id: otpRecord._id });

    // Double check that user doesn't already exist with this phone (to prevent race conditions)
    const userExists = await User.findOne({ phone: newPhone });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'This phone number is already registered to another account' });
    }

    // Update phone number of current logged in user
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    user.phone = newPhone;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Phone number updated successfully',
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        address: user.address,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
