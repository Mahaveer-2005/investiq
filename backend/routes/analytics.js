const router    = require('express').Router();
const axios     = require('axios');
const NodeCache = require('node-cache');
const auth      = require('../middleware/auth');
const User      = require('../models/User');

const cache = new NodeCache({ stdTTL: 300 });

// ── Safe symbol helper ──────────────────────────────────────────────────────
function toYahoo(symbol) {
  if (!symbol || typeof symbol !== 'string') return null;
  const s = symbol.trim().toUpperCase().replace(/\.(NS|BSE)$/i, '');
  if (!s) return null;
  return `${s}.NS`;
}

// ── Fetch live price ────────────────────────────────────────────────────────
async function fetchPrice(symbol) {
  const yahoo = toYahoo(symbol);
  if (!yahoo) return 0;
  const key = `ap_${yahoo}`;
  const c   = cache.get(key);
  if (c != null) return c;
  try {
    const res   = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=1d`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        timeout: 7000,
      }
    );
    const price = res.data?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
    cache.set(key, price, 180);
    return price;
  } catch {
    return 0;
  }
}

// ── Fetch 6-month candles for beta/volatility ───────────────────────────────
async function fetchCandles6m(symbol) {
  const yahoo = toYahoo(symbol);
  if (!yahoo) return [];
  const key = `ac_${yahoo}`;
  const c   = cache.get(key);
  if (c) return c;
  try {
    const res    = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=6mo`,
      {
        headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
        timeout: 8000,
      }
    );
    const result = res.data?.chart?.result?.[0];
    if (!result) return [];
    const ts     = result.timestamp || [];
    const closes = result.indicators?.quote?.[0]?.close || [];
    const candles = ts.map((t, i) => ({
      date:  new Date(t * 1000).toISOString().slice(0, 10),
      close: closes[i] != null ? +closes[i].toFixed(2) : null,
    })).filter(c => c.close !== null);
    cache.set(key, candles, 300);
    return candles;
  } catch {
    return [];
  }
}

// ── XIRR calculation ────────────────────────────────────────────────────────
function xirr(cashflows) {
  if (!cashflows || cashflows.length < 2) return 0;
  const maxIter = 100;
  let rate = 0.1;
  for (let i = 0; i < maxIter; i++) {
    let f = 0, df = 0;
    const t0 = cashflows[0].date.getTime();
    cashflows.forEach(cf => {
      const t   = (cf.date.getTime() - t0) / (365 * 24 * 3600 * 1000);
      const pv  = cf.amount / Math.pow(1 + rate, t);
      f  += pv;
      df -= t * pv / (1 + rate);
    });
    if (Math.abs(f) < 1e-7) break;
    if (df === 0) break;
    rate -= f / df;
    if (rate < -0.999) rate = -0.999;
  }
  return isFinite(rate) ? +((rate * 100).toFixed(2)) : 0;
}

// ── Recalc holdings from transactions ──────────────────────────────────────
function recalcHoldings(transactions) {
  const map = {};
  const sorted = [...(transactions || [])].sort(
    (a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0)
  );
  sorted.forEach(tx => {
    const sym    = (tx.symbol || '').toString().trim().toUpperCase().replace(/\.(NS|BSE)$/i, '');
    if (!sym) return;
    const action = (tx.action || tx.type || '').toLowerCase();
    const qty    = Number(tx.quantity || 0);
    const price  = Number(tx.price    || 0);
    if (qty <= 0) return;
    if (!map[sym]) map[sym] = { qty: 0, totalCost: 0, name: tx.name || sym, sector: tx.sector || 'Other' };
    if (action === 'buy') {
      map[sym].qty       += qty;
      map[sym].totalCost += price > 0 ? price * qty : 0;
    } else if (action === 'sell') {
      const sellQty = Math.min(qty, map[sym].qty);
      if (map[sym].qty > 0 && map[sym].totalCost > 0) {
        const avg = map[sym].totalCost / map[sym].qty;
        map[sym].totalCost = Math.max(0, map[sym].totalCost - avg * sellQty);
      }
      map[sym].qty = Math.max(0, map[sym].qty - sellQty);
    }
  });
  return Object.entries(map)
    .filter(([, v]) => v.qty > 0)
    .map(([symbol, v]) => ({
      symbol,
      name:     v.name,
      sector:   v.sector || 'Other',
      quantity: v.qty,
      avgPrice: v.qty > 0 ? +(v.totalCost / v.qty).toFixed(2) : 0,
      invested: +v.totalCost.toFixed(2),
    }));
}

