const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const chatHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messages: [messageSchema],
  context: { type: String, default: 'general' }
}, { timestamps: true });

module.exports = mongoose.model('ChatHistory', chatHistorySchema);
