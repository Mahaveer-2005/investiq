const axios = require('axios');
const cache = require('../config/cache');

async function getAIRecommendation(stockSymbol, stockName, userProfile, priceHistory) {
  const cacheKey = `ai_rec_${stockSymbol}_${userProfile?.riskTolerance || 'moderate'}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const prompt = `You are InvestIQ AI, an expert Indian stock market advisor.

Stock: ${stockName} (${stockSymbol})
Current Market Data: ${JSON.stringify(priceHistory?.slice(-5) || [])}
User Risk Profile: ${userProfile?.riskTolerance || 'moderate'}
User Investor Type: ${userProfile?.investorType || 'unknown'}

Provide a concise analysis with:
1. BUY/SELL/HOLD recommendation
2. Estimated return in 1 week, 1 month, 3 months (percentage)
3. Key reasons (2-3 points)
4. Risk level (Low/Medium/High)
5. One behavioral bias warning for this investor type

Respond in JSON format:
{
  "recommendation": "BUY|SELL|HOLD",
  "confidence": 75,
  "returns": { "1week": 2.5, "1month": 5.0, "3months": 12.0 },
  "reasons": ["reason1", "reason2", "reason3"],
  "riskLevel": "Medium",
  "biasWarning": "warning message",
  "summary": "brief 2-line summary"
}`;

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }]
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });

    const text = response.data.content[0].text;
    const clean = text.replace(/```json|```/g, '').trim();
    const result = JSON.parse(clean);
    cache.set(cacheKey, result, 3600); // 1 hour cache for AI recommendations
    return result;
  } catch (err) {
    // Fallback mock recommendation
    const mock = {
      recommendation: ['BUY', 'HOLD', 'SELL'][Math.floor(Math.random() * 3)],
      confidence: 60 + Math.floor(Math.random() * 30),
      returns: { '1week': parseFloat((Math.random() * 4 - 1).toFixed(1)), '1month': parseFloat((Math.random() * 8 - 2).toFixed(1)), '3months': parseFloat((Math.random() * 20 - 5).toFixed(1)) },
      reasons: ['Strong fundamentals', 'Good sector performance', 'Technical breakout possible'],
      riskLevel: 'Medium',
      biasWarning: 'Watch out for recency bias — past performance does not guarantee future results.',
      summary: `${stockName} shows mixed signals. Consider your risk tolerance before investing.`
    };
    return mock;
  }
}

async function getChatResponse(messages, userContext) {
  const systemPrompt = `You are InvestIQ AI assistant — a smart, friendly Indian stock market advisor.
You help users understand stocks, mutual funds, IPOs, F&O, and real estate investments.
User's virtual portfolio value: ₹${userContext?.portfolioValue || 100000}
User's risk profile: ${userContext?.riskTolerance || 'moderate'}
Keep responses concise (under 150 words), use ₹ symbol, reference Indian markets (NSE/BSE).
Format numbers clearly. Be encouraging but realistic about risks.`;

  try {
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: messages
    }, {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      }
    });
    return { response: response.data.content[0].text, success: true };
  } catch (err) {
    return {
      response: "I'm having trouble connecting to AI services right now. For quick help: diversify your portfolio, never invest more than you can afford to lose, and keep an emergency fund of 6 months expenses before investing.",
      success: false
    };
  }
}

async function analyzeBehavior(transactions) {
  if (!transactions || transactions.length < 3) {
    return { investorType: 'unknown', biases: {}, score: 50 };
  }

  // Simple ML-like behavioral analysis
  let panicSells = 0, largeTradesAfterProfit = 0, herdBuys = 0, lossHolding = 0;
  let totalTrades = transactions.length;

  transactions.forEach((t, i) => {
    if (t.type === 'sell' && t.profit < -500) panicSells++;
    if (t.type === 'buy' && i > 0 && transactions[i-1].profit > 1000) largeTradesAfterProfit++;
    if (t.total > 10000 && t.type === 'buy') herdBuys++;
  });

  const scores = {
    lossAversion: Math.min(100, (lossHolding / totalTrades) * 100),
    panicSelling: Math.min(100, (panicSells / totalTrades) * 100),
    overconfidence: Math.min(100, (largeTradesAfterProfit / totalTrades) * 100),
    herdBehavior: Math.min(100, (herdBuys / totalTrades) * 100),
  };

  let investorType = 'rational';
  if (scores.panicSelling > 40) investorType = 'impulsive';
  else if (scores.lossAversion > 50) investorType = 'conservative';

  return { investorType, biases: scores, score: 100 - Object.values(scores).reduce((a, b) => a + b, 0) / 4 };
}

module.exports = { getAIRecommendation, getChatResponse, analyzeBehavior };
