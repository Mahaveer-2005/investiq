const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'investiq_secret_key_2024';

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer '))
      return res.status(401).json({ message: 'No token. Please log in.' });

    const token = authHeader.split(' ')[1];
    if (!token)
      return res.status(401).json({ message: 'Invalid token format' });

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      if (e.name === 'TokenExpiredError')
        return res.status(401).json({ message: 'Session expired. Please log in again.' });
      return res.status(401).json({ message: 'Invalid token. Please log in again.' });
    }

    const user = await User.findById(decoded.id).select('-password');
    if (!user)
      return res.status(401).json({ message: 'User not found' });

    req.user = user;
    next();
  } catch (err) {
    console.error('AUTH MIDDLEWARE ERROR:', err.message);
    res.status(500).json({ message: 'Auth error: ' + err.message });
  }
};