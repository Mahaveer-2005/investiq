const express = require('express');
const router = express.Router();
const cache = require('../config/cache');

function genFOData() {
  const FUTURES = [
    { symbol: 'NIFTY', name: 'Nifty 50 Futures', underlying: 'NIFTY 50', lotSize: 50, expiry: '2025-03-27', price: 22500, change: -45, changePercent: -0.20, oi: 15234500 },
    { symbol: 'BANKNIFTY', name: 'Bank Nifty Futures', underlying: 'BANK NIFTY', lotSize: 15, expiry: '2025-03-27', price: 48200, change: 120, changePercent: 0.25, oi: 8756200 },
    { symbol: 'RELIANCE', name: 'Reliance Futures', underlying: 'RELIANCE', lotSize: 250, expiry: '2025-03-27', price: 2460, change: 18, changePercent: 0.74, oi: 3456700 },
    { symbol: 'TCS', name: 'TCS Futures', underlying: 'TCS', lotSize: 150, expiry: '2025-03-27', price: 3680, change: -22, changePercent: -0.59, oi: 1234500 },
    { symbol: 'INFY', name: 'Infosys Futures', underlying: 'INFY', lotSize: 300, expiry: '2025-03-27', price: 1455, change: 8, changePercent: 0.55, oi: 2345600 },
    { symbol: 'HDFC', name: 'HDFC Bank Futures', underlying: 'HDFCBANK', lotSize: 550, expiry: '2025-03-27', price: 1590, change: -5, changePercent: -0.31, oi: 4567800 },
    { symbol: 'ICICI', name: 'ICICI Bank Futures', underlying: 'ICICIBANK', lotSize: 700, expiry: '2025-03-27', price: 958, change: 12, changePercent: 1.27, oi: 5678900 },
    { symbol: 'SBIN', name: 'SBI Futures', underlying: 'SBIN', lotSize: 1500, expiry: '2025-03-27', price: 624, change: 4, changePercent: 0.64, oi: 9876500 },
  ];
  return FUTURES.map(f => ({
    ...f,
    price: parseFloat((f.price * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2)),
    change: parseFloat((f.change + (Math.random() - 0.5) * 5).toFixed(2)),
    marginRequired: parseFloat((f.price * f.lotSize * 0.12).toFixed(0)),
  }));
}

// Options chain data generator
function genOptionsChain(underlying = 'NIFTY', spot = 22500) {
  const strikes = [];
  for (let i = -10; i <= 10; i++) {
    const strike = Math.round((spot + i * 50) / 50) * 50;
    const diff = spot - strike;
    const callPremium = Math.max(2, diff > 0 ? diff + Math.random() * 50 + 20 : Math.random() * 100 + 5);
    const putPremium = Math.max(2, diff < 0 ? -diff + Math.random() * 50 + 20 : Math.random() * 100 + 5);
    strikes.push({
      strike,
      callOI: Math.floor(Math.random() * 1000000),
      callVolume: Math.floor(Math.random() * 50000),
      callPremium: parseFloat(callPremium.toFixed(2)),
      callIV: parseFloat((15 + Math.random() * 20).toFixed(2)),
      putOI: Math.floor(Math.random() * 1000000),
      putVolume: Math.floor(Math.random() * 50000),
      putPremium: parseFloat(putPremium.toFixed(2)),
      putIV: parseFloat((15 + Math.random() * 20).toFixed(2)),
      isATM: Math.abs(strike - spot) < 50,
    });
  }
  return strikes;
}

router.get('/', (req, res) => {
  const cacheKey = 'futures_list';
  let data = cache.get(cacheKey);
  if (!data) { data = genFOData(); cache.set(cacheKey, data, 300); }
  res.json({ success: true, data });
});

router.get('/options/:symbol', (req, res) => {
  const spots = { NIFTY: 22500, BANKNIFTY: 48200, RELIANCE: 2460, TCS: 3680 };
  const spot = spots[req.params.symbol] || 22500;
  res.json({ success: true, data: genOptionsChain(req.params.symbol, spot), spot, symbol: req.params.symbol });
});

module.exports = router;
