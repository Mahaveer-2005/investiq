const mongoose = require('mongoose');

const ipoSchema = new mongoose.Schema({
  companyName: { type: String, required: true },
  symbol: String,
  issuePrice: { type: Number, required: true },
  issuePriceHigh: Number,
  issuePriceLow: Number,
  lotSize: Number,
  issueSize: String,
  openDate: Date,
  closeDate: Date,
  listingDate: Date,
  listingPrice: Number,
  currentPrice: Number,
  status: { type: String, enum: ['upcoming', 'open', 'closed', 'listed'], default: 'upcoming' },
  exchange: { type: String, default: 'NSE/BSE' },
  sector: String,
  description: String,
  logoUrl: String,
  imageUrl: String,
  subscriptionRate: Number,
  gmpPrice: Number,
  registrar: String,
  leadManagers: [String],
  rating: Number,
  recommendation: { type: String, enum: ['subscribe', 'avoid', 'neutral'] },
  financials: {
    revenue: Number,
    profit: Number,
    eps: Number,
    debtEquity: Number
  }
}, { timestamps: true });

module.exports = mongoose.model('IPO', ipoSchema);
