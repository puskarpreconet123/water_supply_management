import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Droplets, Phone, Key, User, MapPin, ArrowRight } from 'lucide-react';

const Login = () => {
  const { sendOtp, verifyOtp, registerCustomer } = useAuth();
  const navigate = useNavigate();

  // Form states
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [tempOtp, setTempOtp] = useState(''); // display OTP to user in dev mode
  
  // New Customer Profile popup states
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [custName, setCustName] = useState('');
  const [custAddress, setCustAddress] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Customer OTP request
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (!phone) return setError('Please enter a valid phone number');
    if (phone.length !== 10) return setError('Phone number must be exactly 10 digits');
    setError('');
    setLoading(true);
    
    try {
      const res = await sendOtp(phone);
      if (res.success) {
        setOtpSent(true);
        setMessage('OTP sent! Check console in development mode.');
        if (res.otp) {
          setTempOtp(res.otp); // Save development OTP
        }
      } else {
        setError(res.message || 'Failed to send OTP');
      }
    } catch (err) {
      setError('Connection failure');
    } finally {
      setLoading(false);
    }
  };

  // Handle Customer OTP verification
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otp) return setError('Please enter the 6-digit OTP');
    setError('');
    setLoading(true);

    try {
      const res = await verifyOtp(phone, otp);
      if (res.success) {
        if (res.isNewUser) {
          // Trigger the Name & Address registration popup
          setShowProfilePopup(true);
          setMessage('OTP verified. Please complete your registration.');
        } else {
          // Logged in successfully
          navigate('/customer');
        }
      } else {
        setError(res.message || 'Invalid OTP');
      }
    } catch (err) {
      setError('Connection failure');
    } finally {
      setLoading(false);
    }
  };

  // Handle Customer Registration after OTP success
  const handleCustomerRegister = async (e) => {
    e.preventDefault();
    if (!custName || !custAddress) return setError('Name and Address are required');
    setError('');
    setLoading(true);

    try {
      const res = await registerCustomer(custName, phone, custAddress);
      if (res.success) {
        setShowProfilePopup(false);
        navigate('/customer');
      } else {
        setError(res.message || 'Failed to create account');
      }
    } catch (err) {
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-marine-950 via-slate-900 to-marine-900 overflow-hidden">
      {/* Decorative floating water blobs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-cyan-600/10 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl animate-float [animation-delay:2s]" />

      <div className="w-full max-w-md glass-panel rounded-2xl overflow-hidden shadow-2xl z-10 border border-marine-800">
        
        {/* Header Branding */}
        <div className="bg-gradient-to-r from-marine-900 to-slate-950 p-6 text-center border-b border-marine-800">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-marine-500/10 mb-3 border border-marine-500/20 text-cyan-400 animate-float">
            <Droplets size={36} className="fill-cyan-400/20 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {import.meta.env.VITE_PROJECT_NAME || 'Customer Portal'}
          </h1>
          <p className="text-xs text-slate-400 mt-1">Water Delivery App & Order Tracking</p>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="p-3 mb-4 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
              {error}
            </div>
          )}
          {message && (
            <div className="p-3 mb-4 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
              {message}
            </div>
          )}

          <div>
            {!otpSent ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="text-center mb-6">
                  <p className="text-sm text-slate-300">Enter your mobile number to request a secure OTP.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Phone size={16} />
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold text-sm hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-950/50 cursor-pointer disabled:opacity-50"
                >
                  {loading ? 'Sending OTP...' : 'Get Security OTP'}
                  <ArrowRight size={16} className="ml-2" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="text-center mb-6">
                  <p className="text-sm text-slate-300">Enter the 6-digit OTP code sent to your phone.</p>
                  {tempOtp && (
                    <div className="mt-3 p-2 bg-cyan-950/60 rounded border border-cyan-800/40 text-cyan-300 text-xs font-mono">
                      Dev Testing OTP: <span className="font-bold text-sm tracking-wider">{tempOtp}</span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">OTP Code</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                      <Key size={16} />
                    </span>
                    <input
                      type="text"
                      maxLength="6"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      placeholder="123456"
                      className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white font-mono tracking-widest placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setTempOtp(''); setOtp(''); }}
                    className="flex-1 py-2.5 rounded-lg border border-marine-880 text-slate-300 font-semibold text-sm hover:bg-marine-900 hover:text-white transition-colors cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-[2] py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold text-sm hover:from-cyan-400 hover:to-teal-400 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {loading ? 'Verifying...' : 'Verify & Enter'}
                  </button>
                </div>
              </form>
            )}
          </div>
          
          <div className="text-center mt-6 pt-4 border-t border-marine-850">
            <a href="/business-login" className="text-xs text-slate-500 hover:text-slate-300 hover:underline transition-colors font-medium">
              Are you an Admin or Water Vendor? Click here
            </a>
          </div>
        </div>
      </div>

      {/* POPUP FOR NEW CUSTOMERS */}
      {showProfilePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="w-full max-w-md glass-panel-glow rounded-2xl p-6 border border-teal-500/30">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-teal-500/10 mb-3 border border-teal-500/20 text-teal-400">
                <User size={24} className="animate-pulse-glow" />
              </div>
              <h2 className="text-xl font-bold text-white">Setup Customer Account</h2>
              <p className="text-xs text-slate-400 mt-1">We couldn't find an account for <span className="text-teal-400 font-bold">{phone}</span>. Let's create one!</p>
            </div>

            <form onSubmit={handleCustomerRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Delivery Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                    <MapPin size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={custAddress}
                    onChange={(e) => setCustAddress(e.target.value)}
                    placeholder="House No, Street, Landmark"
                    className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white focus:outline-none focus:border-teal-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-50"
              >
                {loading ? 'Creating Profile...' : 'Complete Profile & Create Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
