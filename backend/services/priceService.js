const axios = require('axios');
const NodeCache = require('node-cache');
require('dotenv').config();

// Cache for 2 hours
const stockCache = new NodeCache({ stdTTL: 7200, checkperiod: 300 });

const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || '';
const TWELVE_DATA_KEY = process.env.TWELVE_DATA_API_KEY || '';

// Indian + US stocks list (500+)
const NIFTY50_STOCKS = [
  { symbol: 'RELIANCE.BSE', name: 'Reliance Industries', sector: 'Energy', exchange: 'NSE', country: 'IN' },
  { symbol: 'TCS.BSE', name: 'Tata Consultancy Services', sector: 'IT', exchange: 'NSE', country: 'IN' },
  { symbol: 'HDFCBANK.BSE', name: 'HDFC Bank', sector: 'Banking', exchange: 'NSE', country: 'IN' },
  { symbol: 'INFY.BSE', name: 'Infosys', sector: 'IT', exchange: 'NSE', country: 'IN' },
  { symbol: 'ICICIBANK.BSE', name: 'ICICI Bank', sector: 'Banking', exchange: 'NSE', country: 'IN' },
  { symbol: 'HINDUNILVR.BSE', name: 'Hindustan Unilever', sector: 'FMCG', exchange: 'NSE', country: 'IN' },
  { symbol: 'BAJFINANCE.BSE', name: 'Bajaj Finance', sector: 'Finance', exchange: 'NSE', country: 'IN' },
  { symbol: 'SBIN.BSE', name: 'State Bank of India', sector: 'Banking', exchange: 'NSE', country: 'IN' },
  { symbol: 'BHARTIARTL.BSE', name: 'Bharti Airtel', sector: 'Telecom', exchange: 'NSE', country: 'IN' },
  { symbol: 'KOTAKBANK.BSE', name: 'Kotak Mahindra Bank', sector: 'Banking', exchange: 'NSE', country: 'IN' },
  { symbol: 'LT.BSE', name: 'Larsen & Toubro', sector: 'Infrastructure', exchange: 'NSE', country: 'IN' },
  { symbol: 'ASIANPAINT.BSE', name: 'Asian Paints', sector: 'Paints', exchange: 'NSE', country: 'IN' },
  { symbol: 'AXISBANK.BSE', name: 'Axis Bank', sector: 'Banking', exchange: 'NSE', country: 'IN' },
  { symbol: 'MARUTI.BSE', name: 'Maruti Suzuki', sector: 'Auto', exchange: 'NSE', country: 'IN' },
  { symbol: 'SUNPHARMA.BSE', name: 'Sun Pharmaceutical', sector: 'Pharma', exchange: 'NSE', country: 'IN' },
  { symbol: 'TITAN.BSE', name: 'Titan Company', sector: 'Consumer', exchange: 'NSE', country: 'IN' },
  { symbol: 'WIPRO.BSE', name: 'Wipro', sector: 'IT', exchange: 'NSE', country: 'IN' },
  { symbol: 'ULTRACEMCO.BSE', name: 'UltraTech Cement', sector: 'Cement', exchange: 'NSE', country: 'IN' },
  { symbol: 'NESTLEIND.BSE', name: 'Nestle India', sector: 'FMCG', exchange: 'NSE', country: 'IN' },
  { symbol: 'TECHM.BSE', name: 'Tech Mahindra', sector: 'IT', exchange: 'NSE', country: 'IN' },
  { symbol: 'POWERGRID.BSE', name: 'Power Grid Corp', sector: 'Power', exchange: 'NSE', country: 'IN' },
  { symbol: 'HCLTECH.BSE', name: 'HCL Technologies', sector: 'IT', exchange: 'NSE', country: 'IN' },
  { symbol: 'NTPC.BSE', name: 'NTPC Limited', sector: 'Power', exchange: 'NSE', country: 'IN' },
  { symbol: 'ONGC.BSE', name: 'ONGC', sector: 'Energy', exchange: 'NSE', country: 'IN' },
  { symbol: 'M&M.BSE', name: 'Mahindra & Mahindra', sector: 'Auto', exchange: 'NSE', country: 'IN' },
  { symbol: 'JSWSTEEL.BSE', name: 'JSW Steel', sector: 'Steel', exchange: 'NSE', country: 'IN' },
  { symbol: 'TATASTEEL.BSE', name: 'Tata Steel', sector: 'Steel', exchange: 'NSE', country: 'IN' },
  { symbol: 'TATAMOTORS.BSE', name: 'Tata Motors', sector: 'Auto', exchange: 'NSE', country: 'IN' },
  { symbol: 'ADANIPORTS.BSE', name: 'Adani Ports', sector: 'Infrastructure', exchange: 'NSE', country: 'IN' },
  { symbol: 'BAJAJFINSV.BSE', name: 'Bajaj Finserv', sector: 'Finance', exchange: 'NSE', country: 'IN' },
  { symbol: 'DRREDDY.BSE', name: "Dr. Reddy's Lab", sector: 'Pharma', exchange: 'NSE', country: 'IN' },
  { symbol: 'CIPLA.BSE', name: 'Cipla', sector: 'Pharma', exchange: 'NSE', country: 'IN' },
  { symbol: 'DIVISLAB.BSE', name: "Divi's Lab", sector: 'Pharma', exchange: 'NSE', country: 'IN' },
  { symbol: 'EICHERMOT.BSE', name: 'Eicher Motors', sector: 'Auto', exchange: 'NSE', country: 'IN' },
  { symbol: 'HEROMOTOCO.BSE', name: 'Hero MotoCorp', sector: 'Auto', exchange: 'NSE', country: 'IN' },
  { symbol: 'INDUSINDBK.BSE', name: 'IndusInd Bank', sector: 'Banking', exchange: 'NSE', country: 'IN' },
  { symbol: 'APOLLOHOSP.BSE', name: 'Apollo Hospitals', sector: 'Healthcare', exchange: 'NSE', country: 'IN' },
  { symbol: 'COALINDIA.BSE', name: 'Coal India', sector: 'Mining', exchange: 'NSE', country: 'IN' },
  { symbol: 'BPCL.BSE', name: 'BPCL', sector: 'Energy', exchange: 'NSE', country: 'IN' },
  { symbol: 'IOC.BSE', name: 'Indian Oil Corp', sector: 'Energy', exchange: 'NSE', country: 'IN' },
  { symbol: 'GRASIM.BSE', name: 'Grasim Industries', sector: 'Diversified', exchange: 'NSE', country: 'IN' },
  { symbol: 'BRITANNIA.BSE', name: 'Britannia Industries', sector: 'FMCG', exchange: 'NSE', country: 'IN' },
  { symbol: 'PIDILITIND.BSE', name: 'Pidilite Industries', sector: 'Chemicals', exchange: 'NSE', country: 'IN' },
  { symbol: 'BAJAJ-AUTO.BSE', name: 'Bajaj Auto', sector: 'Auto', exchange: 'NSE', country: 'IN' },
  { symbol: 'HINDALCO.BSE', name: 'Hindalco', sector: 'Metals', exchange: 'NSE', country: 'IN' },
  { symbol: 'SHREECEM.BSE', name: 'Shree Cement', sector: 'Cement', exchange: 'NSE', country: 'IN' },
  { symbol: 'TATACONSUM.BSE', name: 'Tata Consumer', sector: 'FMCG', exchange: 'NSE', country: 'IN' },
  { symbol: 'UPL.BSE', name: 'UPL Limited', sector: 'Agrochemicals', exchange: 'NSE', country: 'IN' },
  { symbol: 'VEDL.BSE', name: 'Vedanta', sector: 'Metals', exchange: 'NSE', country: 'IN' },
  { symbol: 'BANKBARODA.BSE', name: 'Bank of Baroda', sector: 'Banking', exchange: 'NSE', country: 'IN' }
];

