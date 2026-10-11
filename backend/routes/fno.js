const router = require('express').Router();
const { getStockPrice, STOCK_LIST } = require('../services/stockService');

const FNO_STOCKS = ['RELIANCE.BSE', 'TCS.BSE', 'INFY.BSE', 'HDFCBANK.BSE', 'ICICIBANK.BSE', 'SBIN.BSE', 'BAJFINANCE.BSE', 'KOTAKBANK.BSE', 'AXISBANK.BSE', 'TATAMOTORS.BSE', 'MARUTI.BSE', 'LT.BSE', 'WIPRO.BSE', 'SUNPHARMA.BSE', 'NTPC.BSE', 'ADANIENT.BSE', 'AAPL', 'MSFT', 'GOOGL', 'TSLA'];

router.get('/options', async (req, res) => {
  const { symbol } = req.query;
  const targetSymbol = symbol || 'RELIANCE.BSE';
  const priceData = await getStockPrice(targetSymbol);
  const spot = priceData.price;

  // Generate option chain
  const strikes = [];
  for (let i = -5; i <= 5; i++) {
    const step = spot > 1000 ? 50 : spot > 500 ? 25 : 10;
    const strike = Math.round(spot / step) * step + i * step;
    const callIV = 18 + Math.abs(i) * 2 + Math.random() * 5;
    const putIV = 19 + Math.abs(i) * 2 + Math.random() * 5;
    const callPremium = Math.max(0, spot - strike) + callIV * spot * 0.004;
    const putPremium = Math.max(0, strike - spot) + putIV * spot * 0.004;
    strikes.push({
      strike: +strike.toFixed(0),
      callOI: Math.floor(Math.random() * 50000 + 5000),
      callVolume: Math.floor(Math.random() * 10000),
      callIV: +callIV.toFixed(2),
      callPremium: +callPremium.toFixed(2),
      callDelta: +(0.5 + i * 0.07).toFixed(2),
      putOI: Math.floor(Math.random() * 50000 + 5000),
      putVolume: Math.floor(Math.random() * 10000),
      putIV: +putIV.toFixed(2),
      putPremium: +putPremium.toFixed(2),
      putDelta: +(-0.5 + i * 0.07).toFixed(2),
      isATM: Math.abs(i) === 0
    });
  }

  res.json({ success: true, symbol: targetSymbol, spot, optionChain: strikes, expiry: getNextExpiry() });
});

router.get('/futures', async (req, res) => {
  const futures = await Promise.all(FNO_STOCKS.map(async sym => {
    const stockInfo = STOCK_LIST.find(s => s.symbol === sym);
    const priceData = await getStockPrice(sym);
    const premium = +(priceData.price * 0.003).toFixed(2);
    return { symbol: sym, name: stockInfo?.name || sym, spot: priceData.price, futures: +(priceData.price + premium).toFixed(2), change: priceData.change, changePercent: priceData.changePercent, lotSize: Math.floor(Math.random() * 100 + 25) * 25, oi: Math.floor(Math.random() * 1000000 + 100000) };
  }));
  res.json({ success: true, futures });
});

router.get('/stocks', (req, res) => {
  const stocks = FNO_STOCKS.map(sym => {
    const info = STOCK_LIST.find(s => s.symbol === sym);
    return { symbol: sym, name: info?.name, sector: info?.sector };
  });
  res.json({ success: true, stocks });
});

function getNextExpiry() {
  const today = new Date();
  const thursday = new Date(today);
  thursday.setDate(today.getDate() + ((4 - today.getDay() + 7) % 7 || 7));
  return thursday.toISOString().slice(0, 10);
}

module.exports = router;
