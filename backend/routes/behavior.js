const router = require('express').Router();
const auth   = require('../middleware/auth');
const User   = require('../models/User');
const axios  = require('axios');
const { groqChatJSON, verifyGroqConfig } = require('../utils/groqClient');

const ML_SERVER = (process.env.ML_SERVER_URL || 'http://localhost:5001').replace(/\/$/, '');
const behaviorAiCache = new (require('node-cache'))({ stdTTL: 1800 });

// ── AI-generated natural-language behaviour coaching (Groq — free API) ────
// Layers a qualitative, personalized narrative on top of the deterministic
// rule/ML score below — using Groq's free-tier Llama model (no cost, no
// credit card) instead of a paid API. Get a free key at console.groq.com/keys
async function getAIBehaviorInsight(userId, features, biases, score) {
  if (!process.env.GROQ_API_KEY) return null;

  const cacheKey = `behavior_ai_${userId}_${score}_${features.totalTrades}`;
  const cached = behaviorAiCache.get(cacheKey);
  if (cached) return cached;

  const prompt = `You are a behavioural-finance coach reviewing a retail investor's virtual trading activity.

Score: ${score}/100
Risk profile signals: winRate=${features.winRate}%, avgHoldDays=${features.avgHoldDays}, numHoldings=${features.numHoldings}, tradingFrequency=${features.tradingFrequency}/month, panicSellCount=${features.panicSellCount}, maxPortfolioWeight=${features.maxPortfolioWeight}
Detected biases: ${biases.map(b => b.name).join(', ') || 'none'}

Write a short, encouraging, specific coaching note (max 60 words) in second person ("You..."), plus ONE concrete action for this week.
Respond ONLY with JSON, no other text: {"note":"...", "actionThisWeek":"..."}`;

  try {
    const result = await groqChatJSON({ prompt, maxTokens: 300, temperature: 0.5 });
    behaviorAiCache.set(cacheKey, result);
    return result;
  } catch (err) {
    const apiMsg = err.response?.data?.error?.message;
    console.error('Behavior AI insight error:', apiMsg || err.message);
    return null;
  }
}

// ── ML Server health check ────────────────────────────────────────────────
async function checkMLServer() {
  try {
    const res = await axios.get(`${ML_SERVER}/health`, { timeout: 3000 });
    return res.data?.status === 'ok';
  } catch { return false; }
}

// ── Call ML server ────────────────────────────────────────────────────────
async function analyzeWithML(features) {
  try {
    const res = await axios.post(`${ML_SERVER}/api/analyze`, features, { timeout: 8000 });
    return res.data;
  } catch (e) {
    console.log('ML Server call failed:', e.message);
    return null;
  }
}

