const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    // Allow server-to-server calls and local tools without an Origin header.
    if (!origin || allowedOrigins.includes(origin.replace(/\/$/, ''))) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'investiq-api',
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET must be configured in production.');
  process.exit(1);
}

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

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const mongoUri = process.env.MONGODB_URI ||
    (isProduction ? '' : 'mongodb://localhost:27017/investiq');

  if (!mongoUri) {
    throw new Error('MONGODB_URI must be configured in production.');
  }

  // Do not accept API traffic until the database is ready.
  await mongoose.connect(mongoUri);
  console.log('✅ MongoDB connected to investiq database');

  // These checks report provider configuration problems but do not prevent
  // the API from starting when optional integrations are unavailable.
  require('./utils/sendEmail').verifyEmailConfig().catch((err) =>
    console.error('Email configuration check failed:', err.message)
  );
  require('./routes/payment').verifyRazorpayConfig().catch((err) =>
    console.error('Razorpay configuration check failed:', err.message)
  );
  require('./utils/groqClient').verifyGroqConfig().catch((err) =>
    console.error('Groq configuration check failed:', err.message)
  );

  const PORT = process.env.PORT || 5000;
  app.listen(PORT, '0.0.0.0', () =>
    console.log(`🚀 InvestIQ Server running on port ${PORT}`)
  );
}

startServer().catch((err) => {
  console.error('❌ InvestIQ startup failed:', err.message);
  process.exit(1);
});