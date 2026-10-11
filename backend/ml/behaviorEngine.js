/**
 * InvestIQ — Behavioral ML Engine
 * Detects: Panic Selling, Loss Aversion, Overconfidence,
 * Herd Behavior, Overtrading, Recency Bias, Disposition Effect
 */

function extractFeatures(transactions = [], portfolio = []) {
  if (!transactions || transactions.length === 0) return null;

  const buys  = transactions.filter(t => t.action === 'buy');
  const sells = transactions.filter(t => t.action === 'sell');
  const total = transactions.length;
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));

  // ── Trading frequency ──────────────────────────────────────────────────
  const firstDate = new Date(sorted[0]?.date);
  const lastDate  = new Date(sorted[sorted.length - 1]?.date);
  const daySpan   = Math.max(1, (lastDate - firstDate) / (1000 * 60 * 60 * 24));
  const tradesPerDay = total / daySpan;

  // ── Panic Sell Score ───────────────────────────────────────────────────
  // Sells within 2 days of buy = panic
  let panicSells = 0;
  sells.forEach(sell => {
    const correspondingBuy = buys
      .filter(b => b.symbol === sell.symbol)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (correspondingBuy) {
      const holdDays = (new Date(sell.date) - new Date(correspondingBuy.date)) / (1000 * 60 * 60 * 24);
      if (holdDays < 2) panicSells++;
    }
  });
  const panicScore = sells.length > 0 ? panicSells / sells.length : 0;

  // ── Loss Aversion Score ────────────────────────────────────────────────
  let quickWinSells = 0, longLossHolds = 0;
  sells.forEach(sell => {
    const buy = buys.filter(b => b.symbol === sell.symbol)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (buy) {
      const holdDays = (new Date(sell.date) - new Date(buy.date)) / (1000 * 60 * 60 * 24);
      const pnlPct = ((sell.price - buy.price) / buy.price) * 100;
      if (pnlPct > 3 && holdDays < 7) quickWinSells++;
    }
  });
  portfolio.forEach(item => {
    if (item.buyPrice && item.currentPrice) {
      const pnlPct = ((item.currentPrice - item.buyPrice) / item.buyPrice) * 100;
      const holdDays = (Date.now() - new Date(item.buyDate)) / (1000 * 60 * 60 * 24);
      if (pnlPct < -5 && holdDays > 30) longLossHolds++;
    }
  });
  const lossAversionScore = Math.min(1, (quickWinSells * 0.4 + longLossHolds * 0.5) / Math.max(1, total * 0.1));

  // ── Overconfidence Score ───────────────────────────────────────────────
  const uniqueSymbols = new Set(transactions.map(t => t.symbol)).size;
  const concentrationRatio = 1 - (uniqueSymbols / Math.max(1, total * 0.3));
  const avgTradeSize = transactions.reduce((s, t) => s + (t.totalAmount || 0), 0) / total;
  const largeTradeRatio = transactions.filter(t => t.totalAmount > avgTradeSize * 2).length / total;
  const overconfidenceScore = Math.min(1, Math.max(0, concentrationRatio * 0.5 + largeTradeRatio * 0.5));

  // ── Herd Behavior Score ────────────────────────────────────────────────
  const symbolFreq = {};
  transactions.forEach(t => { symbolFreq[t.symbol] = (symbolFreq[t.symbol] || 0) + 1; });
  const maxFreq = Math.max(...Object.values(symbolFreq));
  const herdScore = total > 3 ? Math.min(1, (maxFreq - 1) / Math.max(1, total - 1)) : 0;

  // ── Recency Bias Score ─────────────────────────────────────────────────
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentTrades = transactions.filter(t => new Date(t.date) > recentCutoff).length;
  const recencyBiasScore = total > 5 ? Math.min(1, (recentTrades / total) * 3) : 0;

  // ── Disposition Effect Score ───────────────────────────────────────────
  let gainRealizations = 0, lossRealizations = 0;
  sells.forEach(sell => {
    const buy = buys.filter(b => b.symbol === sell.symbol)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (buy) {
      if (sell.price > buy.price) gainRealizations++;
      else lossRealizations++;
    }
  });
  const dispositionScore = sells.length > 0
    ? Math.min(1, Math.max(0, gainRealizations / Math.max(1, sells.length) - lossRealizations / Math.max(1, sells.length) + 0.5))
    : 0.5;

  // ── Win Rate ───────────────────────────────────────────────────────────
  let wins = 0;
  sells.forEach(sell => {
    const buy = buys.filter(b => b.symbol === sell.symbol)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (buy && sell.price > buy.price) wins++;
  });
  const winRate = sells.length > 0 ? wins / sells.length : 0;

  // ── Avg Holding Period ─────────────────────────────────────────────────
  const holdingDays = [];
  sells.forEach(sell => {
    const buy = buys.filter(b => b.symbol === sell.symbol)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (buy) holdingDays.push((new Date(sell.date) - new Date(buy.date)) / (1000 * 60 * 60 * 24));
  });
  const avgHoldingDays = holdingDays.length > 0
    ? holdingDays.reduce((a, b) => a + b, 0) / holdingDays.length : 0;

  // ── Realized P&L ──────────────────────────────────────────────────────
  let totalRealizedPnL = 0;
  sells.forEach(sell => {
    const buy = buys.filter(b => b.symbol === sell.symbol)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (buy) totalRealizedPnL += (sell.price - buy.price) * sell.quantity;
  });

  // ── Decision Score (0–100) ─────────────────────────────────────────────
  const decisionScore = Math.round(Math.max(0, Math.min(100,
    100
    - (panicScore * 25)
    - (lossAversionScore * 20)
    - (overconfidenceScore * 15)
    - (herdScore * 15)
    - (recencyBiasScore * 10)
    + (winRate * 20)
    + (Math.min(avgHoldingDays, 30) / 30 * 15)
  )));

  return {
    panicScore:          +panicScore.toFixed(3),
    lossAversionScore:   +lossAversionScore.toFixed(3),
    overconfidenceScore: +overconfidenceScore.toFixed(3),
    herdScore:           +herdScore.toFixed(3),
    recencyBiasScore:    +recencyBiasScore.toFixed(3),
    dispositionScore:    +dispositionScore.toFixed(3),
    winRate:             +winRate.toFixed(3),
    avgHoldingDays:      +avgHoldingDays.toFixed(1),
    tradesPerDay:        +tradesPerDay.toFixed(3),
    uniqueSymbols,
    totalTrades:         total,
    buyCount:            buys.length,
    sellCount:           sells.length,
    panicSellCount:      panicSells,
    quickWinSells,
    longLossHolds,
    totalRealizedPnL:    +totalRealizedPnL.toFixed(2),
    decisionScore,
  };
}