// ── Extract features from transactions ───────────────────────────────────
function extractFeatures(transactions, portfolio) {
  const txns = transactions || [];
  const port = portfolio    || [];

  // Totals
  const totalTrades = txns.length;
  const buyTxns     = txns.filter(t => (t.action||t.type||'').toLowerCase() === 'buy');
  const sellTxns    = txns.filter(t => (t.action||t.type||'').toLowerCase() === 'sell');

  // Time-based analysis
  const now       = Date.now();
  const oneWeekAgo= now - 7  * 24 * 3600 * 1000;
  const oneMonthAgo=now - 30 * 24 * 3600 * 1000;
  const recentTxns= txns.filter(t => new Date(t.date || t.createdAt || now) > oneWeekAgo);
  const monthTxns = txns.filter(t => new Date(t.date || t.createdAt || now) > oneMonthAgo);

  // Trading frequency
  const tradingFrequency = monthTxns.length;
  const avgTradesPerWeek = recentTxns.length;

  // Hold duration analysis
  const holdDurations = [];
  sellTxns.forEach(sell => {
    const sym      = sell.symbol || sell.ticker || '';
    const sellDate = new Date(sell.date || sell.createdAt || now);
    const matchBuy = buyTxns.find(b => (b.symbol||b.ticker||'') === sym && new Date(b.date||b.createdAt||now) < sellDate);
    if (matchBuy) {
      const days = (sellDate - new Date(matchBuy.date||matchBuy.createdAt||now)) / (24*3600*1000);
      holdDurations.push(days);
    }
  });
  const avgHoldDays    = holdDurations.length ? holdDurations.reduce((s,v)=>s+v,0)/holdDurations.length : 30;
  const shortTermTrades= holdDurations.filter(d => d < 7).length;
  const panicSellCount = holdDurations.filter(d => d < 1).length;

  // P&L analysis
  const profitTrades = sellTxns.filter(t => {
    const sym    = t.symbol || t.ticker || '';
    const buyTx  = buyTxns.find(b => (b.symbol||b.ticker||'') === sym);
    return buyTx && Number(t.price||0) > Number(buyTx.price||0);
  });
  const lossTrades = sellTxns.filter(t => {
    const sym   = t.symbol || t.ticker || '';
    const buyTx = buyTxns.find(b => (b.symbol||b.ticker||'') === sym);
    return buyTx && Number(t.price||0) < Number(buyTx.price||0);
  });

  const winRate      = sellTxns.length > 0 ? (profitTrades.length / sellTxns.length) * 100 : 50;
  const lossRate     = 100 - winRate;
  const avgWin       = profitTrades.length > 0 ? profitTrades.reduce((s,t)=>s+Number(t.totalAmount||0),0)/profitTrades.length : 0;
  const avgLoss      = lossTrades.length  > 0 ? lossTrades.reduce((s,t) =>s+Number(t.totalAmount||0),0)/lossTrades.length  : 0;
  const profitFactor = avgLoss > 0 ? avgWin / avgLoss : 1;

  // Portfolio concentration
  const uniqueSymbols = [...new Set(port.map(h => h.symbol||h.ticker||'').filter(Boolean))];
  const numHoldings   = uniqueSymbols.length || port.length || 0;
  const totalPortVal  = port.reduce((s,h)=>s+Number(h.currentValue||h.value||(Number(h.avgPrice||0)*Number(h.quantity||0))||0),0);
  const maxWeight     = port.length > 0 ? Math.max(...port.map(h => {
    const val = Number(h.currentValue||h.value||(Number(h.avgPrice||0)*Number(h.quantity||0))||0);
    return totalPortVal > 0 ? val/totalPortVal : 0;
  })) : 0;

  // Sell after loss pattern (loss aversion proxy)
  const sellAfterLoss = lossTrades.length;
  const holdAfterLoss = buyTxns.filter(b => {
    const sym     = b.symbol||b.ticker||'';
    const buyDate = new Date(b.date||b.createdAt||now);
    return lossTrades.some(l => (l.symbol||l.ticker||'')===sym && new Date(l.date||l.createdAt||now) < buyDate);
  }).length;

  // Recency bias: more trades in last 7 days than usual?
  const recencyBiasScore = totalTrades > 0 ? (recentTxns.length / totalTrades) * 100 : 0;

  // ── Herd behavior proxy: multiple same-day trades ─────────────────────
  const dateGroups = {};
  txns.forEach(t => {
    const d = new Date(t.date||t.createdAt||now).toDateString();
    dateGroups[d] = (dateGroups[d]||0)+1;
  });
  const herdDays = Object.values(dateGroups).filter(v=>v>2).length;

  // ── Closed-trade P&L sequence (chronological) — powers streaks & consistency ──
  const closedTrades = sellTxns
    .map(sell => {
      const sym   = sell.symbol || sell.ticker || '';
      const buyTx = buyTxns.find(b => (b.symbol||b.ticker||'') === sym && new Date(b.date||b.createdAt||now) < new Date(sell.date||sell.createdAt||now));
      if (!buyTx) return null;
      const buyPrice  = Number(buyTx.price || 0);
      const sellPrice = Number(sell.price || 0);
      const pctReturn = buyPrice > 0 ? ((sellPrice - buyPrice) / buyPrice) * 100 : 0;
      return { symbol: sym, date: new Date(sell.date || sell.createdAt || now), pctReturn, win: pctReturn > 0 };
    })
    .filter(Boolean)
    .sort((a, b) => a.date - b.date);

  // Win/loss streaks (consecutive closed trades)
  let curStreak = 0, curStreakType = null, maxWinStreak = 0, maxLossStreak = 0, runWin = 0, runLoss = 0;
  closedTrades.forEach(t => {
    if (t.win) { runWin++; runLoss = 0; } else { runLoss++; runWin = 0; }
    maxWinStreak  = Math.max(maxWinStreak, runWin);
    maxLossStreak = Math.max(maxLossStreak, runLoss);
  });
  if (closedTrades.length) {
    const last = closedTrades[closedTrades.length - 1];
    curStreakType = last.win ? 'win' : 'loss';
    curStreak = last.win ? runWin : runLoss;
  }

  // Consistency score: lower spread of returns = more consistent (0–100, higher is better)
  let consistencyScore = 50;
  if (closedTrades.length >= 3) {
    const returns = closedTrades.map(t => t.pctReturn);
    const mean    = returns.reduce((s, v) => s + v, 0) / returns.length;
    const variance= returns.reduce((s, v) => s + (v - mean) ** 2, 0) / returns.length;
    const stdDev  = Math.sqrt(variance);
    // Map stdDev to a 0-100 score: tight spread (<5%) → high score, wide spread (>40%) → low score
    consistencyScore = Math.max(0, Math.min(100, Math.round(100 - (stdDev / 40) * 100)));
  }

  // Revenge trading: re-buying the SAME symbol within 48h of a loss-sell on it
  let revengeTradingCount = 0;
  for (const sym of uniqueSymbolsFromTxns(txns)) {
    const losses = sellTxns.filter(s => (s.symbol||s.ticker||'') === sym);
    for (const loss of losses) {
      const buyTx = buyTxns.find(b => (b.symbol||b.ticker||'') === sym && new Date(b.date||b.createdAt||now) < new Date(loss.date||loss.createdAt||now));
      if (!buyTx || Number(loss.price||0) >= Number(buyTx.price||0)) continue; // only count actual losses
      const lossDate = new Date(loss.date||loss.createdAt||now);
      const rebought = buyTxns.some(b => (b.symbol||b.ticker||'') === sym && new Date(b.date||b.createdAt||now) > lossDate && (new Date(b.date||b.createdAt||now) - lossDate) < 48*3600*1000);
      if (rebought) revengeTradingCount++;
    }
  }

  // Sunk cost / averaging down: buying MORE of a symbol at a lower price than a previous buy of the same symbol
  const buysBySymbol = {};
  buyTxns.forEach(b => {
    const sym = b.symbol||b.ticker||'';
    (buysBySymbol[sym] = buysBySymbol[sym] || []).push({ price: Number(b.price||0), date: new Date(b.date||b.createdAt||now) });
  });
  let averagingDownCount = 0;
  Object.values(buysBySymbol).forEach(buys => {
    buys.sort((a,b) => a.date - b.date);
    for (let i = 1; i < buys.length; i++) if (buys[i].price < buys[i-1].price) averagingDownCount++;
  });

  // Sector concentration (based on current portfolio holdings, if sector data present)
  const sectorWeights = {};
  port.forEach(h => {
    const sector = h.sector || 'Unclassified';
    const val = Number(h.currentValue||h.value||(Number(h.avgPrice||0)*Number(h.quantity||0))||0);
    sectorWeights[sector] = (sectorWeights[sector]||0) + val;
  });
  const sectorEntries = Object.entries(sectorWeights);
  const sectorTotal   = sectorEntries.reduce((s,[,v])=>s+v, 0);
  const sectorBreakdown = sectorEntries
    .map(([sector, val]) => ({ sector, weight: sectorTotal > 0 ? +((val/sectorTotal)*100).toFixed(1) : 0 }))
    .sort((a,b) => b.weight - a.weight);
  const topSectorWeight = sectorBreakdown.length ? sectorBreakdown[0].weight : 0;
  const uniqueSectors    = sectorBreakdown.filter(s => s.sector !== 'Unclassified').length;

  // Diversification score (0-100): rewards more holdings AND more sectors, penalizes concentration
  const diversificationScore = Math.max(0, Math.min(100, Math.round(
    (Math.min(numHoldings, 15) / 15) * 50 +
    (Math.min(uniqueSectors, 8) / 8) * 30 +
    (topSectorWeight < 30 ? 20 : topSectorWeight < 50 ? 10 : 0)
  )));

  return {
    totalTrades,
    buyCount:          buyTxns.length,
    sellCount:         sellTxns.length,
    tradingFrequency,
    avgTradesPerWeek,
    avgHoldDays:       +avgHoldDays.toFixed(1),
    shortTermTrades,
    panicSellCount,
    winRate:           +winRate.toFixed(1),
    lossRate:          +lossRate.toFixed(1),
    profitFactor:      +profitFactor.toFixed(2),
    numHoldings,
    maxPortfolioWeight:+maxWeight.toFixed(2),
    sellAfterLoss,
    holdAfterLoss,
    recencyBiasScore:  +recencyBiasScore.toFixed(1),
    herdDays,
    totalPortfolioValue:+totalPortVal.toFixed(0),
    // ── Deeper metrics ─────────────────────────────────────────────────
    currentStreak:      curStreak,
    currentStreakType:  curStreakType,      // 'win' | 'loss' | null
    maxWinStreak,
    maxLossStreak,
    consistencyScore,                       // 0–100, higher = steadier returns
    revengeTradingCount,
    averagingDownCount,
    sectorBreakdown,                        // [{ sector, weight }] sorted desc
    topSectorWeight,
    uniqueSectors,
    diversificationScore,                   // 0–100
    closedTradeCount:   closedTrades.length,
  };
}