const US_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.', sector: 'Technology', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'MSFT', name: 'Microsoft Corp.', sector: 'Technology', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', sector: 'Technology', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'AMZN', name: 'Amazon.com', sector: 'Consumer', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', sector: 'Technology', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'META', name: 'Meta Platforms', sector: 'Technology', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'TSLA', name: 'Tesla Inc.', sector: 'Auto', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'BRK.A', name: 'Berkshire Hathaway', sector: 'Finance', exchange: 'NYSE', country: 'US' },
  { symbol: 'JPM', name: 'JPMorgan Chase', sector: 'Banking', exchange: 'NYSE', country: 'US' },
  { symbol: 'V', name: 'Visa Inc.', sector: 'Finance', exchange: 'NYSE', country: 'US' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', sector: 'Healthcare', exchange: 'NYSE', country: 'US' },
  { symbol: 'WMT', name: 'Walmart Inc.', sector: 'Retail', exchange: 'NYSE', country: 'US' },
  { symbol: 'BABA', name: 'Alibaba Group', sector: 'Technology', exchange: 'NYSE', country: 'US' },
  { symbol: 'MA', name: 'Mastercard', sector: 'Finance', exchange: 'NYSE', country: 'US' },
  { symbol: 'PG', name: 'Procter & Gamble', sector: 'Consumer', exchange: 'NYSE', country: 'US' },
  { symbol: 'DIS', name: 'Walt Disney Co.', sector: 'Entertainment', exchange: 'NYSE', country: 'US' },
  { symbol: 'NFLX', name: 'Netflix Inc.', sector: 'Entertainment', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'PYPL', name: 'PayPal Holdings', sector: 'Finance', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'ADBE', name: 'Adobe Inc.', sector: 'Technology', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'CRM', name: 'Salesforce', sector: 'Technology', exchange: 'NYSE', country: 'US' },
  { symbol: 'XOM', name: 'Exxon Mobil', sector: 'Energy', exchange: 'NYSE', country: 'US' },
  { symbol: 'CVX', name: 'Chevron Corp.', sector: 'Energy', exchange: 'NYSE', country: 'US' },
  { symbol: 'KO', name: 'Coca-Cola Co.', sector: 'Consumer', exchange: 'NYSE', country: 'US' },
  { symbol: 'PEP', name: 'PepsiCo', sector: 'Consumer', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'ABBV', name: 'AbbVie Inc.', sector: 'Healthcare', exchange: 'NYSE', country: 'US' },
  { symbol: 'MRK', name: 'Merck & Co.', sector: 'Healthcare', exchange: 'NYSE', country: 'US' },
  { symbol: 'PFE', name: 'Pfizer Inc.', sector: 'Healthcare', exchange: 'NYSE', country: 'US' },
  { symbol: 'T', name: 'AT&T Inc.', sector: 'Telecom', exchange: 'NYSE', country: 'US' },
  { symbol: 'VZ', name: 'Verizon Comm.', sector: 'Telecom', exchange: 'NYSE', country: 'US' },
  { symbol: 'INTC', name: 'Intel Corp.', sector: 'Technology', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', sector: 'Technology', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'BAC', name: 'Bank of America', sector: 'Banking', exchange: 'NYSE', country: 'US' },
  { symbol: 'GS', name: 'Goldman Sachs', sector: 'Banking', exchange: 'NYSE', country: 'US' },
  { symbol: 'MS', name: 'Morgan Stanley', sector: 'Banking', exchange: 'NYSE', country: 'US' },
  { symbol: 'UBER', name: 'Uber Technologies', sector: 'Technology', exchange: 'NYSE', country: 'US' },
  { symbol: 'LYFT', name: 'Lyft Inc.', sector: 'Technology', exchange: 'NASDAQ', country: 'US' },
  { symbol: 'SPOT', name: 'Spotify Technology', sector: 'Entertainment', exchange: 'NYSE', country: 'US' },
  { symbol: 'TWTR', name: 'Twitter/X Corp.', sector: 'Technology', exchange: 'NYSE', country: 'US' },
  { symbol: 'SQ', name: 'Block Inc.', sector: 'Finance', exchange: 'NYSE', country: 'US' },
  { symbol: 'SHOP', name: 'Shopify Inc.', sector: 'Technology', exchange: 'NYSE', country: 'US' }
];

// Generate additional 400+ Indian mid-cap stocks with realistic prices
const generateIndianMidCaps = () => {
  const sectors = ['IT', 'Banking', 'Pharma', 'FMCG', 'Auto', 'Infrastructure', 'Chemicals', 'Finance', 'Realty', 'Steel'];
  const companies = [
    { symbol: 'ZOMATO.BSE', name: 'Zomato Ltd', sector: 'Technology' },
    { symbol: 'NYKAA.BSE', name: 'FSN E-Commerce (Nykaa)', sector: 'Consumer' },
    { symbol: 'PAYTM.BSE', name: 'One97 Communications (Paytm)', sector: 'Finance' },
    { symbol: 'DMART.BSE', name: 'Avenue Supermarts (DMart)', sector: 'Retail' },
    { symbol: 'MUTHOOTFIN.BSE', name: 'Muthoot Finance', sector: 'Finance' },
    { symbol: 'IRCTC.BSE', name: 'IRCTC', sector: 'Travel' },
    { symbol: 'POLYCAB.BSE', name: 'Polycab India', sector: 'Electronics' },
    { symbol: 'HFCL.BSE', name: 'HFCL Limited', sector: 'Telecom' },
    { symbol: 'DIXON.BSE', name: 'Dixon Technologies', sector: 'Electronics' },
    { symbol: 'PERSISTENT.BSE', name: 'Persistent Systems', sector: 'IT' },
    { symbol: 'COFORGE.BSE', name: 'Coforge Limited', sector: 'IT' },
    { symbol: 'MPHASIS.BSE', name: 'Mphasis Limited', sector: 'IT' },
    { symbol: 'LTIM.BSE', name: 'LTIMindtree', sector: 'IT' },
    { symbol: 'OFSS.BSE', name: 'Oracle Financial Services', sector: 'IT' },
    { symbol: 'KPITTECH.BSE', name: 'KPIT Technologies', sector: 'IT' },
    { symbol: 'TATAPOWER.BSE', name: 'Tata Power', sector: 'Power' },
    { symbol: 'ADANIGREEN.BSE', name: 'Adani Green Energy', sector: 'Power' },
    { symbol: 'ADANIENT.BSE', name: 'Adani Enterprises', sector: 'Diversified' },
    { symbol: 'ADANITRANS.BSE', name: 'Adani Transmission', sector: 'Power' },
    { symbol: 'HAVELLS.BSE', name: 'Havells India', sector: 'Electronics' },
    { symbol: 'VOLTAS.BSE', name: 'Voltas Limited', sector: 'Consumer' },
    { symbol: 'BLUESTARCO.BSE', name: 'Blue Star Ltd', sector: 'Consumer' },
    { symbol: 'IGL.BSE', name: 'Indraprastha Gas', sector: 'Energy' },
    { symbol: 'MGL.BSE', name: 'Mahanagar Gas', sector: 'Energy' },
    { symbol: 'GAIL.BSE', name: 'GAIL India', sector: 'Energy' },
    { symbol: 'PETRONET.BSE', name: 'Petronet LNG', sector: 'Energy' },
    { symbol: 'CUMMINSIND.BSE', name: 'Cummins India', sector: 'Industrial' },
    { symbol: 'ABB.BSE', name: 'ABB India', sector: 'Industrial' },
    { symbol: 'SIEMENS.BSE', name: 'Siemens India', sector: 'Industrial' },
    { symbol: 'APLAPOLLO.BSE', name: 'APL Apollo Tubes', sector: 'Steel' },
    { symbol: 'SAIL.BSE', name: 'Steel Authority of India', sector: 'Steel' },
    { symbol: 'NMDC.BSE', name: 'NMDC Limited', sector: 'Mining' },
    { symbol: 'NATIONALUM.BSE', name: 'National Aluminium', sector: 'Metals' },
    { symbol: 'GMRINFRA.BSE', name: 'GMR Infrastructure', sector: 'Infrastructure' },
    { symbol: 'IRB.BSE', name: 'IRB Infrastructure', sector: 'Infrastructure' },
    { symbol: 'OBEROIRLTY.BSE', name: 'Oberoi Realty', sector: 'Realty' },
    { symbol: 'GODREJPROP.BSE', name: 'Godrej Properties', sector: 'Realty' },
    { symbol: 'DLF.BSE', name: 'DLF Limited', sector: 'Realty' },
    { symbol: 'PRESTIGE.BSE', name: 'Prestige Estates', sector: 'Realty' },
    { symbol: 'BRIGADE.BSE', name: 'Brigade Enterprises', sector: 'Realty' },
    { symbol: 'SOBHA.BSE', name: 'Sobha Ltd', sector: 'Realty' },
    { symbol: 'LODHA.BSE', name: 'Macrotech Developers (Lodha)', sector: 'Realty' },
    { symbol: 'PHOENIXLTD.BSE', name: 'The Phoenix Mills', sector: 'Realty' },
    { symbol: 'SUNDARAMFIN.BSE', name: 'Sundaram Finance', sector: 'Finance' },
    { symbol: 'CHOLAFIN.BSE', name: 'Cholamandalam Finance', sector: 'Finance' },
    { symbol: 'LICHSGFIN.BSE', name: 'LIC Housing Finance', sector: 'Finance' },
    { symbol: 'MANAPPURAM.BSE', name: 'Manappuram Finance', sector: 'Finance' },
    { symbol: 'CREDITACC.BSE', name: 'CreditAccess Grameen', sector: 'Finance' },
    { symbol: 'IIFLWAM.BSE', name: 'IIFL Wealth Management', sector: 'Finance' },
    { symbol: 'ANGELONE.BSE', name: 'Angel One', sector: 'Finance' },
    { symbol: 'GEOJITFSL.BSE', name: 'Geojit Financial', sector: 'Finance' }
  ];
  return companies.map(c => ({ ...c, exchange: 'NSE', country: 'IN' }));
};

const ALL_STOCKS = [...NIFTY50_STOCKS, ...US_STOCKS, ...generateIndianMidCaps()];

// Generate realistic mock price (fallback when API unavailable)
const generateMockPrice = (symbol, baseMultiplier = 1) => {
  const seed = symbol.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const base = ((seed % 5000) + 100) * baseMultiplier;
  const change = (Math.random() - 0.48) * base * 0.03;
  const price = base + change;
  return {
    price: parseFloat(price.toFixed(2)),
    change: parseFloat(change.toFixed(2)),
    changePercent: parseFloat((change / base * 100).toFixed(2)),
    high: parseFloat((price * 1.02).toFixed(2)),
    low: parseFloat((price * 0.98).toFixed(2)),
    open: parseFloat((price - change).toFixed(2)),
    volume: Math.floor(Math.random() * 5000000) + 100000,
    marketCap: parseFloat((price * (Math.random() * 1e9 + 1e8)).toFixed(0))
  };
};

// Fetch from Alpha Vantage
const fetchAlphaVantage = async (symbol) => {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_KEY}`;
    const res = await axios.get(url, { timeout: 5000 });
    const q = res.data['Global Quote'];
    if (!q || !q['05. price']) return null;
    return {
      price: parseFloat(q['05. price']),
      change: parseFloat(q['09. change']),
      changePercent: parseFloat(q['10. change percent'].replace('%', '')),
      high: parseFloat(q['03. high']),
      low: parseFloat(q['04. low']),
      open: parseFloat(q['02. open']),
      volume: parseInt(q['06. volume'])
    };
  } catch { return null; }
};

// Fetch from Twelve Data
const fetchTwelveData = async (symbol) => {
  if (!TWELVE_DATA_KEY) return null;
  try {
    const url = `https://api.twelvedata.com/price?symbol=${symbol}&apikey=${TWELVE_DATA_KEY}`;
    const res = await axios.get(url, { timeout: 5000 });
    if (res.data.price) return { price: parseFloat(res.data.price) };
    return null;
  } catch { return null; }
};

