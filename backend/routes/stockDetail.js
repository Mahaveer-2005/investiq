const router    = require('express').Router();
const axios     = require('axios');
const NodeCache = require('node-cache');
const auth      = require('../middleware/auth');

const cache = new NodeCache({ stdTTL: 300 });

// Index symbol map — these need ^ prefix for Yahoo Finance
const INDEX_SYMBOLS = {
  'NSEI':     '^NSEI',
  'BSESN':    '^BSESN',
  'NSEBANK':  '^NSEBANK',
  'ENSEBANK': '^NSEBANK',
  'NIFTY':    '^NSEI',
  'SENSEX':   '^BSESN',
  'BANKNIFTY':'^NSEBANK',
};

function resolveSymbol(raw) {
  const up = raw.toUpperCase().replace('.NS','').replace('.BSE','');
  if (INDEX_SYMBOLS[up]) return INDEX_SYMBOLS[up];
  if (raw.startsWith('^')) return raw;
  return `${up}.NS`;
}

async function fetchCandles(symbol, interval = '1d', range = '6mo') {
  const key = `candles_${symbol}_${interval}_${range}`;
  const c   = cache.get(key);
  if (c) return c;

  const sym = resolveSymbol(symbol);

  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=${interval}&range=${range}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        timeout: 10000,
      }
    );

    const r      = res.data.chart.result[0];
    const ts     = r.timestamp || [];
    const q      = r.indicators.quote[0];
    const closes = q.close  || [];
    const opens  = q.open   || [];
    const highs  = q.high   || [];
    const lows   = q.low    || [];
    const vols   = q.volume || [];

    const candles = ts.map((t, i) => ({
      time:   new Date(t * 1000).toISOString().slice(0, 10),
      open:   opens[i]  != null ? +opens[i].toFixed(2)  : null,
      high:   highs[i]  != null ? +highs[i].toFixed(2)  : null,
      low:    lows[i]   != null ? +lows[i].toFixed(2)   : null,
      close:  closes[i] != null ? +closes[i].toFixed(2) : null,
      volume: vols[i]   != null ? Math.round(vols[i])   : 0,
    })).filter(c => c.close !== null && c.open !== null);

    if (candles.length === 0) throw new Error('No candles returned');
    cache.set(key, candles, 300);
    return candles;
  } catch (e) {
    console.error(`fetchCandles error ${symbol}:`, e.message);
    return [];
  }
}

// ── Technical indicators ────────────────────────────────────────────────────
function calcSMA(data, period) {
  return data.map((_, i) => {
    if (i < period - 1) return null;
    const slice = data.slice(i - period + 1, i + 1).filter(v => v != null);
    if (slice.length < period) return null;
    return +(slice.reduce((s, v) => s + v, 0) / period).toFixed(2);
  });
}

function calcEMA(data, period) {
  const k   = 2 / (period + 1);
  const ema = [];
  let idx   = 0;
  let prev  = 0;
  const clean = data.filter(v => v != null);
  if (clean.length < period) return data.map(() => null);
  prev = clean.slice(0, period).reduce((s, v) => s + v, 0) / period;
  data.forEach((v) => {
    if (v == null) { ema.push(null); return; }
    if (idx < period - 1) { ema.push(null); idx++; return; }
    if (idx === period - 1) { ema.push(+prev.toFixed(2)); idx++; return; }
    prev = v * k + prev * (1 - k);
    ema.push(+prev.toFixed(2));
    idx++;
  });
  return ema;
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return closes.map(() => null);
  const rsi = new Array(period).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period;
  avgLoss /= period;
  rsi.push(avgLoss === 0 ? 100 : +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    rsi.push(avgLoss === 0 ? 100 : +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
  }
  return rsi;
}

function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  const macd  = ema12.map((v, i) => (v != null && ema26[i] != null) ? +(v - ema26[i]).toFixed(2) : null);
  const macdClean  = macd.filter(v => v != null);
  const sigRaw     = calcEMA(macdClean, 9);
  const nullCount  = macd.filter(v => v == null).length;
  const signal     = [...new Array(nullCount).fill(null), ...sigRaw];
  const histogram  = macd.map((v, i) => (v != null && signal[i] != null) ? +(v - signal[i]).toFixed(2) : null);
  return { macd, signal, histogram };
}

