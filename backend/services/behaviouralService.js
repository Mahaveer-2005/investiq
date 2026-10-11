/**
 * Behavioural Analysis Service
 * Implements ML-based investor profiling using:
 * - Rule-based classification (baseline)
 * - Feature extraction from trade history
 * - Reinforcement Learning advisory agent
 */

const Trade = require('../models/Trade');
const User = require('../models/User');

// ============================================================
// FEATURE EXTRACTION
// ============================================================
const extractBehaviouralFeatures = (trades) => {
  if (!trades || trades.length === 0) return null;

  const sells = trades.filter(t => t.type === 'SELL');
  const buys = trades.filter(t => t.type === 'BUY');
  const totalTrades = trades.length;

  // Loss Aversion: Does user hold losing assets longer than winning ones?
  const losingHolds = sells.filter(t => t.realizedPnL < 0).map(t => t.holdingDuration || 0);
  const winningHolds = sells.filter(t => t.realizedPnL > 0).map(t => t.holdingDuration || 0);
  const avgLosingHold = losingHolds.length ? losingHolds.reduce((a, b) => a + b, 0) / losingHolds.length : 0;
  const avgWinningHold = winningHolds.length ? winningHolds.reduce((a, b) => a + b, 0) / winningHolds.length : 0;
  const lossAversionScore = avgLosingHold > avgWinningHold * 1.5 ?
    Math.min(100, ((avgLosingHold / (avgWinningHold || 1)) - 1) * 30) : 0;

  // Panic Selling: Selling after sudden drops (marked in flags)
  const panicSells = sells.filter(t => t.behaviouralFlags?.isPanicSell);
  const panicSellingScore = sells.length > 0 ? (panicSells.length / sells.length) * 100 : 0;

  // Overconfidence: Large trades after profits
  const overconfidentTrades = trades.filter(t => t.behaviouralFlags?.isOverconfident);
  const overconfidenceScore = totalTrades > 0 ? (overconfidentTrades.length / totalTrades) * 100 : 0;

  // Herd Behaviour: Buying during rapid price rises
  const herdBuys = buys.filter(t => t.behaviouralFlags?.isHerdBehaviour);
  const herdScore = buys.length > 0 ? (herdBuys.length / buys.length) * 100 : 0;

  // Trade frequency (overtrading indicator)
  const tradeDates = trades.map(t => new Date(t.executedAt).toDateString());
  const uniqueDays = new Set(tradeDates).size;
  const avgTradesPerDay = totalTrades / (uniqueDays || 1);
  const overtradingScore = Math.min(100, avgTradesPerDay * 10);

  // Win/Loss ratio
  const winners = sells.filter(t => t.realizedPnL > 0);
  const winRate = sells.length > 0 ? (winners.length / sells.length) * 100 : 50;

  // Concentration risk
  const symbols = buys.map(t => t.symbol);
  const symbolCounts = symbols.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
  const maxConcentration = Math.max(...Object.values(symbolCounts)) / totalTrades * 100;
  const concentrationRisk = maxConcentration > 50 ? maxConcentration : 0;

  return {
    lossAversionScore: Math.round(lossAversionScore),
    panicSellingScore: Math.round(panicSellingScore),
    overconfidenceScore: Math.round(overconfidenceScore),
    herdScore: Math.round(herdScore),
    overtradingScore: Math.round(overtradingScore),
    winRate: Math.round(winRate),
    concentrationRisk: Math.round(concentrationRisk),
    totalTrades,
    avgTradesPerDay: Math.round(avgTradesPerDay * 10) / 10,
  };
};

// ============================================================
// INVESTOR TYPE CLASSIFICATION (ML Model Simulation)
// ============================================================
const classifyInvestorType = (features) => {
  if (!features) return 'rational';

  const { lossAversionScore, panicSellingScore, overconfidenceScore, herdScore, overtradingScore, winRate } = features;

  // Scoring weights (simplified decision tree)
  const impulsiveScore = (panicSellingScore * 0.3) + (overtradingScore * 0.4) + (herdScore * 0.3);
  const conservativeScore = (lossAversionScore * 0.5) + ((100 - overtradingScore) * 0.3) + ((100 - overconfidenceScore) * 0.2);
  const aggressiveScore = (overconfidenceScore * 0.4) + (overtradingScore * 0.3) + ((100 - lossAversionScore) * 0.3);
  const rationalScore = (winRate * 0.4) + ((100 - herdScore) * 0.3) + ((100 - panicSellingScore) * 0.3);

  const scores = {
    impulsive: impulsiveScore,
    conservative: conservativeScore,
    aggressive: aggressiveScore,
    rational: rationalScore,
    balanced: (rationalScore + conservativeScore) / 2
  };

  return Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
};

// ============================================================
// RISK TOLERANCE CALCULATION
// ============================================================
const calculateRiskTolerance = (features) => {
  if (!features) return 50;
  const { lossAversionScore, overconfidenceScore, winRate, concentrationRisk } = features;
  const tolerance = 50 +
    (overconfidenceScore * 0.2) -
    (lossAversionScore * 0.3) +
    (winRate * 0.1) -
    (concentrationRisk * 0.1);
  return Math.max(0, Math.min(100, Math.round(tolerance)));
};

