const mongoose = require('mongoose');

const tradeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbol: { type: String, required: true },
  companyName: { type: String },
  type: { type: String, enum: ['BUY', 'SELL'], required: true },
  assetClass: { type: String, enum: ['stock', 'ipo', 'futures', 'realestate', 'crypto'], default: 'stock' },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  coinsUsed: { type: Number, required: true },
  pnl: { type: Number, default: 0 },
  marketCondition: { type: String },
  behaviorFlag: { type: String, enum: ['panic_sell', 'overconfident_buy', 'herd_buy', 'rational', 'none'], default: 'none' },
  aiWarning: { type: String },
  tradeTime: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Trade', tradeSchema);
