import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Plus, List, Users, CreditCard, LogOut, RefreshCw, Layers, Menu, X, Trash2, Info, IndianRupee } from 'lucide-react';

const AdminDashboard = () => {
  const { logout, authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'vendors', 'plans', 'paymentSettings'
  const [vendors, setVendors] = useState([]);
  const [plans, setPlans] = useState([]);
  const [stats, setStats] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Razorpay Gateway Config states
  const [rzpKeyId, setRzpKeyId] = useState('');
  const [rzpKeySecret, setRzpKeySecret] = useState('');
  const [hasSavedSecret, setHasSavedSecret] = useState(false);
  
  // Modal for assigning subscription
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  // Create Plan Form states
  const [planName, setPlanName] = useState('');
  const [planPrice, setPlanPrice] = useState('');
  const [planDuration, setPlanDuration] = useState('monthly');
  const [planLimit, setPlanLimit] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Fetch plans and vendors
  const fetchData = async () => {
    setLoading(true);
    try {
      const plansRes = await authFetch('/admin/plans');
      if (plansRes.success) setPlans(plansRes.data);

      const vendorsRes = await authFetch('/admin/vendors');
      if (vendorsRes.success) setVendors(vendorsRes.data);

      const configRes = await authFetch('/payment/config');
      if (configRes.success && configRes.data) {
        setRzpKeyId(configRes.data.keyId || '');
        setHasSavedSecret(configRes.data.hasSecret || false);
      }

      const statsRes = await authFetch('/admin/stats');
      if (statsRes.success) setStats(statsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle plan submission
  const handleCreatePlan = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!planName || planPrice === '' || planLimit === '') {
      return setError('Please fill in all plan details');
    }

    try {
      const res = await authFetch('/admin/plans', {
        method: 'POST',
        body: JSON.stringify({
          name: planName,
          price: Number(planPrice),
          duration: planDuration,
          userLimit: Number(planLimit)
        })
      });

      if (res.success) {
        setSuccess('Subscription plan created successfully!');
        setPlanName('');
        setPlanPrice('');
        setPlanLimit('');
        fetchData();
      } else {
        setError(res.message || 'Failed to create plan');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Handle assign subscription
  const handleAssignSub = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!selectedPlanId) return setError('Please select a plan');

    try {
      const res = await authFetch('/admin/assign-subscription', {
        method: 'POST',
        body: JSON.stringify({
          vendorId: selectedVendor._id,
          planId: selectedPlanId
        })
      });

      if (res.success) {
        setSuccess(`Assigned plan to ${selectedVendor.name} successfully!`);
        setShowAssignModal(false);
        setSelectedVendor(null);
        setSelectedPlanId('');
        fetchData();
      } else {
        setError(res.message || 'Failed to assign plan');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Handle plan deletion
  const handleDeletePlan = async (planId) => {
    if (!window.confirm('Are you sure you want to delete this subscription plan?')) return;
    setError('');
    setSuccess('');
    try {
      const res = await authFetch(`/admin/plans/${planId}`, {
        method: 'DELETE'
      });
      if (res.success) {
        setSuccess('Subscription plan deleted successfully!');
        fetchData();
      } else {
        setError(res.message || 'Failed to delete plan');
      }
    } catch (err) {
      setError('Connection failure');
    }
  };

  // Handle saving payment config
  const handleSavePaymentConfig = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!rzpKeyId || !rzpKeySecret) {
      return setError('Please fill in both Key ID and Secret');
    }
    setLoading(true);

    try {
      const res = await authFetch('/payment/config', {
        method: 'POST',
        body: JSON.stringify({
          keyId: rzpKeyId,
          keySecret: rzpKeySecret
        })
      });

      if (res.success) {
        setSuccess('Razorpay API keys saved successfully!');
        setRzpKeySecret(''); // clear input
        setHasSavedSecret(true);
      } else {
        setError(res.message || 'Failed to save configuration');
      }
    } catch (err) {
      setError('Connection failure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex flex-col md:flex-row bg-marine-950 text-slate-100">
      
      {/* MOBILE HEADER BAR */}
      <header className="flex md:hidden items-center justify-between p-4 bg-marine-sidebar border-b border-marine-800 z-20">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-cyan-600/10 rounded-lg text-cyan-500 border border-cyan-500/20">
            <Shield size={18} className="fill-cyan-500/20" />
          </div>
          <h2 className="font-bold text-slate-800 text-sm">Admin Console</h2>
        </div>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1 text-slate-600 hover:text-cyan-600 transition-colors cursor-pointer"
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

      {/* SIDEBAR NAVIGATION (SLIDING DRAWER ON MOBILE) */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-marine-sidebar border-r border-marine-800 flex flex-col justify-between p-6 z-40 transition-transform duration-300 md:static md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-8">
          {/* Header branding inside drawer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-600/10 rounded-lg text-cyan-400 border border-cyan-500/20">
                <Shield size={24} className="fill-cyan-400/20" />
              </div>
              <div>
                <h2 className="font-bold text-white leading-tight">Admin Console</h2>
                <span className="text-[10px] text-slate-400 tracking-wider uppercase font-semibold">
                  {import.meta.env.VITE_PROJECT_NAME || 'Water System'}
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
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/40'
                  : 'text-slate-400 hover:bg-marine-card hover:text-white'
              }`}
            >
              <Info size={18} />
              Overview
            </button>
            <button
              onClick={() => { setActiveTab('vendors'); setError(''); setSuccess(''); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'vendors'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/40'
                  : 'text-slate-400 hover:bg-marine-card hover:text-white'
              }`}
            >
              <Users size={18} />
              Vendor Accounts
            </button>
            <button
              onClick={() => { setActiveTab('plans'); setError(''); setSuccess(''); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'plans'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/40'
                  : 'text-slate-400 hover:bg-marine-card hover:text-white'
              }`}
            >
              <Layers size={18} />
              Subscription Plans
            </button>
            <button
              onClick={() => { setActiveTab('paymentSettings'); setError(''); setSuccess(''); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
                activeTab === 'paymentSettings'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/40'
                  : 'text-slate-400 hover:bg-marine-card hover:text-white'
              }`}
            >
              <CreditCard size={18} />
              Payment Gateway
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
            Logout System
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        
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

        {/* TAB 0: OVERVIEW PANEL */}
        {activeTab === 'overview' && (
          <section className="space-y-6 animate-tab-transition">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">System Overview</h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">Global statistics, subscription counts, and active revenues.</p>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Registered Vendors */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Registered Vendors</span>
                  <Users size={18} className="text-cyan-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {stats?.vendorsCount || 0}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Total number of registered distribution businesses.</p>
              </div>

              {/* Card 2: Active Subscriptions */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Active Subscriptions</span>
                  <Layers size={18} className="text-emerald-400" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  {stats?.activeSubsCount || 0}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Active paid tiers currently unlock-statused for vendors.</p>
              </div>

              {/* Card 3: Monthly Recurring Revenue */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono">Active Revenue (Est.)</span>
                  <IndianRupee size={18} className="text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold text-white">
                  Rs. {stats?.totalRevenue || 0}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Cumulative value of all currently active sub packages.</p>
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Card 4: Total Customers Connected */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Total Client Headcount</span>
                  <span className="text-3xl font-extrabold text-white">
                    {stats?.customersCount || 0} Customers
                  </span>
                  <p className="text-[10px] text-slate-500 mt-2">Connected consumer accounts across all vendors.</p>
                </div>
                <div className="p-4 bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 rounded-2xl">
                  <Shield size={32} />
                </div>
              </div>

              {/* Card 5: Plan Configurations */}
              <div className="glass-panel rounded-2xl p-6 border border-marine-800 flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider font-mono block mb-1">Plan Configurations</span>
                  <span className="text-3xl font-extrabold text-white">
                    {stats?.plansCount || 0} Tiers
                  </span>
                  <p className="text-[10px] text-slate-500 mt-2">Subscription packages configured by the admin panel.</p>
                </div>
                <div className="p-4 bg-cyan-600/10 border border-cyan-500/20 text-cyan-400 rounded-2xl">
                  <Layers size={32} />
                </div>
              </div>
            </div>

            {/* Quick Action Guides */}
            <div className="glass-panel rounded-2xl p-6 border border-marine-800">
              <h3 className="font-bold text-white mb-3 text-base">Quick Administration Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => setActiveTab('vendors')}
                  className="p-4 bg-marine-card/50 hover:bg-cyan-650/10 border border-marine-800 hover:border-cyan-500/30 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <span className="font-bold text-white block mb-1 group-hover:text-cyan-400 font-sans">Manage Vendors →</span>
                  <span className="text-xs text-slate-400">View vendor phone numbers, expiry dates, and assign custom packages.</span>
                </button>
                <button
                  onClick={() => setActiveTab('plans')}
                  className="p-4 bg-marine-card/50 hover:bg-cyan-650/10 border border-marine-800 hover:border-cyan-500/30 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <span className="font-bold text-white block mb-1 group-hover:text-cyan-400 font-sans">Subscription Plans →</span>
                  <span className="text-xs text-slate-400">Configure plan durations, set customer limits, and adjust prices.</span>
                </button>
                <button
                  onClick={() => setActiveTab('paymentSettings')}
                  className="p-4 bg-marine-card/50 hover:bg-cyan-650/10 border border-marine-800 hover:border-cyan-500/30 rounded-xl text-left transition-all cursor-pointer group"
                >
                  <span className="font-bold text-white block mb-1 group-hover:text-cyan-400 font-sans">Gateway Settings →</span>
                  <span className="text-xs text-slate-400">Configure global Razorpay API credentials to automate paid checkout.</span>
                </button>
              </div>
            </div>

          </section>
        )}

        {/* TAB 1: VENDORS MANAGEMENT */}
        {activeTab === 'vendors' && (
          <section className="space-y-6 animate-tab-transition">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Water Vendors</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Review active water businesses, subscriptions, and active customers.</p>
              </div>
              <span className="self-start sm:self-center px-3 py-1 bg-marine-card border border-marine-800 rounded-full text-xs font-semibold text-cyan-400">
                {vendors.length} Vendors Total
              </span>
            </div>

            {/* Scrollable Container for responsive table */}
            <div className="glass-panel rounded-2xl overflow-hidden border border-marine-800">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[700px]">
                  <thead>
                    <tr className="bg-marine-card border-b border-marine-800 text-slate-400 text-xs font-bold uppercase tracking-wider">
                      <th className="p-4">Vendor Details</th>
                      <th className="p-4">Active Plan</th>
                      <th className="p-4">Expiry Date</th>
                      <th className="p-4">Clients Count</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-marine-800/40 text-sm">
                    {vendors.map((vendor) => {
                      const isExceeded = vendor.subscription && vendor.customerCount >= vendor.subscription.userLimit;
                      return (
                        <tr key={vendor._id} className="hover:bg-marine-card/30 transition-colors">
                          <td className="p-4">
                            <div className="font-semibold text-white">{vendor.name}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{vendor.phone} | {vendor.email || 'No email'}</div>
                          </td>
                          <td className="p-4">
                            {vendor.subscription ? (
                              <span className="inline-block px-2.5 py-1 bg-cyan-950/60 border border-cyan-800/40 text-cyan-400 rounded text-xs font-medium">
                                {vendor.subscription.planName}
                              </span>
                            ) : (
                              <span className="text-rose-400 text-xs font-semibold">No active plan</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-300">
                            {vendor.subscription ? (
                              new Date(vendor.subscription.endDate).toLocaleDateString()
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white">{vendor.customerCount}</span>
                              {vendor.subscription && (
                                <span className={`text-xs ${isExceeded ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                                  / {vendor.subscription.userLimit} max
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => { setSelectedVendor(vendor); setShowAssignModal(true); }}
                              className="px-3.5 py-1.5 bg-cyan-600/10 hover:bg-cyan-600 border border-cyan-500/20 hover:border-cyan-500 text-cyan-400 hover:text-white rounded text-xs font-semibold cursor-pointer transition-colors"
                            >
                              Assign Plan
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {vendors.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-500">
                          No water supply vendors registered yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: PLANS MANAGEMENT */}
        {activeTab === 'plans' && (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-tab-transition">
            
            {/* Create Plan Form */}
            <div className="lg:col-span-1 glass-panel rounded-2xl p-6 border border-marine-800 self-start">
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Plus size={18} className="text-cyan-400" />
                New Subscription
              </h2>
              
              <form onSubmit={handleCreatePlan} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Plan Name</label>
                  <input
                    type="text"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    placeholder="e.g. Quarterly Pro"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Price (Rs)</label>
                    <input
                      type="number"
                      value={planPrice}
                      onChange={(e) => setPlanPrice(e.target.value)}
                      placeholder="999"
                      className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">User Limit</label>
                    <input
                      type="number"
                      value={planLimit}
                      onChange={(e) => setPlanLimit(e.target.value)}
                      placeholder="100"
                      className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Duration</label>
                  <select
                    value={planDuration}
                    onChange={(e) => setPlanDuration(e.target.value)}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="monthly">Monthly (30 Days)</option>
                    <option value="quarterly">Quarterly (90 Days)</option>
                    <option value="yearly">Yearly (365 Days)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors"
                >
                  Create Plan
                </button>
              </form>
            </div>

            {/* Plans Grid */}
            <div className="lg:col-span-2 space-y-6">
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Configured Plans</h1>
                <p className="text-xs md:text-sm text-slate-400 mt-1">Available subscription tiers that vendors can subscribe to.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map((plan) => (
                  <div key={plan._id} className="glass-panel rounded-2xl p-5 border border-marine-800 hover:border-cyan-500/40 transition-all flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-bold text-white text-base">{plan.name}</h3>
                          <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider">{plan.duration}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-white text-xl">Rs. {plan.price}</span>
                        </div>
                      </div>
                      
                      <div className="border-t border-marine-850 pt-3 mt-3 flex justify-between items-center text-xs text-slate-400">
                        <span>Max Vendors Client Limit:</span>
                        <span className="font-bold text-white text-sm">{plan.userLimit} Users</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-marine-850/50 flex justify-end">
                      <button
                        onClick={() => handleDeletePlan(plan._id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/20 hover:border-rose-500 text-xs font-semibold rounded cursor-pointer transition-colors"
                      >
                        <Trash2 size={13} />
                        Delete Plan
                      </button>
                    </div>
                  </div>
                ))}
                {plans.length === 0 && (
                  <div className="col-span-2 text-center py-12 text-slate-500 glass-panel rounded-2xl border border-marine-800">
                    No plans configured yet.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* TAB 3: PAYMENT SETTINGS */}
        {activeTab === 'paymentSettings' && (
          <section className="max-w-xl space-y-6 animate-tab-transition">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white">Payment Gateway Settings</h1>
              <p className="text-xs md:text-sm text-slate-400 mt-1">Configure your Razorpay API credentials for vendor subscriptions checkout.</p>
            </div>

            <div className="glass-panel rounded-2xl p-6 border border-marine-800 space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard size={18} className="text-cyan-400" />
                Razorpay API Keys
              </h2>

              <form onSubmit={handleSavePaymentConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Razorpay Key ID</label>
                  <input
                    type="text"
                    required
                    value={rzpKeyId}
                    onChange={(e) => setRzpKeyId(e.target.value)}
                    placeholder="rzp_test_xxxxxxxxxxxxxx"
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase mb-2">Razorpay Key Secret</label>
                  <input
                    type="password"
                    required
                    value={rzpKeySecret}
                    onChange={(e) => setRzpKeySecret(e.target.value)}
                    placeholder={hasSavedSecret ? "••••••••••••••••••••" : "Enter Key Secret"}
                    className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  {hasSavedSecret && (
                    <p className="text-[10px] text-emerald-400 mt-1">✓ Cryptographic key secret is configured securely in the database.</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm rounded-lg cursor-pointer transition-colors disabled:opacity-50"
                >
                  {loading ? 'Saving Settings...' : 'Save Razorpay Credentials'}
                </button>
              </form>
            </div>
          </section>
        )}

      </main>

      {/* ASSIGN SUBSCRIPTION MODAL */}
      {showAssignModal && selectedVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-glow rounded-2xl p-6 border border-cyan-500/30">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-cyan-500/10 mb-3 border border-cyan-500/20 text-cyan-400">
                <CreditCard size={24} />
              </div>
              <h2 className="text-xl font-bold text-white">Assign Subscription Plan</h2>
              <p className="text-xs text-slate-400 mt-1">
                Select a subscription plan for <span className="text-cyan-400 font-bold">{selectedVendor.name}</span>.
              </p>
            </div>

            <form onSubmit={handleAssignSub} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">Available Plans</label>
                <select
                  required
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  className="w-full bg-marine-950 border border-marine-800 rounded-lg p-2.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Choose a Plan --</option>
                  {plans.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Rs. {p.price} | Limit: {p.userLimit} users | {p.duration})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAssignModal(false); setSelectedVendor(null); setSelectedPlanId(''); }}
                  className="flex-1 py-2.5 border border-marine-850 rounded-lg text-slate-400 font-semibold text-sm hover:bg-marine-card cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
                >
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
