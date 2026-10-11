const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  symbols: [{ 
    symbol: String, 
    addedAt: { type: Date, default: Date.now },
    alertPrice: Number
  }]
}, { timestamps: true });

module.exports = mongoose.model('Watchlist', watchlistSchema);
