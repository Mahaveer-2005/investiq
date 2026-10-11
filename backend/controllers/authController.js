const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'investiq_secret_key', {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, message: 'Please provide name, email and password' });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ success: false, message: 'Email already registered' });

    const user = await User.create({ name, email, password, virtualCoins: parseInt(process.env.INITIAL_COINS) || 100000 });
    const token = signToken(user._id);

    res.status(201).json({
      success: true,
      message: `Welcome to InvestIQ! You've received ₹1,00,000 virtual coins to start trading.`,
      token,
      user: { id: user._id, name: user.name, email: user.email, virtualCoins: user.virtualCoins, behaviourProfile: user.behaviourProfile }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Please provide email and password' });

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: 'Invalid email or password' });

    const token = signToken(user._id);
    res.json({
      success: true, token,
      user: { id: user._id, name: user.name, email: user.email, virtualCoins: user.virtualCoins, totalPortfolioValue: user.totalPortfolioValue, behaviourProfile: user.behaviourProfile }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
