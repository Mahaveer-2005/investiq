const ChatMessage = require('../models/ChatMessage');
const { chatWithAI } = require('../services/aiService');
const User = require('../models/User');

exports.sendMessage = async (req, res) => {
  try {
    const { message, context } = req.body;
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message cannot be empty' });

    const user = await User.findById(req.user._id);

    // Get recent chat history (last 10 messages)
    const chatHistory = await ChatMessage.find({ userId: req.user._id })
      .sort({ timestamp: -1 }).limit(10).lean();
    
    const formattedHistory = chatHistory.reverse().map(m => ({ role: m.role, content: m.content }));
    formattedHistory.push({ role: 'user', content: message });

    // Save user message
    await ChatMessage.create({ userId: req.user._id, role: 'user', content: message, context });

    // Get AI response
    const aiResponse = await chatWithAI(formattedHistory, {
      investorType: user.behaviourProfile?.investorType,
      virtualCoins: user.virtualCoins,
      portfolioSize: user.portfolio?.length
    });

    // Save AI response
    await ChatMessage.create({ userId: req.user._id, role: 'assistant', content: aiResponse, context });

    res.json({ success: true, data: { message: aiResponse, timestamp: new Date() } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getChatHistory = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ userId: req.user._id })
      .sort({ timestamp: 1 }).limit(50);
    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.clearHistory = async (req, res) => {
  try {
    await ChatMessage.deleteMany({ userId: req.user._id });
    res.json({ success: true, message: 'Chat history cleared' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