function uniqueSymbolsFromTxns(txns) {
  return [...new Set(txns.map(t => t.symbol||t.ticker||'').filter(Boolean))];
}

// ── Rules-based bias detection (fallback) ─────────────────────────────────
function detectBiasesRuleBased(features) {
  const biases = [];
  const { totalTrades, panicSellCount, winRate, lossRate, avgHoldDays,
          tradingFrequency, maxPortfolioWeight, recencyBiasScore, herdDays,
          sellAfterLoss, shortTermTrades, profitFactor } = features;

  if (panicSellCount > 0 || (sellAfterLoss > 0 && avgHoldDays < 3))
    biases.push({ name:'Panic Selling', severity: panicSellCount>2?'high':'medium', icon:'😱',
      description:'You tend to sell positions very quickly, possibly due to fear during market dips.',
      suggestion:'Set stop-losses in advance. Avoid watching prices obsessively. Have a written trading plan.' });

  if (lossRate > 60 && sellAfterLoss < winRate/2)
    biases.push({ name:'Loss Aversion', severity:'high', icon:'😰',
      description:'You hold losing positions too long hoping they recover, while selling winners too early.',
      suggestion:'Use trailing stop-losses. Define max loss % before entering a trade. Review losers weekly.' });

  if (winRate > 80 && totalTrades > 3)
    biases.push({ name:'Overconfidence', severity:'medium', icon:'😎',
      description:'Very high win rate may indicate overconfidence or not taking enough risk.',
      suggestion:'Track your predictions vs outcomes. Diversify to avoid concentration risk.' });

  if (herdDays > 2 || (tradingFrequency > 15 && recencyBiasScore > 50))
    biases.push({ name:'Herd Behavior', severity:'medium', icon:'🐑',
      description:'You tend to make multiple trades in clusters, possibly following market trends.',
      suggestion:'Research before trading. Question if you\'re trading based on news/social media.' });

  if (recencyBiasScore > 60)
    biases.push({ name:'Recency Bias', severity:'medium', icon:'📰',
      description:'Recent trades are disproportionately clustered, suggesting reaction to recent events.',
      suggestion:'Review your trading history monthly. Avoid making decisions based only on recent performance.' });

  if (tradingFrequency > 20 || (totalTrades > 5 && avgHoldDays < 2))
    biases.push({ name:'Overtrading', severity: tradingFrequency>30?'high':'medium', icon:'🔄',
      description:'High trading frequency increases costs and reduces returns due to emotional decisions.',
      suggestion:'Set a maximum number of trades per week. Focus on quality over quantity.' });

  if (shortTermTrades > totalTrades * 0.6 && totalTrades > 3)
    biases.push({ name:'Disposition Effect', severity:'medium', icon:'📉',
      description:'You tend to sell winning stocks quickly and hold losing stocks too long.',
      suggestion:'Let winners run by using trailing stops. Cut losses early with predefined stop-losses.' });

  if (maxPortfolioWeight > 0.5 && features.numHoldings < 4)
    biases.push({ name:'Concentration Risk', severity:'high', icon:'🎯',
      description:'Your portfolio is heavily concentrated in few positions, increasing risk significantly.',
      suggestion:'Diversify across at least 8-12 stocks in different sectors. No single stock > 20% of portfolio.' });

  if (features.revengeTradingCount > 0)
    biases.push({ name:'Revenge Trading', severity: features.revengeTradingCount > 2 ? 'high' : 'medium', icon:'😤',
      description:`You re-bought the same stock within 48 hours of a loss ${features.revengeTradingCount} time(s) — a classic sign of trying to "win back" money emotionally rather than on new analysis.`,
      suggestion:'After any loss, enforce a 24–48h cooling-off period before re-entering the same stock. Journal why you\'re re-entering before you act.' });

  if (features.averagingDownCount > 1)
    biases.push({ name:'Sunk Cost Fallacy (Averaging Down)', severity: features.averagingDownCount > 3 ? 'high' : 'medium', icon:'🕳️',
      description:`You added to a losing position at a lower price ${features.averagingDownCount} time(s). This can be a disciplined strategy — or a way of avoiding admitting the first entry was wrong.`,
      suggestion:'Only average down if your original thesis is still valid AND you set a hard total-position size limit in advance — not as a reaction to the price dropping.' });

  if (features.topSectorWeight > 60 && features.uniqueSectors <= 2 && features.numHoldings >= 3)
    biases.push({ name:'Sector Concentration', severity:'medium', icon:'🏭',
      description:`${features.topSectorWeight}% of your portfolio sits in a single sector (${features.sectorBreakdown?.[0]?.sector || 'unclassified'}). A sector-wide downturn would hit your whole portfolio at once.`,
      suggestion:'Spread holdings across at least 4-5 different sectors so no single industry event can sink your whole portfolio.' });

  return biases;
}

