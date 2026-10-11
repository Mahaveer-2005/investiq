const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getAIRecommendation, getChatResponse, analyzeBehavior } = require('../services/aiService');
const { getStockPrice } = require('../services/stockService');

router.get('/recommend/:symbol', protect, async (req, res) => {
  try {
    const { symbol } = req.params;
    const priceData = await getStockPrice(symbol);
    const recommendation = await getAIRecommendation(symbol, symbol, req.user.behaviorProfile, [priceData]);
    res.json({ success: true, data: recommendation });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/chat', protect, async (req, res) => {
  try {
    const { messages } = req.body;
    const userContext = { portfolioValue: 100000, riskTolerance: req.user.behaviorProfile?.riskTolerance };
    const result = await getChatResponse(messages, userContext);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/behavior', protect, async (req, res) => {
  try {
    const analysis = await analyzeBehavior(req.user.transactions || []);
    res.json({ success: true, data: analysis });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
