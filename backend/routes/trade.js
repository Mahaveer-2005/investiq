const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { getStockPrice } = require('../services/stockService');
const { analyzeBehavior } = require('../services/aiService');

router.post('/buy', protect, async (req, res) => {
  try {
    const { symbol, name, quantity, assetType = 'stock' } = req.body;
    const user = await User.findById(req.user._id);
    const priceData = await getStockPrice(symbol);
    const price = priceData.price;
    const total = price * quantity;
    if (user.virtualCoins < total) return res.status(400).json({ success: false, message: 'Insufficient virtual coins' });
    user.virtualCoins -= total;
    const existing = user.portfolio.find(p => p.stockSymbol === symbol);
    if (existing) {
      const totalQty = existing.quantity + quantity;
      existing.avgBuyPrice = ((existing.avgBuyPrice * existing.quantity) + (price * quantity)) / totalQty;
      existing.quantity = totalQty;
    } else {
      user.portfolio.push({ stockSymbol: symbol, stockName: name, quantity, avgBuyPrice: price, type: assetType });
    }
    user.transactions.push({ type: 'buy', stockSymbol: symbol, stockName: name, quantity, price, total, assetType });
    user.behaviorProfile.totalTrades = (user.behaviorProfile.totalTrades || 0) + 1;
    await user.save();
    res.json({ success: true, message: `Bought ${quantity} shares of ${name}`, virtualCoins: user.virtualCoins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/sell', protect, async (req, res) => {
  try {
    const { symbol, name, quantity } = req.body;
    const user = await User.findById(req.user._id);
    const holding = user.portfolio.find(p => p.stockSymbol === symbol);
    if (!holding || holding.quantity < quantity) return res.status(400).json({ success: false, message: 'Insufficient holdings' });
    const priceData = await getStockPrice(symbol);
    const price = priceData.price;
    const total = price * quantity;
    const profit = (price - holding.avgBuyPrice) * quantity;
    user.virtualCoins += total;
    holding.quantity -= quantity;
    if (holding.quantity === 0) user.portfolio = user.portfolio.filter(p => p.stockSymbol !== symbol);
    user.transactions.push({ type: 'sell', stockSymbol: symbol, stockName: name, quantity, price, total, profit });
    if (profit > 0) user.behaviorProfile.profitableTrades = (user.behaviorProfile.profitableTrades || 0) + 1;
    user.behaviorProfile.totalTrades = (user.behaviorProfile.totalTrades || 0) + 1;
    
    // Analyze behavior after each trade
    const behavior = await analyzeBehavior(user.transactions.slice(-20));
    user.behaviorProfile.investorType = behavior.investorType;
    user.behaviorProfile.biases = behavior.biases;
    user.behaviorProfile.lastAnalyzed = new Date();
    await user.save();
    res.json({ success: true, message: `Sold ${quantity} shares. Profit: ₹${profit.toFixed(2)}`, profit, virtualCoins: user.virtualCoins });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/portfolio', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const portfolioWithPrices = await Promise.all(user.portfolio.map(async (holding) => {
      const priceData = await getStockPrice(holding.stockSymbol);
      const currentValue = priceData.price * holding.quantity;
      const investedValue = holding.avgBuyPrice * holding.quantity;
      return {
        ...holding.toObject(),
        currentPrice: priceData.price,
        currentValue,
        investedValue,
        profitLoss: currentValue - investedValue,
        profitLossPercent: ((currentValue - investedValue) / investedValue) * 100
      };
    }));
    const totalInvested = portfolioWithPrices.reduce((a, b) => a + b.investedValue, 0);
    const totalCurrent = portfolioWithPrices.reduce((a, b) => a + b.currentValue, 0);
    res.json({ success: true, portfolio: portfolioWithPrices, virtualCoins: user.virtualCoins, totalInvested, totalCurrent, totalPL: totalCurrent - totalInvested });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/transactions', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ success: true, transactions: user.transactions.slice().reverse().slice(0, 50) });
});

module.exports = router;