// ── Score calculation ─────────────────────────────────────────────────────
function calculateScore(features, biases) {
  let score = 75; // base score

  // Positive factors
  if (features.winRate > 50)    score += Math.min((features.winRate - 50) * 0.5, 15);
  if (features.avgHoldDays > 7) score += Math.min(features.avgHoldDays * 0.2, 10);
  if (features.numHoldings >= 5)score += Math.min(features.numHoldings, 10);
  if (features.profitFactor > 1)score += Math.min((features.profitFactor - 1) * 5, 10);
  if (features.consistencyScore > 60) score += Math.min((features.consistencyScore - 60) * 0.2, 8);
  if (features.diversificationScore > 60) score += Math.min((features.diversificationScore - 60) * 0.1, 5);

  // Bias penalties
  biases.forEach(b => {
    if (b.severity === 'high')   score -= 15;
    if (b.severity === 'medium') score -= 8;
    if (b.severity === 'low')    score -= 3;
  });

  // Streak-based nudge (small — a hot/cold streak isn't itself a bias, but
  // extreme streaks correlate with reduced discipline)
  if (features.maxLossStreak >= 4) score -= 5;

  return Math.max(10, Math.min(100, Math.round(score)));
}

// ── Deep-dive AI report (Groq) — longer, structured, multi-section ────────
// Distinct from getAIBehaviorInsight's short 60-word note: this produces a
// genuine detailed breakdown (root-cause analysis + a concrete 30-day plan),
// generated on-demand via a dedicated button rather than on every page load.
const deepDiveCache = new (require('node-cache'))({ stdTTL: 1800 });