// ── GET /api/analytics ──────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const transactions = user.transactions || [];
    const holdings     = recalcHoldings(transactions);

    if (holdings.length === 0) {
      return res.json({
        totalInvested:    0,
        totalCurrent:     0,
        totalPnL:         0,
        totalPnLPct:      0,
        xirr:             0,
        dayChange:        0,
        dayChangePct:     0,
        holdings:         [],
        sectorAllocation: [],
        monthlyPnL:       [],
        diversification:  { score: 0, grade: 'N/A', sectors: 0, stocks: 0 },
        topPerformer:     null,
        worstPerformer:   null,
      });
    }

    // Fetch live prices in parallel
    const prices = await Promise.all(holdings.map(h => fetchPrice(h.symbol)));

    // Enrich holdings
    const enriched = holdings.map((h, i) => {
      const livePrice  = prices[i] || h.avgPrice;
      const current    = livePrice * h.quantity;
      const invested   = h.avgPrice * h.quantity;
      const pnl        = current - invested;
      const pnlPct     = invested > 0 ? +((pnl / invested) * 100).toFixed(2) : 0;
      return { ...h, livePrice, current, invested, pnl, pnlPct };
    });

    const totalInvested = +enriched.reduce((s, h) => s + h.invested, 0).toFixed(2);
    const totalCurrent  = +enriched.reduce((s, h) => s + h.current,  0).toFixed(2);
    const totalPnL      = +(totalCurrent - totalInvested).toFixed(2);
    const totalPnLPct   = totalInvested > 0 ? +((totalPnL / totalInvested) * 100).toFixed(2) : 0;

    // ── XIRR ──────────────────────────────────────────────────────────────
    let xirrVal = 0;
    try {
      const cashflows = transactions
        .filter(tx => tx.price > 0 && tx.quantity > 0)
        .map(tx => ({
          date:   new Date(tx.date || tx.createdAt || Date.now()),
          amount: (tx.action || tx.type || '').toLowerCase() === 'buy'
            ? -(tx.price * tx.quantity)
            :  (tx.price * tx.quantity),
        }));
      if (totalCurrent > 0) {
        cashflows.push({ date: new Date(), amount: totalCurrent });
      }
      xirrVal = cashflows.length >= 2 ? xirr(cashflows) : 0;
    } catch { xirrVal = 0; }

    // ── Sector allocation ─────────────────────────────────────────────────
    const sectorMap = {};
    enriched.forEach(h => {
      const sec = h.sector || 'Other';
      if (!sectorMap[sec]) sectorMap[sec] = 0;
      sectorMap[sec] += h.current;
    });
    const sectorAllocation = Object.entries(sectorMap)
      .map(([name, value]) => ({
        name,
        value:   +value.toFixed(2),
        percent: totalCurrent > 0 ? +((value / totalCurrent) * 100).toFixed(1) : 0,
      }))
      .sort((a, b) => b.value - a.value);

    // ── Monthly P&L ────────────────────────────────────────────────────────
    const monthMap = {};
    transactions.forEach(tx => {
      const d      = new Date(tx.date || tx.createdAt || Date.now());
      const label  = d.toLocaleString('en-IN', { month: 'short', year: '2-digit' });
      const action = (tx.action || tx.type || '').toLowerCase();
      const amt    = Number(tx.price || 0) * Number(tx.quantity || 0);
      if (!monthMap[label]) monthMap[label] = { invested: 0, returned: 0 };
      if (action === 'buy')  monthMap[label].invested  += amt;
      if (action === 'sell') monthMap[label].returned  += amt;
    });
    const monthlyPnL = Object.entries(monthMap)
      .slice(-12)
      .map(([month, v]) => ({
        month,
        pnl:      +(v.returned - v.invested).toFixed(2),
        invested: +v.invested.toFixed(2),
        returned: +v.returned.toFixed(2),
      }));

    // ── Diversification score ─────────────────────────────────────────────
    const numSectors = Object.keys(sectorMap).length;
    const numStocks  = enriched.length;
    const maxWeight  = sectorAllocation.length > 0
      ? Math.max(...sectorAllocation.map(s => s.percent))
      : 100;
    let divScore = 50;
    if (numStocks >= 10) divScore += 20;
    else if (numStocks >= 5) divScore += 10;
    if (numSectors >= 5) divScore += 20;
    else if (numSectors >= 3) divScore += 10;
    if (maxWeight < 30) divScore += 10;
    else if (maxWeight > 60) divScore -= 15;
    divScore = Math.min(100, Math.max(0, divScore));
    const divGrade = divScore >= 80 ? 'A' : divScore >= 60 ? 'B' : divScore >= 40 ? 'C' : 'D';

    // ── Top / Worst performers ────────────────────────────────────────────
    const sorted       = [...enriched].sort((a, b) => b.pnlPct - a.pnlPct);
    const topPerformer  = sorted[0]  || null;
    const worstPerformer = sorted[sorted.length - 1] || null;

    res.json({
      totalInvested,
      totalCurrent,
      totalPnL,
      totalPnLPct,
      xirr:            xirrVal,
      dayChange:        0,
      dayChangePct:     0,
      holdings:         enriched.map(h => ({
        symbol:    h.symbol,
        name:      h.name,
        sector:    h.sector,
        quantity:  h.quantity,
        avgPrice:  h.avgPrice,
        livePrice: h.livePrice,
        invested:  h.invested,
        current:   h.current,
        pnl:       h.pnl,
        pnlPct:    h.pnlPct,
      })),
      sectorAllocation,
      monthlyPnL,
      diversification: {
        score:   divScore,
        grade:   divGrade,
        sectors: numSectors,
        stocks:  numStocks,
      },
      topPerformer:  topPerformer  ? { symbol: topPerformer.symbol,  name: topPerformer.name,  pnlPct: topPerformer.pnlPct,  pnl: topPerformer.pnl  } : null,
      worstPerformer: worstPerformer ? { symbol: worstPerformer.symbol, name: worstPerformer.name, pnlPct: worstPerformer.pnlPct, pnl: worstPerformer.pnl } : null,
    });

  } catch (err) {
    console.error('ANALYTICS ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;