const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');

router.put('/profile', protect, async (req, res) => {
  try {
    const { name, riskProfile } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { name, riskProfile }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/stats', protect, async (req, res) => {
  const user = await User.findById(req.user._id);
  res.json({ virtualCoins: user.virtualCoins, behaviorProfile: user.behaviorProfile, riskProfile: user.riskProfile });
});

module.exports = router;
