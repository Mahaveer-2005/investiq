const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const { generateMockPrice, ALL_STOCKS } = require('../services/priceService');

router.get('/', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  const watchlist = (user.watchlist || []).map(symbol => {
    const info = ALL_STOCKS.find(s => s.symbol === symbol) || { name: symbol };
    return { ...info, ...generateMockPrice(symbol) };
  });
  res.json(watchlist);
});

router.post('/add', protect, async (req, res) => {
  const { symbol } = req.body;
  const user = await User.findById(req.user._id);
  if (!user.watchlist.includes(symbol)) { user.watchlist.push(symbol); await user.save(); }
  res.json({ watchlist: user.watchlist });
});

router.delete('/:symbol', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  user.watchlist = user.watchlist.filter(s => s !== req.params.symbol);
  await user.save();
  res.json({ watchlist: user.watchlist });
});

module.exports = router;
