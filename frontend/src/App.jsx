import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import BusinessLogin from './pages/BusinessLogin';
import AdminDashboard from './pages/AdminDashboard';
import VendorDashboard from './pages/VendorDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Route Guard for authenticated users by role
const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-marine-950 text-slate-400 font-semibold text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    // If accessing admin or vendor routes, redirect to /business-login
    if (allowedRoles && (allowedRoles.includes('admin') || allowedRoles.includes('vendor'))) {
      return <Navigate to="/business-login" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to their default page if unauthorized
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'vendor') return <Navigate to="/vendor" replace />;
    return <Navigate to="/customer" replace />;
  }

  return children;
};

// Root Redirect Component
const RootRedirect = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-marine-950 text-slate-400 font-semibold text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading session...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.role === 'admin') return <Navigate to="/admin" replace />;
  if (user.role === 'vendor') return <Navigate to="/vendor" replace />;
  return <Navigate to="/customer" replace />;
};

function App() {
  React.useEffect(() => {
    const projName = import.meta.env.VITE_PROJECT_NAME || 'H2O Delivery Management';
    document.title = projName;
  }, []);

  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Auth pages */}
          <Route path="/login" element={<Login />} />
          <Route path="/business-login" element={<BusinessLogin />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Admin Level (1) */}
          <Route
            path="/admin/*"
            element={
              <PrivateRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </PrivateRoute>
            }
          />

          {/* Vendor Level (2) */}
          <Route
            path="/vendor/*"
            element={
              <PrivateRoute allowedRoles={['vendor']}>
                <VendorDashboard />
              </PrivateRoute>
            }
          />

          {/* Customer Level (3) */}
          <Route
            path="/customer/*"
            element={
              <PrivateRoute allowedRoles={['customer']}>
                <CustomerDashboard />
              </PrivateRoute>
            }
          />

          {/* Fallback routes */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
