import React, { useState, useEffect } from 'react';
import { useAuth, API_URL } from '../context/AuthContext';
import {
  Building, Package, Users, Truck, DollarSign, LogOut, Plus, FileText,
  AlertTriangle, RefreshCw, CheckCircle, Info, Calendar, Download, Menu, X
} from 'lucide-react';

const VendorDashboard = () => {
  const { logout, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // overview, products, customers, deliveries, payments
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Data states
  const [subStatus, setSubStatus] = useState(null);
  const [availablePlans, setAvailablePlans] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);

  // Form modals
  const [showProductModal, setShowProductModal] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states - Product
  const [prodName, setProdName] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');

  // Form states - Customer
  const [custPhone, setCustPhone] = useState('');
  const [custName, setCustName] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [showNewCustFields, setShowNewCustFields] = useState(false);

  // Form states - Order (Delivery)
  const [selectedCustId, setSelectedCustId] = useState('');
  const [selectedProdId, setSelectedProdId] = useState('');
  const [orderQty, setOrderQty] = useState(1);
  const [bottlesDelivered, setBottlesDelivered] = useState(1);
  const [bottlesReturned, setBottlesReturned] = useState(0);

  // Form states - Payment
  const [payCustId, setPayCustId] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch all vendor data
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Subscription Status
      const subRes = await authFetch('/vendor/subscription');
      if (subRes.success) {
        setSubStatus(subRes.status);
      }

      // 2. Fetch Products
      const prodRes = await authFetch('/vendor/products');
      if (prodRes.success) setProducts(prodRes.data);

      // 3. Fetch Customers
      const custRes = await authFetch('/vendor/customers');
      if (custRes.success) setCustomers(custRes.data);

      // 4. Fetch Orders
      const orderRes = await authFetch('/orders');
      if (orderRes.success) setOrders(orderRes.data);

      // 5. Fetch Payments
      const payRes = await authFetch('/orders/payments');
      if (payRes.success) setPayments(payRes.data);

      // 6. Fetch Subscription Plans
      const plansRes = await authFetch('/vendor/plans');
      if (plansRes.success) setAvailablePlans(plansRes.data);
      
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle add product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!prodName || !prodPrice) return setError('Name and Price are required');

    try {
      const res = await authFetch('/vendor/products', {
        method: 'POST',
        body: JSON.stringify({
          name: prodName,
          price: Number(prodPrice),
          description: prodDesc
        })
      });

      if (res.success) {
        setSuccess('Product successfully added!');
        setProdName('');
        setProdPrice('');
        setProdDesc('');
        setShowProductModal(false);
        fetchData();
      } else {
        setError(res.message || 'Failed to add product');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Handle link/add customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!custPhone) return setError('Customer phone number is required');
    if (custPhone.length !== 10) return setError('Customer phone number must be exactly 10 digits');

    try {
      const res = await authFetch('/vendor/customers', {
        method: 'POST',
        body: JSON.stringify({
          phone: custPhone,
          name: custName || undefined,
          address: custAddress || undefined
        })
      });

      if (res.success) {
        setSuccess('Customer linked successfully!');
        setCustPhone('');
        setCustName('');
        setCustAddress('');
        setShowNewCustFields(false);
        setShowCustomerModal(false);
        fetchData();
      } else {
        if (res.message.includes('does not exist')) {
          setShowNewCustFields(true);
          setError('Phone number is not registered yet. Please enter Name and Address to create profile.');
        } else {
          setError(res.message);
        }
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Handle log order (delivery)
  const handleAddOrder = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedCustId || !selectedProdId || !orderQty) {
      return setError('Please complete all delivery fields');
    }

    try {
      const res = await authFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: selectedCustId,
          products: [{ productId: selectedProdId, quantity: Number(orderQty) }],
          bottlesDelivered: Number(bottlesDelivered),
          bottlesReturned: Number(bottlesReturned),
          status: 'delivered' // Vendor logs delivery directly
        })
      });

      if (res.success) {
        setSuccess('Water delivery logged and customer balance updated!');
        setSelectedCustId('');
        setSelectedProdId('');
        setOrderQty(1);
        setBottlesDelivered(1);
        setBottlesReturned(0);
        setShowOrderModal(false);
        fetchData();
      } else {
        setError(res.message || 'Failed to log delivery');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Handle log payment
  const handleAddPayment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!payCustId || !payAmount) return setError('Customer and Amount are required');

    try {
      const res = await authFetch('/orders/payments', {
        method: 'POST',
        body: JSON.stringify({
          customerId: payCustId,
          amount: Number(payAmount),
          paymentMethod: payMethod,
          notes: payNotes
        })
      });

      if (res.success) {
        setSuccess('Payment recorded and customer balance deducted!');
        setPayCustId('');
        setPayAmount('');
        setPayNotes('');
        setShowPaymentModal(false);
        fetchData();
      } else {
        setError(res.message || 'Failed to record payment');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Handle order status process
  const handleProcessOrder = async (orderId, action, delQty, retQty) => {
    setError('');
    setSuccess('');
    try {
      const res = await authFetch(`/orders/${orderId}/status`, {
        method: 'PUT',
        body: JSON.stringify({
          status: action,
          bottlesDelivered: Number(delQty || 0),
          bottlesReturned: Number(retQty || 0)
        })
      });

      if (res.success) {
        setSuccess(`Order successfully marked as ${action}!`);
        fetchData();
      } else {
        setError(res.message || 'Failed to process order');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  const handleDownloadPDF = (customerId = '') => {
    const token = localStorage.getItem('token');
    const query = customerId ? `?customerId=${customerId}` : '';
    window.open(`${API_URL}/orders/pdf-report${query}&token=${token}`, '_blank');
  };

  // Dynamically load Razorpay SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Initiate Razorpay checkout for chosen subscription plan
  const handleSubscribePlan = async (plan) => {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setError('Failed to load Razorpay SDK. Verify internet connectivity.');
        setLoading(false);
        return;
      }

      const res = await authFetch('/payment/create-order', {
        method: 'POST',
        body: JSON.stringify({ planId: plan._id })
      });

      if (!res.success) {
        setError(res.message || 'Failed to initiate checkout order.');
        setLoading(false);
        return;
      }

      const { orderId, amount, currency, keyId } = res;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: import.meta.env.VITE_PROJECT_NAME || 'H2O Delivery Management',
        description: `Purchase subscription: ${plan.name}`,
        order_id: orderId,
        handler: async function (response) {
          setLoading(true);
          try {
            const verifyRes = await authFetch('/payment/verify', {
              method: 'POST',
              body: JSON.stringify({
                planId: plan._id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (verifyRes.success) {
              setSuccess('Subscription plan activated successfully!');
              fetchData(); // reload status
            } else {
              setError(verifyRes.message || 'Cryptographic signature verification failed.');
            }
          } catch (err) {
            setError('Verification request failed.');
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: '',
          email: '',
          contact: ''
        },
        theme: {
          color: '#0286c7'
        },
        modal: {
          ondismiss: function () {
            setLoading(false);
          }
        }
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.open();

    } catch (err) {
      setError('Checkout initiation failure');
      setLoading(false);
    }
  };

  const isSubActive = subStatus && subStatus.active;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-marine-950 text-slate-100">
      
      {/* MOBILE HEADER BAR */}
      <header className="flex md:hidden items-center justify-between p-4 bg-marine-sidebar border-b border-marine-800 z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-sky-600/10 rounded-lg text-sky-500 border border-sky-500/20">
            <Building size={18} className="fill-sky-500/20" />
          </div>
          <h2 className="font-bold text-slate-800 text-sm">Vendor Panel</h2>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 text-slate-600 hover:text-sky-600 transition-colors cursor-pointer"
        >
          {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* MOBILE DRAWER BACKDROP */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR NAVIGATION (SLIDING DRAWER MENU) */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-marine-sidebar border-r border-marine-800 flex flex-col justify-between p-6 z-40 transition-transform duration-300 md:static md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-8">
          {/* Header branding */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-600/10 rounded-lg text-sky-400 border border-sky-500/20">
                <Building size={24} className="fill-sky-400/20" />
              </div>
              <div>
                <h2 className="font-bold text-white leading-tight">Vendor Panel</h2>
                <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                  {import.meta.env.VITE_PROJECT_NAME || 'Distributor Console'}
                </span>
              </div>
            </div>
            {/* Close button for mobile */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 md:hidden text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-2">
            <button
              onClick={() => { setActiveTab('overview'); setError(''); setSuccess(''); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/40'
                  : 'text-slate-400 hover:bg-marine-card hover:text-white'
              }`}
            >
              <Info size={18} />
              Overview
            </button>
            <button
              disabled={!isSubActive}
              onClick={() => { setActiveTab('products'); setError(''); setSuccess(''); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'products'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/40'
                  : 'text-slate-400 hover:bg-marine-card hover:text-white'
              }`}
            >
              <Package size={18} />
              Products List
            </button>
            <button
              disabled={!isSubActive}
              onClick={() => { setActiveTab('customers'); setError(''); setSuccess(''); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'customers'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/40'
                  : 'text-slate-400 hover:bg-marine-card hover:text-white'
              }`}
            >
              <Users size={18} />
              Customer Tracker
            </button>
            <button
              disabled={!isSubActive}
              onClick={() => { setActiveTab('deliveries'); setError(''); setSuccess(''); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'deliveries'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/40'
                  : 'text-slate-400 hover:bg-marine-card hover:text-white'
              }`}
            >
              <Truck size={18} />
              Log Deliveries
            </button>
            <button
              disabled={!isSubActive}
              onClick={() => { setActiveTab('payments'); setError(''); setSuccess(''); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                activeTab === 'payments'
                  ? 'bg-sky-600 text-white shadow-lg shadow-sky-950/40'
                  : 'text-slate-400 hover:bg-marine-card hover:text-white'
              }`}
            >
              <DollarSign size={18} />
              Collect Payments
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="space-y-4">
          <button
            onClick={() => { fetchData(); setSidebarOpen(false); }}
            className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-marine-850 rounded hover:bg-marine-card cursor-pointer transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Sync Dashboard
          </button>
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-950/40 border border-rose-900/30 text-rose-400 text-xs font-bold hover:bg-rose-900/40 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            Logout Account
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* Banner Alert for Expired/Inactive Subscriptions */}
        {!isSubActive && (
          <div className="flex items-center gap-4 p-4 mb-6 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
            <AlertTriangle className="shrink-0 animate-float" size={32} />
            <div>
              <h3 className="font-bold text-base">Dashboard Actions Locked</h3>
              <p className="text-xs text-amber-400/80 mt-0.5">
                No active subscription plan was found for your account. Please ask the Administrator to assign you a package plan to unlock your dashboard.
              </p>
            </div>
          </div>
        )}

        {/* Banner Notification */}
        {error && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
            {success}
          </div>
        )}

        {/* OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Vendor Overview</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Status overview, active stats, and subscription limits.</p>
              </div>
              {isSubActive && (
                <button
                  onClick={() => handleDownloadPDF()}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors shadow-lg shadow-sky-950/40 self-start sm:self-center"
                >
                  <Download size={16} />
                  Download PDF Report
                </button>
              )}
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Subscription */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Subscription Status</span>
                  <Calendar size={18} className="text-sky-400" />
                </div>
                {subStatus?.active ? (
                  <div className="space-y-2">
                    <div className="text-xl font-bold text-white">{subStatus.subscription.planId?.name}</div>
                    <div className="text-xs text-slate-400">
                      Expires:{' '}
                      <span className="text-white font-medium">
                        {new Date(subStatus.subscription.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {/* Progress Bar Customer Limit */}
                    <div className="pt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Customer Limit usage</span>
                        <span className="font-bold text-white">
                          {subStatus.customerCount} / {subStatus.userLimit}
                        </span>
                      </div>
                      <div className="w-full bg-marine-950 rounded-full h-2 overflow-hidden border border-marine-800">
                        <div
                          className="bg-sky-500 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(100, (subStatus.customerCount / subStatus.userLimit) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm">No Active Subscription.</div>
                )}
              </div>

              {/* Card 2: Cumulative outstanding payments */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Outstanding Payments Left</span>
                  <DollarSign size={18} className="text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  Rs. {customers.reduce((acc, curr) => acc + curr.balance, 0)}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Sum of all payments left/unpaid across all connected clients.</p>
              </div>

              {/* Card 3: Outstanding Bottles */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Bottles Outstanding</span>
                  <Truck size={18} className="text-teal-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {customers.reduce((acc, curr) => acc + curr.bottlesOutstanding, 0)} Bottles
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Sum of empty bottles remaining at client premises.</p>
              </div>

            </div>

            {/* Purchase Subscription Section */}
            <div className="space-y-4 pt-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Calendar size={18} className="text-sky-400" />
                Subscription Plans & Packages
              </h2>
              <p className="text-xs text-slate-400">Select a subscription plan to activate or renew your distributor panel. Payments are processed securely via Razorpay.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePlans.map((plan) => {
                  const isCurrent = subStatus?.active && subStatus.subscription?.planId?._id === plan._id;
                  return (
                    <div key={plan._id} className={`glass-panel rounded-2xl p-5 border flex flex-col justify-between transition-all ${
                      isCurrent ? 'border-sky-500 bg-sky-950/10' : 'border-marine-800'
                    }`}>
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-white text-base">{plan.name}</h3>
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-sky-500/20 text-sky-400 text-[9px] font-bold rounded-full uppercase tracking-wider">Current</span>
                          )}
                        </div>
                        <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider font-mono">{plan.duration}</span>
                        
                        <div className="my-3">
                          <span className="font-extrabold text-white text-2xl font-mono">Rs. {plan.price}</span>
                        </div>

                        <div className="border-t border-marine-850/50 pt-3 text-xs text-slate-400 space-y-1">
                          <div className="flex justify-between">
                            <span>Client Headcount:</span>
                            <span className="font-semibold text-white">{plan.userLimit} Customers</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSubscribePlan(plan)}
                        disabled={loading}
                        className="w-full mt-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isCurrent ? 'Renew / Extend Plan' : 'Purchase Plan'}
                      </button>
                    </div>
                  );
                })}
                {availablePlans.length === 0 && (
                  <div className="col-span-3 text-center py-6 text-slate-500 bg-marine-card/10 border border-marine-800 rounded-2xl">
                    No subscription plans configured by Admin.
                  </div>
                )}
              </div>
            </div>

            {/* Pending Requests / Order Alerts Section */}
            {isSubActive && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Truck size={18} className="text-sky-400" />
                  Pending Delivery Requests from Clients
                </h2>
                <div className="glass-panel rounded-2xl overflow-hidden border border-marine-800">
                  <div className="p-4 bg-marine-card/50 border-b border-marine-800 text-xs font-bold text-slate-400 uppercase">
                    Requests Queue
                  </div>
                  <div className="divide-y divide-marine-800/40">
                    {orders.filter(o => o.status === 'pending').map((o) => (
                      <div key={o._id} className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 hover:bg-marine-card/10 transition-colors">
                        <div>
                          <div className="font-semibold text-white">{o.customerId?.name}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            Phone: {o.customerId?.phone} | Products:{' '}
                            <span className="text-slate-300 font-medium">
                              {o.products.map(p => `${p.name} (x${p.quantity})`).join(', ')}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end md:self-center">
                          <button
                            onClick={() => {
                              const del = prompt('Enter number of bottles delivered:', o.products.reduce((a,c) => a + c.quantity, 0));
                              const ret = prompt('Enter number of empty bottles returned:', '0');
                              if (del !== null && ret !== null) {
                                handleProcessOrder(o._id, 'delivered', del, ret);
                              }
                            }}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/20 text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Mark Delivered
                          </button>
                          <button
                            onClick={() => handleProcessOrder(o._id, 'cancelled')}
                            className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/30 text-rose-400 rounded text-xs font-semibold cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ))}
                    {orders.filter(o => o.status === 'pending').length === 0 && (
                      <div className="p-6 text-center text-slate-500 text-sm">
                        No pending water requests at this moment.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Product Catalog</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Add or manage water products, packaging types, and rates.</p>
              </div>
              <button
                onClick={() => setShowProductModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center"
              >
                <Plus size={16} />
                Add New Product
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((prod) => (
                <div key={prod._id} className="glass-panel rounded-2xl overflow-hidden border border-marine-800 hover:border-sky-500/40 transition-all flex flex-col justify-between">
                  <div className="p-5 space-y-3">
                    <div className="flex justify-between items-start">
                      <h3 className="font-bold text-white text-lg">{prod.name}</h3>
                      <span className="font-extrabold text-sky-400 text-lg">Rs. {prod.price}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{prod.description || 'No description provided.'}</p>
                  </div>
                  <div className="px-5 py-3.5 bg-marine-card/50 border-t border-marine-850 flex justify-between items-center text-xs text-slate-500">
                    <span>Availability Status:</span>
                    <span className={`font-semibold ${prod.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                      {prod.isActive ? 'In Stock' : 'Suspended'}
                    </span>
                  </div>
                </div>
              ))}
              {products.length === 0 && (
                <div className="col-span-3 text-center py-12 text-slate-500 glass-panel rounded-2xl border border-marine-800">
                  No products added yet. Click 'Add New Product' to start.
                </div>
              )}
            </div>
          </section>
        )}

        {/* CUSTOMERS TAB */}
        {activeTab === 'customers' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Customer Tracker</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Manage linked customers, outstanding bottles, balances, and download statements.</p>
              </div>
              <button
                onClick={() => setShowCustomerModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center"
              >
                <Plus size={16} />
                Link Customer
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-marine-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[650px]">
                  <thead>
                    <tr className="bg-marine-card border-b border-marine-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Customer</th>
                      <th className="p-4">Delivery Address</th>
                      <th className="p-4 text-rose-400">Payments Left</th>
                      <th className="p-4 text-teal-400">Bottles Pending</th>
                      <th className="p-4 text-right">Statement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {customers.map((cust) => (
                      <tr key={cust.relationId} className="hover:bg-marine-card/30 transition-colors">
                        <td className="p-4">
                          <div className="font-semibold text-white">{cust.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">{cust.phone}</div>
                        </td>
                        <td className="p-4 text-slate-300 max-w-[200px] truncate" title={cust.address}>
                          {cust.address}
                        </td>
                        <td className="p-4 font-bold text-white">
                          {cust.balance > 0 ? (
                            <span className="text-rose-400">Rs. {cust.balance}</span>
                          ) : cust.balance < 0 ? (
                            <span className="text-emerald-400">Paid Adv. (Rs. {Math.abs(cust.balance)})</span>
                          ) : (
                            <span className="text-slate-500">Nil</span>
                          )}
                        </td>
                        <td className="p-4 font-bold">
                          {cust.bottlesOutstanding > 0 ? (
                            <span className="text-teal-400">{cust.bottlesOutstanding} Jars</span>
                          ) : (
                            <span className="text-slate-500">All Returned</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleDownloadPDF(cust.customerId)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-marine-card hover:bg-marine-card/80 border border-marine-800 text-xs font-semibold rounded cursor-pointer transition-colors"
                          >
                            <FileText size={14} className="text-sky-400" />
                            Statement
                          </button>
                        </td>
                      </tr>
                    ))}
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">
                          No customer accounts connected to your supply.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* DELIVERIES TAB */}
        {activeTab === 'deliveries' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Delivery Ledger</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Log bottle drop-offs and empty returns, review historical orders.</p>
              </div>
              <button
                onClick={() => setShowOrderModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center"
              >
                <Plus size={16} />
                Log Delivery
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-marine-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-marine-card border-b border-marine-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Date</th>
                      <th className="p-4">Client</th>
                      <th className="p-4">Products (Qty)</th>
                      <th className="p-4">Bottles Log</th>
                      <th className="p-4">Cost (Rs)</th>
                      <th className="p-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {orders.map((ord) => (
                      <tr key={ord._id} className="hover:bg-marine-card/30 transition-colors">
                        <td className="p-4 text-slate-400">
                          {new Date(ord.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{ord.customerId?.name}</div>
                          <div className="text-[10px] text-slate-400">{ord.customerId?.phone}</div>
                        </td>
                        <td className="p-4 text-slate-200">
                          {ord.products.map(p => `${p.name} (${p.quantity})`).join(', ')}
                        </td>
                        <td className="p-4 text-xs font-mono text-slate-300">
                          Drop: {ord.bottlesDelivered} | Ret: {ord.bottlesReturned}
                        </td>
                        <td className="p-4 font-bold text-white">
                          Rs. {ord.totalAmount}
                        </td>
                        <td className="p-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            ord.status === 'delivered'
                              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                              : ord.status === 'cancelled'
                              ? 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
                              : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
                          }`}>
                            {ord.status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-500">
                          No delivery despatches logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* PAYMENTS TAB */}
        {activeTab === 'payments' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Payment Collections</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Record collections and review transaction histories.</p>
              </div>
              <button
                onClick={() => setShowPaymentModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-sm font-semibold cursor-pointer transition-colors self-start sm:self-center"
              >
                <Plus size={16} />
                Record Collection
              </button>
            </div>

            <div className="glass-panel rounded-2xl border border-marine-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-marine-card border-b border-marine-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Transaction Date</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Mode</th>
                      <th className="p-4">Reference Note</th>
                      <th className="p-4 text-emerald-400">Amount Received</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {payments.map((p) => (
                      <tr key={p._id} className="hover:bg-marine-card/30 transition-colors">
                        <td className="p-4 text-slate-400">
                          {new Date(p.paymentDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-white">{p.customerId?.name}</div>
                          <div className="text-[10px] text-slate-400">{p.customerId?.phone}</div>
                        </td>
                        <td className="p-4 text-slate-300 uppercase font-mono text-xs">
                          {p.paymentMethod}
                        </td>
                        <td className="p-4 text-slate-400 italic text-xs max-w-[200px] truncate" title={p.notes}>
                          {p.notes || '—'}
                        </td>
                        <td className="p-4 font-extrabold text-emerald-400">
                          + Rs. {p.amount}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">
                          No payment collections recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

      </main>

      {/* MODAL: ADD PRODUCT */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-glow rounded-2xl p-6 border border-sky-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Add Product</h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Product Name</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  placeholder="e.g. 20 Litre Mineral Jar"
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Price per unit (Rs)</label>
                <input
                  type="number"
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(e.target.value)}
                  placeholder="e.g. 80"
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Description / Capacity</label>
                <textarea
                  value={prodDesc}
                  onChange={(e) => setProdDesc(e.target.value)}
                  placeholder="Details about water source, container, etc."
                  rows="3"
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowProductModal(false)}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg cursor-pointer"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LINK CUSTOMER */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-glow rounded-2xl p-6 border border-sky-500/30">
            <h2 className="text-xl font-bold text-white mb-2">Link Customer</h2>
            <p className="text-xs text-slate-400 mb-4">Enter a user phone number to connect them to your water supply channel.</p>
            
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {showNewCustFields && (
                <div className="space-y-4 border-t border-marine-850 pt-4 mt-4 animate-float">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 text-sky-400 font-mono">Customer Name</label>
                    <input
                      type="text"
                      required
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      placeholder="John Doe"
                      className="w-full bg-marine-950 border border-sky-850 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 text-sky-400 font-mono">Delivery Address</label>
                    <input
                      type="text"
                      required
                      value={custAddress}
                      onChange={(e) => setCustAddress(e.target.value)}
                      placeholder="Door No, Street Name, City"
                      className="w-full bg-marine-950 border border-sky-850 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerModal(false);
                    setShowNewCustFields(false);
                    setCustPhone('');
                    setCustName('');
                    setCustAddress('');
                  }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg cursor-pointer"
                >
                  {showNewCustFields ? 'Register & Link' : 'Validate & Connect'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG DELIVERY */}
      {showOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-glow rounded-2xl p-6 border border-sky-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Log Delivery Dispatch</h2>
            <form onSubmit={handleAddOrder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Select Customer</label>
                <select
                  required
                  value={selectedCustId}
                  onChange={(e) => setSelectedCustId(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.relationId} value={c.customerId}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Select Product</label>
                <select
                  required
                  value={selectedProdId}
                  onChange={(e) => setSelectedProdId(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Rs. {p.price})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={orderQty}
                    onChange={(e) => {
                      setOrderQty(e.target.value);
                      setBottlesDelivered(e.target.value);
                    }}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Delivered</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bottlesDelivered}
                    onChange={(e) => setBottlesDelivered(e.target.value)}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Returned</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={bottlesReturned}
                    onChange={(e) => setBottlesReturned(e.target.value)}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowOrderModal(false)}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg cursor-pointer"
                >
                  Log Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: COLLECT PAYMENT */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-glow rounded-2xl p-6 border border-sky-500/30">
            <h2 className="text-xl font-bold text-white mb-4">Record Payment</h2>
            <form onSubmit={handleAddPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Select Customer</label>
                <select
                  required
                  value={payCustId}
                  onChange={(e) => setPayCustId(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Choose Customer --</option>
                  {customers.map((c) => (
                    <option key={c.relationId} value={c.customerId}>
                      {c.name} (Phone: {c.phone} | Bal: Rs. {c.balance})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Amount (Rs)</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Mode</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="cash">Cash Mode</option>
                    <option value="online">Online Mode (UPI)</option>
                    <option value="other">Other Mode</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Notes / Ref Number</label>
                <input
                  type="text"
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Txn ID, Month bill, etc."
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm rounded-lg cursor-pointer"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default VendorDashboard;
