const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Routes
app.use('/api/realestate', require('./routes/realestate'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/market', require('./routes/market'));
app.use('/api/behavior', require('./routes/behavior'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/screener', require('./routes/screener'));
app.use('/api/news',     require('./routes/news'));
app.use('/api/ipo', require('./routes/ipo'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/alerts',    require('./routes/alerts'));
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/stocks',    require('./routes/stocks'));
app.use('/api/portfolio', require('./routes/portfolio'));
app.use('/api/backtest', require('./routes/backtest'));
app.use('/api/tax', require('./routes/tax'));
app.use('/api/sip', require('./routes/sip'));
app.use('/api/advisor', require('./routes/advisor'));
app.use('/api/benchmark', require('./routes/benchmark'));
app.use('/api/fundamental', require('./routes/fundamental'));

// Add this line with your other routes:
app.use('/api/stock-detail', require('./routes/stockDetail'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/investiq')
  .then(() => console.log('✅ MongoDB connected to investiq database'))
  .catch(err => console.error('MongoDB error:', err));

// Verify email (Gmail) credentials at startup — fails loudly here instead of
// silently on a real user's first registration attempt.
require('./utils/sendEmail').verifyEmailConfig();

// Verify Razorpay credentials at startup — same reasoning.
require('./routes/payment').verifyRazorpayConfig();

// Verify Groq (free AI) credentials at startup — same reasoning.
require('./utils/groqClient').verifyGroqConfig();

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 InvestIQ Server running on port ${PORT}`));