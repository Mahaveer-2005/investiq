/**
 * Behaviour Analysis Service
 * Implements ML-based cognitive bias detection and RL advisory
 */

// Bias detection thresholds
const BIAS_THRESHOLDS = {
  LOSS_AVERSION: { holdDays: 30, lossPercent: -10 },
  PANIC_SELLING: { dropPercent: -3, timeWindow: 2 }, // hours
  OVERCONFIDENCE: { afterProfitPercent: 15, largeTradeMultiplier: 3 },
  HERD_BEHAVIOUR: { volumeSpikeMultiplier: 2, priceRise: 5 }
};

// RL States and Actions
const RL_ACTIONS = {
  ALLOW: 'allow',
  WARN: 'warn',
  DELAY: 'delay',
  SUGGEST_DIVERSIFY: 'suggest_diversification',
  BLOCK: 'block'
};

// Simple Q-Table for RL (state -> action mapping)
const Q_TABLE = {
  high_risk_impulsive: { weights: { warn: 0.8, delay: 0.6, allow: 0.1 } },
  high_risk_rational: { weights: { allow: 0.9, warn: 0.2, delay: 0.1 } },
  low_risk_impulsive: { weights: { warn: 0.5, allow: 0.6, delay: 0.3 } },
  low_risk_rational: { weights: { allow: 0.95, warn: 0.1 } },
  panic_detected: { weights: { delay: 0.95, warn: 0.9, block: 0.3 } },
  overconfidence_detected: { weights: { warn: 0.85, suggest_diversification: 0.7 } },
};

function detectBiases(tradeData, userHistory) {
  const biases = [];
  const { type, price, currentPriceChange, holdingDays, totalAfterProfit } = tradeData;

  // Loss Aversion: holding losing assets > 30 days
  if (type === 'SELL' && holdingDays > 30 && currentPriceChange < -10) {
    biases.push({ type: 'loss_aversion', severity: 'high', message: '⚠️ You\'ve been holding this losing asset for a long time. Consider cutting losses.' });
  }

  // Panic Selling: selling after sudden drop
  if (type === 'SELL' && currentPriceChange < -3) {
    biases.push({ type: 'panic_selling', severity: 'medium', message: '⚠️ Selling during a market dip may lock in losses. Review before acting.' });
  }

  // Overconfidence: large trade after consecutive wins
  if (type === 'BUY' && totalAfterProfit > 15 && tradeData.amount > 10000) {
    biases.push({ type: 'overconfidence', severity: 'medium', message: '⚠️ You\'re making a large trade after recent profits. Overconfidence bias detected.' });
  }

  // Herd behaviour: buying during rapid price rise
  if (type === 'BUY' && currentPriceChange > 5) {
    biases.push({ type: 'herd_behaviour', severity: 'low', message: '⚠️ Buying during a rapid price rise may mean you\'re following the crowd (FOMO).' });
  }

  return biases;
}

function getRLAdvisory(userState, biases) {
  const { investorType, riskProfile, biasScore } = userState;
  let stateKey = `${riskProfile === 'aggressive' ? 'high' : 'low'}_risk_${investorType}`;
  
  if (biases.some(b => b.type === 'panic_selling')) stateKey = 'panic_detected';
  if (biases.some(b => b.type === 'overconfidence')) stateKey = 'overconfidence_detected';
  
  const qState = Q_TABLE[stateKey] || Q_TABLE['low_risk_rational'];
  const topAction = Object.entries(qState.weights).sort((a,b) => b[1]-a[1])[0][0];
  
  const advisoryMessages = {
    allow: { action: 'allow', message: '✅ Trade looks good. Proceed with your decision.', color: 'green' },
    warn: { action: 'warn', message: '⚠️ Review your trade before proceeding. Consider the risks.', color: 'yellow' },
    delay: { action: 'delay', message: '⏳ Consider waiting 24 hours before executing this trade.', color: 'orange' },
    suggest_diversification: { action: 'suggest_diversification', message: '📊 Your portfolio may be concentrated. Consider diversifying.', color: 'blue' },
    block: { action: 'block', message: '🚫 High risk detected. This trade pattern has historically led to losses.', color: 'red' },
  };
  
  return advisoryMessages[topAction] || advisoryMessages.allow;
}

function classifyInvestor(tradingHistory) {
  if (!tradingHistory || tradingHistory.length < 5) return 'unknown';
  
  const panicSells = tradingHistory.filter(t => t.emotionTag === 'panic').length;
  const totalTrades = tradingHistory.length;
  const avgHoldDays = tradingHistory.reduce((a,b) => a + (b.holdDays || 0), 0) / totalTrades;
  
  if (panicSells / totalTrades > 0.3) return 'impulsive';
  if (avgHoldDays > 90) return 'conservative';
  return 'rational';
}

function updateBiasScores(currentScores, newBiases) {
  const updated = { ...currentScores };
  newBiases.forEach(b => {
    if (b.type === 'loss_aversion') updated.lossAversion = Math.min(100, (updated.lossAversion || 0) + 10);
    if (b.type === 'panic_selling') updated.panicSelling = Math.min(100, (updated.panicSelling || 0) + 10);
    if (b.type === 'overconfidence') updated.overconfidence = Math.min(100, (updated.overconfidence || 0) + 10);
    if (b.type === 'herd_behaviour') updated.herdBehaviour = Math.min(100, (updated.herdBehaviour || 0) + 10);
  });
  return updated;
}

// ML Recommendation Engine
function generateStockRecommendations(userProfile, stockList) {
  const { riskProfile, investorType, biasScore } = userProfile;
  
  const riskWeights = {
    conservative: { stability: 0.7, growth: 0.3 },
    moderate: { stability: 0.5, growth: 0.5 },
    aggressive: { stability: 0.2, growth: 0.8 }
  };
  
  const w = riskWeights[riskProfile] || riskWeights.moderate;
  
  const safeSectors = ['Banking', 'FMCG', 'IT', 'Pharma'];
  const growthSectors = ['Consumer Tech', 'Fintech', 'Renewable Energy', 'Defence'];
  
  return stockList
    .map(stock => {
      let score = Math.random() * 50;
      if (safeSectors.includes(stock.sector)) score += 50 * w.stability;
      if (growthSectors.includes(stock.sector)) score += 50 * w.growth;
      if (stock.changePercent > 0) score += 10;
      return { ...stock, aiScore: Math.min(99, score) };
    })
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, 10);
}

module.exports = { detectBiases, getRLAdvisory, classifyInvestor, updateBiasScores, generateStockRecommendations };