function classifyBiases(features) {
  if (!features) return [];
  const biases = [];

  if (features.panicScore > 0.3) biases.push({
    type: 'PANIC_SELLING', label: 'Panic Selling', emoji: '😱',
    severity: features.panicScore > 0.6 ? 'HIGH' : 'MEDIUM',
    score: features.panicScore, color: '#ef4444',
    description: 'You sell quickly when prices drop, locking in unnecessary losses.',
    advice: 'Before selling, ask: has the reason for buying fundamentally changed?'
  });

  if (features.lossAversionScore > 0.3) biases.push({
    type: 'LOSS_AVERSION', label: 'Loss Aversion', emoji: '😰',
    severity: features.lossAversionScore > 0.6 ? 'HIGH' : 'MEDIUM',
    score: features.lossAversionScore, color: '#f59e0b',
    description: 'You hold losers too long and sell winners too fast.',
    advice: 'Set stop-loss before buying. Use "Would I buy this today?" test for each holding.'
  });

  if (features.overconfidenceScore > 0.4) biases.push({
    type: 'OVERCONFIDENCE', label: 'Overconfidence', emoji: '🦁',
    severity: features.overconfidenceScore > 0.7 ? 'HIGH' : 'MEDIUM',
    score: features.overconfidenceScore, color: '#8b5cf6',
    description: 'You make large concentrated bets — overconfident in predictions.',
    advice: 'No single position > 15% of portfolio. Diversify across 5+ sectors.'
  });

  if (features.herdScore > 0.4) biases.push({
    type: 'HERD_BEHAVIOR', label: 'Herd Behavior', emoji: '🐑',
    severity: features.herdScore > 0.65 ? 'HIGH' : 'MEDIUM',
    score: features.herdScore, color: '#06b6d4',
    description: 'You frequently trade the same stocks, following trends.',
    advice: "Form your own thesis before investing. Don't let FOMO drive decisions."
  });

  if (features.recencyBiasScore > 0.5) biases.push({
    type: 'RECENCY_BIAS', label: 'Recency Bias', emoji: '📅',
    severity: features.recencyBiasScore > 0.75 ? 'HIGH' : 'MEDIUM',
    score: features.recencyBiasScore, color: '#10b981',
    description: 'Your trading spikes after recent market events — reacting to short-term news.',
    advice: 'Stick to a pre-defined plan. Avoid decisions during high-volatility periods.'
  });

  if (features.tradesPerDay > 2) biases.push({
    type: 'OVERTRADING', label: 'Overtrading', emoji: '⚡',
    severity: features.tradesPerDay > 5 ? 'HIGH' : 'MEDIUM',
    score: Math.min(1, features.tradesPerDay / 10), color: '#f97316',
    description: `You're averaging ${features.tradesPerDay.toFixed(1)} trades/day — this erodes returns.`,
    advice: 'Quality > Quantity. Set a max: 2–3 new positions per week.'
  });

  if (features.dispositionScore > 0.65) biases.push({
    type: 'DISPOSITION_EFFECT', label: 'Disposition Effect', emoji: '⚖️',
    severity: 'MEDIUM', score: features.dispositionScore, color: '#ec4899',
    description: 'You realize gains too quickly and defer losses — a costly pattern.',
    advice: 'Let winners run. Use trailing stop-losses instead of taking quick profits.'
  });

  return biases;
}

