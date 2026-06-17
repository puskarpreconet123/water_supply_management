const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes
const protect = async (req, res, next) => {
  let token;

  // Read header or query parameter
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.query && req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_water_token_key_123!');
    
    // Find user
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    if (req.user.isActive === false) {
      return res.status(403).json({ success: false, message: 'Your account has been deactivated. Please contact support/Admin.' });
    }
    
    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized to access this route' });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || 'unknown'}' is not authorized to access this route`
      });
    }
    next();
  };
};

// Check if vendor has active subscription
const checkSubscription = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'vendor') {
      const VendorSubscription = require('../models/VendorSubscription');
      const activeSub = await VendorSubscription.findOne({
        vendorId: req.user._id,
        isActive: true,
        endDate: { $gte: new Date() }
      });

      if (!activeSub) {
        return res.status(403).json({
          success: false,
          message: 'No active subscription found. Please purchase a plan or contact Admin.'
        });
      }
    }
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { protect, authorize, checkSubscription };

