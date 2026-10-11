const User = require('../models/User');
const { getStockPrice } = require('../services/stockService');

exports.getPortfolio = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    // Update current prices for all holdings
    let totalCurrentValue = 0;
    const updatedPortfolio = await Promise.all(user.portfolio.map(async (item) => {
      const priceData = await getStockPrice(item.symbol);
      const currentPrice = priceData.price || item.avgBuyPrice;
      const currentValue = currentPrice * item.quantity;
      const profitLoss = currentValue - item.totalInvested;
      const profitLossPercent = (profitLoss / item.totalInvested) * 100;
      totalCurrentValue += currentValue;
      return { ...item.toObject(), currentPrice, currentValue, profitLoss, profitLossPercent };
    }));

    res.json({
      success: true,
      data: {
        portfolio: updatedPortfolio,
        summary: {
          virtualCoins: user.virtualCoins,
          totalInvested: user.totalInvested,
          currentValue: totalCurrentValue,
          totalPnL: totalCurrentValue - user.totalInvested,
          totalPnLPercent: user.totalInvested > 0 ? ((totalCurrentValue - user.totalInvested) / user.totalInvested) * 100 : 0,
          realizedPnL: user.realizedPnL,
          netWorth: user.virtualCoins + totalCurrentValue
        },
        behaviourProfile: user.behaviourProfile
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTradeHistory = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({
      success: true,
      data: user.tradeHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addToWatchlist = async (req, res) => {
  try {
    const { symbol, name, category = 'stock' } = req.body;
    const user = await User.findById(req.user._id);
    
    const exists = user.watchlist.find(w => w.symbol === symbol);
    if (exists) return res.status(400).json({ success: false, message: 'Already in watchlist' });

    user.watchlist.push({ symbol, name, category, addedAt: new Date() });
    await user.save();
    res.json({ success: true, message: 'Added to watchlist' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWatchlist = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const watchlistWithPrices = await Promise.all(user.watchlist.map(async (item) => {
      const priceData = await getStockPrice(item.symbol);
      return { ...item.toObject(), ...priceData };
    }));
    res.json({ success: true, data: watchlistWithPrices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getBehaviourAnalysis = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const { behaviourProfile, tradeHistory } = user;
    
    const analysisData = {
      profile: behaviourProfile,
      biasBreakdown: {
        panicSelling: behaviourProfile.panicSellCount,
        overconfidence: behaviourProfile.overconfidenceCount,
        lossAversion: behaviourProfile.lossAversionCount,
        herdBehaviour: behaviourProfile.herdBehaviourCount
      },
      totalTrades: tradeHistory.length,
      profitableTrades: tradeHistory.filter(t => t.profitLoss > 0).length,
      advice: generateBehaviourAdvice(behaviourProfile)
    };
    
    res.json({ success: true, data: analysisData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

function generateBehaviourAdvice(profile) {
  const advice = [];
  if (profile.panicSellCount > 2) advice.push('You have a tendency to panic sell. Try setting pre-defined stop losses before entering a trade.');
  if (profile.overconfidenceCount > 2) advice.push('You show overconfidence after wins. Always maintain consistent position sizing regardless of past performance.');
  if (profile.lossAversionCount > 2) advice.push('You hold losing positions too long. Set a maximum loss limit (10-15%) for every trade and stick to it.');
  if (profile.herdBehaviourCount > 2) advice.push('You tend to follow market hype. Always check fundamentals before buying a stock that\'s rapidly rising.');
  if (advice.length === 0) advice.push('Great discipline! Keep maintaining rational decision-making and proper risk management.');
  return advice;
}
