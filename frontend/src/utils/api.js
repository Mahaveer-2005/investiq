import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 15000
});

API.interceptors.request.use(config => {
  const token = localStorage.getItem('investiq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('investiq_token');
      localStorage.removeItem('investiq_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default API;

export const formatCurrency = (val, prefix = '₹') => {
  if (!val && val !== 0) return prefix + '0';
  const absVal = Math.abs(val);
  if (absVal >= 10000000) return prefix + (val/10000000).toFixed(2) + 'Cr';
  if (absVal >= 100000) return prefix + (val/100000).toFixed(2) + 'L';
  if (absVal >= 1000) return prefix + (val/1000).toFixed(1) + 'K';
  return prefix + val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatChange = (change, percent) => {
  const sign = change >= 0 ? '+' : '';
  return sign + change?.toFixed(2) + ' (' + sign + percent?.toFixed(2) + '%)';
};

export const colorForChange = (val) => val >= 0 ? 'var(--accent-green)' : 'var(--accent-red)';
export const classForChange = (val) => val >= 0 ? 'change-positive' : 'change-negative';
