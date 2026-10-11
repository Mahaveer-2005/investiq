const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  symbol: { type: String, required: true, unique: true, uppercase: true },
  name: { type: String, required: true },
  sector: String,
  industry: String,
  exchange: { type: String, enum: ['NSE', 'BSE', 'NASDAQ', 'NYSE'], default: 'NSE' },
  price: Number,
  change: Number,
  changePercent: Number,
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number,
  marketCap: Number,
  pe: Number,
  eps: Number,
  week52High: Number,
  week52Low: Number,
  description: String,
  logoUrl: String,
  lastUpdated: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Stock', stockSchema);
