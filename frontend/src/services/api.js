import axios from 'axios';

const API_BASE_URL = (process.env.REACT_APP_API_URL || '').replace(/\/+$/, '');
const API = axios.create({ baseURL: `${API_BASE_URL}/api` });

API.interceptors.request.use((config) => {
  const token = localStorage.getItem('investiq_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

API.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('investiq_token');
      localStorage.removeItem('investiq_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
  updateProfile: (data) => API.put('/auth/profile', data),
};

export const stocksAPI = {
  getAll: (params) => API.get('/stocks', { params }),
  getOne: (symbol) => API.get(`/stocks/${symbol}`),
  getIntraday: (symbol) => API.get(`/stocks/${symbol}/intraday`),
  getSectors: () => API.get('/stocks/sectors'),
};

export const indicesAPI = { getAll: () => API.get('/indices') };

export const tradeAPI = {
  buy: (data) => API.post('/trade/buy', data),
  sell: (data) => API.post('/trade/sell', data),
  getPortfolio: () => API.get('/trade/portfolio'),
  getTransactions: () => API.get('/trade/transactions'),
};

export const portfolioAPI = {
  get: () => API.get('/portfolio'),
  toggleWatchlist: (symbol) => API.post('/portfolio/watchlist', { symbol }),
};

export const ipoAPI = {
  getAll: (params) => API.get('/ipo', { params }),
  getOne: (id) => API.get(`/ipo/${id}`),
};

export const futuresAPI = {
  getAll: () => API.get('/futures'),
  getOptions: (symbol) => API.get(`/futures/options/${symbol}`),
};

export const realEstateAPI = {
  getAll: (params) => API.get('/realEstate', { params }),
  getOne: (id) => API.get(`/realEstate/${id}`),
};

export const aiAPI = {
  recommend: (symbol) => API.get(`/ai/recommend/${symbol}`),
  chat: (messages) => API.post('/ai/chat', { messages }),
  analyzeBehavior: () => API.get('/ai/behavior'),
};

export default API;
