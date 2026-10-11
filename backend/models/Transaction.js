const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['BUY', 'SELL'], required: true },
  assetType: { type: String, enum: ['stock', 'ipo', 'fno', 'realestate'], default: 'stock' },
  symbol: { type: String, required: true },
  name: String,
  quantity: { type: Number, required: true },
  price: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  coinsBalance: Number,
  pnl: Number,
  emotionTag: { type: String, enum: ['neutral', 'panic', 'greed', 'fomo', 'rational'] },
  marketCondition: String,
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
