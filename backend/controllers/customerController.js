const User = require('../models/User');
const VendorCustomer = require('../models/VendorCustomer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Payment = require('../models/Payment');

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
      .populate('vendorId', 'name phone email');
      
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
          email: relation.vendorId?.email
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
