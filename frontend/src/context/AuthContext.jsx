import React, { createContext, useState, useEffect, useContext } from 'react';

const AuthContext = createContext();

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // Load user profile on startup if token exists
  useEffect(() => {
    const fetchMe = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await res.json();
        if (data.success) {
          setUser(data.user);
        } else {
          // Token expired or invalid
          logout();
        }
      } catch (err) {
        console.error('Failed to load profile on startup:', err);
        logout();
      } finally {
        setLoading(false);
      }
    };

    fetchMe();
  }, [token]);

  // Login for admin / vendor
  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      }
      return data;
    } catch (err) {
      return { success: false, message: 'Server connection failed' };
    }
  };

  // Register vendor
  const registerVendor = async (name, phone, email, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/register-vendor`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, email, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      }
      return data;
    } catch (err) {
      return { success: false, message: 'Server connection failed' };
    }
  };

  // Send Firebase ID Token to backend to verify and login
  const verifyFirebaseToken = async (idToken) => {
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken })
      });
      const data = await res.json();
      
      // If OTP verified and user exists, log them in
      if (data.success && !data.isNewUser) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      }
      return data;
    } catch (err) {
      return { success: false, message: 'Server connection failed' };
    }
  };

  // Register Customer (if isNewUser is true)
  const registerCustomer = async (name, idToken, address) => {
    try {
      const res = await fetch(`${API_URL}/auth/register-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, idToken, address })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        setToken(data.token);
        setUser(data.user);
      }
      return data;
    } catch (err) {
      return { success: false, message: 'Server connection failed' };
    }
  };

  // Forgot Password
  const forgotPassword = async (email) => {
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Server connection failed' };
    }
  };

  // Reset Password
  const resetPassword = async (tokenParam, password) => {
    try {
      const res = await fetch(`${API_URL}/auth/reset-password/${tokenParam}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      return await res.json();
    } catch (err) {
      return { success: false, message: 'Server connection failed' };
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  // Refresh user details
  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to refresh profile:', err);
    }
  };

  // Helper fetch function that attaches JWT
  const authFetch = async (endpoint, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    };
    
    if (options.body && options.body instanceof FormData) {
      delete headers['Content-Type'];
    }

    try {
      const res = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers
      });
      
      if (res.status === 401) {
        logout();
        return { success: false, message: 'Session expired. Please log in again.' };
      }
      
      return await res.json();
    } catch (err) {
      console.error(`Auth fetch error at ${endpoint}:`, err);
      return { success: false, message: 'Network request failed' };
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      registerVendor,
      verifyFirebaseToken,
      registerCustomer,
      forgotPassword,
      resetPassword,
      logout,
      authFetch,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