function classifyRiskProfile(features) {
  if (!features) return { profile: 'UNKNOWN', label: 'Unknown', color: '#64748b', description: 'Trade more to unlock.' };
  const { tradesPerDay, avgHoldingDays, overconfidenceScore, panicScore } = features;

  if (tradesPerDay > 3 || avgHoldingDays < 3)
    return { profile: 'AGGRESSIVE', label: '🔴 Aggressive Trader', color: '#ef4444', description: 'High-frequency, short-term. High risk & potential reward.' };
  if (panicScore > 0.5)
    return { profile: 'CONSERVATIVE', label: '🟢 Conservative Investor', color: '#10b981', description: 'Risk-averse, stability focused. Lower but more stable returns.' };
  if (avgHoldingDays > 30 && overconfidenceScore < 0.5)
    return { profile: 'MODERATE', label: '🟡 Moderate Investor', color: '#f59e0b', description: 'Balanced approach. Mix of growth and capital preservation.' };
  return { profile: 'BALANCED', label: '🔵 Balanced Trader', color: '#6366f1', description: 'Adaptive style mixing short and long-term strategies.' };
}

function generateRecommendations(features, biases) {
  const recs = [];
  if (!features || features.totalTrades < 2) {
    return [{ title: '🚀 Start Trading', body: 'Make at least 5 trades to unlock behavioral analysis.', priority: 'INFO', emoji: '🚀', color: '#6366f1' }];
  }
  biases.filter(b => b.severity === 'HIGH').forEach(bias => {
    recs.push({ title: `⚠️ Fix: ${bias.label}`, body: bias.advice, priority: 'HIGH', emoji: bias.emoji, color: bias.color });
  });
  if (features.winRate < 0.4 && features.sellCount > 3)
    recs.push({ title: '📉 Improve Win Rate', body: `Win rate ${(features.winRate*100).toFixed(0)}%. Focus on stocks with strong fundamentals and better entry timing.`, priority: 'HIGH', emoji: '🎯', color: '#ef4444' });
  else if (features.winRate > 0.7)
    recs.push({ title: '🌟 Excellent Win Rate', body: `${(features.winRate*100).toFixed(0)}% win rate! Consider sizing up on high-conviction trades.`, priority: 'LOW', emoji: '🌟', color: '#10b981' });
  if (features.avgHoldingDays < 3 && features.sellCount > 2)
    recs.push({ title: '⏱️ Hold Longer', body: 'Avg hold < 3 days. Quality stocks need 3–6 months. Try a 30-day minimum hold rule.', priority: 'MEDIUM', emoji: '⏳', color: '#f59e0b' });
  if (features.uniqueSymbols < 3 && features.totalTrades > 5)
    recs.push({ title: '🌐 Diversify', body: 'Fewer than 3 unique stocks. Spread across Banking, IT, FMCG, Pharma to reduce risk.', priority: 'MEDIUM', emoji: '🌐', color: '#8b5cf6' });
  if (features.decisionScore >= 75)
    recs.push({ title: '🏆 Strong Discipline', body: `Decision score ${features.decisionScore}/100. You show rational, disciplined investing behavior.`, priority: 'LOW', emoji: '🏆', color: '#10b981' });
  return recs.slice(0, 6);
}

function getRadarData(features) {
  if (!features) return [];
  return [
    { skill: 'Discipline',   value: Math.round((1 - features.panicScore) * 100) },
    { skill: 'Rationality',  value: Math.round((1 - features.lossAversionScore) * 100) },
    { skill: 'Confidence',   value: Math.round((1 - Math.abs(features.overconfidenceScore - 0.3)) * 100) },
    { skill: 'Independence', value: Math.round((1 - features.herdScore) * 100) },
    { skill: 'Consistency',  value: Math.round((1 - features.recencyBiasScore) * 100) },
    { skill: 'Win Rate',     value: Math.round(features.winRate * 100) },
  ];
}

function buildScoreHistory(transactions) {
  if (!transactions || transactions.length < 2) return [];
  const sorted = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  return sorted.slice(1).map((_, i) => {
    const slice = sorted.slice(0, i + 2);
    const f = extractFeatures(slice, []);
    return f ? {
      trade: i + 2,
      score: f.decisionScore,
      date: new Date(sorted[i + 1].date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    } : null;
  }).filter(Boolean);
}

module.exports = { extractFeatures, classifyBiases, classifyRiskProfile, generateRecommendations, getRadarData, buildScoreHistory };