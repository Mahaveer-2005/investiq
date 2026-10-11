import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [token,   setToken]   = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  // Verify token on mount
  useEffect(() => {
    const verify = async () => {
      const t = localStorage.getItem('token');
      if (!t) { setLoading(false); return; }
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${t}`;
        const { data } = await axios.get('/api/auth/me');
        setUser(data);
        setToken(t);
      } catch {
        // Token invalid or expired — clear everything
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };
    verify();
  }, []);

  const login = (userData, tokenStr) => {
    localStorage.setItem('token', tokenStr);
    localStorage.setItem('user',  JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${tokenStr}`;
    setToken(tokenStr);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
  };

  // ── Registration flow ────────────────────────────────────────────────────
  // Step 1: create the (unverified) account and email an OTP.
  // Does NOT log the user in — an account only becomes usable once the OTP
  // is confirmed via verifyEmail(), matching the backend's email-verification
  // requirement.
  const register = async (name, email, password) => {
    const { data } = await axios.post('/api/auth/register', { name, email, password });
    return data; // { success, requiresVerification, email, message, devOtp? }
  };

  // Step 2: confirm the 6-digit OTP. On success this logs the user in.
  const verifyEmail = async (email, otp) => {
    const { data } = await axios.post('/api/auth/verify-email', { email, otp });
    login(data.user, data.token);
    return data;
  };

  const resendOTP = async (email) => {
    const { data } = await axios.post('/api/auth/resend-otp', { email });
    return data;
  };

  const forgotPassword = async (email) => {
    const { data } = await axios.post('/api/auth/forgot-password', { email });
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, setUser, token, loading, login, logout, register, verifyEmail, resendOTP, forgotPassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);