const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const User = require('./models/User');
const SubscriptionPlan = require('./models/SubscriptionPlan');
const VendorSubscription = require('./models/VendorSubscription');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middlewares
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(origin => origin.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json());

// Mount routers under /api/v1
app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/admin', require('./routes/admin'));
app.use('/api/v1/vendor', require('./routes/vendor'));
app.use('/api/v1/customer', require('./routes/customer'));
app.use('/api/v1/orders', require('./routes/orders'));
app.use('/api/v1/payment', require('./routes/payment'));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({ success: true, message: 'Water Supply API running successfully' });
});

// Seed Initial Admin & default plans helper function
const seedDefaults = async () => {
  try {
    // 1. Seed Admin
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        name: 'System Admin',
        phone: '9999999999',
        email: 'admin@water.com',
        password: 'admin123', // Will be hashed automatically by userSchema pre-save hook
        role: 'admin'
      });
      console.log('Default Admin user seeded: admin@water.com / admin123');
    }

    // 2. Seed Default Plans
    let freeTrialPlan = await SubscriptionPlan.findOne({ name: 'Free Trial' });
    if (!freeTrialPlan) {
      await SubscriptionPlan.create({
        name: 'Free Trial',
        price: 0,
        duration: 'monthly',
        userLimit: 10000
      });
      console.log('Default Free Trial Plan seeded (up to 10k users, 1 month)');
    }

    let starterPlan = await SubscriptionPlan.findOne({ name: 'Monthly Starter' });
    if (!starterPlan) {
      const createdPlans = await SubscriptionPlan.create([
        {
          name: 'Monthly Starter',
          price: 499,
          duration: 'monthly',
          userLimit: 50
        },
        {
          name: 'Quarterly Pro',
          price: 1299,
          duration: 'quarterly',
          userLimit: 150
        },
        {
          name: 'Yearly Enterprise',
          price: 4499,
          duration: 'yearly',
          userLimit: 500
        }
      ]);
      console.log('Default Subscription Plans seeded (Monthly, Quarterly, Yearly)');
      starterPlan = createdPlans[0];
    }

    // 3. Seed Default Vendor
    const vendorExists = await User.findOne({ role: 'vendor' });
    if (!vendorExists) {
      const vendor = await User.create({
        name: 'AquaFlow Water Suppliers',
        phone: '8888888888',
        email: 'vendor@water.com',
        password: 'vendor123',
        role: 'vendor'
      });
      console.log('Default Vendor user seeded: vendor@water.com / vendor123');

      if (!starterPlan) {
        starterPlan = await SubscriptionPlan.findOne({ name: 'Monthly Starter' });
      }

      if (starterPlan) {
        const startDate = new Date();
        const endDate = new Date();
        endDate.setDate(startDate.getDate() + 30); // 30 days active

        await VendorSubscription.create({
          vendorId: vendor._id,
          planId: starterPlan._id,
          startDate,
          endDate,
          isActive: true
        });
        console.log('Active Monthly Starter subscription assigned to Default Vendor');
      }
    }
  } catch (error) {
    console.error('Error seeding initial data:', error.message);
  }
};

// Execute Seeder
seedDefaults();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});
