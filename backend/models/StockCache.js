const mongoose = require('mongoose');

const stockCacheSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true, index: true },
  name: { type: String },
  exchange: { type: String },
  sector: { type: String },
  industry: { type: String },
  price: { type: Number },
  open: { type: Number },
  high: { type: Number },
  low: { type: Number },
  close: { type: Number },
  previousClose: { type: Number },
  change: { type: Number },
  changePercent: { type: Number },
  volume: { type: Number },
  avgVolume: { type: Number },
  marketCap: { type: Number },
  pe: { type: Number },
  eps: { type: Number },
  week52High: { type: Number },
  week52Low: { type: Number },
  dividendYield: { type: Number },
  beta: { type: Number },
  logoUrl: { type: String },
  description: { type: String },
  website: { type: String },
  // Intraday data
  intradayData: [{
    time: String,
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    volume: Number
  }],
  // Historical data (daily, last 1 year)
  historicalData: [{
    date: String,
    open: Number,
    high: Number,
    low: Number,
    close: Number,
    volume: Number
  }],
  cachedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date }
}, { timestamps: true });

// Auto expire cache after 2 hours
stockCacheSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('StockCache', stockCacheSchema);
