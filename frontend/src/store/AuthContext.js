import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('investiq_token');
    if (token) {
      authAPI.getMe().then(res => { setUser(res.user); setLoading(false); })
        .catch(() => { localStorage.removeItem('investiq_token'); setLoading(false); });
    } else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    localStorage.setItem('investiq_token', res.token);
    setUser(res.user);
    return res;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register({ name, email, password });
    localStorage.setItem('investiq_token', res.token);
    setUser(res.user);
    return res;
  };

  const logout = () => {
    localStorage.removeItem('investiq_token');
    setUser(null);
  };

  const updateUser = (updates) => setUser(prev => ({ ...prev, ...updates }));

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
