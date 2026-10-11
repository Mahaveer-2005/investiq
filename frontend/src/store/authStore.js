import { create } from 'zustand';
import API from '../utils/api';

const useAuthStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('investiq_user') || 'null'),
  token: localStorage.getItem('investiq_token'),
  isAuthenticated: !!localStorage.getItem('investiq_token'),
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post('/auth/login', { email, password });
      const { token, user } = res.data;
      localStorage.setItem('investiq_token', token);
      localStorage.setItem('investiq_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, loading: false });
      return { success: true };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  register: async (name, email, password) => {
    set({ loading: true, error: null });
    try {
      const res = await API.post('/auth/register', { name, email, password });
      const { token, user, message } = res.data;
      localStorage.setItem('investiq_token', token);
      localStorage.setItem('investiq_user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true, loading: false });
      return { success: true, message };
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed';
      set({ error: msg, loading: false });
      return { success: false, error: msg };
    }
  },

  logout: () => {
    localStorage.removeItem('investiq_token');
    localStorage.removeItem('investiq_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    try {
      const res = await API.get('/auth/me');
      const user = res.data.user;
      localStorage.setItem('investiq_user', JSON.stringify(user));
      set({ user });
    } catch(e) {}
  }
}));

export default useAuthStore;
