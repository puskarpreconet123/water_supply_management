import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Droplets, Lock, ArrowRight } from 'lucide-react';

const ResetPassword = () => {
  const { token } = useParams();
  const { resetPassword } = useAuth();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password.length < 6) {
      return setError('Password must be at least 6 characters');
    }

    if (password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);
    try {
      const res = await resetPassword(token, password);
      if (res.success) {
        setMessage('Password reset successful! Redirecting...');
        setTimeout(() => {
          navigate('/business-login');
        }, 2000);
      } else {
        setError(res.message || 'Invalid or expired token');
      }
    } catch (err) {
      setError('Connection failure');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-marine-950 via-slate-900 to-marine-900 overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-cyan-600/10 blur-3xl animate-float" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl animate-float [animation-delay:2s]" />

      <div className="w-full max-w-md glass-panel rounded-2xl overflow-hidden shadow-2xl z-10 border border-marine-800">
        <div className="bg-gradient-to-r from-marine-900 to-slate-950 p-6 text-center border-b border-marine-800">
          <div className="inline-flex items-center justify-center p-3 rounded-full bg-marine-500/10 mb-3 border border-marine-500/20 text-cyan-400 animate-float">
            <Droplets size={36} className="fill-cyan-400/20 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">New Password</h1>
          <p className="text-xs text-slate-400 mt-1">Enter a strong new password for your account</p>
        </div>

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

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">New Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-marine-950/50 border border-marine-800 rounded-lg py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center py-2.5 rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 text-white font-semibold text-sm hover:from-cyan-400 hover:to-teal-400 transition-all shadow-lg shadow-cyan-950/50 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Updating...' : 'Update Password'}
              <ArrowRight size={16} className="ml-2" />
            </button>
          </form>

          <div className="text-center mt-6 pt-4 border-t border-marine-850">
            <Link to="/business-login" className="text-xs text-slate-500 hover:text-slate-300 hover:underline transition-colors font-medium">
              Back to Business Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
