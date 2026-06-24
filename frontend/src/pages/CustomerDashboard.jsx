import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Droplet, ShoppingBag, History, CreditCard, LogOut,
  Phone, ShieldAlert, RefreshCw, Send, Menu, X,
  Settings, Trash2, MapPin, Plus, CheckCircle2, Clock,
  XCircle, ChevronRight, Wallet, Package, Star, ArrowRight,
  AlertCircle, Sparkles, TrendingUp, User
} from 'lucide-react';

/* ─── Small animated count-up hook ─────────────────────────── */
function useCountUp(target, duration = 900) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!target || isNaN(target)) { setValue(target); return; }
    const num = Number(target);
    const steps = 40;
    const step = num / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= num) { setValue(num); clearInterval(timer); }
      else setValue(Math.round(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

/* ─── Skeleton loader component ─────────────────────────────── */
const Skeleton = ({ className = '' }) => (
  <div className={`cp-shimmer rounded-lg ${className}`} />
);

/* ─── Status badge component ─────────────────────────────────── */
const StatusBadge = ({ status }) => {
  const map = {
    delivered: { cls: 'cp-badge-delivered', icon: <CheckCircle2 size={11} />, label: 'DELIVERED' },
    pending:   { cls: 'cp-badge-pending',   icon: <Clock size={11} />,         label: 'PENDING'   },
    cancelled: { cls: 'cp-badge-cancelled', icon: <XCircle size={11} />,       label: 'CANCELLED' },
  };
  const s = map[status] || map.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${s.cls}`}>
      {s.icon}
      {s.label}
    </span>
  );
};

/* ─── Right-side Drawer wrapper ──────────────────────────────── */
const Drawer = ({ open, onClose, title, subtitle, icon, children, accentColor = 'purple' }) => {
  const accentMap = {
    purple: 'from-violet-600/30 via-purple-600/20 to-transparent',
    teal:   'from-teal-500/30 via-cyan-600/20 to-transparent',
    rose:   'from-rose-500/30 via-pink-600/20 to-transparent',
  };
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="cp-drawer-overlay absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div className="cp-drawer-enter relative w-full max-w-md h-full cp-glass-bright flex flex-col shadow-2xl">
        {/* Gradient header */}
        <div className={`relative px-6 py-6 bg-gradient-to-br ${accentMap[accentColor]} border-b border-white/10`}>
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.4),transparent_70%)]" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/10 border border-white/15 text-white shadow-inner">
                {icon}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">{title}</h2>
                {subtitle && <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all cursor-pointer mt-0.5 shrink-0"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ─── Main CustomerDashboard ─────────────────────────────────── */
const CustomerDashboard = () => {
  const { logout, user, authFetch, refreshUser } = useAuth();

  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [vendorDetails, setVendorDetails] = useState(null);

  const [activeTab, setActiveTab] = useState('shop');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Request Delivery
  const [requestProd, setRequestProd] = useState(null);
  const [requestQty, setRequestQty] = useState(1);
  const [requestSlot, setRequestSlot] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestAddress, setRequestAddress] = useState('');
  const [isCustomAddress, setIsCustomAddress] = useState(false);
  const [saveToProfile, setSaveToProfile] = useState(false);

  // Online Payment
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');

  // Settings
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileAddress, setProfileAddress] = useState('');
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState('');
  const [fetchingLocation, setFetchingLocation] = useState(false);

  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [addressError, setAddressError] = useState('');
  const [addressSuccess, setAddressSuccess] = useState('');

  // Phone Change
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [phoneOtp, setPhoneOtp] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [tempPhoneOtp, setTempPhoneOtp] = useState('');

  /* ── Data fetching ── */
  const fetchVendors = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/customer/vendors');
      if (res.success) {
        setVendors(res.data);
        if (res.data.length > 0) setSelectedVendorId(res.data[0].vendorId);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchVendorDetails = async (vendorId) => {
    if (!vendorId) return;
    setLoading(true);
    try {
      const res = await authFetch(`/customer/vendors/${vendorId}`);
      if (res.success) setVendorDetails(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchVendors(); }, []);
  useEffect(() => {
    if (selectedVendorId) fetchVendorDetails(selectedVendorId);
    else setVendorDetails(null);
  }, [selectedVendorId]);
  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setProfilePhone(user.phone || '');
      setProfileAddress(user.address || '');
      setSavedAddresses(user.addresses || []);
    }
  }, [user]);

  /* ── Address handlers ── */
  const handleSaveAddresses = async (newAddresses, activeAddress) => {
    setAddressError(''); setAddressSuccess(''); setLoading(true);
    try {
      const res = await authFetch('/customer/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: profileName, addresses: newAddresses, address: activeAddress })
      });
      if (res.success) { setAddressSuccess('Addresses updated!'); await refreshUser(); }
      else setAddressError(res.message || 'Failed to save');
    } catch { setAddressError('Connection failure'); }
    finally { setLoading(false); }
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) { setAddressError('Geolocation not supported.'); return; }
    setFetchingLocation(true); setAddressError(''); setAddressSuccess('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&accept-language=en`);
          const data = await res.json();
          if (data?.display_name) {
            setNewAddress(data.display_name);
            setAddressSuccess('Location retrieved! Review and click "Add Address".');
          } else setAddressError('Could not resolve location.');
        } catch { setAddressError('Failed to fetch address from location.'); }
        finally { setFetchingLocation(false); }
      },
      (err) => {
        setFetchingLocation(false);
        const msgs = { 1: 'Location permission denied.', 2: 'Location unavailable.', 3: 'Location request timed out.' };
        setAddressError(msgs[err.code] || 'Unknown geolocation error.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleAddAddressList = async (e) => {
    e.preventDefault();
    setAddressError(''); setAddressSuccess('');
    const trimmed = newAddress.trim();
    if (!trimmed) return;
    if (savedAddresses.some(a => a.toLowerCase() === trimmed.toLowerCase()))
      return setAddressError('This address is already saved.');
    if (savedAddresses.length >= 5)
      return setAddressError('Maximum 5 addresses allowed.');
    const updated = [...savedAddresses, trimmed];
    const def = profileAddress || trimmed;
    setSavedAddresses(updated); setNewAddress('');
    if (!profileAddress) setProfileAddress(def);
    await handleSaveAddresses(updated, profileAddress || def);
  };

  const handleDeleteAddress = async (idx) => {
    setAddressError(''); setAddressSuccess('');
    const del = savedAddresses[idx];
    const updated = savedAddresses.filter((_, i) => i !== idx);
    let newDef = profileAddress;
    if (del === profileAddress) { newDef = updated[0] || ''; setProfileAddress(newDef); }
    setSavedAddresses(updated);
    await handleSaveAddresses(updated, newDef);
  };

  const handleSetDefaultAddress = async (addr) => {
    setAddressError(''); setAddressSuccess('');
    setProfileAddress(addr);
    await handleSaveAddresses(savedAddresses, addr);
  };

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setProfileError(''); setProfileSuccess(''); setLoading(true);
    try {
      const res = await authFetch('/customer/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: profileName, address: profileAddress, addresses: savedAddresses })
      });
      if (res.success) { setProfileSuccess('Profile saved!'); await refreshUser(); }
      else setProfileError(res.message || 'Failed to update');
    } catch { setProfileError('Connection failure'); }
    finally { setLoading(false); }
  };

  const handleRequestPhoneChange = async (e) => {
    e.preventDefault();
    if (!newPhone) return setError('Enter a new phone number');
    if (newPhone.length !== 10) return setError('Must be 10 digits');
    if (newPhone === user.phone) return setError('Must differ from current number');
    setError(''); setLoading(true);
    try {
      const res = await authFetch('/customer/change-phone-request', { method: 'POST', body: JSON.stringify({ newPhone }) });
      if (res.success) {
        setPhoneOtpSent(true);
        setSuccess('OTP sent to new number!');
        if (res.otp) setTempPhoneOtp(res.otp);
      } else setError(res.message || 'Failed to send OTP');
    } catch { setError('Connection failure'); }
    finally { setLoading(false); }
  };

  const handleVerifyPhoneChange = async (e) => {
    e.preventDefault();
    if (!phoneOtp) return setError('Enter OTP');
    setError(''); setLoading(true);
    try {
      const res = await authFetch('/customer/change-phone-verify', { method: 'PUT', body: JSON.stringify({ newPhone, otp: phoneOtp }) });
      if (res.success) {
        setProfileSuccess('Phone updated successfully!');
        setShowPhoneModal(false);
        setNewPhone(''); setPhoneOtp(''); setPhoneOtpSent(false); setTempPhoneOtp('');
        await refreshUser();
      } else setError(res.message || 'OTP verification failed');
    } catch { setError('Verification failed'); }
    finally { setLoading(false); }
  };

  const handleRequestDelivery = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!requestProd || !requestQty || requestQty < 1) return;
    if (!requestAddress.trim()) return setError('Please provide a delivery address');
    setLoading(true);
    try {
      const res = await authFetch('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerId: user.id || user._id,
          vendorId: selectedVendorId,
          products: [{ productId: requestProd._id, quantity: Number(requestQty) }],
          status: 'pending',
          deliverySlot: requestSlot,
          deliveryAddress: requestAddress.trim(),
          saveToProfile: isCustomAddress && saveToProfile
        })
      });
      if (res.success) {
        setSuccess(`Request for ${requestProd.name} (×${requestQty}) placed!`);
        setShowRequestModal(false);
        setRequestProd(null); setRequestQty(1); setRequestSlot('');
        setRequestAddress(''); setIsCustomAddress(false); setSaveToProfile(false);
        fetchVendorDetails(selectedVendorId);
        if (isCustomAddress && saveToProfile) await refreshUser();
      } else setError(res.message || 'Failed to place request');
    } catch { setError('Connection failure'); }
    finally { setLoading(false); }
  };

  const loadRazorpayScript = () => new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });

  const handlePayBalance = async (e) => {
    e.preventDefault();
    setError(''); setSuccess(''); setLoading(true);
    if (!payAmount || Number(payAmount) <= 0) { setError('Enter valid amount'); setLoading(false); return; }
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) { setError('Failed to load Razorpay. Check internet.'); setLoading(false); return; }
      const res = await authFetch('/payment/customer/create-order', {
        method: 'POST',
        body: JSON.stringify({ vendorId: selectedVendorId, amount: Number(payAmount) })
      });
      if (!res.success) { setError(res.message || 'Failed to initiate payment.'); setLoading(false); return; }
      const { orderId, amount, currency, keyId } = res;
      const options = {
        key: keyId, amount, currency,
        name: vendorDetails?.vendor?.name || 'Water Supplier',
        description: 'Outstanding bill payment',
        order_id: orderId,
        handler: async (response) => {
          setLoading(true);
          try {
            const vr = await authFetch('/payment/customer/verify', {
              method: 'POST',
              body: JSON.stringify({ vendorId: selectedVendorId, amount: Number(payAmount), ...response })
            });
            if (vr.success) {
              setSuccess('Payment successful!');
              setShowPaymentModal(false); setPayAmount('');
              fetchVendorDetails(selectedVendorId);
            } else setError(vr.message || 'Signature verification failed.');
          } catch { setError('Verification failed.'); }
          finally { setLoading(false); }
        },
        prefill: { name: user?.name || '', email: user?.email || '', contact: user?.phone || '' },
        theme: { color: '#7c3aed' },
        modal: { ondismiss: () => setLoading(false) }
      };
      new window.Razorpay(options).open();
    } catch { setError('Checkout failed'); setLoading(false); }
  };

  /* ── Derived ── */
  const userInitials = user?.name ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  const balanceDisplay = vendorDetails?.balance > 0
    ? { label: `₹${vendorDetails.balance}`, color: 'text-rose-400', glow: 'cp-glow-rose', note: 'due' }
    : vendorDetails?.balance < 0
    ? { label: `₹${Math.abs(vendorDetails.balance)}`, color: 'text-emerald-400', glow: 'cp-glow-emerald', note: 'advance' }
    : { label: 'Clear', color: 'text-emerald-400', glow: 'cp-glow-emerald', note: 'settled' };

  const navItems = [
    { id: 'shop',     icon: <ShoppingBag size={17} />,  label: 'Order Water',     show: vendors.length > 0 },
    { id: 'history',  icon: <History size={17} />,       label: 'Order History',   show: vendors.length > 0 },
    { id: 'payments', icon: <CreditCard size={17} />,    label: 'Payments',        show: vendors.length > 0 },
    { id: 'settings', icon: <Settings size={17} />,      label: 'Settings',        show: true               },
  ].filter(n => n.show);

  /* ─── Input style helper ─── */
  const inputCls = 'w-full rounded-xl px-4 py-3 text-sm bg-white/6 border border-white/10 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 focus:bg-violet-500/5 transition-all';
  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2';

  /* ─── Alert helper inside forms ─── */
  const Alert = ({ type, msg, onClose }) => {
    if (!msg) return null;
    const colors = {
      error:   'bg-rose-500/10 border-rose-500/20 text-rose-400',
      success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
    };
    return (
      <div className={`p-3 rounded-xl border text-xs flex justify-between items-center cp-slide-up ${colors[type]}`}>
        <span>{msg}</span>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10 cursor-pointer shrink-0 ml-3 transition-colors">
          <X size={13} />
        </button>
      </div>
    );
  };

  /* ══════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════ */
  return (
    <div className="customer-portal h-screen overflow-hidden flex flex-col md:flex-row">

      {/* ── MOBILE HEADER ─────────────────────────────────── */}
      <header className="flex md:hidden items-center justify-between px-5 py-4 z-20"
        style={{ background: 'rgba(14,26,46,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
            <Droplet size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-sm">Customer Portal</span>
        </div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-2 rounded-xl cursor-pointer text-slate-400 hover:text-white hover:bg-white/10 transition-all">
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* ── MOBILE BACKDROP ────────────────────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 md:hidden cp-fade-in"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ────────────────────────────────────────── */}
      <aside
        className={`fixed inset-y-0 left-0 w-68 z-40 flex flex-col transition-transform duration-300 ease-out md:static md:translate-x-0 md:w-64 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ width: '260px', background: 'linear-gradient(180deg,#112035 0%,#0e1a2e 100%)', borderRight: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Logo area */}
        <div className="px-5 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg cp-glow-purple"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>
                <Droplet size={20} className="text-white fill-white/30" />
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#080f20] cp-glow-pulse-anim" />
              </div>
              <div>
                <div className="font-bold text-white text-sm leading-tight">Customer Portal</div>
                <div className="text-[10px] text-slate-500 tracking-widest uppercase font-semibold mt-0.5">
                  {import.meta.env.VITE_PROJECT_NAME || 'H2O Water App'}
                </div>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden p-1.5 rounded-lg text-slate-500 hover:text-white hover:bg-white/10 cursor-pointer transition-all">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* User profile block */}
        <div className="mx-4 mb-5 p-4 rounded-2xl" style={{ background: 'rgba(124,58,237,0.16)', border: '1px solid rgba(124,58,237,0.28)' }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', boxShadow: '0 4px 14px rgba(124,58,237,0.35)' }}>
              {userInitials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-white text-sm truncate">{user?.name || 'Customer'}</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5">{user?.phone}</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {/* Vendor selector if multiple */}
          {vendors.length > 1 && (
            <div className="px-2 pb-3 mb-2 border-b border-white/5">
              <label className="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">Water Supplier</label>
              <select
                value={selectedVendorId}
                onChange={e => setSelectedVendorId(e.target.value)}
                className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#f1f5f9' }}
              >
                {vendors.map(v => <option key={v.relationId} value={v.vendorId}>{v.name}</option>)}
              </select>
            </div>
          )}

          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id); setError(''); setSuccess(''); setSidebarOpen(false); }}
              className={`cp-nav-item w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold cursor-pointer text-left ${activeTab === item.id ? 'active text-white' : 'text-slate-300'}`}
            >
              <span className={`transition-colors ${activeTab === item.id ? 'text-violet-400' : ''}`}>{item.icon}</span>
              {item.label}
              {activeTab === item.id && <ChevronRight size={14} className="ml-auto text-violet-400 opacity-70" />}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 space-y-2 border-t border-white/5">
          {vendors.length > 0 && (
            <button
              onClick={() => { fetchVendors(); if (selectedVendorId) fetchVendorDetails(selectedVendorId); setSidebarOpen(false); }}
              className="cp-btn-ghost w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              Sync Data
            </button>
          )}
          <button
            onClick={logout}
            className="cp-btn-danger w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
          >
            <LogOut size={13} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ───────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto px-4 py-5 md:px-8 md:py-7">

        {/* Global banner alerts */}
        {activeTab !== 'settings' && (error || success) && (
          <div className="mb-5 space-y-2">
            <Alert type="error"   msg={error}   onClose={() => setError('')} />
            <Alert type="success" msg={success} onClose={() => setSuccess('')} />
          </div>
        )}

        {/* ══ SETTINGS TAB ════════════════════════════════ */}
        {activeTab === 'settings' && (
          <section className="space-y-6 animate-tab-transition max-w-2xl mx-auto cp-slide-up">
            <div>
              <h1 className="text-2xl font-bold text-white cp-gradient-text inline-block">Profile Settings</h1>
              <p className="text-sm text-slate-400 mt-1">Manage your personal details and delivery addresses.</p>
            </div>

            <Alert type="error"   msg={profileError}   onClose={() => setProfileError('')} />
            <Alert type="success" msg={profileSuccess} onClose={() => setProfileSuccess('')} />

            {/* Personal details card */}
            <div className="cp-glass rounded-2xl p-6 space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2 pb-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <User size={16} className="text-violet-400" /> Personal Details
              </h2>
              <form onSubmit={handleUpdateSettings} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Full Name</label>
                    <input type="text" required value={profileName} onChange={e => setProfileName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>Registered Phone</label>
                    <div className="flex gap-2">
                      <input type="tel" disabled value={profilePhone}
                        className={`${inputCls} flex-1 cursor-not-allowed opacity-50`} />
                      <button type="button"
                        onClick={() => { setNewPhone(''); setPhoneOtp(''); setPhoneOtpSent(false); setTempPhoneOtp(''); setShowPhoneModal(true); }}
                        className="cp-btn-primary px-3.5 rounded-xl text-xs font-semibold shrink-0 cursor-pointer">
                        <span>Change</span>
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 flex gap-1 items-start">
                  <span className="text-violet-400 font-bold shrink-0">Note:</span>
                  Click "Save Details" to apply name changes.
                </p>
                <button type="submit" disabled={loading}
                  className="cp-btn-primary w-full py-3 rounded-xl font-semibold text-sm cursor-pointer disabled:opacity-50">
                  <span>{loading ? 'Saving…' : 'Save Details'}</span>
                </button>
              </form>
            </div>

            {/* Addresses card */}
            <div className="cp-glass rounded-2xl p-6 space-y-5">
              <h2 className="text-base font-bold text-white flex items-center gap-2 pb-3"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                <MapPin size={16} className="text-teal-400" /> Delivery Addresses
              </h2>

              <Alert type="error"   msg={addressError}   onClose={() => setAddressError('')} />
              <Alert type="success" msg={addressSuccess} onClose={() => setAddressSuccess('')} />

              {/* Active address */}
              {profileAddress ? (
                <div className="p-4 rounded-xl flex gap-3 items-start"
                  style={{ background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)' }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                    style={{ background: 'rgba(45,212,191,0.15)' }}>
                    <MapPin size={15} className="text-teal-400" />
                  </div>
                  <div>
                    <div className="text-[10px] text-teal-400 font-bold uppercase tracking-wider mb-1">Active Location</div>
                    <p className="text-sm text-slate-200 leading-relaxed">{profileAddress}</p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl" style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)' }}>
                  <p className="text-xs text-rose-400">No active delivery location. Add and select one below.</p>
                </div>
              )}

              {/* Saved list */}
              <div>
                <label className={labelCls}>Saved Addresses ({savedAddresses.length}/5)</label>
                {savedAddresses.length > 0 ? (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                    {savedAddresses.map((addr, idx) => {
                      const isActive = addr === profileAddress;
                      return (
                        <div key={idx} className={`p-3 rounded-xl flex justify-between items-start gap-3 transition-all ${isActive ? 'border border-teal-500/25' : 'border border-white/6'}`}
                          style={{ background: isActive ? 'rgba(45,212,191,0.07)' : 'rgba(255,255,255,0.03)' }}>
                          <div className="flex-1">
                            <p className="text-xs text-slate-300 leading-relaxed">{addr}</p>
                            {isActive ? (
                              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold text-teal-400"
                                style={{ background: 'rgba(45,212,191,0.12)', border: '1px solid rgba(45,212,191,0.25)' }}>
                                ✓ Active Default
                              </span>
                            ) : (
                              <button type="button" onClick={() => handleSetDefaultAddress(addr)}
                                className="mt-1.5 text-[10px] text-violet-400 hover:text-violet-300 font-semibold cursor-pointer transition-colors">
                                Set as default →
                              </button>
                            )}
                          </div>
                          <button type="button" onClick={() => handleDeleteAddress(idx)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 cursor-pointer transition-colors">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic py-2">No saved addresses yet.</p>
                )}
              </div>

              {/* Add new address */}
              {savedAddresses.length < 5 ? (
                <div className="space-y-3 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                  <label className={labelCls}>Add New Address</label>
                  <textarea rows={2} value={newAddress} onChange={e => setNewAddress(e.target.value)}
                    placeholder="Flat No, Building Name, Street, Landmark…"
                    className={`${inputCls} resize-none`} />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleGetCurrentLocation} disabled={fetchingLocation}
                      className="cp-btn-ghost flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50">
                      {fetchingLocation ? <RefreshCw size={13} className="animate-spin text-violet-400" /> : <MapPin size={13} className="text-violet-400" />}
                      {fetchingLocation ? 'Detecting…' : 'Use My Location'}
                    </button>
                    <button type="button" onClick={handleAddAddressList}
                      className="cp-btn-primary flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer flex items-center justify-center gap-1.5">
                      <span className="flex items-center gap-1.5"><Plus size={13} /> Add Address</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-xl text-xs text-amber-400"
                  style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                  Address limit reached (5/5). Delete one to add a new address.
                </div>
              )}
            </div>
          </section>
        )}

        {/* ══ NO VENDOR STATE ═════════════════════════════ */}
        {activeTab !== 'settings' && vendors.length === 0 && (
          <div className="max-w-lg mx-auto mt-8 md:mt-16 text-center space-y-8 cp-slide-up">
            {/* Animated orb */}
            <div className="relative inline-flex items-center justify-center">
              <div className="absolute w-32 h-32 rounded-full opacity-20 cp-glow-pulse-anim"
                style={{ background: 'radial-gradient(circle,#fb7185,transparent 70%)' }} />
              <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center cp-orbit-float"
                style={{ background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.25)' }}>
                <ShieldAlert size={36} className="text-rose-400" />
              </div>
            </div>

            <div>
              <h1 className="text-2xl font-bold text-white mb-2">No Vendor Connected</h1>
              <p className="text-sm text-slate-400 leading-relaxed">
                Your account <span className="text-rose-400 font-mono font-bold">({user?.phone})</span> is active but not linked to a water distributor yet.
              </p>
            </div>

            <div className="cp-glass rounded-2xl p-5 text-left space-y-3">
              <div className="text-xs font-bold text-white mb-1 flex items-center gap-2">
                <Sparkles size={14} className="text-violet-400" /> How to connect
              </div>
              {['Share your phone number with your local water delivery business',
                'They will register you in their Vendor Tracker',
                'Come back and sync — your shop will appear here'].map((step, i) => (
                <div key={i} className="flex items-start gap-3 text-xs text-slate-400">
                  <div className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }}>{i + 1}</div>
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <button onClick={fetchVendors}
              className="cp-btn-primary px-8 py-3 rounded-xl font-semibold text-sm cursor-pointer inline-flex items-center gap-2">
              <span className="flex items-center gap-2"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Check Connection</span>
            </button>
          </div>
        )}

        {/* ══ VENDOR CONNECTED CONTENT ════════════════════ */}
        {activeTab !== 'settings' && vendors.length > 0 && (
          <div className="space-y-6">

            {/* Vendor + Stats Hero Banner */}
            <div className="cp-slide-up">
              {/* Vendor name row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  {vendors.length > 1 ? (
                    <select value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)}
                      className="text-xl font-bold rounded-xl px-4 py-2 focus:outline-none cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#ffffff' }}>
                      {vendors.map(v => <option key={v.relationId} value={v.vendorId}>{v.name}</option>)}
                    </select>
                  ) : (
                    <h1 className="text-2xl font-extrabold text-white">{vendorDetails?.vendor?.name || '—'}</h1>
                  )}
                  {vendorDetails?.vendor?.phone && (
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1.5">
                      <Phone size={11} className="text-teal-400" />
                      <span>Support: {vendorDetails.vendor.phone}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="px-3 py-1 rounded-full text-[11px] font-bold text-teal-400"
                    style={{ background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.2)' }}>
                    ● Connected
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Balance card */}
                <div className="cp-stat-card cp-glass rounded-2xl p-4 col-span-2 lg:col-span-1">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Wallet size={11} /> Outstanding Balance
                  </div>
                  {loading ? <Skeleton className="h-9 w-32 mt-1" /> : (
                    <>
                      <div className={`text-3xl font-extrabold ${balanceDisplay.color}`}>
                        {balanceDisplay.label}
                      </div>
                      <div className="text-xs text-slate-500 mt-1 capitalize">{balanceDisplay.note}</div>
                    </>
                  )}
                  {!loading && vendorDetails?.vendor?.razorpayKeyId && vendorDetails?.balance > 0 && (
                    <button
                      onClick={() => { setError(''); setSuccess(''); setPayAmount(vendorDetails.balance); setShowPaymentModal(true); }}
                      className="cp-btn-primary mt-3 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5">
                      <span className="flex items-center gap-1.5"><CreditCard size={12} /> Pay Now</span>
                    </button>
                  )}
                </div>

                {/* Jars to return */}
                <div className="cp-stat-card cp-glass rounded-2xl p-4">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Package size={11} /> Jars to Return
                  </div>
                  {loading ? <Skeleton className="h-9 w-20 mt-1" /> : (
                    <>
                      <div className={`text-3xl font-extrabold ${vendorDetails?.bottlesOutstanding > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {vendorDetails?.bottlesOutstanding > 0 ? vendorDetails.bottlesOutstanding : '—'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        {vendorDetails?.bottlesOutstanding > 0 ? 'empty jars' : 'none pending'}
                      </div>
                    </>
                  )}
                </div>

                {/* Total orders */}
                <div className="cp-stat-card cp-glass rounded-2xl p-4">
                  <div className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <TrendingUp size={11} /> Total Orders
                  </div>
                  {loading ? <Skeleton className="h-9 w-20 mt-1" /> : (
                    <>
                      <div className="text-3xl font-extrabold text-violet-400">
                        {vendorDetails?.orders?.length ?? '—'}
                      </div>
                      <div className="text-xs text-slate-500 mt-1">all time</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Tab content */}
            {/* ── SHOP TAB ── */}
            {activeTab === 'shop' && (
              <section className="space-y-5 animate-tab-transition">
                <h2 className="text-lg font-bold text-white">Place a Delivery Request</h2>

                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {[1,2,3].map(i => <Skeleton key={i} className="h-52" />)}
                  </div>
                ) : vendorDetails?.products?.length === 0 ? (
                  <div className="cp-glass rounded-2xl p-12 text-center text-slate-500 text-sm">
                    No products listed by this vendor yet.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 cp-stagger">
                    {vendorDetails?.products?.map((prod) => (
                      <div key={prod._id} className="cp-product-card cp-glass rounded-2xl overflow-hidden cp-card-entrance flex flex-col">
                        {/* Card header */}
                        <div className="p-5 flex-1 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                              style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(6,182,212,0.2))', border: '1px solid rgba(124,58,237,0.2)' }}>
                              <Droplet size={20} className="text-cyan-400" />
                            </div>
                            {prod.quantity && (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold text-violet-400 shrink-0"
                                style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                                {prod.quantity}
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-white text-base leading-snug">{prod.name}</h3>
                          <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{prod.description || 'Pure, fresh water delivered to your doorstep.'}</p>
                        </div>
                        {/* Card footer */}
                        <div className="px-5 py-4 flex items-center justify-between"
                          style={{ background: 'rgba(255,255,255,0.03)', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                          <div>
                            <div className="text-[10px] text-slate-500 uppercase tracking-wider">Price</div>
                            <div className="text-lg font-extrabold cp-gradient-text">₹{prod.price}</div>
                          </div>
                          <button
                            onClick={() => {
                              setRequestProd(prod);
                              const slots = vendorDetails?.vendor?.deliverySlots?.length > 0
                                ? vendorDetails.vendor.deliverySlots
                                : ['Morning (8 AM – 12 PM)', 'Afternoon (12 PM – 4 PM)', 'Evening (4 PM – 8 PM)'];
                              setRequestSlot(slots[0] || '');
                              if (user?.address) { setRequestAddress(user.address); setIsCustomAddress(false); }
                              else if (user?.addresses?.length > 0) { setRequestAddress(user.addresses[0]); setIsCustomAddress(false); }
                              else { setRequestAddress(''); setIsCustomAddress(true); }
                              setSaveToProfile(false);
                              setShowRequestModal(true);
                            }}
                            className="cp-btn-primary px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5">
                            <span className="flex items-center gap-1.5"><Send size={12} /> Request</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── HISTORY TAB ── */}
            {activeTab === 'history' && (
              <section className="space-y-5 animate-tab-transition">
                <h2 className="text-lg font-bold text-white">Order History</h2>
                {loading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
                ) : vendorDetails?.orders?.length === 0 ? (
                  <div className="cp-glass rounded-2xl p-12 text-center text-slate-500 text-sm">
                    No delivery requests yet.
                  </div>
                ) : (
                  <div className="space-y-3 cp-stagger">
                    {vendorDetails.orders.map((ord) => (
                      <div key={ord._id} className="cp-glass rounded-2xl p-4 flex flex-col sm:flex-row gap-4 cp-card-entrance">
                        {/* Status dot + date */}
                        <div className="flex sm:flex-col items-center sm:items-start gap-3 sm:gap-1 shrink-0 sm:w-28">
                          <div className={`cp-timeline-dot ${
                            ord.status === 'delivered' ? 'bg-emerald-400' :
                            ord.status === 'cancelled' ? 'bg-rose-400' : 'bg-amber-400'
                          }`} />
                          <div className="text-xs text-slate-400">{new Date(ord.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'2-digit' })}</div>
                          {ord.deliverySlot && (
                            <div className="hidden sm:block text-[10px] text-slate-500 leading-snug mt-1">{ord.deliverySlot}</div>
                          )}
                        </div>

                        {/* Main info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <div className="font-semibold text-white text-sm">
                              {ord.products.map(p => `${p.name} ×${p.quantity}`).join(', ')}
                            </div>
                            <StatusBadge status={ord.status} />
                          </div>
                          {ord.deliveryAddress && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                              <MapPin size={11} className="text-teal-400 shrink-0" />
                              <span className="truncate">{ord.deliveryAddress}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                            <span>Amount: <span className="text-white font-semibold">₹{ord.totalAmount}</span></span>
                            {ord.status === 'delivered' && (
                              <span>Del: {ord.bottlesDelivered} | Ret: {ord.bottlesReturned}</span>
                            )}
                            {ord.deliverySlot && (
                              <span className="sm:hidden text-[10px]">{ord.deliverySlot}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* ── PAYMENTS TAB ── */}
            {activeTab === 'payments' && (
              <section className="space-y-5 animate-tab-transition">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white">Payment History</h2>
                  {vendorDetails?.payments?.length > 0 && (
                    <div className="text-xs text-slate-400">
                      Total: <span className="text-emerald-400 font-bold">
                        ₹{vendorDetails.payments.reduce((s, p) => s + p.amount, 0)}
                      </span>
                    </div>
                  )}
                </div>

                {loading ? (
                  <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
                ) : vendorDetails?.payments?.length === 0 ? (
                  <div className="cp-glass rounded-2xl p-12 text-center text-slate-500 text-sm">
                    No payment records yet.
                  </div>
                ) : (
                  <div className="space-y-3 cp-stagger">
                    {vendorDetails.payments.map((p) => (
                      <div key={p._id} className="cp-glass rounded-2xl px-5 py-4 flex items-center gap-4 cp-card-entrance">
                        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                          style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                          <CreditCard size={18} className="text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-violet-400"
                              style={{ background: 'rgba(124,58,237,0.12)', border: '1px solid rgba(124,58,237,0.2)' }}>
                              {p.paymentMethod}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {new Date(p.paymentDate).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'2-digit' })}
                            </span>
                          </div>
                          {p.notes && <p className="text-xs text-slate-500 truncate mt-0.5">{p.notes}</p>}
                        </div>
                        <div className="text-xl font-extrabold text-emerald-400 shrink-0">₹{p.amount}</div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

          </div>
        )}
      </main>

      {/* ══ ORDER REQUEST DRAWER ════════════════════════════ */}
      <Drawer
        open={showRequestModal && !!requestProd}
        onClose={() => { setShowRequestModal(false); setRequestProd(null); setRequestQty(1); }}
        title="Request Delivery"
        subtitle={requestProd ? `Ordering: ${requestProd.name}` : ''}
        icon={<Send size={22} />}
        accentColor="purple"
      >
        <form onSubmit={handleRequestDelivery} className="space-y-5">
          <Alert type="error"   msg={error}   onClose={() => setError('')} />
          <Alert type="success" msg={success} onClose={() => setSuccess('')} />

          <div>
            <label className={labelCls}>Quantity (Jars)</label>
            <input type="number" min="1" required value={requestQty}
              onChange={e => setRequestQty(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>Preferred Delivery Slot</label>
            <select value={requestSlot} onChange={e => setRequestSlot(e.target.value)} required className={inputCls + ' cursor-pointer'}>
              {(vendorDetails?.vendor?.deliverySlots?.length > 0
                ? vendorDetails.vendor.deliverySlots
                : ['Morning (8 AM – 12 PM)', 'Afternoon (12 PM – 4 PM)', 'Evening (4 PM – 8 PM)']
              ).map((slot, i) => <option key={i} value={slot}>{slot}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Delivery Address</label>
            <select
              value={isCustomAddress ? 'custom' : requestAddress}
              onChange={e => {
                if (e.target.value === 'custom') { setIsCustomAddress(true); setRequestAddress(''); }
                else { setIsCustomAddress(false); setRequestAddress(e.target.value); }
              }}
              className={inputCls + ' cursor-pointer mb-3'}
            >
              {user?.address && <option value={user.address}>Default: {user.address}</option>}
              {savedAddresses.filter(a => a !== user?.address).map((a, i) => <option key={i} value={a}>{a}</option>)}
              <option value="custom">— Use a different address —</option>
            </select>

            {isCustomAddress && (
              <div className="space-y-3 cp-slide-up">
                <textarea rows={2} required value={requestAddress}
                  onChange={e => setRequestAddress(e.target.value)}
                  placeholder="Flat No, Building, Street, Landmark…"
                  className={inputCls + ' resize-none'} />
                {savedAddresses.length < 5 && (
                  <label className="flex items-center gap-2.5 text-xs text-slate-400 cursor-pointer select-none">
                    <input type="checkbox" checked={saveToProfile} onChange={e => setSaveToProfile(e.target.checked)}
                      className="rounded cursor-pointer" />
                    Save this address to profile
                  </label>
                )}
              </div>
            )}
          </div>

          {/* Cost preview */}
          <div className="flex justify-between items-center py-3 px-4 rounded-xl"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.15)' }}>
            <span className="text-xs text-slate-400">Estimated cost</span>
            <span className="font-extrabold text-white text-lg">₹{requestProd ? requestProd.price * requestQty : 0}</span>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" disabled={loading}
              onClick={() => { setShowRequestModal(false); setRequestProd(null); setRequestQty(1); }}
              className="cp-btn-ghost flex-1 py-3 rounded-xl font-semibold text-sm cursor-pointer disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="cp-btn-primary flex-[2] py-3 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50">
              <span>{loading ? 'Submitting…' : 'Confirm Request'}</span>
            </button>
          </div>
        </form>
      </Drawer>

      {/* ══ PAYMENT DRAWER ══════════════════════════════════ */}
      <Drawer
        open={showPaymentModal}
        onClose={() => { setShowPaymentModal(false); setPayAmount(''); }}
        title="Online Payment"
        subtitle={vendorDetails?.vendor?.name ? `Pay to ${vendorDetails.vendor.name}` : ''}
        icon={<CreditCard size={22} />}
        accentColor="teal"
      >
        <form onSubmit={handlePayBalance} className="space-y-5">
          <Alert type="error"   msg={error}   onClose={() => setError('')} />
          <Alert type="success" msg={success} onClose={() => setSuccess('')} />

          {/* Balance summary */}
          <div className="p-4 rounded-2xl text-center"
            style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.2)' }}>
            <div className="text-xs text-slate-400 mb-1">Outstanding Balance</div>
            <div className="text-3xl font-extrabold text-rose-400">₹{vendorDetails?.balance}</div>
          </div>

          <div>
            <label className={labelCls}>Payment Amount (₹)</label>
            <input type="number" min="1" max={vendorDetails?.balance} required
              value={payAmount} onChange={e => setPayAmount(e.target.value)} className={inputCls} />
            <p className="text-[11px] text-slate-500 mt-1.5">Maximum payable: ₹{vendorDetails?.balance}</p>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" disabled={loading}
              onClick={() => { setShowPaymentModal(false); setPayAmount(''); }}
              className="cp-btn-ghost flex-1 py-3 rounded-xl font-semibold text-sm cursor-pointer disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="cp-btn-primary flex-[2] py-3 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50">
              <span>{loading ? 'Processing…' : 'Pay with Razorpay'}</span>
            </button>
          </div>
        </form>
      </Drawer>

      {/* ══ PHONE CHANGE DRAWER ═════════════════════════════ */}
      <Drawer
        open={showPhoneModal}
        onClose={() => { setShowPhoneModal(false); setNewPhone(''); setPhoneOtp(''); setPhoneOtpSent(false); setTempPhoneOtp(''); setError(''); setSuccess(''); }}
        title="Change Phone Number"
        subtitle="A verification OTP will be sent to your new number"
        icon={<Phone size={22} />}
        accentColor="purple"
      >
        <Alert type="error"   msg={error}   onClose={() => setError('')} />
        <Alert type="success" msg={success} onClose={() => setSuccess('')} />

        {!phoneOtpSent ? (
          <form onSubmit={handleRequestPhoneChange} className="space-y-5 mt-5">
            <div>
              <label className={labelCls}>New Phone Number</label>
              <input type="tel" required value={newPhone}
                onChange={e => setNewPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                placeholder="10-digit mobile number" maxLength={10} className={inputCls} />
            </div>
            <div className="flex gap-3">
              <button type="button"
                onClick={() => { setShowPhoneModal(false); setNewPhone(''); setError(''); setSuccess(''); }}
                className="cp-btn-ghost flex-1 py-3 rounded-xl font-semibold text-sm cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="cp-btn-primary flex-1 py-3 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50">
                <span>{loading ? 'Sending…' : 'Send OTP'}</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleVerifyPhoneChange} className="space-y-5 mt-5">
            <div className="p-4 rounded-2xl text-center"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)' }}>
              <p className="text-xs text-slate-400">Enter the 6-digit OTP sent to your new number.</p>
              {tempPhoneOtp && (
                <div className="mt-3 p-2.5 rounded-xl text-violet-400 text-sm font-mono font-bold"
                  style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)' }}>
                  Dev OTP: <span className="tracking-widest">{tempPhoneOtp}</span>
                </div>
              )}
            </div>
            <div>
              <label className={labelCls}>OTP Code</label>
              <input type="text" maxLength={6} required value={phoneOtp}
                onChange={e => setPhoneOtp(e.target.value)} placeholder="123456"
                className={inputCls + ' text-center text-xl font-mono tracking-[0.4em]'} />
            </div>
            <div className="flex gap-3">
              <button type="button"
                onClick={() => { setPhoneOtp(''); setPhoneOtpSent(false); setTempPhoneOtp(''); }}
                className="cp-btn-ghost flex-1 py-3 rounded-xl font-semibold text-sm cursor-pointer">
                ← Back
              </button>
              <button type="submit" disabled={loading}
                className="cp-btn-primary flex-[2] py-3 rounded-xl font-bold text-sm cursor-pointer disabled:opacity-50">
                <span>{loading ? 'Verifying…' : 'Verify & Update'}</span>
              </button>
            </div>
          </form>
        )}
      </Drawer>

    </div>
  );
};

export default CustomerDashboard;
