const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema({
  symbol: { type: String, required: true },
  companyName: { type: String },
  assetClass: { type: String, default: 'stock' },
  quantity: { type: Number, required: true, default: 0 },
  avgBuyPrice: { type: Number, required: true },
  currentPrice: { type: Number },
  investedAmount: { type: Number },
  currentValue: { type: Number },
  pnl: { type: Number, default: 0 },
  pnlPercent: { type: Number, default: 0 },
  sector: { type: String }
});

const portfolioSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  holdings: [holdingSchema],
  totalInvested: { type: Number, default: 0 },
  currentValue: { type: Number, default: 0 },
  totalPnl: { type: Number, default: 0 },
  totalPnlPercent: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Portfolio', portfolioSchema);