async function getDeepDiveReport(userId, features, biases, strengths, score, riskProfile) {
  if (!process.env.GROQ_API_KEY) {
    return { available: false, reason: 'GROQ_API_KEY is not configured on the server. Get a free key at console.groq.com/keys.' };
  }

  const cacheKey = `behavior_deepdive_${userId}_${score}_${features.totalTrades}_${biases.length}`;
  const cached = deepDiveCache.get(cacheKey);
  if (cached) return cached;

  const prompt = `You are a senior behavioural-finance analyst producing a detailed report on a retail investor's virtual trading activity. Be specific and reference the actual numbers given — do not write generic filler.

SCORE: ${score}/100 | RISK PROFILE: ${riskProfile}

TRADING STATS:
- Total trades: ${features.totalTrades} (${features.buyCount} buys, ${features.sellCount} sells)
- Win rate: ${features.winRate}% | Profit factor: ${features.profitFactor}
- Avg hold period: ${features.avgHoldDays} days | Trading frequency: ${features.tradingFrequency}/month
- Consistency score: ${features.consistencyScore}/100 (higher = steadier returns)
- Diversification score: ${features.diversificationScore}/100 across ${features.uniqueSectors} sectors, ${features.numHoldings} holdings
- Top sector weight: ${features.topSectorWeight}%
- Current streak: ${features.currentStreak} ${features.currentStreakType || 'n/a'} | Max win streak: ${features.maxWinStreak} | Max loss streak: ${features.maxLossStreak}
- Revenge trading incidents: ${features.revengeTradingCount} | Averaging-down incidents: ${features.averagingDownCount}
- Panic sells (held <1 day): ${features.panicSellCount}

DETECTED BIASES: ${biases.map(b => `${b.name} (${b.severity})`).join(', ') || 'none detected'}
STRENGTHS: ${strengths.map(s => s.label).join(', ')}

Respond ONLY with JSON, no other text, in this exact shape:
{
  "headline": "one sentence overall verdict",
  "rootCauseAnalysis": "2-3 sentences connecting the detected biases to WHY they likely happen for this specific trader, based on the numbers above",
  "biggestRisk": "the single most important thing to fix, one sentence, and why it matters most given these numbers",
  "thirtyDayPlan": ["specific action 1", "specific action 2", "specific action 3", "specific action 4"],
  "encouragement": "one genuine, specific (not generic) sentence of encouragement referencing an actual strength from the data"
}`;

  try {
    const parsed = await groqChatJSON({ prompt, maxTokens: 800, temperature: 0.4 });
    const result = { available: true, ...parsed };
    deepDiveCache.set(cacheKey, result);
    return result;
  } catch (err) {
    const apiMsg = err.response?.data?.error?.message;
    console.error('Deep-dive report error:', apiMsg || err.message);
    return { available: false, reason: apiMsg ? `Groq API error: ${apiMsg}` : 'Could not generate the detailed report right now. Please try again shortly.' };
  }
}