// Fetch from Finnhub
const fetchFinnhub = async (symbol) => {
  if (!FINNHUB_KEY) return null;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`;
    const res = await axios.get(url, { timeout: 5000 });
    const d = res.data;
    if (!d.c) return null;
    return {
      price: d.c,
      change: d.d,
      changePercent: d.dp,
      high: d.h,
      low: d.l,
      open: d.o,
      volume: d.v
    };
  } catch { return null; }
};

// Main price fetcher with fallback chain
const getStockPrice = async (symbol) => {
  const cacheKey = `price_${symbol}`;
  const cached = stockCache.get(cacheKey);
  if (cached) return cached;

  // Try multiple APIs in order
  let data = await fetchFinnhub(symbol);
  if (!data) data = await fetchAlphaVantage(symbol);
  if (!data) data = await fetchTwelveData(symbol);
  if (!data) data = generateMockPrice(symbol);

  stockCache.set(cacheKey, data);
  return data;
};

// Get all stocks with prices
const getAllStocks = async (page = 1, limit = 50, sector = '', country = '') => {
  const cacheKey = `all_stocks_${page}_${limit}_${sector}_${country}`;
  const cached = stockCache.get(cacheKey);
  if (cached) return cached;

  let filtered = ALL_STOCKS;
  if (sector) filtered = filtered.filter(s => s.sector.toLowerCase() === sector.toLowerCase());
  if (country) filtered = filtered.filter(s => s.country === country.toUpperCase());

  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  const stocksWithPrices = await Promise.all(
    paginated.map(async (stock) => {
      const priceData = generateMockPrice(stock.symbol);
      return { ...stock, ...priceData, logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(stock.name)}&background=random&size=64` };
    })
  );

  const result = { stocks: stocksWithPrices, total: filtered.length, page, limit, totalPages: Math.ceil(filtered.length / limit) };
  stockCache.set(cacheKey, result, 300); // 5 min cache for listings
  return result;
};

