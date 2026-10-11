const router = require('express').Router();
const axios  = require('axios');
const auth   = require('../middleware/auth');
const User   = require('../models/User');

const ANTHROPIC_API = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || '';

// ── Stock knowledge base ──────────────────────────────────────────────────
const MARKET_KNOWLEDGE = `
You are InvestIQ's expert AI financial advisor named "IQ Bot". You have deep knowledge of:

INDIAN STOCK MARKET:
- NSE (National Stock Exchange) and BSE (Bombay Stock Exchange)
- NIFTY 50, NIFTY NEXT 50, SENSEX, BANK NIFTY, MIDCAP, SMALLCAP indices
- SEBI regulations, circuit breakers, T+1 settlement
- F&O (Futures & Options) — lot sizes, expiry, Greeks (Delta, Gamma, Theta, Vega)
- IPO process — ASBA, GMP (Grey Market Premium), allotment, listing gains
- Mutual Funds — SIP, NAV, AUM, expense ratio, ELSS, debt vs equity funds
- Technical Analysis — RSI, MACD, Bollinger Bands, moving averages, candlestick patterns
- Fundamental Analysis — P/E, P/B, EPS, EBITDA, debt-to-equity, ROE, ROCE
- Sectors — IT, Banking, Pharma, FMCG, Auto, Infra, Energy, Metals, Real Estate
- Key companies — Reliance, TCS, HDFC Bank, Infosys, ICICI Bank, Wipro, etc.

BEHAVIORAL FINANCE:
- Loss aversion, panic selling, herd behavior, overconfidence, recency bias
- Disposition effect, anchoring, confirmation bias, mental accounting
- How to overcome psychological biases in investing

INVESTMENT STRATEGIES:
- Value investing (Warren Buffett style), growth investing, momentum investing
- SIP vs lumpsum, rupee cost averaging, portfolio rebalancing
- Risk management — stop loss, position sizing, diversification
- Long-term vs short-term investing, tax implications (STCG, LTCG)

GLOBAL MARKETS:
- US markets — NYSE, NASDAQ, S&P 500, Dow Jones
- Fed rate decisions, inflation impact on markets
- FII/DII flows impact on Indian markets
- Currency impact (USD/INR) on stock prices

PLATFORM FEATURES:
- Virtual trading with ₹1,00,000 starting coins
- Real-time stock prices from Yahoo Finance / BSE / NSE
- Portfolio tracking with live P&L
- Behavioral analysis with ML bias detection
- IPO investments and Real Estate simulation

RESPONSE RULES:
1. Always give specific, actionable advice
2. Use INR (₹) for Indian stocks
3. Cite real data when possible (P/E ratios, sector performance)
4. For buy/sell decisions — analyze fundamentals + technicals + sentiment
5. Warn about risks clearly
6. Keep responses concise but complete
7. Use emojis to make responses engaging
8. For platform questions — guide users to the right section
9. Never give guaranteed returns — always mention risk
10. Speak like a knowledgeable friend, not a textbook
`;

// ── Conversation memory (in-memory per user session) ─────────────────────
const conversationHistory = new Map();

function getHistory(userId) {
  if (!conversationHistory.has(userId)) {
    conversationHistory.set(userId, []);
  }
  return conversationHistory.get(userId);
}

function addToHistory(userId, role, content) {
  const history = getHistory(userId);
  history.push({ role, content });
  // Keep last 20 messages only
  if (history.length > 20) history.splice(0, history.length - 20);
}

// ── Build context from user's portfolio ───────────────────────────────────
function buildUserContext(user) {
  if (!user) return '';
  const portfolio = user.portfolio || [];
  const txCount   = (user.transactions || []).length;
  const coins     = user.virtualCoins || 0;

  let ctx = `\nCURRENT USER CONTEXT:\n`;
  ctx += `- Virtual Coins Available: ₹${coins.toLocaleString('en-IN')}\n`;
  ctx += `- Total Trades Made: ${txCount}\n`;
  ctx += `- Risk Profile: ${user.riskProfile || 'moderate'}\n`;
  ctx += `- Decision Score: ${user.behaviorMetrics?.decisionScore || 'N/A'}/100\n`;

  if (portfolio.length > 0) {
    ctx += `- Current Holdings:\n`;
    portfolio.forEach(item => {
      const pnl = item.currentPrice
        ? ((item.currentPrice - item.buyPrice) / item.buyPrice * 100).toFixed(1)
        : '0';
      ctx += `  • ${item.name} (${item.symbol?.replace('.BSE','')}): ${item.quantity} shares @ ₹${item.buyPrice} | P&L: ${pnl}%\n`;
    });
  } else {
    ctx += `- No current holdings\n`;
  }

  if (user.behaviorMetrics) {
    const m = user.behaviorMetrics;
    if (m.panicSellCount > 0)    ctx += `- ⚠️ Behavioral Alert: Panic selling detected (${m.panicSellCount} times)\n`;
    if (m.decisionScore < 40)    ctx += `- ⚠️ Low decision score — needs improvement\n`;
  }

  return ctx;
}

