import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Droplets, Mail, Lock, Building, Phone, ArrowRight } from 'lucide-react';

const BusinessLogin = () => {
  const { login, registerVendor } = useAuth();
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Vendor Signup states
  const [vendorName, setVendorName] = useState('');
  const [vendorPhone, setVendorPhone] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');
  const [vendorPassword, setVendorPassword] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBusinessLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return setError('Email and Password are required');
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        if (res.user.role === 'admin') {
          navigate('/admin');
        } else if (res.user.role === 'vendor') {
          navigate('/vendor');
        }
      } else {
        setError(res.message || 'Invalid credentials');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleVendorSignup = async (e) => {
    e.preventDefault();
    if (!vendorName || !vendorPhone || !vendorEmail || !vendorPassword) {
      return setError('Please fill in all vendor fields');
    }
    if (vendorPhone.length !== 10) {
      return setError('Phone number must be exactly 10 digits');
    }
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await registerVendor(vendorName, vendorPhone, vendorEmail, vendorPassword);
      if (res.success) {
        navigate('/vendor');
      } else {
        setError(res.message || 'Vendor registration failed');
      }
    } catch (err) {
      setError('Sign up connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-marine-950 via-slate-900 to-marine-900 overflow-hidden">
      {/* Floating water blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-cyan-600/10 blur-3xl animate-float pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl animate-float [animation-delay:2s] pointer-events-none" />

      <div className="w-full max-w-md glass-panel rounded-2xl overflow-hidden shadow-2xl z-10 border border-marine-800">
        
        {/* Branding Header */}
        <div className="bg-gradient-to-r from-marine-900 to-slate-950 p-6 text-center border-b border-marine-800">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-marine-500/10 mb-3 border border-marine-500/20 text-cyan-400 animate-float">
            <Building size={36} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {import.meta.env.VITE_PROJECT_NAME || 'Business Portal'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Water Distributor & Admin Management Control</p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="p-3 mb-4 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 mb-4 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              {success}
            </div>
          )}

          {!isSignup ? (
            /* Login Form */
            <form onSubmit={handleBusinessLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email or Phone</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@water.com or vendor mobile"
                    className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
                <div className="text-right mt-2">
                  <Link to="/forgot-password" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
                    Forgot Password?
                  </Link>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-sm transition-colors cursor-pointer shadow-lg shadow-cyan-950/50 disabled:opacity-50"
              >
                {loading ? 'Validating credentials...' : 'Enter Console'}
              </button>
              <div className="text-center mt-4 text-xs text-slate-400">
                Are you a water supplier?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignup(true); setError(''); }}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Register Company
                </button>
              </div>
              <div className="text-center mt-2">
                <a href="/login" className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                  Go to Customer OTP Login
                </a>
              </div>
            </form>
          ) : (
            /* Signup Form */
            <form onSubmit={handleVendorSignup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Company Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Building size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Blue Wave Aquatics"
                    className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Mobile Number</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Phone size={16} />
                  </span>
                  <input
                    type="tel"
                    required
                    value={vendorPhone}
                    onChange={(e) => setVendorPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="e.g. 9876543210"
                    maxLength={10}
                    className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={vendorEmail}
                    onChange={(e) => setVendorEmail(e.target.value)}
                    placeholder="e.g. operations@bluewave.com"
                    className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Console Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <Lock size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={vendorPassword}
                    onChange={(e) => setVendorPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-semibold text-sm transition-colors hover:from-teal-400 hover:to-cyan-400 cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creating Vendor Profile...' : 'Complete Registration'}
              </button>
              <div className="text-center mt-4 text-xs text-slate-400">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignup(false); setError(''); }}
                  className="text-cyan-400 hover:underline font-semibold"
                >
                  Login here
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessLogin;