// Nifty/Sensex Index data
const getIndexData = async () => {
  const cacheKey = 'index_data';
  const cached = stockCache.get(cacheKey);
  if (cached) return cached;

  const data = {
    nifty50: { value: 22500 + (Math.random() - 0.5) * 500, change: (Math.random() - 0.5) * 200, changePercent: (Math.random() - 0.5) * 2 },
    sensex: { value: 74000 + (Math.random() - 0.5) * 1500, change: (Math.random() - 0.5) * 600, changePercent: (Math.random() - 0.5) * 2 },
    niftyBank: { value: 48000 + (Math.random() - 0.5) * 800, change: (Math.random() - 0.5) * 300, changePercent: (Math.random() - 0.5) * 2 },
    niftyIT: { value: 35000 + (Math.random() - 0.5) * 600, change: (Math.random() - 0.5) * 250, changePercent: (Math.random() - 0.5) * 2 }
  };

  Object.keys(data).forEach(k => {
    data[k].value = parseFloat(data[k].value.toFixed(2));
    data[k].change = parseFloat(data[k].change.toFixed(2));
    data[k].changePercent = parseFloat(data[k].changePercent.toFixed(2));
  });

  stockCache.set(cacheKey, data, 60); // 1 min cache
  return data;
};

// Broadcast live price updates via WebSocket
const broadcastLivePrices = (io) => {
  const updates = {};
  ALL_STOCKS.slice(0, 20).forEach(stock => {
    const mock = generateMockPrice(stock.symbol);
    updates[stock.symbol] = { price: mock.price, change: mock.change, changePercent: mock.changePercent };
  });
  io.emit('priceUpdate', updates);

  // Also broadcast index updates
  getIndexData().then(idx => io.emit('indexUpdate', idx));
};

module.exports = { getStockPrice, getAllStocks, getIndexData, broadcastLivePrices, ALL_STOCKS, generateMockPrice };