function calcBollingerBands(closes, period = 20) {
  const sma = calcSMA(closes, period);
  return closes.map((_, i) => {
    if (i < period - 1 || sma[i] == null) return { upper: null, middle: null, lower: null };
    const slice  = closes.slice(i - period + 1, i + 1);
    const mean   = sma[i];
    const stddev = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return {
      upper:  +(mean + 2 * stddev).toFixed(2),
      middle: mean,
      lower:  +(mean - 2 * stddev).toFixed(2),
    };
  });
}

function calcStochastic(candles, k = 14, d = 3) {
  const result = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < k - 1) { result.push({ k: null, d: null }); continue; }
    const slice   = candles.slice(i - k + 1, i + 1);
    const highest = Math.max(...slice.map(c => c.high));
    const lowest  = Math.min(...slice.map(c => c.low));
    const kVal    = highest === lowest ? 50 : +((candles[i].close - lowest) / (highest - lowest) * 100).toFixed(2);
    result.push({ k: kVal, d: null });
  }
  for (let i = d - 1; i < result.length; i++) {
    const vals = result.slice(i - d + 1, i + 1).map(r => r.k).filter(v => v != null);
    if (vals.length === d) result[i].d = +(vals.reduce((s, v) => s + v, 0) / d).toFixed(2);
  }
  return result;
}

function calcATR(candles, period = 14) {
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prev = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  return calcSMA(trs, period);
}

function calcVWAP(candles) {
  let cumTV = 0, cumV = 0;
  return candles.map(c => {
    const typical = (c.high + c.low + c.close) / 3;
    cumTV += typical * (c.volume || 0);
    cumV  += (c.volume || 0);
    return cumV > 0 ? +(cumTV / cumV).toFixed(2) : null;
  });
}

function findSupportResistance(candles) {
  if (candles.length < 20) return { support: [], resistance: [] };
  const highs = candles.map(c => c.high);
  const lows  = candles.map(c => c.low);
  const support = [], resistance = [];
  const window  = 5;
  for (let i = window; i < candles.length - window; i++) {
    const localLow  = Math.min(...lows.slice(i - window, i + window + 1));
    const localHigh = Math.max(...highs.slice(i - window, i + window + 1));
    if (lows[i]  === localLow)  support.push(+lows[i].toFixed(2));
    if (highs[i] === localHigh) resistance.push(+highs[i].toFixed(2));
  }
  const uniq = arr => [...new Set(arr.map(v => Math.round(v / 10) * 10))].sort((a, b) => a - b);
  return { support: uniq(support).slice(-3), resistance: uniq(resistance).slice(-3) };
}

function detectPatterns(candles) {
  const patterns = [];
  if (candles.length < 3) return patterns;
  const last = candles.slice(-5);
  const [c1, , c3] = last.slice(-3);
  const body3   = Math.abs(c3.close - c3.open);
  const lShadow = Math.min(c3.open, c3.close) - c3.low;
  const uShadow = c3.high - Math.max(c3.open, c3.close);

  if (body3 / (c3.close || 1) < 0.003)
    patterns.push({ name: 'Doji', type: 'neutral', emoji: '⚖️', desc: 'Indecision — possible reversal' });
  if (lShadow > body3 * 2 && c3.close > c3.open)
    patterns.push({ name: 'Hammer', type: 'bullish', emoji: '🔨', desc: 'Potential bullish reversal' });
  if (c1.close < c1.open && c3.close > c3.open && c3.close > c1.open && c3.open < c1.close)
    patterns.push({ name: 'Bullish Engulfing', type: 'bullish', emoji: '📈', desc: 'Strong reversal signal' });
  if (c1.close > c1.open && c3.close < c3.open && c3.close < c1.open && c3.open > c1.close)
    patterns.push({ name: 'Bearish Engulfing', type: 'bearish', emoji: '📉', desc: 'Potential downside ahead' });
  if (last.slice(-3).every(c => c.close > c.open) && last.slice(-3).every((c, i, a) => i === 0 || c.close > a[i-1].close))
    patterns.push({ name: '3 White Soldiers', type: 'bullish', emoji: '🏹', desc: 'Strong uptrend continuation' });
  if (last.slice(-3).every(c => c.close < c.open) && last.slice(-3).every((c, i, a) => i === 0 || c.close < a[i-1].close))
    patterns.push({ name: '3 Black Crows', type: 'bearish', emoji: '🦅', desc: 'Strong downtrend continuation' });
  if (uShadow > body3 * 2 && c3.close < c3.open)
    patterns.push({ name: 'Shooting Star', type: 'bearish', emoji: '🌠', desc: 'Bearish reversal at top' });

  return patterns;
}

