const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

router.get('/', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  const transactions = await Transaction.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(20);
  res.json({ virtualCoins: user.virtualCoins, transactions });
});

router.post('/reset', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { virtualCoins: 100000 });
    res.json({ message: 'Wallet reset to ₹1,00,000 virtual coins', virtualCoins: 100000 });
  } catch (e) { res.status(500).json({ message: e.message }); }
});

module.exports = router;
