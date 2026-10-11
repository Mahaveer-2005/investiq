const router = require('express').Router();
const axios  = require('axios');
const auth   = require('../middleware/auth');
const User   = require('../models/User');
const { getLivePrice } = require('./stocks');

// ─────────────────────────────────────────────────────────────────────────
// "Beat the Index" — for every real stock purchase the user made, this
// computes what that same rupee amount would be worth today if it had
// bought Nifty 50 units instead on that exact date, using REAL historical
// Nifty closing prices (not a flat assumed return). This is deliberately
// the one honest comparison most trading apps don't surface, since most
// active retail traders underperform a simple index buy-and-hold.
//
// SIMPLIFICATION (stated plainly, not hidden): this compares "all money
// ever spent buying stocks, held in Nifty units the whole time" against
// "current holdings value + cash already realized from selling" — it does
// NOT simulate selling Nifty units when you sell a stock. This keeps the
// comparison simple and interpretable rather than building a full
// cash-flow-matched XIRR model. It's a benchmark, not exact accounting.
// ─────────────────────────────────────────────────────────────────────────

const HEADERS = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' };
const cache = new (require('node-cache'))({ stdTTL: 3600 });

// Fetch NIFTY's full daily close history far enough back to cover the
// user's earliest transaction, once per request (cached 1h).
async function getNiftyHistory() {
  const cached = cache.get('nifty_daily_history');
  if (cached) return cached;

  const { data } = await axios.get(
    'https://query1.finance.yahoo.com/v8/finance/chart/%5ENSEI?interval=1d&range=5y',
    { headers: HEADERS, timeout: 10000, insecureHTTPParser: true }
  );
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error('Could not fetch Nifty history');

  const timestamps = result.timestamp || [];
  const closes = result.indicators?.quote?.[0]?.close || [];
  const history = timestamps
    .map((ts, i) => ({ date: new Date(ts * 1000).toISOString().slice(0, 10), close: closes[i] }))
    .filter(h => h.close != null);

  cache.set('nifty_daily_history', history);
  return history;
}

// Find the closest trading-day close on/before a given date (handles
// weekends/holidays when the user's transaction happened on a non-trading day).
function closestClose(history, targetDateStr) {
  const target = new Date(targetDateStr).getTime();
  let best = null;
  for (const h of history) {
    const t = new Date(h.date).getTime();
    if (t <= target && (!best || t > new Date(best.date).getTime())) best = h;
  }
  return best || history[0]; // fall back to earliest available if transaction predates our history window
}

// ── GET /api/benchmark/beat-the-index ───────────────────────────────────
router.get('/beat-the-index', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const buyTxns  = (user.transactions || []).filter(t => t.action === 'buy'  && t.symbol !== 'COINS' && t.symbol !== 'SIP');
    const sellTxns = (user.transactions || []).filter(t => t.action === 'sell' && t.symbol !== 'COINS' && t.symbol !== 'SIP');

    if (buyTxns.length === 0) {
      return res.json({
        hasData: false,
        message: 'Make a few stock trades first — this compares your real trading performance against a Nifty 50 buy-and-hold benchmark using your actual transaction history.',
      });
    }

    const niftyHistory = await getNiftyHistory();
    const currentNiftyPrice = niftyHistory[niftyHistory.length - 1].close;

    let totalInvested = 0;
    let niftyUnitsAccumulated = 0;
    const timeline = [];

    for (const t of buyTxns.sort((a, b) => new Date(a.date) - new Date(b.date))) {
      const dateStr = new Date(t.date).toISOString().slice(0, 10);
      const niftyOnDate = closestClose(niftyHistory, dateStr);
      const unitsBought = t.totalAmount / niftyOnDate.close;
      niftyUnitsAccumulated += unitsBought;
      totalInvested += t.totalAmount;
      timeline.push({
        date: dateStr, amount: t.totalAmount, symbol: t.symbol,
        niftyPriceThen: +niftyOnDate.close.toFixed(2),
        cumulativeNiftyValue: +(niftyUnitsAccumulated * currentNiftyPrice).toFixed(0),
        cumulativeInvested: +totalInvested.toFixed(0),
      });
    }

    const totalSellProceeds = sellTxns.reduce((s, t) => s + t.totalAmount, 0);

    // Current market value of remaining holdings (real live prices)
    let currentHoldingsValue = 0;
    for (const h of (user.portfolio || [])) {
      try {
        const quote = await getLivePrice(h.symbol);
        currentHoldingsValue += (quote?.price || h.avgPrice) * h.quantity;
      } catch {
        currentHoldingsValue += h.avgPrice * h.quantity; // fallback to avg cost if a live quote fails
      }
    }

    const actualValueToday = currentHoldingsValue + totalSellProceeds;
    const niftyEquivalentValueToday = niftyUnitsAccumulated * currentNiftyPrice;

    const actualReturnPct = totalInvested > 0 ? +(((actualValueToday - totalInvested) / totalInvested) * 100).toFixed(2) : 0;
    const niftyReturnPct  = totalInvested > 0 ? +(((niftyEquivalentValueToday - totalInvested) / totalInvested) * 100).toFixed(2) : 0;
    const gapPct = +(actualReturnPct - niftyReturnPct).toFixed(2);

    res.json({
      hasData: true,
      totalInvested: +totalInvested.toFixed(0),
      currentHoldingsValue: +currentHoldingsValue.toFixed(0),
      totalSellProceeds: +totalSellProceeds.toFixed(0),
      actualValueToday: +actualValueToday.toFixed(0),
      actualReturnPct,
      niftyEquivalentValueToday: +niftyEquivalentValueToday.toFixed(0),
      niftyReturnPct,
      gapPct, // positive = user beat the index, negative = index beat the user
      beatIndex: gapPct >= 0,
      currentNiftyPrice: +currentNiftyPrice.toFixed(2),
      timeline,
      disclaimer: 'Simplified benchmark: compares money spent buying stocks (held in Nifty 50 units the whole time, using real historical Nifty prices on each purchase date) against your current holdings value plus cash already realized from selling. Not a full cash-flow-matched return calculation — educational comparison, not investment advice.',
    });
  } catch (err) {
    console.error('BEAT THE INDEX ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;