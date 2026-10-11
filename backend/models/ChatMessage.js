const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
  context: String // stock/ipo/market context
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
