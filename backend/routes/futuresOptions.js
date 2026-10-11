const express = require('express');
const router = express.Router();

const FO_INSTRUMENTS = [
  { symbol: 'NIFTY', name: 'NIFTY 50', type: 'Index', lotSize: 50, marginRequired: 125000, contracts: ['NIFTY25MAR22800CE', 'NIFTY25MAR22800PE', 'NIFTY25APR22500CE'] },
  { symbol: 'BANKNIFTY', name: 'Bank Nifty', type: 'Index', lotSize: 15, marginRequired: 58000, contracts: [] },
  { symbol: 'RELIANCE', name: 'Reliance Industries', type: 'Stock', lotSize: 500, marginRequired: 78000, contracts: [] },
  { symbol: 'TCS', name: 'TCS', type: 'Stock', lotSize: 300, marginRequired: 95000, contracts: [] },
  { symbol: 'HDFCBANK', name: 'HDFC Bank', type: 'Stock', lotSize: 550, marginRequired: 68000, contracts: [] }
];

router.get('/', (req, res) => {
  const instruments = FO_INSTRUMENTS.map(i => ({
    ...i,
    futurePrice: Math.round((22800 + Math.random() * 200) * 100) / 100,
    change: Math.round((Math.random() - 0.5) * 100 * 100) / 100,
    openInterest: Math.floor(Math.random() * 5000000),
    pcr: Math.round(Math.random() * 2 * 100) / 100
  }));
  res.json({ success: true, instruments });
});

router.get('/options-chain/:symbol', (req, res) => {
  const atm = 22800;
  const strikes = [];
  for (let i = -10; i <= 10; i++) {
    const strike = atm + i * 100;
    strikes.push({
      strike,
      call: { oi: Math.floor(Math.random() * 1000000), volume: Math.floor(Math.random() * 500000), iv: Math.round((15 + Math.random() * 30) * 100) / 100, ltp: Math.round(Math.random() * 500 * 100) / 100, change: Math.round((Math.random() - 0.5) * 50 * 100) / 100 },
      put: { oi: Math.floor(Math.random() * 1000000), volume: Math.floor(Math.random() * 500000), iv: Math.round((15 + Math.random() * 30) * 100) / 100, ltp: Math.round(Math.random() * 500 * 100) / 100, change: Math.round((Math.random() - 0.5) * 50 * 100) / 100 }
    });
  }
  res.json({ success: true, symbol: req.params.symbol, spotPrice: atm, optionsChain: strikes });
});

module.exports = router;