function generateSignal(candles, indicators) {
  let bull = 0, bear = 0;
  const last       = candles[candles.length - 1];
  const { rsi, macd, bb, sma20, sma50, sma200, stoch } = indicators;
  const rsiLast    = rsi?.filter(v => v != null).pop();
  const macdLast   = macd?.macd?.filter(v => v != null).pop();
  const sigLast    = macd?.signal?.filter(v => v != null).pop();
  const bbLast     = bb?.filter(v => v?.upper != null).pop();
  const sma20Last  = sma20?.filter(v => v != null).pop();
  const sma50Last  = sma50?.filter(v => v != null).pop();
  const sma200Last = sma200?.filter(v => v != null).pop();
  const stochLast  = stoch?.filter(v => v?.k != null).pop();
  const signals    = [];

  if (rsiLast != null) {
    if (rsiLast < 30)      { bull += 2; signals.push({ indicator: 'RSI', signal: 'Oversold',     type: 'bullish', value: `RSI ${rsiLast}` }); }
    else if (rsiLast > 70) { bear += 2; signals.push({ indicator: 'RSI', signal: 'Overbought',   type: 'bearish', value: `RSI ${rsiLast}` }); }
    else if (rsiLast > 50) { bull += 1; signals.push({ indicator: 'RSI', signal: 'Bullish zone', type: 'bullish', value: `RSI ${rsiLast}` }); }
    else                   { bear += 1; signals.push({ indicator: 'RSI', signal: 'Bearish zone', type: 'bearish', value: `RSI ${rsiLast}` }); }
  }
  if (macdLast != null && sigLast != null) {
    if (macdLast > sigLast) { bull += 2; signals.push({ indicator: 'MACD', signal: 'Bullish crossover', type: 'bullish', value: `MACD ${macdLast?.toFixed(1)}` }); }
    else                    { bear += 2; signals.push({ indicator: 'MACD', signal: 'Bearish crossover', type: 'bearish', value: `MACD ${macdLast?.toFixed(1)}` }); }
  }
  if (sma20Last != null) {
    if (last.close > sma20Last) { bull += 1; signals.push({ indicator: 'SMA20', signal: 'Above SMA20', type: 'bullish', value: `₹${sma20Last}` }); }
    else                        { bear += 1; signals.push({ indicator: 'SMA20', signal: 'Below SMA20', type: 'bearish', value: `₹${sma20Last}` }); }
  }
  if (sma50Last != null) {
    if (last.close > sma50Last) { bull += 1; signals.push({ indicator: 'SMA50', signal: 'Above SMA50', type: 'bullish', value: `₹${sma50Last}` }); }
    else                        { bear += 1; signals.push({ indicator: 'SMA50', signal: 'Below SMA50', type: 'bearish', value: `₹${sma50Last}` }); }
  }
  if (sma50Last != null && sma200Last != null) {
    if (sma50Last > sma200Last) { bull += 2; signals.push({ indicator: 'Golden Cross', signal: 'SMA50 > SMA200', type: 'bullish', value: 'Bullish trend' }); }
    else                        { bear += 2; signals.push({ indicator: 'Death Cross',  signal: 'SMA50 < SMA200', type: 'bearish', value: 'Bearish trend' }); }
  }
  if (bbLast) {
    if (last.close < bbLast.lower)       { bull += 2; signals.push({ indicator: 'Bollinger', signal: 'Below lower band', type: 'bullish', value: 'Oversold zone' }); }
    else if (last.close > bbLast.upper)  { bear += 2; signals.push({ indicator: 'Bollinger', signal: 'Above upper band', type: 'bearish', value: 'Overbought zone' }); }
    else                                 { signals.push({ indicator: 'Bollinger', signal: 'Inside bands', type: 'neutral', value: 'Normal range' }); }
  }
  if (stochLast?.k != null) {
    if (stochLast.k < 20) { bull += 1; signals.push({ indicator: 'Stoch', signal: 'Oversold',   type: 'bullish', value: `K:${stochLast.k}` }); }
    if (stochLast.k > 80) { bear += 1; signals.push({ indicator: 'Stoch', signal: 'Overbought', type: 'bearish', value: `K:${stochLast.k}` }); }
  }

  const total    = (bull + bear) || 1;
  const strength = Math.round((bull / total) * 100);
  let verdict, verdictColor, verdictEmoji;
  if (strength >= 70)      { verdict = 'STRONG BUY';  verdictColor = '#10b981'; verdictEmoji = '🚀'; }
  else if (strength >= 55) { verdict = 'BUY';          verdictColor = '#6366f1'; verdictEmoji = '✅'; }
  else if (strength >= 45) { verdict = 'NEUTRAL';      verdictColor = '#f59e0b'; verdictEmoji = '⚖️'; }
  else if (strength >= 30) { verdict = 'SELL';         verdictColor = '#ef4444'; verdictEmoji = '⚠️'; }
  else                     { verdict = 'STRONG SELL';  verdictColor = '#dc2626'; verdictEmoji = '🚫'; }

  return { bull, bear, strength, verdict, verdictColor, verdictEmoji, signals };
}