// ============================================================
// REINFORCEMENT LEARNING ADVISORY AGENT
// State: user profile + portfolio risk + market conditions
// Action: warn | delay | suggest_diversification | allow | educate
// Reward: improved decision discipline (reduced impulsive trades)
// ============================================================
const RLAgent = {
  // State space definition
  getState: (user, portfolioRisk, marketCondition) => {
    const { behaviouralProfile } = user;
    return {
      investorType: behaviouralProfile.investorType,
      riskTolerance: behaviouralProfile.riskTolerance > 70 ? 'high' : behaviouralProfile.riskTolerance > 40 ? 'medium' : 'low',
      biasLevel: Object.values(behaviouralProfile.biasScore).reduce((a, b) => a + b, 0) > 150 ? 'high' : 'medium',
      portfolioRisk: portfolioRisk > 70 ? 'high' : portfolioRisk > 40 ? 'medium' : 'low',
      marketCondition: marketCondition || 'neutral',
      improvementScore: user.rlAgentState.improvementScore
    };
  },

  // Policy: choose best action given state
  selectAction: (state, tradeContext) => {
    const { investorType, biasLevel, portfolioRisk, marketCondition } = state;
    const { isSell, priceDropPercent, isLargePosition, isAfterStreak } = tradeContext;

    // Rule-based policy (can be upgraded to Q-learning)
    if (biasLevel === 'high' && isSell && priceDropPercent > 3) {
      return { action: 'warn', message: '⚠️ Panic Alert! The stock dropped, but selling now might lock in losses. Consider holding if fundamentals are strong.', educationModule: 'panic_selling' };
    }
    if (investorType === 'impulsive' && isAfterStreak) {
      return { action: 'delay', message: '⏸️ Take a pause! After consecutive wins, overconfidence bias may affect your judgment. Review your strategy.', delay: 5 };
    }
    if (portfolioRisk === 'high' && !isSell && isLargePosition) {
      return { action: 'suggest_diversification', message: '📊 Portfolio Risk Alert! This would increase concentration risk. Consider diversifying across sectors.', suggestions: [] };
    }
    if (biasLevel === 'high' && !isSell && marketCondition === 'bullish') {
      return { action: 'educate', message: '📚 Market momentum is high - watch for herd behaviour bias. Ensure your buy has a sound reason.', educationModule: 'herd_behaviour' };
    }
    return { action: 'allow', message: 'Trade looks reasonable. Proceed with your decision.' };
  },

  // Calculate reward (positive if behaviour improved)
  calculateReward: (beforeBiasScore, afterBiasScore, wasWarningHeeded) => {
    const biasReduction = Object.keys(beforeBiasScore).reduce((sum, key) => {
      return sum + (beforeBiasScore[key] - afterBiasScore[key]);
    }, 0);
    const reward = biasReduction * 0.5 + (wasWarningHeeded ? 10 : -5);
    return Math.max(-20, Math.min(20, reward));
  }
};

// ============================================================
// MAIN ANALYSIS FUNCTION
// ============================================================
const analyzeUserBehaviour = async (userId) => {
  try {
    const trades = await Trade.find({ user: userId }).sort({ executedAt: -1 }).limit(100);
    if (trades.length < 3) return null;

    const features = extractBehaviouralFeatures(trades);
    const investorType = classifyInvestorType(features);
    const riskTolerance = calculateRiskTolerance(features);

    const biasScore = {
      lossAversion: features.lossAversionScore,
      panicSelling: features.panicSellingScore,
      overconfidence: features.overconfidenceScore,
      herdBehaviour: features.herdScore,
      anchoringBias: Math.round(features.concentrationRisk * 0.5)
    };

    const decisionConsistencyScore = Math.max(0, 100 - (
      features.lossAversionScore * 0.2 +
      features.panicSellingScore * 0.3 +
      features.overconfidenceScore * 0.25 +
      features.herdScore * 0.25
    ));

    // Update user profile
    await User.findByIdAndUpdate(userId, {
      'behaviouralProfile.investorType': investorType,
      'behaviouralProfile.riskTolerance': riskTolerance,
      'behaviouralProfile.biasScore': biasScore,
      'behaviouralProfile.decisionConsistencyScore': Math.round(decisionConsistencyScore),
      'behaviouralProfile.totalTradesAnalyzed': trades.length,
      'behaviouralProfile.lastAnalyzed': new Date()
    });

    return { features, investorType, riskTolerance, biasScore, decisionConsistencyScore };
  } catch (error) {
    console.error('Behaviour analysis error:', error);
    return null;
  }
};

// Pre-trade advisory
const getPreTradeAdvisory = async (user, tradeDetails) => {
  const { type, symbol, quantity, currentPrice, priceDropPercent } = tradeDetails;
  const { behaviouralProfile, portfolio } = user;

  const tradeContext = {
    isSell: type === 'SELL',
    priceDropPercent: priceDropPercent || 0,
    isLargePosition: (quantity * currentPrice) > (user.virtualCoins * 0.2),
    isAfterStreak: behaviouralProfile.rlAgentState?.consecutiveWins > 2
  };

  const state = RLAgent.getState(user, 50, 'neutral');
  const advisory = RLAgent.selectAction(state, tradeContext);

  // Detect behavioural flags for the trade
  const flags = {
    isPanicSell: type === 'SELL' && priceDropPercent > 3,
    isOverconfident: tradeContext.isAfterStreak && (quantity * currentPrice) > (user.virtualCoins * 0.3),
    isHerdBehaviour: false, // Would need market data to determine
    isImpulsive: behaviouralProfile.investorType === 'impulsive' && tradeContext.isLargePosition
  };

  return { advisory, flags };
};

module.exports = { analyzeUserBehaviour, getPreTradeAdvisory, RLAgent, extractBehaviouralFeatures };
