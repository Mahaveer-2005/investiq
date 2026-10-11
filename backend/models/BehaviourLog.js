const mongoose = require('mongoose');

const behaviourLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: String, required: true },
  data: mongoose.Schema.Types.Mixed,
  biasDetected: [String],
  advisoryAction: String,
  reward: Number,
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BehaviourLog', behaviourLogSchema);
