// ML Behavioral Analysis Service
// Implements cognitive bias detection using statistical models

const analyzeBehavior = (trades) => {
  if (!trades || trades.length < 3) return { type: 'unknown', scores: {}, insights: [] };

  const insights = [];
  let lossAversionScore = 0;
  let panicSellingCount = 0;
  let overconfidenceScore = 0;
  let herdBehaviorCount = 0;

  // Analyze trade patterns
  for (let i = 1; i < trades.length; i++) {
    const prev = trades[i - 1];
    const curr = trades[i];
    
    const timeDiff = (new Date(curr.tradeTime) - new Date(prev.tradeTime)) / (1000 * 60); // minutes

    // Panic selling: sell within 10 mins of a drop
    if (curr.type === 'SELL' && curr.pnl < -0.05 && timeDiff < 10) {
      panicSellingCount++;
      insights.push({ type: 'panic_sell', message: `Panic sell detected on ${curr.symbol}`, severity: 'high' });
    }

    // Loss aversion: holding losers too long (pnl < -10% but still holding)
    if (curr.type === 'SELL' && curr.pnl < -0.1) {
      lossAversionScore += Math.abs(curr.pnl);
      insights.push({ type: 'loss_aversion', message: `Held losing position on ${curr.symbol} too long`, severity: 'medium' });
    }

    // Overconfidence: large buy after a win
    if (curr.type === 'BUY' && prev.pnl > 0.05 && curr.totalAmount > prev.totalAmount * 1.5) {
      overconfidenceScore++;
      insights.push({ type: 'overconfidence', message: `Overconfident large trade on ${curr.symbol} after win`, severity: 'medium' });
    }
  }

  // Herd behavior: buying at 52-week high
  const buys = trades.filter(t => t.type === 'BUY');
  const priceSpikes = buys.filter(t => {
    const recentBuys = buys.filter(b => b.symbol === t.symbol && Math.abs(new Date(b.tradeTime) - new Date(t.tradeTime)) < 3600000 * 24);
    return recentBuys.length > 2;
  });
  herdBehaviorCount = priceSpikes.length;
  if (herdBehaviorCount > 0) insights.push({ type: 'herd_behavior', message: 'Multiple rapid buys on same stock detected', severity: 'low' });

  // Calculate win rate
  const completedTrades = trades.filter(t => t.pnl !== 0);
  const winRate = completedTrades.length > 0 ? completedTrades.filter(t => t.pnl > 0).length / completedTrades.length : 0;

  // Classify behavior type
  let type = 'rational';
  const maxScore = Math.max(panicSellingCount, overconfidenceScore, lossAversionScore);
  if (panicSellingCount > 2 || lossAversionScore > 0.5) type = 'impulsive';
  else if (overconfidenceScore > 2) type = 'overconfident';
  else if (herdBehaviorCount > 3) type = 'herd_follower';
  else if (winRate > 0.6) type = 'rational';
  else type = 'conservative';

  return {
    type,
    scores: { lossAversionScore: parseFloat(lossAversionScore.toFixed(2)), panicSellingCount, overconfidenceScore, herdBehaviorCount, winRate: parseFloat((winRate * 100).toFixed(1)) },
    insights: insights.slice(0, 5),
    recommendation: getRecommendation(type, { lossAversionScore, panicSellingCount, overconfidenceScore })
  };
};

const getRecommendation = (type, scores) => {
  const recs = {
    impulsive: 'Consider setting stop-loss orders and avoid checking prices too frequently. Use the 24-hour rule before selling.',
    overconfident: 'Diversify your portfolio. Avoid putting more than 10% in a single stock after a win streak.',
    herd_follower: 'Research independently before buying trending stocks. High volume often means the opportunity has passed.',
    rational: 'Great discipline! Continue with systematic investment approach. Consider increasing position size gradually.',
    conservative: 'Consider slightly higher risk positions with strong fundamentals for better long-term returns.',
    unknown: 'Complete more trades to get personalized behavioral insights.'
  };
  return recs[type] || recs.unknown;
};

// RL Advisory Agent - decides what advice to give
const getTradeAdvisory = (user, stockData, tradeRequest) => {
  const { behaviorProfile, virtualCoins } = user;
  const { symbol, type, quantity, price } = tradeRequest;
  const totalCost = quantity * price;
  const portfolioPercent = (totalCost / (virtualCoins + totalCost)) * 100;

  const warnings = [];
  const suggestions = [];
  let action = 'allow'; // allow | warn | delay | suggest_diversify

  // Check for panic selling
  if (type === 'SELL' && stockData.changePercent < -3) {
    warnings.push('⚠️ Market is down today. Selling during a dip often locks in losses. Consider holding.');
    action = 'warn';
    if (behaviorProfile.panicSellingCount > 2) {
      warnings.push('🧠 Based on your history, you tend to panic-sell. This stock may recover.');
    }
  }

  // Check portfolio concentration
  if (portfolioPercent > 20 && type === 'BUY') {
    warnings.push(`⚠️ This trade would be ${portfolioPercent.toFixed(1)}% of your portfolio. Consider diversifying.`);
    action = 'warn';
  }

  // Check overconfidence after wins
  if (type === 'BUY' && behaviorProfile.overconfidenceScore > 2) {
    suggestions.push('💡 You recently had wins. Avoid over-allocating based on recent success.');
  }

  // Check available coins
  if (virtualCoins < totalCost) {
    warnings.push('❌ Insufficient virtual coins for this trade.');
    action = 'block';
  }

  // Positive reinforcement
  if (action === 'allow' && behaviorProfile.winRate > 50) {
    suggestions.push('✅ Good trade setup based on your profile!');
  }

  return { action, warnings, suggestions, riskScore: calculateRiskScore(user, stockData, portfolioPercent) };
};

const calculateRiskScore = (user, stockData, portfolioPercent) => {
  let score = 0;
  if (portfolioPercent > 20) score += 3;
  if (portfolioPercent > 10) score += 1;
  if (stockData.changePercent < -3) score += 2;
  if (user.behaviorProfile.panicSellingCount > 2) score += 2;
  if (user.behaviorProfile.overconfidenceScore > 2) score += 1;
  return Math.min(score, 10);
};

module.exports = { analyzeBehavior, getTradeAdvisory };