// ── Preset quick responses (no API needed) ────────────────────────────────
const QUICK_RESPONSES = {
  greet: ['hi','hello','hey','namaste','good morning','good evening','good afternoon'],
  help:  ['help','what can you do','features','commands'],
  coins: ['my coins','my balance','how many coins','virtual coins'],
};

function checkQuickResponse(msg, user) {
  const m = msg.toLowerCase().trim();

  if (QUICK_RESPONSES.greet.some(g => m.includes(g))) {
    return `👋 Hello${user?.name ? `, **${user.name}**` : ''}! I'm **IQ Bot**, your AI financial advisor.

I can help you with:
📈 **Stock Analysis** — "Analyse Reliance" or "Should I buy TCS?"
🧠 **Behavioral Coaching** — "Why do I keep losing money?"
📊 **Market Insights** — "How is NIFTY performing?"
💰 **Investment Strategy** — "Best stocks for long term?"
🔮 **IPO Guidance** — "Tell me about upcoming IPOs"
📚 **Financial Education** — "Explain P/E ratio"

You have **₹${(user?.virtualCoins || 100000).toLocaleString('en-IN')}** to invest. What would you like to know?`;
  }

  if (QUICK_RESPONSES.coins.some(g => m.includes(g))) {
    return `🪙 Your current balance: **₹${(user?.virtualCoins || 0).toLocaleString('en-IN')}**\n\nYou have ${user?.portfolio?.length || 0} active holdings. Head to [Portfolio](/portfolio) to see your full breakdown.`;
  }

  return null;
}

