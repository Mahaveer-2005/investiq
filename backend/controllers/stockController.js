const { INDIAN_STOCKS, getStockPrice, getMarketIndices, BASE_PRICES, generateMockPrice } = require('../services/stockService');
const { detectBiases, classifyInvestorType, getRLAdvisory, generateAIRecommendations } = require('../services/aiService');
const User = require('../models/User');

exports.getAllStocks = async (req, res) => {
  try {
    const { page = 1, limit = 50, sector, search } = req.query;
    let stocks = INDIAN_STOCKS;

    if (sector) stocks = stocks.filter(s => s.sector?.toLowerCase() === sector.toLowerCase());
    if (search) stocks = stocks.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.symbol.toLowerCase().includes(search.toLowerCase()));

    const startIdx = (page - 1) * limit;
    const paginated = stocks.slice(startIdx, startIdx + parseInt(limit));

    // Fetch prices for paginated stocks
    const stocksWithPrices = await Promise.all(paginated.map(async (stock) => {
      const priceData = await getStockPrice(stock.symbol);
      const basePrice = BASE_PRICES[stock.symbol] || 1000;
      return {
        ...stock,
        ...priceData,
        marketCap: (priceData.price || basePrice) * (Math.random() * 500000000 + 100000000),
        high52w: (priceData.price || basePrice) * (1 + Math.random() * 0.5),
        low52w: (priceData.price || basePrice) * (1 - Math.random() * 0.3),
        pe: parseFloat((15 + Math.random() * 35).toFixed(1)),
        logo: `https://logo.clearbit.com/${stock.name.toLowerCase().replace(/\s+/g, '').replace(/[^a-z]/g, '')}.com`,
        imageUrl: `https://source.unsplash.com/300x200/?${encodeURIComponent(stock.sector + ' business')}`
      };
    }));

    res.json({
      success: true,
      data: stocksWithPrices,
      pagination: {
        total: stocks.length, page: parseInt(page),
        limit: parseInt(limit), pages: Math.ceil(stocks.length / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStockDetail = async (req, res) => {
  try {
    const { symbol } = req.params;
    const stock = INDIAN_STOCKS.find(s => s.symbol === symbol);
    if (!stock) return res.status(404).json({ success: false, message: 'Stock not found' });

    const priceData = await getStockPrice(symbol);
    const basePrice = BASE_PRICES[symbol] || 1000;

    // Generate chart data (30 days)
    const chartData = [];
    let price = basePrice;
    for (let i = 30; i >= 0; i--) {
      price = price * (1 + (Math.random() - 0.48) * 0.03);
      const date = new Date();
      date.setDate(date.getDate() - i);
      chartData.push({ date: date.toISOString().split('T')[0], price: parseFloat(price.toFixed(2)), volume: Math.floor(Math.random() * 5000000) });
    }

    res.json({
      success: true,
      data: {
        ...stock,
        ...priceData,
        marketCap: (priceData.price || basePrice) * (Math.random() * 500000000 + 100000000),
        high52w: (priceData.price || basePrice) * 1.35,
        low52w: (priceData.price || basePrice) * 0.72,
        pe: parseFloat((15 + Math.random() * 35).toFixed(1)),
        eps: parseFloat(((priceData.price || basePrice) / 25).toFixed(2)),
        dividendYield: parseFloat((Math.random() * 3).toFixed(2)),
        beta: parseFloat((0.5 + Math.random() * 1.2).toFixed(2)),
        description: `${stock.name} is a leading company in the ${stock.sector} sector listed on NSE/BSE.`,
        chartData
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMarketIndices = async (req, res) => {
  try {
    const indices = await getMarketIndices();
    res.json({ success: true, data: indices });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTopGainersLosers = async (req, res) => {
  try {
    const sampleStocks = INDIAN_STOCKS.slice(0, 30);
    const withPrices = sampleStocks.map(s => {
      const base = BASE_PRICES[s.symbol] || 1000;
      const cp = generateMockPrice(base);
      return { ...s, ...cp };
    });

    const gainers = [...withPrices].sort((a, b) => b.changePercent - a.changePercent).slice(0, 5);
    const losers = [...withPrices].sort((a, b) => a.changePercent - b.changePercent).slice(0, 5);

    res.json({ success: true, data: { gainers, losers } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.executeTrade = async (req, res) => {
  try {
    const { symbol, name, type, quantity, price, category = 'stock' } = req.body;
    const user = await User.findById(req.user._id);

    if (!symbol || !type || !quantity || !price)
      return res.status(400).json({ success: false, message: 'Missing required fields' });

    const totalAmount = price * quantity;

    // Check for biases
    const biasDetected = detectBiases({ type, priceChange: req.body.priceChange || 0, amount: totalAmount, holdingDays: req.body.holdingDays || 0 }, user.portfolio, { recentProfitStreak: 0, tradesToday: user.tradeHistory?.filter(t => new Date(t.timestamp).toDateString() === new Date().toDateString()).length || 0 });

    // Get RL advisory
    const advisories = getRLAdvisory({
      investorType: user.behaviourProfile.investorType,
      riskScore: user.behaviourProfile.riskScore,
      biasDetected,
      tradeType: type,
      priceChange: req.body.priceChange || 0,
      portfolioDiversity: user.portfolio?.length || 0
    });

    if (type === 'BUY') {
      if (user.virtualCoins < totalAmount)
        return res.status(400).json({ success: false, message: 'Insufficient virtual coins' });

      user.virtualCoins -= totalAmount;
      user.totalInvested += totalAmount;

      const existingItem = user.portfolio.find(p => p.symbol === symbol);
      if (existingItem) {
        const totalQty = existingItem.quantity + quantity;
        existingItem.avgBuyPrice = ((existingItem.avgBuyPrice * existingItem.quantity) + (price * quantity)) / totalQty;
        existingItem.quantity = totalQty;
        existingItem.totalInvested += totalAmount;
      } else {
        user.portfolio.push({ symbol, name, category, quantity, avgBuyPrice: price, currentPrice: price, totalInvested: totalAmount, currentValue: totalAmount, profitLoss: 0, profitLossPercent: 0 });
      }
    } else if (type === 'SELL') {
      const portfolioItem = user.portfolio.find(p => p.symbol === symbol);
      if (!portfolioItem || portfolioItem.quantity < quantity)
        return res.status(400).json({ success: false, message: 'Insufficient holdings' });

      const profitLoss = (price - portfolioItem.avgBuyPrice) * quantity;
      user.virtualCoins += totalAmount;
      user.realizedPnL += profitLoss;

      portfolioItem.quantity -= quantity;
      if (portfolioItem.quantity === 0)
        user.portfolio = user.portfolio.filter(p => p.symbol !== symbol);
    }

    // Record trade history
    user.tradeHistory.push({ symbol, name, type, quantity, price, totalAmount, category, biasDetected, profitLoss: type === 'SELL' ? (price - (user.portfolio.find(p => p.symbol === symbol)?.avgBuyPrice || price)) * quantity : 0 });

    // Update behaviour profile
    user.behaviourProfile.totalTrades += 1;
    if (biasDetected.includes('panic_selling')) user.behaviourProfile.panicSellCount += 1;
    if (biasDetected.includes('overconfidence')) user.behaviourProfile.overconfidenceCount += 1;
    if (biasDetected.includes('loss_aversion')) user.behaviourProfile.lossAversionCount += 1;
    if (biasDetected.includes('herd_behaviour')) user.behaviourProfile.herdBehaviourCount += 1;
    user.behaviourProfile.investorType = classifyInvestorType(user.behaviourProfile);
    user.behaviourProfile.lastUpdated = new Date();

    await user.save();

    res.json({
      success: true,
      message: `${type} order executed successfully!`,
      data: { trade: { symbol, name, type, quantity, price, totalAmount }, biasDetected, advisories, remainingCoins: user.virtualCoins }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const recommendations = await generateAIRecommendations(user.behaviourProfile);
    res.json({ success: true, data: recommendations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSectors = async (req, res) => {
  const sectors = [...new Set(INDIAN_STOCKS.map(s => s.sector).filter(Boolean))];
  res.json({ success: true, data: sectors });
};