// ── GET /api/stock-detail/:symbol ──────────────────────────────────────────
router.get('/:symbol', auth, async (req, res) => {
  try {
    const raw      = decodeURIComponent(req.params.symbol);
    const symbol   = raw.replace('.BSE','').replace('.NS','').toUpperCase();
    const interval = req.query.interval || '1d';
    const range    = req.query.range    || '6mo';

    const candles = await fetchCandles(symbol, interval, range);
    if (!candles || candles.length < 2)
      return res.status(404).json({ message: `No data found for ${symbol}. Try a valid NSE symbol like RELIANCE, TCS` });

    const closes  = candles.map(c => c.close);
    const sma20   = calcSMA(closes, 20);
    const sma50   = calcSMA(closes, 50);
    const sma200  = calcSMA(closes, 200);
    const ema9    = calcEMA(closes, 9);
    const ema21   = calcEMA(closes, 21);
    const rsi     = calcRSI(closes);
    const macd    = calcMACD(closes);
    const bb      = calcBollingerBands(closes);
    const stoch   = calcStochastic(candles);
    const atr     = calcATR(candles);
    const vwap    = calcVWAP(candles);
    const { support, resistance } = findSupportResistance(candles);
    const patterns = detectPatterns(candles);
    const signal   = generateSignal(candles, { rsi, macd, bb, sma20, sma50, sma200, stoch });

    const last      = candles[candles.length - 1];
    const prev      = candles[candles.length - 2] || last;
    const change    = +(last.close - prev.close).toFixed(2);
    const changePct = +((change / prev.close) * 100).toFixed(2);
    const w52High   = +Math.max(...candles.map(c => c.high)).toFixed(2);
    const w52Low    = +Math.min(...candles.map(c => c.low)).toFixed(2);
    const volArr    = candles.slice(-20).map(c => c.volume).filter(Boolean);
    const avgVol    = volArr.length ? Math.round(volArr.reduce((s, v) => s + v, 0) / volArr.length) : 0;

    const chartData = candles.map((c, i) => ({
      ...c,
      sma20:     sma20[i],
      sma50:     sma50[i],
      sma200:    sma200[i],
      ema9:      ema9[i],
      ema21:     ema21[i],
      rsi:       rsi[i],
      macd:      macd.macd[i],
      signal:    macd.signal[i],
      histogram: macd.histogram[i],
      bbUpper:   bb[i]?.upper,
      bbMiddle:  bb[i]?.middle,
      bbLower:   bb[i]?.lower,
      stochK:    stoch[i]?.k,
      stochD:    stoch[i]?.d,
      atr:       atr[i],
      vwap:      vwap[i],
    }));

    res.json({
      symbol,
      meta: {
        price:        last.close,
        open:         last.open,
        high:         last.high,
        low:          last.low,
        volume:       last.volume,
        avgVolume:    avgVol,
        change,
        changePct,
        w52High,
        w52Low,
        w52HighPct:   +((last.close - w52High) / w52High * 100).toFixed(1),
        w52LowPct:    +((last.close - w52Low)  / w52Low  * 100).toFixed(1),
        volumeSurge:  avgVol > 0 ? +(last.volume / avgVol).toFixed(2) : 1,
        rsiCurrent:   rsi.filter(v => v != null).pop()  || 50,
        atrCurrent:   atr.filter(v => v != null).pop()  || null,
        vwapCurrent:  vwap.filter(v => v != null).pop() || null,
      },
      chartData,
      support,
      resistance,
      patterns,
      signal,
    });
  } catch (err) {
    console.error('STOCK DETAIL ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;