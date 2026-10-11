const router    = require('express').Router();
const axios     = require('axios');
const NodeCache = require('node-cache');
const auth      = require('../middleware/auth');

const cache = new NodeCache({ stdTTL: 3600 });

// ── Fetch historical candles from Yahoo Finance ─────────────────────────────
async function fetchHistory(symbol, range = '1y') {
  const key = `bt_${symbol}_${range}`;
  const c   = cache.get(key);
  if (c) return c;

  const sym = symbol.includes('.') ? symbol : `${symbol}.NS`;
  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=${range}`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        timeout: 12000,
      }
    );
    const result = res.data?.chart?.result?.[0];
    if (!result) throw new Error('No data');

    const ts     = result.timestamp       || [];
    const closes = result.indicators?.quote?.[0]?.close  || [];
    const highs  = result.indicators?.quote?.[0]?.high   || [];
    const lows   = result.indicators?.quote?.[0]?.low    || [];
    const opens  = result.indicators?.quote?.[0]?.open   || [];
    const vols   = result.indicators?.quote?.[0]?.volume || [];

    const candles = ts.map((t, i) => ({
      date:   new Date(t * 1000).toISOString().slice(0, 10),
      open:   opens[i]  != null ? +opens[i].toFixed(2)  : null,
      high:   highs[i]  != null ? +highs[i].toFixed(2)  : null,
      low:    lows[i]   != null ? +lows[i].toFixed(2)   : null,
      close:  closes[i] != null ? +closes[i].toFixed(2) : null,
      volume: vols[i]   != null ? Math.round(vols[i])   : 0,
    })).filter(c => c.close !== null && c.open !== null);

    cache.set(key, candles, 3600);
    return candles;
  } catch (e) {
    throw new Error(`Failed to fetch data for ${symbol}: ${e.message}`);
  }
}

// ── Technical indicator helpers ─────────────────────────────────────────────
function sma(arr, period) {
  return arr.map((_, i) => {
    if (i < period - 1) return null;
    const slice = arr.slice(i - period + 1, i + 1).filter(v => v != null);
    return slice.length === period ? +(slice.reduce((s, v) => s + v, 0) / period).toFixed(2) : null;
  });
}

function ema(arr, period) {
  const k = 2 / (period + 1);
  const result = [];
  let prev = null;
  arr.forEach((v, i) => {
    if (v == null) { result.push(null); return; }
    if (prev == null) {
      if (i >= period - 1) {
        const slice = arr.slice(i - period + 1, i + 1).filter(x => x != null);
        if (slice.length === period) { prev = slice.reduce((s, x) => s + x, 0) / period; result.push(+prev.toFixed(2)); return; }
      }
      result.push(null); return;
    }
    prev = v * k + prev * (1 - k);
    result.push(+prev.toFixed(2));
  });
  return result;
}

function rsi(closes, period = 14) {
  const result = new Array(period).fill(null);
  let avgGain = 0, avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) avgGain += d; else avgLoss -= d;
  }
  avgGain /= period; avgLoss /= period;
  result.push(avgLoss === 0 ? 100 : +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period;
    result.push(avgLoss === 0 ? 100 : +(100 - 100 / (1 + avgGain / avgLoss)).toFixed(2));
  }
  return result;
}

function macd(closes, fast = 12, slow = 26, signal = 9) {
  const emaFast   = ema(closes, fast);
  const emaSlow   = ema(closes, slow);
  const macdLine  = emaFast.map((v, i) => (v != null && emaSlow[i] != null) ? +(v - emaSlow[i]).toFixed(2) : null);
  const cleanMacd = macdLine.filter(v => v != null);
  const sigRaw    = ema(cleanMacd, signal);
  const nullCount = macdLine.filter(v => v == null).length;
  const signalLine = [...new Array(nullCount).fill(null), ...sigRaw];
  const histogram  = macdLine.map((v, i) => (v != null && signalLine[i] != null) ? +(v - signalLine[i]).toFixed(2) : null);
  return { macdLine, signalLine, histogram };
}

function bollingerBands(closes, period = 20, stdDev = 2) {
  return closes.map((_, i) => {
    if (i < period - 1) return { upper: null, middle: null, lower: null };
    const slice = closes.slice(i - period + 1, i + 1);
    const mean  = slice.reduce((s, v) => s + v, 0) / period;
    const sd    = Math.sqrt(slice.reduce((s, v) => s + (v - mean) ** 2, 0) / period);
    return { upper: +(mean + stdDev * sd).toFixed(2), middle: +mean.toFixed(2), lower: +(mean - stdDev * sd).toFixed(2) };
  });
}

function atr(candles, period = 14) {
  const trs = candles.map((c, i) => {
    if (i === 0) return c.high - c.low;
    const prev = candles[i - 1].close;
    return Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  });
  return sma(trs, period);
}

// ── Strategy signal generators ──────────────────────────────────────────────
function generateSignals(candles, strategy, params) {
  const closes = candles.map(c => c.close);
  const n      = candles.length;
  const signals = new Array(n).fill(0); // 1=buy, -1=sell
  let indicators = {};

  switch (strategy) {

    case 'sma_crossover': {
      const fast = sma(closes, params.fastPeriod || 10);
      const slow = sma(closes, params.slowPeriod || 30);
      for (let i = 1; i < n; i++) {
        if (!fast[i] || !slow[i] || !fast[i-1] || !slow[i-1]) continue;
        if (fast[i-1] <= slow[i-1] && fast[i] > slow[i]) signals[i] =  1;
        if (fast[i-1] >= slow[i-1] && fast[i] < slow[i]) signals[i] = -1;
      }
      indicators = { fast, slow };
      break;
    }

    case 'ema_crossover': {
      const fast = ema(closes, params.fastPeriod || 9);
      const slow = ema(closes, params.slowPeriod || 21);
      for (let i = 1; i < n; i++) {
        if (!fast[i] || !slow[i] || !fast[i-1] || !slow[i-1]) continue;
        if (fast[i-1] <= slow[i-1] && fast[i] > slow[i]) signals[i] =  1;
        if (fast[i-1] >= slow[i-1] && fast[i] < slow[i]) signals[i] = -1;
      }
      indicators = { fast, slow };
      break;
    }

    case 'rsi_strategy': {
      const rsiVals  = rsi(closes, params.rsiPeriod || 14);
      const oversold = params.oversold  || 30;
      const overbought = params.overbought || 70;
      for (let i = 1; i < n; i++) {
        if (!rsiVals[i] || !rsiVals[i-1]) continue;
        if (rsiVals[i-1] < oversold   && rsiVals[i] >= oversold)   signals[i] =  1;
        if (rsiVals[i-1] > overbought && rsiVals[i] <= overbought) signals[i] = -1;
      }
      indicators = { rsi: rsiVals };
      break;
    }

    case 'macd_strategy': {
      const { macdLine, signalLine, histogram } = macd(closes, params.fast || 12, params.slow || 26, params.signal || 9);
      for (let i = 1; i < n; i++) {
        if (!macdLine[i] || !signalLine[i] || !macdLine[i-1] || !signalLine[i-1]) continue;
        if (macdLine[i-1] <= signalLine[i-1] && macdLine[i] > signalLine[i]) signals[i] =  1;
        if (macdLine[i-1] >= signalLine[i-1] && macdLine[i] < signalLine[i]) signals[i] = -1;
      }
      indicators = { macdLine, signalLine, histogram };
      break;
    }

    case 'bollinger_bands': {
      const bb = bollingerBands(closes, params.period || 20, params.stdDev || 2);
      for (let i = 1; i < n; i++) {
        if (!bb[i].upper || !bb[i-1].upper) continue;
        if (closes[i-1] <= bb[i-1].lower && closes[i] > bb[i].lower) signals[i] =  1;
        if (closes[i-1] >= bb[i-1].upper && closes[i] < bb[i].upper) signals[i] = -1;
      }
      indicators = { upper: bb.map(b => b.upper), middle: bb.map(b => b.middle), lower: bb.map(b => b.lower) };
      break;
    }

    case 'rsi_macd': {
      // Combined: RSI confirms direction + MACD crossover triggers
      const rsiVals = rsi(closes, params.rsiPeriod || 14);
      const { macdLine, signalLine } = macd(closes);
      for (let i = 1; i < n; i++) {
        if (!rsiVals[i] || !macdLine[i] || !signalLine[i]) continue;
        const macdCrossBull = macdLine[i-1] <= signalLine[i-1] && macdLine[i] > signalLine[i];
        const macdCrossBear = macdLine[i-1] >= signalLine[i-1] && macdLine[i] < signalLine[i];
        if (macdCrossBull && rsiVals[i] < 60) signals[i] =  1;
        if (macdCrossBear && rsiVals[i] > 40) signals[i] = -1;
      }
      indicators = { rsi: rsiVals, macdLine, signalLine };
      break;
    }

    case 'supertrend': {
      // Very popular with Indian intraday/swing traders. Flips trend
      // direction based on ATR bands around the median price.
      const period     = params.atrPeriod || 10;
      const multiplier = params.multiplier || 3;
      const atrVals    = atr(candles, period);
      const st         = new Array(n).fill(null);
      const trendUp    = new Array(n).fill(true);
      for (let i = 0; i < n; i++) {
        if (!atrVals[i]) continue;
        const hl2 = (candles[i].high + candles[i].low) / 2;
        const upperBand = hl2 + multiplier * atrVals[i];
        const lowerBand = hl2 - multiplier * atrVals[i];
        if (i === 0 || !st[i-1]) { st[i] = lowerBand; trendUp[i] = true; continue; }
        if (trendUp[i-1]) {
          st[i] = Math.max(lowerBand, st[i-1]);
          trendUp[i] = closes[i] > st[i];
        } else {
          st[i] = Math.min(upperBand, st[i-1]);
          trendUp[i] = closes[i] > st[i];
        }
        if (trendUp[i] && !trendUp[i-1]) signals[i] =  1; // trend flipped bullish
        if (!trendUp[i] && trendUp[i-1]) signals[i] = -1; // trend flipped bearish
      }
      indicators = { supertrend: st, trendUp };
      break;
    }

    case 'volume_breakout': {
      // Buys when price breaks above the recent high on unusually strong
      // volume (a classic momentum/breakout confirmation filter); exits on
      // a break below the recent low.
      const lookback  = params.lookback || 20;
      const volMult   = params.volumeMultiplier || 1.5;
      const volumes   = candles.map(c => c.volume || 0);
      const avgVol    = sma(volumes, lookback);
      for (let i = lookback; i < n; i++) {
        const recentHigh = Math.max(...closes.slice(i - lookback, i));
        const recentLow  = Math.min(...closes.slice(i - lookback, i));
        const volSpike   = avgVol[i] && volumes[i] > avgVol[i] * volMult;
        if (closes[i] > recentHigh && volSpike) signals[i] =  1;
        if (closes[i] < recentLow) signals[i] = -1;
      }
      indicators = { avgVolume: avgVol };
      break;
    }

    case 'mean_reversion': {
      // Z-score mean reversion: buy when price is statistically "too far"
      // below its moving average (likely to snap back), sell when it
      // reverts near/above the mean. Popular in range-bound / sideways markets.
      const period    = params.period || 20;
      const zEntry    = params.zEntry || -2;   // buy when z-score <= this (oversold)
      const zExit     = params.zExit || 0;     // sell when z-score >= this (reverted)
      const maVals    = sma(closes, period);
      for (let i = period; i < n; i++) {
        if (!maVals[i]) continue;
        const window = closes.slice(i - period, i);
        const mean = maVals[i];
        const variance = window.reduce((s, v) => s + (v - mean) ** 2, 0) / period;
        const stdDev = Math.sqrt(variance);
        if (stdDev === 0) continue;
        const z = (closes[i] - mean) / stdDev;
        if (z <= zEntry) signals[i] = 1;
        if (z >= zExit) signals[i] = -1;
      }
      indicators = { sma: maVals };
      break;
    }

    case 'donchian_breakout': {
      // Turtle-trading style: buy on an N-day high breakout, exit on an
      // N-day low breakout — pure trend-following, no lagging indicator.
      const entryPeriod = params.entryPeriod || 20;
      const exitPeriod  = params.exitPeriod || 10;
      const upperBand = new Array(n).fill(null);
      const lowerBand = new Array(n).fill(null);
      for (let i = entryPeriod; i < n; i++) {
        upperBand[i] = Math.max(...closes.slice(i - entryPeriod, i));
        lowerBand[i] = Math.min(...closes.slice(i - exitPeriod, i));
        if (closes[i] > upperBand[i]) signals[i] = 1;
        if (closes[i] < lowerBand[i]) signals[i] = -1;
      }
      indicators = { upperBand, lowerBand };
      break;
    }

    case 'vwap_strategy': {
      // Volume-Weighted Average Price — very common for intraday: buy when
      // price dips meaningfully below VWAP (value zone), sell when it runs
      // meaningfully above it. Recomputed cumulatively (resets conceptually
      // per session for true intraday use; here run over the full series
      // for swing-style application).
      const bandPct = params.bandPct || 1.0; // % distance from VWAP to trigger
      let cumPV = 0, cumVol = 0;
      const vwapVals = new Array(n).fill(null);
      for (let i = 0; i < n; i++) {
        const vol = candles[i].volume || 1;
        const typicalPrice = (candles[i].high + candles[i].low + candles[i].close) / 3;
        cumPV += typicalPrice * vol;
        cumVol += vol;
        vwapVals[i] = cumVol > 0 ? cumPV / cumVol : closes[i];
        if (i < 5) continue;
        const distPct = ((closes[i] - vwapVals[i]) / vwapVals[i]) * 100;
        if (distPct <= -bandPct) signals[i] = 1;
        if (distPct >= bandPct) signals[i] = -1;
      }
      indicators = { vwap: vwapVals };
      break;
    }

    case 'parabolic_sar': {
      // Classic trend-following stop-and-reverse indicator — signals fire
      // exactly when the trend flips (price crosses the SAR dots), with the
      // acceleration factor increasing as a trend extends.
      const afStep = params.afStep || 0.02;
      const afMax  = params.afMax || 0.2;
      const sarVals = new Array(n).fill(null);
      let isUpTrend = true, af = afStep, ep = candles[0].high, sar = candles[0].low;
      for (let i = 1; i < n; i++) {
        sar = sar + af * (ep - sar);
        if (isUpTrend) {
          if (candles[i].low < sar) {
            isUpTrend = false; sar = ep; af = afStep; ep = candles[i].low;
            signals[i] = -1; // trend flipped bearish
          } else {
            if (candles[i].high > ep) { ep = candles[i].high; af = Math.min(af + afStep, afMax); }
          }
        } else {
          if (candles[i].high > sar) {
            isUpTrend = true; sar = ep; af = afStep; ep = candles[i].high;
            signals[i] = 1; // trend flipped bullish
          } else {
            if (candles[i].low < ep) { ep = candles[i].low; af = Math.min(af + afStep, afMax); }
          }
        }
        sarVals[i] = sar;
      }
      indicators = { sar: sarVals };
      break;
    }

    default:
      break;
  }

  return { signals, indicators };
}

// ── Simulate trades ─────────────────────────────────────────────────────────
function simulateTrades(candles, signals, startingCapital, stopLossPct, takeProfitPct) {
  const closes    = candles.map(c => c.close);
  let cash        = startingCapital;
  let shares      = 0;
  let entryPrice  = 0;
  let entryDate   = '';
  const trades    = [];
  const equity    = [startingCapital];

  for (let i = 1; i < candles.length; i++) {
    const price = closes[i];

    // Check stop loss / take profit if in position
    if (shares > 0) {
      const pnlPct = ((price - entryPrice) / entryPrice) * 100;
      if (stopLossPct   > 0 && pnlPct <= -stopLossPct)  signals[i] = -1;
      if (takeProfitPct > 0 && pnlPct >= takeProfitPct) signals[i] = -1;
    }

    if (signals[i] === 1 && shares === 0) {
      shares      = Math.floor(cash / price);
      if (shares === 0) { equity.push(+(cash).toFixed(2)); continue; }
      entryPrice  = price;
      entryDate   = candles[i].date;
      cash       -= shares * price;
      trades.push({
        type:       'BUY',
        date:       candles[i].date,
        price,
        shares,
        value:      +(shares * price).toFixed(2),
        pnl:        null,
        pnlPct:     null,
        holdDays:   null,
        cumCapital: null,
      });
    } else if (signals[i] === -1 && shares > 0) {
      const value   = shares * price;
      const pnl     = +(value - shares * entryPrice).toFixed(2);
      const pnlPct  = +((pnl / (shares * entryPrice)) * 100).toFixed(2);
      const entryDt = new Date(entryDate);
      const exitDt  = new Date(candles[i].date);
      const holdDays = Math.round((exitDt - entryDt) / (1000 * 3600 * 24));
      cash         += value;
      trades.push({
        type:       'SELL',
        date:       candles[i].date,
        price,
        shares,
        value:      +value.toFixed(2),
        pnl,
        pnlPct,
        holdDays,
        cumCapital: +cash.toFixed(2),
      });
      shares = 0;
    }

    equity.push(+(cash + shares * price).toFixed(2));
  }

  // Close open position at last price
  if (shares > 0) {
    const lastPrice = closes[closes.length - 1];
    const value     = shares * lastPrice;
    const pnl       = +(value - shares * entryPrice).toFixed(2);
    cash           += value;
    trades.push({
      type:       'SELL (open)',
      date:       candles[candles.length - 1].date,
      price:      lastPrice,
      shares,
      value:      +value.toFixed(2),
      pnl,
      pnlPct:     +((pnl / (shares * entryPrice)) * 100).toFixed(2),
      holdDays:   null,
      cumCapital: +cash.toFixed(2),
      isOpen:     true,
    });
  }

  return { trades, equity, finalCapital: cash };
}

// ── Compute statistics ───────────────────────────────────────────────────────
function computeStats(trades, equity, startingCapital, candles) {
  const sellTrades  = trades.filter(t => t.type.startsWith('SELL') && t.pnl !== null);
  const wins        = sellTrades.filter(t => t.pnl >= 0);
  const losses      = sellTrades.filter(t => t.pnl < 0);
  const totalTrades = sellTrades.length;
  const winRate     = totalTrades > 0 ? +((wins.length / totalTrades) * 100).toFixed(1) : 0;
  const finalVal    = equity[equity.length - 1];
  const totalReturn = +((finalVal - startingCapital) / startingCapital * 100).toFixed(2);

  // Max drawdown (+ track how long it took to recover, and its duration)
  let peak = equity[0], maxDD = 0, ddStartIdx = 0, maxDDStartIdx = 0, maxDDEndIdx = 0, inDrawdown = false;
  equity.forEach((v, i) => {
    if (v >= peak) { peak = v; if (inDrawdown) inDrawdown = false; }
    else if (!inDrawdown) { inDrawdown = true; ddStartIdx = i - 1; }
    const dd = (peak - v) / peak * 100;
    if (dd > maxDD) { maxDD = dd; maxDDStartIdx = ddStartIdx; maxDDEndIdx = i; }
  });
  maxDD = +maxDD.toFixed(2);
  const maxDDDays = maxDDEndIdx - maxDDStartIdx;
  // Recovery: days from the drawdown trough back to a new equity high (null if never recovered)
  let recoveryDays = null;
  if (maxDDEndIdx < equity.length - 1) {
    const troughVal = equity[maxDDEndIdx];
    const priorPeakVal = equity[maxDDStartIdx];
    for (let i = maxDDEndIdx + 1; i < equity.length; i++) {
      if (equity[i] >= priorPeakVal) { recoveryDays = i - maxDDEndIdx; break; }
    }
  }

  // Daily returns — power multiple risk-adjusted ratios
  const dailyReturns = equity.slice(1).map((v, i) => (v - equity[i]) / equity[i]);
  const meanReturn    = dailyReturns.reduce((s, v) => s + v, 0) / (dailyReturns.length || 1);
  const stdReturn     = Math.sqrt(dailyReturns.reduce((s, v) => s + (v - meanReturn) ** 2, 0) / (dailyReturns.length || 1));
  const riskFreeDaily = 0.06 / 252; // 6% annual India risk-free proxy

  // Sharpe ratio (annualised)
  const sharpe = stdReturn > 0 ? +((((meanReturn - riskFreeDaily) / stdReturn) * Math.sqrt(252))).toFixed(2) : 0;

  // Sortino ratio — like Sharpe but only penalizes DOWNSIDE volatility
  const downside = dailyReturns.filter(r => r < riskFreeDaily);
  const downsideDev = Math.sqrt(downside.reduce((s, v) => s + (v - riskFreeDaily) ** 2, 0) / (downside.length || 1));
  const sortino = downsideDev > 0 ? +((((meanReturn - riskFreeDaily) / downsideDev) * Math.sqrt(252))).toFixed(2) : 0;

  // Annualized volatility & CAGR
  const volatility = +((stdReturn * Math.sqrt(252)) * 100).toFixed(2);
  const years = candles.length / 252;
  const cagr = years > 0 && finalVal > 0 ? +((Math.pow(finalVal / startingCapital, 1 / years) - 1) * 100).toFixed(2) : 0;

  // Calmar ratio — CAGR relative to max drawdown (higher = better risk-adjusted growth)
  const calmar = maxDD > 0 ? +(cagr / maxDD).toFixed(2) : 0;

  // Buy & hold benchmark
  const bnh = +((candles[candles.length-1].close - candles[0].close) / candles[0].close * 100).toFixed(2);
  const alpha = +(totalReturn - bnh).toFixed(2); // strategy return minus benchmark

  // Avg win / loss, best / worst single trade
  const avgWin  = wins.length  > 0 ? +(wins.reduce((s, t)  => s + t.pnl, 0) / wins.length).toFixed(2)   : 0;
  const avgLoss = losses.length > 0 ? +(losses.reduce((s, t) => s + t.pnl, 0) / losses.length).toFixed(2) : 0;
  const bestTrade  = sellTrades.length ? +Math.max(...sellTrades.map(t => t.pnl)).toFixed(2) : 0;
  const worstTrade = sellTrades.length ? +Math.min(...sellTrades.map(t => t.pnl)).toFixed(2) : 0;

  // Profit factor & expectancy (expected P&L per trade — the single best
  // "is this strategy worth running" number)
  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss   = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? +(grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? 999 : 0;
  const expectancy = totalTrades > 0 ? +(((wins.length/totalTrades) * avgWin) + ((losses.length/totalTrades) * avgLoss)).toFixed(2) : 0;

  // Recovery factor — net profit relative to the worst drawdown suffered
  const netProfit = finalVal - startingCapital;
  const recoveryFactor = maxDD > 0 ? +((netProfit / (maxDD/100 * startingCapital))).toFixed(2) : 0;

  // Avg hold days
  const holdDays = sellTrades.filter(t => t.holdDays != null).map(t => t.holdDays);
  const avgHold  = holdDays.length > 0 ? Math.round(holdDays.reduce((s, v) => s + v, 0) / holdDays.length) : 0;

  // Consecutive wins/losses
  let maxConsecWins = 0, maxConsecLosses = 0, cw = 0, cl = 0;
  sellTrades.forEach(t => {
    if (t.pnl >= 0) { cw++; cl = 0; maxConsecWins   = Math.max(maxConsecWins,   cw); }
    else            { cl++; cw = 0; maxConsecLosses = Math.max(maxConsecLosses, cl); }
  });

  // Exposure — % of the backtest period actually holding a position (vs
  // sitting in cash). This is a single-position backtest (BUY/SELL alternate
  // strictly), so we can just walk the trade list pairing each BUY with the
  // next SELL/SELL(open) in sequence.
  let inPositionDays = 0, openBuy = null;
  trades.forEach(t => {
    if (t.type === 'BUY') { openBuy = t; }
    else if (openBuy) {
      const days = t.holdDays != null
        ? t.holdDays
        : Math.round((new Date(t.date) - new Date(openBuy.date)) / (1000 * 3600 * 24));
      inPositionDays += days;
      openBuy = null;
    }
  });
  const exposurePct = candles.length > 0 ? +Math.min(100, (inPositionDays / candles.length) * 100).toFixed(1) : 0;

  return {
    totalTrades, winRate, finalVal, totalReturn, maxDD, maxDDDays, recoveryDays,
    sharpe, sortino, volatility, cagr, calmar,
    bnh, alpha, avgWin, avgLoss, bestTrade, worstTrade,
    profitFactor, expectancy, recoveryFactor, avgHold,
    maxConsecWins, maxConsecLosses, exposurePct,
    totalWins: wins.length, totalLosses: losses.length,
    grossProfit: +grossProfit.toFixed(2),
    grossLoss:   +grossLoss.toFixed(2),
  };
}

// ── POST /api/backtest ───────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const {
      symbol          = 'RELIANCE',
      strategy        = 'sma_crossover',
      params          = {},
      startingCapital = 100000,
      stopLossPct     = 0,
      takeProfitPct   = 0,
      range           = '1y',
    } = req.body;

    if (!symbol || typeof symbol !== 'string')
      return res.status(400).json({ message: 'Invalid symbol' });

    const candles = await fetchHistory(symbol.toUpperCase(), range);
    if (!candles || candles.length < 50)
      return res.status(400).json({ message: `Not enough data for ${symbol}. Need at least 50 candles.` });

    const { signals, indicators } = generateSignals(candles, strategy, params);
    const { trades, equity, finalCapital } = simulateTrades(candles, signals, startingCapital, stopLossPct, takeProfitPct);
    const stats = computeStats(trades, equity, startingCapital, candles);

    res.json({
      symbol:  symbol.toUpperCase(),
      strategy,
      params,
      range,
      startingCapital,
      stats,
      trades:  trades.slice(-50), // last 50 trades
      equity:  equity.map((v, i) => ({ date: candles[i]?.date, value: v })),
      candles: candles.map((c, i) => ({ ...c, signal: signals[i] })),
      indicators,
    });

  } catch (err) {
    console.error('BACKTEST ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/backtest/symbols — search NSE symbols ───────────────────────────
router.get('/symbols', auth, async (req, res) => {
  const SYMBOLS = [
    // Nifty 50 & large-cap
    'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','HINDUNILVR','SBIN','BHARTIARTL',
    'ITC','KOTAKBANK','LT','HCLTECH','WIPRO','AXISBANK','ASIANPAINT','MARUTI','ULTRACEMCO',
    'NESTLEIND','TITAN','BAJFINANCE','SUNPHARMA','TATAMOTORS','ONGC','NTPC','POWERGRID',
    'JSWSTEEL','TATASTEEL','TECHM','INDUSINDBK','BAJAJFINSV','CIPLA','DRREDDY','DIVISLAB',
    'BPCL','COALINDIA','HEROMOTOCO','GRASIM','BRITANNIA','EICHERMOT','HINDALCO',
    'ADANIPORTS','ADANIENT','ADANIGREEN','TATACONSUM','SBICARD','PIDILITIND',
    'MUTHOOTFIN','NAUKRI','BERGEPAINT','HAVELLS','MARICO','GODREJCP','DABUR','COLPAL',
    'SIEMENS','ABB','BOSCHLTD','VOLTAS','WHIRLPOOL','BATAINDIA','PAGEIND','MCDOWELL-N',
    'BAJAJ-AUTO','APOLLOHOSP','HDFCLIFE','SBILIFE','SHREECEM','UPL','GAIL','IOC',
    'VEDL','LTIM','TATAPOWER','DLF','PNB','BANKBARODA','CANBK','IDFCFIRSTB','FEDERALBNK',
    'BANDHANBNK','AUBANK','CHOLAFIN','LICHSGFIN','PFC','RECLTD','IRFC','BEL','HAL',
    'BHEL','SAIL','NMDC','NATIONALUM','JINDALSTEL','APLAPOLLO','RATNAMANI',
    // IT / tech
    'MPHASIS','COFORGE','PERSISTENT','LTTS','OFSS','TATAELXSI','ZENSARTECH',
    'CYIENT','KPITTECH','SONATSOFTW','NEWGEN','INTELLECT',
    // Pharma / healthcare
    'LUPIN','AUROPHARMA','ALKEM','TORNTPHARM','GLENMARK','CADILAHC','BIOCON','LALPATHLAB',
    'METROPOLIS','FORTIS','MAXHEALTH','NARAYANHRUD','SYNGENE',
    // Auto & ancillaries
    'M&M','ASHOKLEY','TVSMOTOR','BALKRISIND','MRF','APOLLOTYRE','MOTHERSON','BOSCHLTD',
    'EXIDEIND','AMARAJABAT','ESCORTS','SONACOMS','BHARATFORG',
    // FMCG / consumer
    'EMAMILTD','VBL','UBL','RADICO','JYOTHYLAB','GILLETTE','PGHH','TATACHEM',
    // Financials / NBFC
    'MANAPPURAM','M&MFIN','SUNDARMFIN','IIFL','CREDITACC','POONAWALLA','ABCAPITAL',
    'ICICIGI','ICICIPRULI','NIACL','GICRE','STARHEALTH',
    // Cement / infra / real estate
    'AMBUJACEM','ACC','RAMCOCEM','DALBHARAT','JKCEMENT','GODREJPROP','OBEROIRLTY',
    'PRESTIGE','PHOENIXLTD','SOBHA','BRIGADE',
    // Metals / mining / energy
    'HINDCOPPER','MOIL','WELCORP','JSL','GMRINFRA','ADANIPOWER','TORNTPOWER',
    'ADANIENSOL','JSWENERGY','NHPC','SJVN','IEX',
    // Chemicals / specialty
    'SRF','AARTIIND','DEEPAKNTR','ATUL','NAVINFLUOR','FLUOROCHEM','CLEAN','GALAXYSURF',
    // Retail / consumer discretionary
    'TRENT','ABFRL','DMART','SHOPERSTOP','VMART','METROBRAND','CAMPUS','RELAXO',
    // Telecom / media
    'IDEA','ZEEL','SUNTV','PVRINOX','NETWORK18',
    // New-age / recent listings
    'ZOMATO','NYKAA','PAYTM','POLICYBZR','DELHIVERY','IRCTC','INDIGO','IEX','CDSL',
    'CAMS','ANGELONE','NAZARA','MAPMYINDIA','EASEMYTRIP','LATENTVIEW','MEDPLUS',
  ];
  const q = (req.query.q || '').toUpperCase();
  const results = q ? SYMBOLS.filter(s => s.includes(q)) : SYMBOLS.slice(0, 20);
  res.json(results);
});

module.exports = router;