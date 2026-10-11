const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const { getStockPrice, STOCK_LIST } = require('../services/stockService');

// Buy stock
router.post('/buy', auth, async (req, res) => {
  try {
    const { symbol, quantity, assetType = 'stock' } = req.body;
    if (!symbol || !quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid trade parameters' });

    const stockInfo = STOCK_LIST.find(s => s.symbol === symbol);
    if (!stockInfo) return res.status(404).json({ error: 'Stock not found' });

    const priceData = await getStockPrice(symbol);
    const totalCost = +(priceData.price * quantity).toFixed(2);

    const user = await User.findById(req.user._id);
    if (user.virtualCoins < totalCost) return res.status(400).json({ error: `Insufficient coins. Need ₹${totalCost}, have ₹${user.virtualCoins}` });

    // Deduct coins
    user.virtualCoins = +(user.virtualCoins - totalCost).toFixed(2);

    // Update holdings
    const existingHolding = user.holdings.find(h => h.symbol === symbol);
    if (existingHolding) {
      const totalQty = existingHolding.quantity + quantity;
      const totalCostBasis = existingHolding.avgBuyPrice * existingHolding.quantity + totalCost;
      existingHolding.avgBuyPrice = +(totalCostBasis / totalQty).toFixed(2);
      existingHolding.quantity = totalQty;
      existingHolding.totalInvested = +(existingHolding.avgBuyPrice * totalQty).toFixed(2);
      existingHolding.currentPrice = priceData.price;
      existingHolding.currentValue = +(priceData.price * totalQty).toFixed(2);
      existingHolding.pnl = +(existingHolding.currentValue - existingHolding.totalInvested).toFixed(2);
      existingHolding.pnlPercent = +((existingHolding.pnl / existingHolding.totalInvested) * 100).toFixed(2);
    } else {
      user.holdings.push({
        symbol, name: stockInfo.name, assetType, quantity,
        avgBuyPrice: priceData.price, currentPrice: priceData.price,
        totalInvested: totalCost, currentValue: totalCost, pnl: 0, pnlPercent: 0
      });
    }

    // Add transaction
    user.transactions.push({
      type: 'buy', assetType, symbol, name: stockInfo.name,
      quantity, price: priceData.price, totalAmount: totalCost, timestamp: new Date()
    });

    // Behaviour analysis
    user.behaviour.totalTrades += 1;
    // Large trade = possible overconfidence
    if (totalCost > user.virtualCoins * 0.3) user.behaviour.overconfidentTrades += 1;

    await user.save();
    res.json({ success: true, message: `✅ Bought ${quantity} shares of ${stockInfo.name} at ₹${priceData.price}`, transaction: { symbol, quantity, price: priceData.price, total: totalCost }, remainingCoins: user.virtualCoins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sell stock
router.post('/sell', auth, async (req, res) => {
  try {
    const { symbol, quantity } = req.body;
    if (!symbol || !quantity || quantity <= 0) return res.status(400).json({ error: 'Invalid trade parameters' });

    const user = await User.findById(req.user._id);
    const holdingIndex = user.holdings.findIndex(h => h.symbol === symbol);
    if (holdingIndex === -1) return res.status(400).json({ error: 'You do not hold this stock' });

    const holding = user.holdings[holdingIndex];
    if (holding.quantity < quantity) return res.status(400).json({ error: `Only have ${holding.quantity} shares` });

    const priceData = await getStockPrice(symbol);
    const saleValue = +(priceData.price * quantity).toFixed(2);
    const costBasis = +(holding.avgBuyPrice * quantity).toFixed(2);
    const pnl = +(saleValue - costBasis).toFixed(2);

    // Add coins
    user.virtualCoins = +(user.virtualCoins + saleValue).toFixed(2);

    // Update holding
    if (holding.quantity === quantity) {
      user.holdings.splice(holdingIndex, 1);
    } else {
      holding.quantity -= quantity;
      holding.currentPrice = priceData.price;
      holding.currentValue = +(priceData.price * holding.quantity).toFixed(2);
      holding.pnl = +(holding.currentValue - holding.totalInvested).toFixed(2);
      holding.pnlPercent = +((holding.pnl / holding.totalInvested) * 100).toFixed(2);
    }

    // Behaviour tracking
    user.behaviour.totalTrades += 1;
    if (pnl > 0) user.behaviour.profitableTrades += 1;
    // Panic sell detection: selling when change is negative
    const priceChange = priceData.changePercent || 0;
    if (priceChange < -2 && pnl < 0) user.behaviour.panicSells += 1;

    user.transactions.push({
      type: 'sell', symbol, name: holding.name, quantity,
      price: priceData.price, totalAmount: saleValue, pnl, timestamp: new Date()
    });

    await user.save();
    res.json({ success: true, message: `✅ Sold ${quantity} shares of ${holding.name} at ₹${priceData.price}`, pnl, remainingCoins: user.virtualCoins });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