// ── GET /api/behavior/deep-dive ─────────────────────────────────────────────
router.get('/deep-dive', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const transactions = Array.isArray(user.transactions) ? user.transactions : [];
    const portfolio     = Array.isArray(user.portfolio)    ? user.portfolio    : [];
    const features = extractFeatures(transactions, portfolio);
    const biases   = detectBiasesRuleBased(features);
    const score    = calculateScore(features, biases);
    let riskProfile = 'Moderate';
    if (features.avgHoldDays < 3 || features.tradingFrequency > 20) riskProfile = 'Aggressive';
    if (features.avgHoldDays > 30 && features.tradingFrequency < 5) riskProfile = 'Conservative';
    const strengths = [];
    if (features.winRate > 55) strengths.push({ label: 'Good Win Rate' });
    if (features.consistencyScore > 70) strengths.push({ label: 'Consistent Returns' });
    if (features.diversificationScore > 70) strengths.push({ label: 'Well Diversified' });

    const report = await getDeepDiveReport(req.user._id, features, biases, strengths, score, riskProfile);
    res.json(report);
  } catch (err) {
    console.error('DEEP DIVE ROUTE ERROR:', err.message);
    res.status(500).json({ available: false, reason: err.message });
  }
});

// ── GET /api/behavior ─────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const transactions = Array.isArray(user.transactions) ? user.transactions : [];
    const portfolio    = Array.isArray(user.portfolio)    ? user.portfolio    : [];

    // ── REMOVED the "5 trades minimum" gate — show data for any trades ───
    const features = extractFeatures(transactions, portfolio);

    // ── Try ML server first ───────────────────────────────────────────────
    const mlOnline = await checkMLServer();
    let   mlResult = null;
    let   biases   = [];
    let   score    = 50;
    let   source   = 'rules';

    if (mlOnline) {
      mlResult = await analyzeWithML(features);
      if (mlResult && mlResult.score != null) {
        score  = mlResult.score;
        biases = mlResult.biases || detectBiasesRuleBased(features);
        source = 'ml';
        console.log(`✅ ML Server analysis: score=${score}, biases=${biases.length}`);
      }
    }

    // Fallback to rule-based if ML failed or offline
    if (source === 'rules') {
      biases = detectBiasesRuleBased(features);
      score  = calculateScore(features, biases);
      console.log(`📊 Rule-based analysis: score=${score}, biases=${biases.length}`);
    }

    // ── Coaching tips based on score ──────────────────────────────────────
    const coaching = [];
    if (features.avgHoldDays < 7)
      coaching.push({ tip:'Consider longer holding periods', detail:'Short-term trading incurs higher costs and taxes (STCG 15%). Studies show holding 3–12 months improves returns.', icon:'⏳', type:'warning' });
    if (features.numHoldings < 5)
      coaching.push({ tip:'Diversify your portfolio', detail:'Holding fewer than 5 stocks increases risk significantly. Target 8–15 stocks across different sectors.', icon:'🌐', type:'warning' });
    if (features.winRate < 40 && features.totalTrades > 2)
      coaching.push({ tip:'Review your entry strategy', detail:'Win rate below 40% suggests your entry criteria may need improvement. Review your trade setups.', icon:'🎯', type:'danger' });
    if (features.winRate > 55)
      coaching.push({ tip:'Good win rate — focus on position sizing', detail:'Your win rate is solid. Now focus on making winners bigger than losers.', icon:'✅', type:'success' });
    if (features.tradingFrequency < 5)
      coaching.push({ tip:'Patience is your strength', detail:'Low trading frequency reduces costs and emotional decisions. Keep it disciplined.', icon:'🧘', type:'success' });
    if (features.totalTrades === 0)
      coaching.push({ tip:'Start your trading journey', detail:'Make your first trade to begin building your behavioral profile. Even paper trades count!', icon:'🚀', type:'info' });
    if (features.totalTrades > 0 && features.totalTrades < 5)
      coaching.push({ tip:'Keep trading to improve analysis accuracy', detail:`You have ${features.totalTrades} trade(s). More trades = more accurate bias detection and ML analysis.`, icon:'📊', type:'info' });
    if (features.revengeTradingCount > 0)
      coaching.push({ tip:'Cool off after losses', detail:`You re-entered the same stock within 48h of a loss ${features.revengeTradingCount} time(s). Build in a mandatory waiting period.`, icon:'😤', type:'danger' });
    if (features.diversificationScore < 40 && features.numHoldings > 0)
      coaching.push({ tip:'Spread risk across sectors', detail:`Diversification score is ${features.diversificationScore}/100 — ${features.topSectorWeight}% sits in one sector. Add positions in uncorrelated industries.`, icon:'🏭', type:'warning' });
    if (features.currentStreakType === 'loss' && features.currentStreak >= 3)
      coaching.push({ tip:'You\'re on a losing streak', detail:`${features.currentStreak} losses in a row. Consider pausing new trades for a few days and reviewing what changed in the market or your process.`, icon:'📉', type:'danger' });
    if (features.currentStreakType === 'win' && features.currentStreak >= 3)
      coaching.push({ tip:'Hot streak — stay disciplined', detail:`${features.currentStreak} wins in a row is great, but don't let it push you into oversized position bets. Keep sizing consistent.`, icon:'🔥', type:'success' });

    // ── Risk profile ──────────────────────────────────────────────────────
    let riskProfile = 'Moderate';
    if (features.avgHoldDays < 3 || features.tradingFrequency > 20)  riskProfile = 'Aggressive';
    if (features.avgHoldDays > 30 && features.tradingFrequency < 5) riskProfile = 'Conservative';

    // ── Strengths ─────────────────────────────────────────────────────────
    const strengths = [];
    if (features.winRate > 55)      strengths.push({ label:'Good Win Rate',      value:`${features.winRate}%`,      icon:'🎯' });
    if (features.avgHoldDays > 14)  strengths.push({ label:'Patient Investor',   value:`${features.avgHoldDays}d avg`, icon:'⏳' });
    if (features.numHoldings >= 5)  strengths.push({ label:'Diversified',        value:`${features.numHoldings} stocks`, icon:'🌐' });
    if (features.profitFactor > 1.2)strengths.push({ label:'Profit Factor',      value:features.profitFactor,       icon:'💰' });
    if (features.panicSellCount===0)strengths.push({ label:'No Panic Selling',   value:'Disciplined',               icon:'🧘' });
    if (features.consistencyScore > 70) strengths.push({ label:'Consistent Returns', value:`${features.consistencyScore}/100`, icon:'📏' });
    if (features.diversificationScore > 70) strengths.push({ label:'Well Diversified', value:`${features.diversificationScore}/100`, icon:'🌍' });
    if (features.maxWinStreak >= 3) strengths.push({ label:'Best Win Streak', value:`${features.maxWinStreak} in a row`, icon:'🔥' });
    if (features.revengeTradingCount === 0 && features.closedTradeCount > 2) strengths.push({ label:'No Revenge Trading', value:'Cool-headed', icon:'😌' });
    if (strengths.length === 0)
      strengths.push({ label:'Getting Started', value:'Keep trading!', icon:'🌱' });

    // ── AI-generated personalized coaching note (non-blocking best-effort) ──
    const aiInsight = await getAIBehaviorInsight(req.user._id, features, biases, score);

    res.json({
      score,
      source,
      mlOnline,
      riskProfile,
      features,
      biases,
      strengths,
      coaching,
      aiInsight, // { note, actionThisWeek } or null if ANTHROPIC_API_KEY not configured
      summary: {
        totalTrades:    features.totalTrades,
        winRate:        features.winRate,
        avgHoldDays:    features.avgHoldDays,
        numHoldings:    features.numHoldings,
        tradingFreq:    features.tradingFrequency,
        biasCount:      biases.length,
      },
    });

  } catch (err) {
    console.error('BEHAVIOR ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.verifyGroqConfig = verifyGroqConfig;