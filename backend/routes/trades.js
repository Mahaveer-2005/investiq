const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Trade = require('../models/Trade');
const User = require('../models/User');
const Portfolio = require('../models/Portfolio');
const { getTradeAdvisory, analyzeBehavior } = require('../services/mlService');
const { generateMockPrice, ALL_STOCKS } = require('../services/priceService');

// Execute a trade
router.post('/execute', protect, async (req, res) => {
  try {
    const { symbol, type, quantity, assetClass = 'stock', skipWarning = false } = req.body;
    const user = await User.findById(req.user._id);
    
    const stockInfo = ALL_STOCKS.find(s => s.symbol === symbol) || {};
    const priceData = generateMockPrice(symbol);
    const price = priceData.price;
    const totalAmount = price * quantity;

    // Get RL advisory
    const advisory = getTradeAdvisory(user, priceData, { symbol, type, quantity, price });
    
    // Block if insufficient coins
    if (type === 'BUY' && user.virtualCoins < totalAmount) {
      return res.status(400).json({ error: 'Insufficient virtual coins', available: user.virtualCoins, required: totalAmount });
    }

    // Return warnings if any (unless user explicitly skips)
    if (!skipWarning && advisory.warnings.length > 0) {
      return res.status(200).json({ requiresConfirmation: true, advisory, price, totalAmount });
    }

    // Execute trade
    let pnl = 0;
    if (type === 'SELL') {
      const portfolio = await Portfolio.findOne({ user: user._id });
      const holding = portfolio?.holdings.find(h => h.symbol === symbol);
      if (!holding || holding.quantity < quantity) return res.status(400).json({ error: 'Insufficient holdings to sell' });
      pnl = (price - holding.avgBuyPrice) * quantity;
      holding.quantity -= quantity;
      if (holding.quantity === 0) portfolio.holdings = portfolio.holdings.filter(h => h.symbol !== symbol);
      else { holding.currentPrice = price; holding.currentValue = holding.quantity * price; holding.pnl = (price - holding.avgBuyPrice) * holding.quantity; }
      await portfolio.save();
      user.virtualCoins += totalAmount;
    } else {
      // BUY
      let portfolio = await Portfolio.findOne({ user: user._id });
      if (!portfolio) portfolio = await Portfolio.create({ user: user._id });
      
      const existing = portfolio.holdings.find(h => h.symbol === symbol);
      if (existing) {
        const newQty = existing.quantity + quantity;
        existing.avgBuyPrice = ((existing.avgBuyPrice * existing.quantity) + (price * quantity)) / newQty;
        existing.quantity = newQty;
        existing.currentPrice = price;
        existing.currentValue = newQty * price;
        existing.investedAmount = newQty * existing.avgBuyPrice;
        existing.pnl = (price - existing.avgBuyPrice) * newQty;
      } else {
        portfolio.holdings.push({ symbol, companyName: stockInfo.name || symbol, assetClass, quantity, avgBuyPrice: price, currentPrice: price, investedAmount: totalAmount, currentValue: totalAmount, pnl: 0, sector: stockInfo.sector });
      }
      
      portfolio.totalInvested = portfolio.holdings.reduce((a, h) => a + h.investedAmount, 0);
      portfolio.currentValue = portfolio.holdings.reduce((a, h) => a + h.currentValue, 0);
      portfolio.totalPnl = portfolio.currentValue - portfolio.totalInvested;
      await portfolio.save();
      user.virtualCoins -= totalAmount;
    }

    // Detect behavior flags
    let behaviorFlag = 'none';
    if (type === 'SELL' && priceData.changePercent < -3) behaviorFlag = 'panic_sell';
    else if (type === 'BUY' && user.behaviorProfile.overconfidenceScore > 2) behaviorFlag = 'overconfident_buy';

    const trade = await Trade.create({
      user: user._id, symbol, companyName: stockInfo.name, type, assetClass, quantity, price, totalAmount, coinsUsed: totalAmount, pnl, behaviorFlag,
      aiWarning: advisory.warnings[0] || null
    });

    // Update behavior profile
    user.behaviorProfile.totalTrades++;
    if (behaviorFlag === 'panic_sell') user.behaviorProfile.panicSellingCount++;
    if (behaviorFlag === 'overconfident_buy') user.behaviorProfile.overconfidenceScore++;
    await user.save();

    res.json({ success: true, trade, remainingCoins: user.virtualCoins, advisory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trade history
router.get('/history', protect, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
    res.json(trades);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get behavior analysis
router.get('/behavior-analysis', protect, async (req, res) => {
  try {
    const trades = await Trade.find({ user: req.user._id }).sort({ tradeTime: -1 }).limit(50);
    const analysis = analyzeBehavior(trades);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
