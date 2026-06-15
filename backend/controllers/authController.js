const User = require('../models/User');
const Otp = require('../models/Otp');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'super_secret_water_token_key_123!', {
    expiresIn: '30d'
  });
};

const validatePhone = (phone) => {
  return /^\d{10}$/.test(phone);
};

// @desc    Register a Vendor
// @route   POST /api/v1/auth/register-vendor
// @access  Public
exports.registerVendor = async (req, res) => {
  try {
    const { name, phone, email, password } = req.body;

    if (!name || !phone || !email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide all details' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
    }

    // Check if vendor exists
    const userExists = await User.findOne({ $or: [{ email }, { phone }] });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User with this email or phone already exists' });
    }

    // Create Vendor
    const vendor = await User.create({
      name,
      phone,
      email,
      password,
      role: 'vendor'
    });

    res.status(201).json({
      success: true,
      token: generateToken(vendor._id),
      user: {
        id: vendor._id,
        name: vendor.name,
        phone: vendor.phone,
        email: vendor.email,
        role: vendor.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Login Admin/Vendor
// @route   POST /api/v1/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    // Find user by email (or phone, if they entered it in email field)
    const user = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone: email }]
    });

    if (!user || user.role === 'customer') {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.status(200).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send OTP to customer phone
// @route   POST /api/v1/auth/send-otp
// @access  Public
exports.sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Please provide phone number' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Remove any previous OTPs for this phone number
    await Otp.deleteMany({ phone });

    // Save to Database
    await Otp.create({ phone, otp });

    // --- FUTURE INTEGRATION PLACEHOLDER ---
    // Here you would call your SMS gateway provider, e.g.
    // await smsProvider.send(phone, `Your OTP is ${otp}`);
    // --------------------------------------
    console.log(`[SMS-PROVIDER PLACEHOLDER] Generated OTP for ${phone}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      // For development, return it to client so they don't have to check server logs
      otp: process.env.NODE_ENV === 'production' ? undefined : otp
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify OTP for login
// @route   POST /api/v1/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Please provide phone and OTP' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
    }

    // Find OTP record
    const otpRecord = await Otp.findOne({ phone, otp });
    if (!otpRecord) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    // Delete the OTP after successful verification
    await Otp.deleteOne({ _id: otpRecord._id });

    // Check if customer exists in the user database
    const user = await User.findOne({ phone, role: 'customer' });

    if (!user) {
      // User is new; tell frontend to prompt for Name & Address
      return res.status(200).json({
        success: true,
        isNewUser: true,
        message: 'OTP verified. Account creation needed.'
      });
    }

    res.status(200).json({
      success: true,
      isNewUser: false,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register a new customer after verifying OTP
// @route   POST /api/v1/auth/register-customer
// @access  Public
exports.registerCustomer = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    if (!name || !phone || !address) {
      return res.status(400).json({ success: false, message: 'Please provide name, phone and address' });
    }

    if (!validatePhone(phone)) {
      return res.status(400).json({ success: false, message: 'Phone number must be exactly 10 digits' });
    }

    // Verify user doesn't already exist with this phone
    let user = await User.findOne({ phone });
    if (user) {
      return res.status(400).json({ success: false, message: 'User with this phone already exists' });
    }

    // Create Customer
    user = await User.create({
      name,
      phone,
      address,
      role: 'customer'
    });

    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        address: user.address
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get Current Logged in User Profile
// @route   GET /api/v1/auth/me
// @access  Private
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.status(200).json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
