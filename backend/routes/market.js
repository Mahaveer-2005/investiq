const router = require('express').Router();
const auth   = require('../middleware/auth');
const axios  = require('axios');
const NodeCache = require('node-cache');
const cache  = new NodeCache({ stdTTL: 120 });

const HEADERS = { 'User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };

// ── GET /api/market/index/:yahoo  (e.g. %5EBSESN) ─────────────────────
router.get('/index/:yahoo', auth, async (req, res) => {
  const sym = req.params.yahoo;
  const key = `idx_${sym}`;
  const hit = cache.get(key);
  if (hit) return res.json(hit);
  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
      { headers: HEADERS, timeout: 8000 }
    );
    const meta  = data?.chart?.result?.[0]?.meta;
    if (!meta) return res.status(404).json({ message: 'No data' });
    const price    = meta.regularMarketPrice     || 0;
    const prevClose= meta.chartPreviousClose     || meta.previousClose || price;
    const change   = +(price - prevClose).toFixed(2);
    const changePct= prevClose ? +((change / prevClose) * 100).toFixed(2) : 0;
    const result = {
      price:     +price.toFixed(2),
      prevClose: +prevClose.toFixed(2),
      change,
      changePct,
      name:      meta.longName || meta.shortName || sym,
    };
    cache.set(key, result, 120);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/market/chart/:yahoo  (30-day candles) ─────────────────────
router.get('/chart/:yahoo', auth, async (req, res) => {
  const sym = req.params.yahoo;
  const key = `chart_${sym}`;
  const hit = cache.get(key);
  if (hit) return res.json(hit);
  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1mo`,
      { headers: HEADERS, timeout: 10000 }
    );
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ message: 'No chart data' });

    const timestamps = result.timestamp || [];
    const closes     = result.indicators?.quote?.[0]?.close || [];

    const candles = timestamps
      .map((ts, i) => ({
        date:  new Date(ts * 1000).toISOString().split('T')[0],
        price: closes[i] != null ? +Number(closes[i]).toFixed(2) : null,
      }))
      .filter(c => c.price !== null && c.price > 0);

    cache.set(key, candles, 300);
    res.json(candles);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/market/candles/:yahoo?interval=5m&range=1d ─────────────────
// Full OHLCV candles (not just close) for real candlestick charts, with
// configurable interval/range — supports both intraday (1m/5m/15m/30m/1h)
// and longer-term (1d/1wk/1mo) views using the same reliable v8 chart
// endpoint already proven to work without auth (unlike v7/v10 which need
// a crumb — see routes/fundamental.js for that fix).
router.get('/candles/:yahoo', auth, async (req, res) => {
  const sym = req.params.yahoo;
  const interval = req.query.interval || '1d';
  const range = req.query.range || '3mo';
  const key = `candles_${sym}_${interval}_${range}`;
  const hit = cache.get(key);
  if (hit) return res.json(hit);
  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=${interval}&range=${range}`,
      { headers: HEADERS, timeout: 10000, insecureHTTPParser: true }
    );
    const result = data?.chart?.result?.[0];
    if (!result) return res.status(404).json({ message: 'No chart data' });

    const meta = result.meta || {};
    const timestamps = result.timestamp || [];
    const q = result.indicators?.quote?.[0] || {};

    const candles = timestamps.map((ts, i) => ({
      time: ts * 1000,
      date: new Date(ts * 1000).toISOString(),
      open: q.open?.[i]  != null ? +Number(q.open[i]).toFixed(2)  : null,
      high: q.high?.[i]  != null ? +Number(q.high[i]).toFixed(2)  : null,
      low:  q.low?.[i]   != null ? +Number(q.low[i]).toFixed(2)   : null,
      close:q.close?.[i] != null ? +Number(q.close[i]).toFixed(2) : null,
      volume: q.volume?.[i] || 0,
    })).filter(c => c.close !== null);

    const result_payload = {
      candles,
      meta: {
        price: meta.regularMarketPrice || candles[candles.length-1]?.close || 0,
        prevClose: meta.chartPreviousClose || meta.previousClose || 0,
        dayHigh: meta.regularMarketDayHigh || Math.max(...candles.map(c=>c.high).filter(Boolean)),
        dayLow: meta.regularMarketDayLow || Math.min(...candles.map(c=>c.low).filter(Boolean)),
        w52High: meta.fiftyTwoWeekHigh || 0,
        w52Low: meta.fiftyTwoWeekLow || 0,
        volume: meta.regularMarketVolume || 0,
        marketState: meta.marketState || 'UNKNOWN', // 'REGULAR' | 'PRE' | 'POST' | 'CLOSED'
        exchangeTimezoneName: meta.exchangeTimezoneName || '',
        name: meta.longName || meta.shortName || sym,
      },
    };
    cache.set(key, result_payload, interval.includes('m') || interval.includes('h') ? 30 : 300);
    res.json(result_payload);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;