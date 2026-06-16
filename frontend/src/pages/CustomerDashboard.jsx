import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplet, ShoppingBag, History, CreditCard, LogOut, Phone, ShieldAlert, RefreshCw, Send, Menu, X, Settings } from 'lucide-react';

const CustomerDashboard = () => {
  const { logout, user, authFetch, refreshUser } = useAuth();
  
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorDetails, setVendorDetails] = useState(null);
  
  const [activeTab, setActiveTab] = useState('shop'); // shop, history, payments, settings
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states - Request Delivery
  const [requestProd, setRequestProd] = useState(null);
  const [requestQty, setRequestQty] = useState(1);
  const [requestSlot, setRequestSlot] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);

  // Form states - Online Payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  // Settings Form States
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');

  // Phone Change States
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [tempPhoneOtp, setTempPhoneOtp] = useState('');

  // Fetch list of connected vendors
  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/customer/vendors');
      if (res.success) {
        setVendors(res.data);
        if (res.data.length > 0) {
          // Auto select first vendor
          setSelectedVendorId(res.data[0].vendorId);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch details (products, orders, payments) for selected vendor
  const fetchVendorDetails = async (vendorId) => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/customer/vendors/${vendorId}`);
      if (res.success) {
        setVendorDetails(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  useEffect(() => {
    if (selectedVendorId) {
      fetchVendorDetails(selectedVendorId);
    } else {
      setVendorDetails(null);
    }
  }, [selectedVendorId]);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileAddress(user.address || '');
    }
  }, [user]);

  // Handle settings update
  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = {
        name: profileName,
        address: profileAddress
      };

      const res = await authFetch('/customer/profile', {
        method: 'PUT',
        body: JSON.stringify(payload)
      });

      if (res.success) {
        setSuccess('Profile settings updated successfully!');
        await refreshUser();
      } else {
        setError(res.message || 'Failed to update settings');
      }
    } catch (err) {
      setError('Connection failure');
    } finally {
      setLoading(false);
    }
  };

  // Handle request phone change (send OTP to new phone number)
  const handleRequestPhoneChange = async (e) => {
    e.preventDefault();
    if (!newPhone) return setError('Please enter a new phone number');
    if (newPhone.length !== 10) return setError('Phone number must be exactly 10 digits');
    if (newPhone === user.phone) return setError('New number must be different from current phone');
    setError('');
    setLoading(true);

    try {
      const res = await authFetch('/customer/change-phone-request', {
        method: 'POST',
        body: JSON.stringify({ newPhone })
      });

      if (res.success) {
        setPhoneOtpSent(true);
        setSuccess('OTP verification code sent to your new phone number!');
        if (res.otp) {
          setTempPhoneOtp(res.otp);
        }
      } else {
        setError(res.message || 'Failed to request phone change');
      }
    } catch (err) {
      setError('Connection failure');
    } finally {
      setLoading(false);
    }
  };

  // Handle verify OTP and update phone number
  const handleVerifyPhoneChange = async (e) => {
    e.preventDefault();
    if (!phoneOtp) return setError('Please enter the verification OTP');
    setError('');
    setLoading(true);

    try {
      const res = await authFetch('/customer/change-phone-verify', {
        method: 'PUT',
        body: JSON.stringify({ newPhone, otp: phoneOtp })
      });

      if (res.success) {
        setSuccess('Your phone number has been updated successfully!');
        setShowPhoneModal(false);
        setNewPhone('');
        setPhoneOtp('');
        setPhoneOtpSent(false);
        setTempPhoneOtp('');
        await refreshUser();
      } else {
        setError(res.message || 'OTP verification failed');
      }
    } catch (err) {
      setError('Verification connection failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle place order (request delivery)
  const handleRequestDelivery = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!requestProd || !requestQty || requestQty < 1) return;

    try {
      const res = await authFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: user.id || user._id,
          vendorId: selectedVendorId,
          products: [{ productId: requestProd._id, quantity: Number(requestQty) }],
          status: 'pending', // Customer requests as pending
          deliverySlot: requestSlot
        })
      });

      if (res.success) {
        setSuccess(`Delivery request for ${requestProd.name} (x${requestQty}) placed successfully!`);
        setShowRequestModal(false);
        setRequestProd(null);
        setRequestQty(1);
        setRequestSlot('');
        fetchVendorDetails(selectedVendorId);
      } else {
        setError(res.message || 'Failed to place request');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Dynamically load Razorpay SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
      if (existingScript) {
        existingScript.onload = () => resolve(true);
        existingScript.onerror = () => resolve(false);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Initiate Razorpay checkout for customer-to-vendor payment
  const handlePayBalance = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!payAmount || Number(payAmount) <= 0) {
      setError('Please enter a valid payment amount');
      setLoading(false);
      return;
    }

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        setError('Failed to load Razorpay SDK. Verify internet connectivity.');
        setLoading(false);
        return;
      }

      // Create Razorpay Order
      const res = await authFetch('/payment/customer/create-order', {
        method: 'POST',
        body: JSON.stringify({
          vendorId: selectedVendorId,
          amount: Number(payAmount)
        })
      });

      if (!res.success) {
        setError(res.message || 'Failed to initiate online payment.');
        setLoading(false);
        return;
      }

      const { orderId, amount, currency, keyId } = res;

      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: vendorDetails?.vendor?.name || 'Water Supplier',
        description: 'Payment towards outstanding bill',
        order_id: orderId,
        handler: async function (response) {
          setLoading(true);
          try {
            const verifyRes = await authFetch('/payment/customer/verify', {
              method: 'POST',
              body: JSON.stringify({
                vendorId: selectedVendorId,
                amount: Number(payAmount),
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_signature: response.razorpay_signature
              })
            });

            if (verifyRes.success) {
              setSuccess('Payment successful and balance updated!');
              setShowPaymentModal(false);
              setPayAmount('');
              // Re-fetch vendor details to show updated balance & payments list
              fetchVendorDetails(selectedVendorId);
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
          name: user?.name || '',
          email: user?.email || '',
          contact: user?.phone || ''
        },
        theme: {
          color: '#0d9488' // teal color for customer dashboard theme
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

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-marine-950 text-slate-100">
      
      {/* MOBILE HEADER BAR */}
      <header className="flex md:hidden items-center justify-between p-4 bg-marine-sidebar border-b border-marine-800 z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-teal-600/10 rounded-lg text-teal-500 border border-teal-500/20">
            <Droplet size={18} className="fill-teal-500/20 text-teal-400" />
          </div>
          <h2 className="font-bold text-slate-800 text-sm">Customer Portal</h2>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 text-slate-600 hover:text-teal-600 transition-colors cursor-pointer"
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

      {/* SIDEBAR NAVIGATION (SLIDING DRAWER) */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-marine-sidebar border-r border-marine-800 flex flex-col justify-between p-6 z-40 transition-transform duration-300 md:static md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-600/10 rounded-lg text-teal-400 border border-teal-500/20">
                <Droplet size={24} className="fill-teal-400/20 text-teal-400" />
              </div>
              <div>
                <h2 className="font-bold text-white leading-tight">Customer Portal</h2>
                <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                  {import.meta.env.VITE_PROJECT_NAME || 'H2O Water App'}
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

          {/* User profile block */}
          <div className="p-3 bg-marine-card/40 border border-marine-800 rounded-xl space-y-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Logged In Client</div>
            <div className="font-semibold text-white truncate text-xs">{user?.name}</div>
            <div className="text-[10px] text-slate-400 font-mono">{user?.phone}</div>
          </div>

          {/* Navigation */}
          <nav className="space-y-2">
            {vendors.length > 0 && (
              <>
                <button
                  onClick={() => { setActiveTab('shop'); setError(''); setSuccess(''); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'shop'
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-950/40'
                      : 'text-slate-400 hover:bg-marine-card hover:text-white'
                  }`}
                >
                  <ShoppingBag size={18} />
                  Order Water
                </button>
                <button
                  onClick={() => { setActiveTab('history'); setError(''); setSuccess(''); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'history'
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-950/40'
                      : 'text-slate-400 hover:bg-marine-card hover:text-white'
                  }`}
                >
                  <History size={18} />
                  Order Requests
                </button>
                <button
                  onClick={() => { setActiveTab('payments'); setError(''); setSuccess(''); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                    activeTab === 'payments'
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-950/40'
                      : 'text-slate-400 hover:bg-marine-card hover:text-white'
                  }`}
                >
                  <CreditCard size={18} />
                  Payments Log
                </button>
              </>
            )}
            <button
              onClick={() => { setActiveTab('settings'); setError(''); setSuccess(''); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-teal-600 text-white shadow-lg shadow-teal-950/40'
                  : 'text-slate-400 hover:bg-marine-card hover:text-white'
              }`}
            >
              <Settings size={18} />
              Profile Settings
            </button>
          </nav>
        </div>

        {/* Footer actions */}
        <div className="space-y-4">
          {vendors.length > 0 && (
            <button
              onClick={() => {
                fetchVendors();
                if (selectedVendorId) fetchVendorDetails(selectedVendorId);
                setSidebarOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-semibold text-slate-400 hover:text-white border border-marine-850 rounded hover:bg-marine-card cursor-pointer transition-colors"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Sync Data
            </button>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-rose-950/40 border border-rose-900/30 text-rose-400 text-xs font-bold hover:bg-rose-900/40 hover:text-rose-300 transition-colors cursor-pointer"
          >
            <LogOut size={14} />
            Logout Portal
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
        {/* Banner Notifications for Settings and other tabs */}
        {(activeTab === 'settings' || vendors.length === 0) && (
          <div className="max-w-4xl mx-auto">
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
          </div>
        )}

        {activeTab === 'settings' ? (
          <section className="space-y-6 animate-tab-transition max-w-4xl mx-auto">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Client Portal Settings</h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">Manage your personal profile details and delivery address.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Profile Details Form */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800 space-y-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-marine-850 pb-3">
                  Edit Personal Details
                </h2>
                <form onSubmit={handleUpdateSettings} className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Full Name</label>
                      <input
                        type="text"
                        required
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Registered Phone</label>
                      <div className="flex gap-2">
                        <input
                          type="tel"
                          disabled
                          value={profilePhone}
                          className="flex-1 bg-marine-950/40 border border-marine-850 rounded-lg p-2.5 text-sm text-slate-400 cursor-not-allowed focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setNewPhone('');
                            setPhoneOtp('');
                            setPhoneOtpSent(false);
                            setTempPhoneOtp('');
                            setShowPhoneModal(true);
                          }}
                          className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer shadow shadow-teal-950/20"
                        >
                          Change Number
                        </button>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full mt-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Saving Settings...' : 'Save Settings'}
                  </button>
                </form>
              </div>

              {/* Address Form Card */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800 space-y-4 flex flex-col justify-between">
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2 border-b border-marine-850 pb-3">
                    Delivery Address Setup
                  </h2>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Provide your exact home or office address. This address is shown to the water supplier so they can drop off items at your exact location.
                  </p>

                  <div className="pt-2">
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2 font-mono">Current Delivery Address</label>
                    <textarea
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      required
                      rows="4"
                      placeholder="Enter your complete flat/house number, building name, street address, and landmark."
                      className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="p-3 bg-teal-500/5 border border-teal-500/10 rounded-xl text-[11px] text-slate-400 leading-relaxed mt-4">
                  <span className="font-bold text-teal-400 block mb-0.5">Quick Tip:</span>
                  Accurate details help delivery personnel find your door faster. Click "Save Settings" on the left after writing.
                </div>
              </div>
            </div>
          </section>
        ) : vendors.length === 0 ? (
          <div className="max-w-2xl mx-auto mt-6 md:mt-12 glass-panel rounded-3xl p-6 md:p-8 border border-rose-500/20 text-center space-y-6">
            <div className="inline-flex items-center justify-center p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 animate-float">
              <ShieldAlert size={48} className="fill-rose-500/10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl md:text-2xl font-bold text-white">No Vendor Link Established</h1>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed">
                Your customer account for mobile <span className="text-rose-400 font-mono font-bold">{user?.phone}</span> is active, but you are not linked to a local water distributor.
              </p>
            </div>
            
            <div className="p-4 bg-marine-card/50 rounded-xl border border-marine-850 text-xs text-slate-400 max-w-md mx-auto text-left leading-relaxed">
              <span className="font-bold text-white block mb-1">How do I connect?</span>
              Give your phone number (<span className="text-teal-400 font-semibold">{user?.phone}</span>) to your local water delivery business. Once they input it in their Vendor Tracker, refresh your dashboard to view their shop and log orders.
            </div>

            <button
              onClick={fetchVendors}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-500 border border-rose-500/20 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Check Connection Again
            </button>
          </div>
        ) : (
          /* CASE 2: CONNECTED TO A VENDOR */
          <div className="space-y-6">
            
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

            {/* Vendor Selector & Contact Info */}
            <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6 border-b border-marine-850 pb-6">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Water Supplier</span>
                {vendors.length > 1 ? (
                  <select
                    value={selectedVendorId}
                    onChange={(e) => setSelectedVendorId(e.target.value)}
                    className="mt-1 block bg-marine-card border border-marine-800 rounded-lg py-1.5 px-3 text-sm text-white font-semibold focus:outline-none"
                  >
                    {vendors.map(v => (
                      <option key={v.relationId} value={v.vendorId}>{v.name}</option>
                    ))}
                  </select>
                ) : (
                  <h1 className="text-xl md:text-2xl font-bold text-white mt-1">{vendorDetails?.vendor?.name}</h1>
                )}
                
                {/* Contact phone */}
                {vendorDetails?.vendor?.phone && (
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-1.5 font-medium">
                    <Phone size={12} className="text-teal-400" />
                    <span>Vendor Support: {vendorDetails.vendor.phone}</span>
                  </div>
                )}
              </div>

              {/* Outstanding metrics display */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full lg:w-auto">
                <div className="glass-panel px-4 py-2.5 rounded-xl border border-marine-800 text-left flex items-center justify-between gap-4 flex-1 sm:flex-none">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Outstanding Payments Due</div>
                    <div className={`text-base md:text-lg font-extrabold ${vendorDetails?.balance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {vendorDetails?.balance > 0 ? `Rs. ${vendorDetails.balance}` : vendorDetails?.balance < 0 ? `Adv. Rs. ${Math.abs(vendorDetails.balance)}` : 'Nil'}
                    </div>
                  </div>
                  {vendorDetails?.vendor?.razorpayKeyId && vendorDetails?.balance > 0 && (
                    <button
                      onClick={() => {
                        setError('');
                        setSuccess('');
                        setPayAmount(vendorDetails.balance);
                        setShowPaymentModal(true);
                      }}
                      className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-bold transition-all cursor-pointer shadow shadow-teal-950/40"
                    >
                      Pay Online
                    </button>
                  )}
                </div>

                <div className="glass-panel px-4 py-2.5 rounded-xl border border-marine-800 text-left sm:text-right flex-1 sm:flex-none">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono">Bottles to Return</div>
                  <div className={`text-base md:text-lg font-extrabold ${vendorDetails?.bottlesOutstanding > 0 ? 'text-teal-400' : 'text-slate-500'}`}>
                    {vendorDetails?.bottlesOutstanding > 0 ? `${vendorDetails.bottlesOutstanding} empty jars` : 'None pending'}
                  </div>
                </div>
              </div>
            </div>

            {/* TAB CONTENT: WATER SHOP */}
            {activeTab === 'shop' && (
              <section className="space-y-6 animate-tab-transition">
                <h2 className="text-lg font-bold text-white">Place Delivery Requests</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {vendorDetails?.products.map((prod) => (
                    <div key={prod._id} className="glass-panel rounded-2xl overflow-hidden border border-marine-800 hover:border-teal-500/40 transition-all flex flex-col justify-between">
                      <div className="p-5 space-y-3">
                        <h3 className="font-bold text-white text-lg flex items-center gap-2">
                          {prod.name}
                          {prod.quantity && (
                            <span className="text-xs font-mono px-2 py-0.5 bg-teal-500/10 border border-teal-500/20 text-teal-400 rounded-full shrink-0">
                              {prod.quantity}
                            </span>
                          )}
                        </h3>
                        <p className="text-xs text-slate-400 leading-relaxed">{prod.description || 'No description provided.'}</p>
                      </div>
                      <div className="px-5 py-4 bg-marine-card/50 border-t border-marine-850 flex justify-between items-center">
                        <span className="font-extrabold text-teal-400 text-lg">Rs. {prod.price}</span>
                        <button
                          onClick={() => {
                            setRequestProd(prod);
                            const vendorSlots = vendorDetails?.vendor?.deliverySlots || [];
                            const defaultSlots = ['Morning (8 AM - 12 PM)', 'Afternoon (12 PM - 4 PM)', 'Evening (4 PM - 8 PM)'];
                            const slotsToUse = vendorSlots.length > 0 ? vendorSlots : defaultSlots;
                            setRequestSlot(slotsToUse[0] || '');
                            setShowRequestModal(true);
                          }}
                          className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded text-xs font-bold transition-colors cursor-pointer"
                        >
                          Request Jar
                        </button>
                      </div>
                    </div>
                  ))}
                  {vendorDetails?.products.length === 0 && (
                    <div className="col-span-3 text-center py-12 text-slate-500 glass-panel rounded-2xl border border-marine-800">
                      This vendor has not published any items in their shop yet.
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* TAB CONTENT: ORDER REQUESTS HISTORY */}
            {activeTab === 'history' && (
              <section className="space-y-6 animate-tab-transition">
                <h2 className="text-lg font-bold text-white">Your Delivery Logs</h2>
                <div className="glass-panel rounded-2xl border border-marine-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[600px]">
                      <thead>
                        <tr className="bg-marine-card border-b border-marine-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="p-4">Date / Slot</th>
                          <th className="p-4">Items Requested</th>
                          <th className="p-4">Jars (Deliv/Ret)</th>
                          <th className="p-4">Amount (Rs)</th>
                          <th className="p-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-marine-800/40 text-sm">
                        {vendorDetails?.orders.map((ord) => (
                          <tr key={ord._id} className="hover:bg-marine-card/30 transition-colors">
                            <td className="p-4 text-slate-400">
                              <div>{new Date(ord.createdAt).toLocaleDateString()}</div>
                              {ord.deliverySlot && (
                                <div className="text-[10px] text-teal-400 font-mono mt-0.5" title="Preferred Delivery Slot">
                                  {ord.deliverySlot}
                                </div>
                              )}
                            </td>
                            <td className="p-4 font-semibold text-white">
                              {ord.products.map(p => `${p.name} (x${p.quantity})`).join(', ')}
                            </td>
                            <td className="p-4 text-xs font-mono text-slate-300">
                              {ord.status === 'delivered' ? `Delivered: ${ord.bottlesDelivered} | Returned: ${ord.bottlesReturned}` : '—'}
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
                        {vendorDetails?.orders.length === 0 && (
                          <tr>
                            <td colSpan="5" className="p-8 text-center text-slate-500">
                              No delivery request histories recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {/* TAB CONTENT: PAYMENTS LOG */}
            {activeTab === 'payments' && (
              <section className="space-y-6 animate-tab-transition">
                <h2 className="text-lg font-bold text-white">Payments History</h2>
                <div className="glass-panel rounded-2xl border border-marine-800">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[550px]">
                      <thead>
                        <tr className="bg-marine-card border-b border-marine-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                          <th className="p-4">Payment Date</th>
                          <th className="p-4">Mode</th>
                          <th className="p-4">Ref Details</th>
                          <th className="p-4 text-emerald-400">Amount Paid</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-marine-800/40 text-sm">
                        {vendorDetails?.payments.map((p) => (
                          <tr key={p._id} className="hover:bg-marine-card/30 transition-colors">
                            <td className="p-4 text-slate-400">
                              {new Date(p.paymentDate).toLocaleDateString()}
                            </td>
                            <td className="p-4 text-slate-300 font-mono text-xs uppercase">
                              {p.paymentMethod}
                            </td>
                            <td className="p-4 text-slate-400 italic text-xs">
                              {p.notes || '—'}
                            </td>
                            <td className="p-4 font-extrabold text-emerald-400">
                              Rs. {p.amount}
                            </td>
                          </tr>
                        ))}
                        {vendorDetails?.payments.length === 0 && (
                          <tr>
                            <td colSpan="4" className="p-8 text-center text-slate-500">
                              No payment collection logs registered.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

          </div>
        )}

      </main>

      {/* REQUEST DELIVERY MODAL */}
      {showRequestModal && requestProd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-glow rounded-2xl p-6 border border-teal-500/30">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-teal-500/10 mb-3 border border-teal-500/20 text-teal-400">
                <Send size={24} className="animate-float" />
              </div>
              <h2 className="text-xl font-bold text-white">Request Water Jar</h2>
              <p className="text-xs text-slate-400 mt-1">
                Confirm your request for <span className="text-teal-400 font-bold">{requestProd.name}</span>.
              </p>
            </div>

            <form onSubmit={handleRequestDelivery} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quantity (Jars)</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={requestQty}
                  onChange={(e) => setRequestQty(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preferred Delivery Slot</label>
                <select
                  value={requestSlot}
                  onChange={(e) => setRequestSlot(e.target.value)}
                  required
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500 cursor-pointer"
                >
                  {(vendorDetails?.vendor?.deliverySlots && vendorDetails.vendor.deliverySlots.length > 0
                    ? vendorDetails.vendor.deliverySlots
                    : ['Morning (8 AM - 12 PM)', 'Afternoon (12 PM - 4 PM)', 'Evening (4 PM - 8 PM)']
                  ).map((slot, index) => (
                    <option key={index} value={slot}>
                      {slot}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-marine-850 pt-3 mt-3 flex justify-between items-center text-xs text-slate-400">
                <span>Estimated cost:</span>
                <span className="font-bold text-white text-sm">Rs. {requestProd.price * requestQty}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowRequestModal(false); setRequestProd(null); setRequestQty(1); }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors"
                >
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ONLINE PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-glow rounded-2xl p-6 border border-teal-500/30">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-teal-500/10 mb-3 border border-teal-500/20 text-teal-400">
                <CreditCard size={24} className="animate-float" />
              </div>
              <h2 className="text-xl font-bold text-white">Online Payment</h2>
              <p className="text-xs text-slate-400 mt-1">
                Pay your outstanding balance to <span className="text-teal-400 font-bold">{vendorDetails?.vendor?.name}</span>.
              </p>
            </div>

            {/* Error Display inside Modal */}
            {error && (
              <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {error}
              </div>
            )}

            <form onSubmit={handlePayBalance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Payment Amount (Rs)</label>
                <input
                  type="number"
                  min="1"
                  max={vendorDetails?.balance}
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Maximum payable: Rs. {vendorDetails?.balance}</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowPaymentModal(false); setPayAmount(''); }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                  disabled={loading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                >
                  {loading ? 'Processing...' : 'Pay with Razorpay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHONE CHANGE VERIFICATION MODAL */}
      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-glow rounded-2xl p-6 border border-teal-500/30">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-teal-500/10 mb-3 border border-teal-500/20 text-teal-400">
                <Phone size={24} className="animate-float" />
              </div>
              <h2 className="text-xl font-bold text-white font-sans">Modify Phone Number</h2>
              <p className="text-xs text-slate-400 mt-1">
                You will need to verify the new phone number using a secure OTP.
              </p>
            </div>

            {!phoneOtpSent ? (
              <form onSubmit={handleRequestPhoneChange} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">New Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPhoneModal(false);
                      setNewPhone('');
                      setPhoneOtp('');
                      setPhoneOtpSent(false);
                      setTempPhoneOtp('');
                    }}
                    className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send OTP'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleVerifyPhoneChange} className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-xs text-slate-300">Enter the 6-digit OTP code sent to your new phone number.</p>
                  {tempPhoneOtp && (
                    <div className="mt-3 p-2 bg-cyan-950/60 rounded border border-cyan-800/40 text-cyan-300 text-xs font-mono">
                      Dev Testing OTP: <span className="font-bold text-sm tracking-wider">{tempPhoneOtp}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">OTP Code</label>
                  <input
                    type="text"
                    maxLength="6"
                    required
                    value={phoneOtp}
                    onChange={(e) => setPhoneOtp(e.target.value)}
                    placeholder="123456"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white text-center font-mono tracking-widest focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneOtp('');
                      setPhoneOtpSent(false);
                      setTempPhoneOtp('');
                    }}
                    className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Update'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerDashboard;
