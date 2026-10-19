const router = require('express').Router();
const auth   = require('../middleware/auth');
const User   = require('../models/User');
const axios  = require('axios');
const NodeCache = require('node-cache');
const cache  = new NodeCache({ stdTTL: 120 });

async function getLivePrice(symbol) {
  const normalized = String(symbol || '').trim().toUpperCase();
  const key = `lp_${normalized}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const candidates = normalized.includes('.')
    ? [normalized]
    : [`${normalized}.NS`, `${normalized}.BO`];
  for (const sym of candidates) {
    try {
      const { data } = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`,
        { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, timeout: 8000 }
      );
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      const closes = result?.indicators?.quote?.[0]?.close || [];
      const lastClose = [...closes].reverse().find(v => Number.isFinite(v) && v > 0);
      const price = Number(meta?.regularMarketPrice || lastClose || 0);
      if (price > 0) {
        const prev = Number(meta?.chartPreviousClose || meta?.previousClose || price);
        const change = prev > 0 ? +(price - prev).toFixed(2) : 0;
        const resultPrice = {
          price: +price.toFixed(2),
          change,
          changePct: prev > 0 ? +((change / prev) * 100).toFixed(2) : 0,
          name: meta?.longName || meta?.shortName || normalized,
          exchangeSymbol: sym,
        };
        cache.set(key, resultPrice, 120);
        return resultPrice;
      }
    } catch { /* Try the other exchange symbol. */ }
  }
  return null;
}

// ── GET /api/portfolio ────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const txns = (user.transactions || []);

    // ── Step 1: Build holdings from transactions chronologically ─────────
    const holdingMap = {};  // symbol → { qty, totalCost, name, sector }

    const sorted = [...txns].sort((a, b) =>
      new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0)
    );

    for (const tx of sorted) {
      const sym    = (tx.symbol || '').toUpperCase().replace(/\.(NS|BSE)$/i, '');
      const action = (tx.action || tx.type || '').toLowerCase();
      const qty    = Number(tx.quantity   || 0);
      const price  = Number(tx.price      || 0);

      if (!sym || qty <= 0) continue;

      // ── If price is 0 in old txn, skip for avgPrice calc but keep qty ──
      if (!holdingMap[sym]) {
        holdingMap[sym] = { qty: 0, totalCost: 0, name: tx.name || sym, sector: tx.sector || '' };
      }

      if (action === 'buy') {
        holdingMap[sym].qty       += qty;
        holdingMap[sym].totalCost += price > 0 ? price * qty : 0;
      } else if (action === 'sell') {
        const sellQty = Math.min(qty, holdingMap[sym].qty);
        if (holdingMap[sym].qty > 0 && holdingMap[sym].totalCost > 0) {
          const avg = holdingMap[sym].totalCost / holdingMap[sym].qty;
          holdingMap[sym].totalCost = Math.max(0, holdingMap[sym].totalCost - avg * sellQty);
        }
        holdingMap[sym].qty = Math.max(0, holdingMap[sym].qty - sellQty);
      }
    }

    // ── Step 2: Build enriched holdings with live prices ─────────────────
    const symbols = Object.keys(holdingMap).filter(s => holdingMap[s].qty > 0);

    const enriched = await Promise.all(symbols.map(async sym => {
      const h    = holdingMap[sym];
      const live = await getLivePrice(sym);

      const currentPrice = live?.price || 0;

      // avgPrice from txns — if 0 (old corrupt data), fetch live as proxy
      let avgPrice = h.qty > 0 && h.totalCost > 0
        ? +(h.totalCost / h.qty).toFixed(2)
        : 0;

      // If avgPrice is still 0 (all old txns had price:0), use live price
      // so at least P&L shows 0 instead of fake huge number
      if (avgPrice <= 0 && currentPrice > 0) {
        avgPrice = currentPrice;
      }

      const invested  = +(avgPrice     * h.qty).toFixed(2);
      const current   = +(currentPrice * h.qty).toFixed(2);
      const pnl       = +(current - invested).toFixed(2);
      const pnlPct    = invested > 0 ? +((pnl / invested) * 100).toFixed(2) : 0;

      return {
        symbol:       sym,
        name:         live?.name || h.name,
        sector:       h.sector,
        quantity:     h.qty,
        avgPrice,
        currentPrice,
        invested,
        current,
        pnl,
        pnlPct,
        change:       live?.change    || 0,
        changePct:    live?.changePct || 0,
        hasBadData:   h.totalCost === 0,   // flag for UI
      };
    }));

    const valid         = enriched.filter(h => h.currentPrice > 0);
    const totalInvested = +valid.reduce((s, h) => s + h.invested, 0).toFixed(2);
    const totalCurrent  = +valid.reduce((s, h) => s + h.current,  0).toFixed(2);
    const totalPnL      = +(totalCurrent - totalInvested).toFixed(2);
    const totalPnLPct   = totalInvested > 0 ? +((totalPnL / totalInvested) * 100).toFixed(2) : 0;

    res.json({
      holdings:     valid,
      totalInvested,
      totalCurrent,
      totalPnL,
      totalPnLPct,
      virtualCoins: user.virtualCoins || 0,
      transactions: [...txns].reverse().slice(0, 200),
    });
  } catch (err) {
    console.error('PORTFOLIO ERR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/portfolio/fix — wipe corrupt avgPrice, recalc from txns ─────
router.post('/fix', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).lean();
    // Fetch real current prices for holdings with price:0 txns and patch them
    const txns   = (user.transactions || []);
    const patched = [];

    for (const tx of txns) {
      const sym    = (tx.symbol||'').toUpperCase().replace(/\.(NS|BSE)$/i,'');
      const price  = Number(tx.price || 0);
      let   newTx  = { ...tx };

      // If buy txn has price:0, fetch real price to patch it
      if ((tx.action||tx.type||'').toLowerCase() === 'buy' && price <= 0) {
        const live = await getLivePrice(sym);
        if (live?.price) {
          newTx.price       = live.price;
          newTx.totalAmount = +(live.price * Number(tx.quantity || 0)).toFixed(2);
          newTx.total       = newTx.totalAmount;
        }
      }
      patched.push(newTx);
    }

    await User.updateOne({ _id: user._id }, { $set: { transactions: patched } });
    res.json({ success: true, fixed: patched.length, message: 'Transactions patched with real prices' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;