// ── Main POST /api/chat ───────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { message, clearHistory } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: 'Message is required' });

    const userId = req.user._id.toString();
    const user   = await User.findById(userId);

    // Clear history if requested
    if (clearHistory) conversationHistory.delete(userId);

    // Check quick responses first (no API needed)
    const quick = checkQuickResponse(message, user);
    if (quick) {
      addToHistory(userId, 'user',      message);
      addToHistory(userId, 'assistant', quick);
      return res.json({ reply: quick, source: 'local', tokensUsed: 0 });
    }

    // Build full context
    const userContext   = buildUserContext(user);
    const systemPrompt  = MARKET_KNOWLEDGE + userContext;
    const history       = getHistory(userId);

    // Add current message to history
    addToHistory(userId, 'user', message);

    // Build messages array for API
    const messages = history.map(h => ({ role: h.role, content: h.content }));

    let reply = '';
    let source = 'fallback';
    let tokensUsed = 0;

    // ── Try Anthropic Claude API ──────────────────────────────────────────
    if (ANTHROPIC_KEY && ANTHROPIC_KEY !== 'your_key_here') {
      try {
        const response = await axios.post(ANTHROPIC_API, {
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system:     systemPrompt,
          messages,
        }, {
          headers: {
            'x-api-key':         ANTHROPIC_KEY,
            'anthropic-version': '2023-06-01',
            'content-type':      'application/json',
          },
          timeout: 15000,
        });

        reply      = response.data.content[0]?.text || '';
        tokensUsed = response.data.usage?.output_tokens || 0;
        source     = 'claude';
      } catch (apiErr) {
        console.log('Claude API error:', apiErr.response?.data?.error?.message || apiErr.message);
      }
    }

    // ── Fallback: Smart rule-based responses ──────────────────────────────
    if (!reply) {
      reply = generateSmartReply(message, user);
      source = 'smart-fallback';
    }

    // Save assistant reply to history
    addToHistory(userId, 'assistant', reply);

    res.json({ reply, source, tokensUsed });
  } catch (err) {
    console.error('CHAT ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/chat/history ─────────────────────────────────────────────────
router.get('/history', auth, (req, res) => {
  const userId  = req.user._id.toString();
  const history = getHistory(userId);
  res.json({ history, count: history.length });
});

// ── DELETE /api/chat/history ──────────────────────────────────────────────
router.delete('/history', auth, (req, res) => {
  const userId = req.user._id.toString();
  conversationHistory.delete(userId);
  res.json({ success: true });
});

// ── Smart Fallback Engine ─────────────────────────────────────────────────
function generateSmartReply(message, user) {
  const m = message.toLowerCase();

  // Stock analysis
  const stockKeywords = ['reliance','tcs','hdfc','infosys','icici','wipro','sbi','airtel','bajaj','kotak','nifty','sensex','bank nifty'];
  const matchedStock  = stockKeywords.find(s => m.includes(s));

  if ((m.includes('buy') || m.includes('invest') || m.includes('should i')) && matchedStock) {
    return `📊 **${matchedStock.toUpperCase()} Analysis**

**Before buying, check these:**

🔍 **Fundamental Check:**
- P/E Ratio: Compare with sector average (IT sector avg ~25-30x)
- Revenue growth: Look for consistent 10%+ YoY growth
- Debt levels: Prefer debt-to-equity < 1
- ROE: Look for > 15% consistently

📈 **Technical Check:**
- Is it above 200-day moving average? (Bullish if yes)
- RSI between 40-60 = healthy zone, >70 = overbought
- Check recent support/resistance levels

⚡ **Current Sentiment:**
- Check FII/DII activity (FII buying = positive signal)
- Upcoming quarterly results can move stock ±10%
- Sector tailwinds/headwinds matter

💡 **My Suggestion:**
With ₹${(user?.virtualCoins || 0).toLocaleString('en-IN')} available, consider starting with 1-2 shares to test. Never put more than 15% in one stock.

Go to [Stocks](/stocks) to see live price and trade! 🚀`;
  }

  if (m.includes('nifty') || m.includes('sensex') || m.includes('market today') || m.includes('market')) {
    return `📊 **Indian Market Overview**

**Key Indices:**
- 🔵 NIFTY 50: Tracks top 50 NSE companies
- 🟣 SENSEX: Tracks top 30 BSE companies
- 🏦 BANK NIFTY: Banking sector index (most volatile)

**Market Hours (IST):**
- Pre-open: 9:00 AM - 9:15 AM
- Regular: 9:15 AM - 3:30 PM
- Post-close: 3:40 PM - 4:00 PM

**What Moves the Market:**
- 🌍 Global cues (US markets, crude oil, dollar index)
- 📊 FII/DII activity
- 🏛️ RBI monetary policy
- 📈 Quarterly earnings season
- 🗳️ Political events & budget

Check live index data on your [Dashboard](/dashboard)! 📈`;
  }

  if (m.includes('ipo')) {
    return `🚀 **IPO Guide for Indian Markets**

**What is an IPO?**
Initial Public Offering — when a private company sells shares to the public for the first time.

**How to Evaluate an IPO:**
1. 📊 **GMP (Grey Market Premium)** — higher GMP = more demand
2. 💰 **Valuation** — is P/E reasonable vs listed peers?
3. 🏢 **Business fundamentals** — profitable? growing revenue?
4. 👤 **Promoter holding** — higher = more confidence
5. 📋 **Use of funds** — expansion vs debt repayment?

**InvestIQ IPO Section:**
Go to [IPO](/ipo) to invest in upcoming IPOs with your virtual coins!

**Pro Tip:** Apply through ASBA — no money blocked unless allotted! 💡`;
  }

  if (m.includes('mutual fund') || m.includes('sip') || m.includes('mf')) {
    return `💰 **Mutual Funds & SIP Guide**

**SIP vs Lumpsum:**
- 📅 **SIP**: Fixed monthly investment, averages out market volatility (Rupee Cost Averaging)
- 💵 **Lumpsum**: Invest all at once, better when market is low

**Fund Categories:**
- 🚀 **Large Cap**: Stable, lower risk (Nifty 50 stocks)
- ⚡ **Mid Cap**: Higher growth potential, more volatile
- 🎯 **Small Cap**: Highest risk/reward, long-term only
- 🛡️ **Debt Funds**: Low risk, better than FD for 3+ years
- 💎 **ELSS**: Tax saving under 80C, 3-year lock-in

**Key Metrics to Compare:**
- Expense Ratio: Lower is better (< 1% for index funds)
- Sharpe Ratio: Higher = better risk-adjusted return
- Alpha: Positive = beating benchmark

**Best for Beginners:** Index funds (Nifty 50 ETF) — low cost, market returns! 📊`;
  }

  if (m.includes('pe') || m.includes('p/e') || m.includes('ratio') || m.includes('fundamental')) {
    return `📚 **Key Financial Ratios Explained**

**Valuation Ratios:**
- 📊 **P/E Ratio** = Price ÷ EPS. Lower = cheaper. Compare within same sector.
  - IT sector avg: 25-35x | Banking: 12-20x | FMCG: 40-60x
- 📈 **P/B Ratio** = Price ÷ Book Value. Banks: prefer < 3x
- 🎯 **PEG Ratio** = P/E ÷ Growth Rate. < 1 = undervalued

**Profitability Ratios:**
- 💰 **ROE** (Return on Equity): > 15% is good, > 20% is excellent
- 🏭 **ROCE** (Return on Capital Employed): > 15% preferred
- 📉 **EBITDA Margin**: Higher = more efficient operations

**Debt Ratios:**
- ⚖️ **Debt/Equity**: < 1 is safe, > 2 is risky (except Banks/NBFCs)
- 💵 **Interest Coverage**: > 3x means comfortable debt servicing

**Quick Screen:** High ROE + Low P/E + Low Debt = Value Buy! 🎯`;
  }

  if (m.includes('technical') || m.includes('rsi') || m.includes('macd') || m.includes('chart')) {
    return `📈 **Technical Analysis Guide**

**Key Indicators:**

🔴 **RSI (Relative Strength Index):**
- < 30 = Oversold (potential buy signal)
- > 70 = Overbought (potential sell signal)
- 40-60 = Healthy trend zone

📊 **MACD (Moving Average Convergence Divergence):**
- MACD line crosses above signal line = Bullish
- MACD line crosses below signal line = Bearish
- Histogram shows momentum strength

📉 **Moving Averages:**
- 50 DMA & 200 DMA are key levels
- Price above 200 DMA = Long-term uptrend
- 50 DMA crossing above 200 DMA = "Golden Cross" (very bullish!)

🕯️ **Key Candlestick Patterns:**
- Hammer / Doji = Reversal signal
- Engulfing pattern = Strong reversal
- Shooting Star = Bearish reversal at top

💡 **Pro Tip:** Never use just one indicator. Combine RSI + MACD + Volume for confirmation! 🎯`;
  }

  if (m.includes('option') || m.includes('future') || m.includes('f&o') || m.includes('derivative')) {
    return `⚡ **F&O (Futures & Options) Guide**

**Futures:**
- Obligation to buy/sell at future date & price
- Lot sizes: NIFTY = 50, BANKNIFTY = 15
- Expiry: Last Thursday of every month
- Used for: Hedging, speculation, arbitrage

**Options:**
- **Call Option (CE)**: Right to BUY — profit when price rises
- **Put Option (PE)**: Right to SELL — profit when price falls
- Premium = time value + intrinsic value

**Option Greeks:**
- 🔺 **Delta**: How much option moves per ₹1 stock move (0 to 1)
- ⚡ **Gamma**: Rate of change of Delta
- ⏰ **Theta**: Time decay — options lose value daily!
- 📊 **Vega**: Sensitivity to volatility changes

**⚠️ Risk Warning:**
F&O can wipe out capital fast. 90% of retail traders lose in F&O.
Start with paper trading on InvestIQ before real F&O! 🛡️`;
  }

  if (m.includes('tax') || m.includes('stcg') || m.includes('ltcg') || m.includes('capital gain')) {
    return `🏛️ **Stock Market Taxation in India**

**Capital Gains Tax:**

📅 **Short Term Capital Gain (STCG):**
- Holding period: < 1 year
- Tax rate: **15%** (flat)
- Applies to: Equity shares, Equity MFs

📆 **Long Term Capital Gain (LTCG):**
- Holding period: > 1 year
- Tax rate: **10%** above ₹1 lakh profit per year
- First ₹1 lakh LTCG = TAX FREE!

💡 **Tax Saving Tips:**
1. **Harvesting**: Book ₹1L profit each year to use LTCG exemption
2. **ELSS Funds**: 80C deduction up to ₹1.5L
3. **Hold > 1 year**: Save 5% tax on equity gains
4. **Set-off losses**: Short-term losses can offset STCG

**F&O Tax:**
- Treated as business income (not capital gains)
- 30% tax slab + audit required if turnover > ₹1Cr

💰 Long-term investing is the most tax-efficient strategy! 🎯`;
  }

  if (m.includes('portfolio') || m.includes('holding') || m.includes('my stock')) {
    const holdings = user?.portfolio || [];
    if (holdings.length === 0) {
      return `📭 **Your Portfolio is Empty**

You haven't invested yet! Here's how to start:

1. 🏦 Go to [Stocks](/stocks) — browse 500+ Indian stocks
2. 🔍 Search for a stock you believe in
3. 💰 Click **Trade** and buy shares
4. 📊 Track P&L in [Portfolio](/portfolio)

**Suggested Starter Portfolio (₹1L):**
- 30% → Large Cap (HDFC Bank / Reliance)
- 25% → IT (TCS / Infosys)
- 20% → Pharma (Sun Pharma / Cipla)
- 15% → FMCG (HUL / ITC)
- 10% → Keep as cash buffer

You have ₹${(user?.virtualCoins || 100000).toLocaleString('en-IN')} ready to invest! 🚀`;
    }
    return `💼 **Your Portfolio Summary**

You hold **${holdings.length} stocks**. Head to [Portfolio](/portfolio) for detailed P&L analysis.

**Quick Tips for Your Portfolio:**
- ✅ Rebalance if any stock > 20% of total value
- ✅ Review fundamentals every quarter
- ✅ Don't panic on 5-10% dips — it's normal
- ✅ Check your [Behavioral Analysis](/behavior) for bias detection

Need analysis on a specific stock you hold? Just ask! 📊`;
  }

  if (m.includes('bias') || m.includes('panic') || m.includes('psychology') || m.includes('emotion')) {
    return `🧠 **Trading Psychology & Behavioral Finance**

**Most Common Investor Mistakes:**

😱 **Panic Selling**: Selling at bottom due to fear
- Fix: Set stop-loss before buying, not after falling

😰 **Loss Aversion**: Holding losers, selling winners too fast
- Fix: Use "Would I buy this today?" rule for every holding

🦁 **Overconfidence**: Betting too big on one stock
- Fix: Max 15% in any single position

🐑 **Herd Behavior**: Buying what's trending on social media
- Fix: Research before you buy, not after

📅 **Recency Bias**: Making decisions based on last week's news
- Fix: Zoom out to 3-5 year charts before deciding

⚡ **Overtrading**: Too many trades = too many fees + mistakes
- Fix: Set a rule: max 3 new trades per week

**Check Your Behavioral Score:**
Go to [Behavior](/behavior) for your personalized ML analysis! 🤖`;
  }

  if (m.includes('beginner') || m.includes('start') || m.includes('new') || m.includes('learn')) {
    return `📚 **Beginner's Guide to Stock Investing**

**Step 1: Learn the Basics**
- What is a share? Ownership in a company
- Stock exchange: BSE & NSE in India
- How prices move: Demand vs Supply

**Step 2: Understand Risk**
- Never invest money you can't afford to lose
- Diversify across sectors (don't put all eggs in one basket)
- Start small, learn, then scale

**Step 3: Research Before Buying**
- Read the company's annual report
- Check P/E, ROE, Revenue growth
- Understand the business model

**Step 4: Start with Blue Chips**
Best starter stocks for beginners:
- 🏦 HDFC Bank (Banking leader)
- 💻 Infosys (IT bellwether)
- 🏭 Hindustan Unilever (FMCG stable)
- ⚡ NTPC (Utility, dividend paying)

**Step 5: Practice Here First!**
You have ₹${(user?.virtualCoins || 100000).toLocaleString('en-IN')} virtual coins — use InvestIQ to practice risk-free!

Go to [Stocks](/stocks) and make your first trade! 🚀`;
  }

  if (m.includes('thank') || m.includes('thanks') || m.includes('good') || m.includes('great')) {
    return `😊 You're welcome! Happy to help you on your investment journey.

Remember: **The best investment is in your financial education!** 📚

Any other questions about stocks, markets, or your portfolio? I'm here 24/7! 🤖💡`;
  }

  // Default intelligent response
  return `🤖 **IQ Bot** here! I can help you with:

| Topic | Example Question |
|-------|-----------------|
| 📈 Stock Analysis | "Should I buy Reliance?" |
| 📊 Market Update | "How is NIFTY today?" |
| 🧠 Behavioral Tips | "Why do I keep losing?" |
| 💰 Investment Strategy | "Best stocks for 2025?" |
| 📚 Financial Education | "Explain P/E ratio" |
| 🚀 IPO Guide | "Tell me about upcoming IPOs" |
| ⚡ F&O Basics | "How do options work?" |
| 🏛️ Tax Queries | "What is LTCG tax?" |

**Your question:** "${message}"

Could you be more specific? For example:
- "Analyse TCS stock"
- "Should I invest in banking sector?"
- "How to diversify my portfolio?"

I'll give you a detailed answer! 💡`;
}

module.exports = router;