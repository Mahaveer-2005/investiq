const router = require('express').Router();
const auth   = require('../middleware/auth');
const User   = require('../models/User');
const { TAX_CONFIG, calculateBuyCharges, calculateSellCharges, calculateIntradayCharges } = require('../config/taxConfig');

function cleanSymbol(s) {
  return (s || '').toString().trim().toUpperCase().replace(/\.(NS|BSE)$/i, '');
}
function daysBetween(d1, d2) {
  return Math.abs(new Date(d2) - new Date(d1)) / (1000 * 3600 * 24);
}
function getFY(date) {
  const d = new Date(date);
  const m = d.getMonth();
  const y = d.getFullYear();
  return m >= 3 ? `${y}-${String(y+1).slice(2)}` : `${y-1}-${String(y).slice(2)}`;
}

// ── Normalize action — handles both 'action' and 'type' fields ──────────────
function getAction(tx) {
  const raw = (tx.action || tx.type || '').toString().toLowerCase().trim();
  if (raw === 'buy'  || raw === 'bought') return 'buy';
  if (raw === 'sell' || raw === 'sold')   return 'sell';
  return raw;
}

// ── FIFO gain calculation ────────────────────────────────────────────────────
function computeRealizedGains(transactions) {
  const buyQueue = {};
  const trades   = [];

  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0)
  );

  sorted.forEach(tx => {
    const sym    = cleanSymbol(tx.symbol);
    const action = getAction(tx);
    const qty    = Number(tx.quantity || 0);
    const price  = Number(tx.price || tx.avgPrice || 0);
    const date   = tx.date || tx.createdAt || new Date().toISOString();

    if (!sym || qty <= 0) return;

    if (action === 'buy') {
      if (!buyQueue[sym]) buyQueue[sym] = [];
      buyQueue[sym].push({ qty, price, date });
    } else if (action === 'sell') {
      if (!buyQueue[sym] || buyQueue[sym].length === 0) return;
      let remaining = qty;
      while (remaining > 0 && buyQueue[sym].length > 0) {
        const oldest  = buyQueue[sym][0];
        const matched = Math.min(remaining, oldest.qty);
        const holding = daysBetween(oldest.date, date);
        const isLTCG  = holding > 365;
        const buyAmt  = matched * oldest.price;
        const sellAmt = matched * price;
        const gain    = sellAmt - buyAmt;
        trades.push({
          symbol:      sym,
          name:        tx.name || sym,
          buyDate:     oldest.date,
          sellDate:    date,
          qty:         matched,
          buyPrice:    +oldest.price.toFixed(2),
          sellPrice:   +price.toFixed(2),
          buyAmount:   +buyAmt.toFixed(2),
          sellAmount:  +sellAmt.toFixed(2),
          gain:        +gain.toFixed(2),
          gainPct:     buyAmt > 0 ? +((gain / buyAmt) * 100).toFixed(2) : 0,
          holdingDays: Math.round(holding),
          type:        isLTCG ? 'LTCG' : 'STCG',
          fy:          getFY(date),
          taxRate:     isLTCG ? 12.5 : 20,
          taxableGain: +Math.max(0, gain).toFixed(2),
        });
        oldest.qty -= matched;
        remaining  -= matched;
        if (oldest.qty <= 0) buyQueue[sym].shift();
      }
    }
  });

  return trades;
}

// ── Compute unrealized holdings ──────────────────────────────────────────────
function computeUnrealized(transactions) {
  const map    = {};
  const sorted = [...transactions].sort(
    (a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0)
  );

  sorted.forEach(tx => {
    const sym    = cleanSymbol(tx.symbol);
    const action = getAction(tx);
    const qty    = Number(tx.quantity || 0);
    const price  = Number(tx.price || tx.avgPrice || 0);
    const date   = tx.date || tx.createdAt || new Date().toISOString();
    if (!sym || qty <= 0) return;

    if (!map[sym]) map[sym] = { qty: 0, totalCost: 0, name: tx.name || sym, firstBuy: date };

    if (action === 'buy') {
      map[sym].qty       += qty;
      map[sym].totalCost += price > 0 ? price * qty : 0;
    } else if (action === 'sell') {
      const sellQty = Math.min(qty, map[sym].qty);
      const avg     = map[sym].qty > 0 ? map[sym].totalCost / map[sym].qty : 0;
      map[sym].totalCost = Math.max(0, map[sym].totalCost - avg * sellQty);
      map[sym].qty       = Math.max(0, map[sym].qty - sellQty);
    }
  });

  return Object.entries(map)
    .filter(([, v]) => v.qty > 0)
    .map(([sym, v]) => {
      const avg  = v.qty > 0 ? v.totalCost / v.qty : 0;
      const inv  = avg * v.qty;
      const days = daysBetween(v.firstBuy, new Date());
      return {
        symbol:        sym,
        name:          v.name,
        qty:           v.qty,
        avgPrice:      +avg.toFixed(2),
        livePrice:     +avg.toFixed(2),
        invested:      +inv.toFixed(2),
        current:       +inv.toFixed(2),
        unrealized:    0,
        unrealizedPct: 0,
        holdingDays:   Math.round(days),
        projectedType: days > 365 ? 'LTCG' : 'STCG',
        projectedTax:  days > 365 ? 12.5  : 20,
      };
    });
}

// ── Demo data ─────────────────────────────────────────────────────────────────
const DEMO = {
  isDemo: true,
  fy: 'FY 2024-25',
  availableFYs: ['FY 2024-25'],
  summary: {
    totalTrades: 8, winningTrades: 5, losingTrades: 3,
    totalGain: 91400, stcgGain: 54200, ltcgGain: 37200,
    stcgTax: 10840, ltcgTax: 0, totalTax: 10840,
    ltcgExemption: 125000, ltcgTaxable: 0,
    netGainAfterTax: 80560, harvestOpportunity: 21500,
  },
  stcgTrades: [
    { symbol:'RELIANCE',  name:'Reliance Industries', buyDate:'2024-06-10', sellDate:'2024-10-15', qty:50,  buyPrice:2820, sellPrice:3140, buyAmount:141000, sellAmount:157000, gain:16000,  gainPct:11.35, holdingDays:127, type:'STCG', taxRate:20,   taxableGain:16000 },
    { symbol:'INFY',      name:'Infosys Ltd',          buyDate:'2024-07-20', sellDate:'2024-11-30', qty:80,  buyPrice:1580, sellPrice:1920, buyAmount:126400, sellAmount:153600, gain:27200,  gainPct:21.52, holdingDays:133, type:'STCG', taxRate:20,   taxableGain:27200 },
    { symbol:'HDFCBANK',  name:'HDFC Bank Ltd',        buyDate:'2024-08-05', sellDate:'2025-01-10', qty:60,  buyPrice:1680, sellPrice:1550, buyAmount:100800, sellAmount:93000,  gain:-7800,  gainPct:-7.74, holdingDays:158, type:'STCG', taxRate:20,   taxableGain:0     },
    { symbol:'ITC',       name:'ITC Ltd',              buyDate:'2024-09-12', sellDate:'2025-02-20', qty:200, buyPrice:484,  sellPrice:556,  buyAmount:96800,  sellAmount:111200, gain:14400,  gainPct:14.88, holdingDays:161, type:'STCG', taxRate:20,   taxableGain:14400 },
    { symbol:'WIPRO',     name:'Wipro Ltd',             buyDate:'2024-10-01', sellDate:'2025-03-05', qty:100, buyPrice:520,  sellPrice:492,  buyAmount:52000,  sellAmount:49200,  gain:-2800,  gainPct:-5.38, holdingDays:155, type:'STCG', taxRate:20,   taxableGain:0     },
    { symbol:'BAJFINANCE',name:'Bajaj Finance',        buyDate:'2024-11-15', sellDate:'2025-03-20', qty:10,  buyPrice:6840, sellPrice:7440, buyAmount:68400,  sellAmount:74400,  gain:6000,   gainPct:8.77,  holdingDays:125, type:'STCG', taxRate:20,   taxableGain:6000  },
    { symbol:'SBIN',      name:'State Bank of India',  buyDate:'2024-12-01', sellDate:'2025-04-10', qty:100, buyPrice:740,  sellPrice:698,  buyAmount:74000,  sellAmount:69800,  gain:-4200,  gainPct:-5.68, holdingDays:130, type:'STCG', taxRate:20,   taxableGain:0     },
  ],
  ltcgTrades: [
    { symbol:'TCS',    name:'Tata Consultancy', buyDate:'2023-03-15', sellDate:'2024-08-20', qty:30, buyPrice:3280, sellPrice:4460, buyAmount:98400,  sellAmount:133800, gain:35400, gainPct:35.98, holdingDays:523, type:'LTCG', taxRate:12.5, taxableGain:0 },
    { symbol:'MARUTI', name:'Maruti Suzuki',    buyDate:'2022-11-10', sellDate:'2024-05-15', qty:5,  buyPrice:8820, sellPrice:12980,buyAmount:44100,  sellAmount:64900,  gain:20800, gainPct:47.17, holdingDays:552, type:'LTCG', taxRate:12.5, taxableGain:0 },
  ],
  unrealized: [
    { symbol:'BAJFINANCE', name:'Bajaj Finance',       qty:15,  avgPrice:6840, livePrice:7420, invested:102600, current:111300, unrealized:8700,  unrealizedPct:8.48,  holdingDays:95,  projectedType:'STCG', projectedTax:20   },
    { symbol:'SUNPHARMA',  name:'Sun Pharma',           qty:40,  avgPrice:1560, livePrice:1820, invested:62400,  current:72800,  unrealized:10400, unrealizedPct:16.67, holdingDays:142, projectedType:'STCG', projectedTax:20   },
    { symbol:'ONGC',       name:'ONGC Ltd',             qty:200, avgPrice:282,  livePrice:274,  invested:56400,  current:54800,  unrealized:-1600, unrealizedPct:-2.84, holdingDays:78,  projectedType:'STCG', projectedTax:20   },
    { symbol:'AXISBANK',   name:'Axis Bank',            qty:50,  avgPrice:1120, livePrice:1042, invested:56000,  current:52100,  unrealized:-3900, unrealizedPct:-6.96, holdingDays:112, projectedType:'STCG', projectedTax:20   },
    { symbol:'NESTLEIND',  name:'Nestle India',         qty:8,   avgPrice:24800,livePrice:25640,invested:198400, current:205120, unrealized:6720,  unrealizedPct:3.39,  holdingDays:410, projectedType:'LTCG', projectedTax:12.5 },
    { symbol:'TITAN',      name:'Titan Company',        qty:20,  avgPrice:3420, livePrice:3680, invested:68400,  current:73600,  unrealized:5200,  unrealizedPct:7.60,  holdingDays:310, projectedType:'STCG', projectedTax:20   },
    { symbol:'DABUR',      name:'Dabur India',          qty:100, avgPrice:580,  livePrice:530,  invested:58000,  current:53000,  unrealized:-5000, unrealizedPct:-8.62, holdingDays:55,  projectedType:'STCG', projectedTax:20   },
    { symbol:'KOTAKBANK',  name:'Kotak Mahindra Bank',  qty:30,  avgPrice:1780, livePrice:1760, invested:53400,  current:52800,  unrealized:-600,  unrealizedPct:-1.12, holdingDays:220, projectedType:'STCG', projectedTax:20   },
  ],
  monthly: [
    { month:'2024-05', stcg:0,     ltcg:20800, total:20800 },
    { month:'2024-08', stcg:0,     ltcg:35400, total:35400 },
    { month:'2024-10', stcg:16000, ltcg:0,     total:16000 },
    { month:'2024-11', stcg:27200, ltcg:0,     total:27200 },
    { month:'2025-01', stcg:-7800, ltcg:0,     total:-7800 },
    { month:'2025-02', stcg:14400, ltcg:0,     total:14400 },
    { month:'2025-03', stcg:-2800, ltcg:0,     total:-2800 },
  ],
};

// ── GET /api/tax/demo ── MUST be before /:fy ──────────────────────────────────
// ── GET /api/tax/config — current rates, so frontend never hardcodes them ──
router.get('/config', auth, (req, res) => {
  res.json({
    ...TAX_CONFIG,
    disclaimer: 'Rates and tax treatment can change and depend on your individual circumstances. Verify with current official tax guidance (Income Tax Dept / SEBI) before making real decisions. This is not tax or legal advice.',
  });
});

// ── POST /api/tax/simulate-buy — pre-trade cost breakdown ──────────────────
router.post('/simulate-buy', auth, (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!amount || amount <= 0) return res.status(400).json({ message: 'Enter a valid investment amount' });
    const result = calculateBuyCharges(amount);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/tax/simulate-sell — pre-trade P&L + capital gains breakdown ──
router.post('/simulate-sell', auth, (req, res) => {
  try {
    const buyValue    = Number(req.body.buyValue);
    const sellValue   = Number(req.body.sellValue);
    const holdingDays = Number(req.body.holdingDays) || 0;
    if (!buyValue || buyValue <= 0)  return res.status(400).json({ message: 'Enter a valid buy value' });
    if (!sellValue || sellValue <= 0) return res.status(400).json({ message: 'Enter a valid sell value' });
    const result = calculateSellCharges(buyValue, sellValue, holdingDays);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/tax/simulate-intraday — speculative income tax breakdown ─────
router.post('/simulate-intraday', auth, (req, res) => {
  try {
    const buyValue  = Number(req.body.buyValue);
    const sellValue = Number(req.body.sellValue);
    const slabRatePct = Number(req.body.slabRatePct) || 30;
    if (!buyValue || buyValue <= 0) return res.status(400).json({ message: 'Enter a valid buy value' });
    if (!sellValue || sellValue <= 0) return res.status(400).json({ message: 'Enter a valid sell value' });
    res.json(calculateIntradayCharges(buyValue, sellValue, slabRatePct));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/demo', auth, (req, res) => res.json(DEMO));

// ── GET /api/tax ──────────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ message: 'User not found' });

    const transactions = user.transactions || [];

    // DEBUG: log what we have
    console.log(`TAX: user ${req.user.id} has ${transactions.length} transactions`);
    transactions.slice(0, 5).forEach((tx, i) => {
      console.log(`  tx[${i}]: symbol=${tx.symbol} action=${tx.action} type=${tx.type} qty=${tx.quantity} price=${tx.price} date=${tx.date}`);
    });

    const allTrades = computeRealizedGains(transactions);
    console.log(`TAX: computed ${allTrades.length} realized trades`);

    // If no sell trades exist yet, show demo
    const hasSells = transactions.some(tx => {
      const a = getAction(tx);
      return a === 'sell';
    });

    if (!hasSells) {
      console.log('TAX: no sell transactions found — returning demo data');
      return res.json(DEMO);
    }

    const { fy }   = req.query;
    const trades   = fy ? allTrades.filter(t => t.fy === fy) : allTrades;
    const stcg     = trades.filter(t => t.type === 'STCG');
    const ltcg     = trades.filter(t => t.type === 'LTCG');

    const stcgGain    = stcg.reduce((s, t) => s + t.gain, 0);
    const ltcgGain    = ltcg.reduce((s, t) => s + t.gain, 0);
    const totalGain   = stcgGain + ltcgGain;
    const stcgTax     = Math.max(0, stcgGain) * 0.20;
    const ltcgTaxable = Math.max(0, ltcgGain - 125000);
    const ltcgTax     = ltcgTaxable * 0.125;
    const totalTax    = stcgTax + ltcgTax;

    const monthMap = {};
    trades.forEach(t => {
      const d = new Date(t.sellDate);
      const k = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
      if (!monthMap[k]) monthMap[k] = { month: k, stcg: 0, ltcg: 0, total: 0 };
      monthMap[k][t.type.toLowerCase()] += t.gain;
      monthMap[k].total += t.gain;
    });

    const fySet      = [...new Set(allTrades.map(t => t.fy))].sort();
    const unrealized = computeUnrealized(transactions);

    res.json({
      isDemo:       false,
      fy:           fy || fySet[fySet.length - 1] || getFY(new Date()),
      availableFYs: fySet,
      summary: {
        totalTrades:    trades.length,
        winningTrades:  trades.filter(t => t.gain > 0).length,
        losingTrades:   trades.filter(t => t.gain <= 0).length,
        totalGain:      +totalGain.toFixed(2),
        stcgGain:       +stcgGain.toFixed(2),
        ltcgGain:       +ltcgGain.toFixed(2),
        stcgTax:        +stcgTax.toFixed(2),
        ltcgTax:        +ltcgTax.toFixed(2),
        totalTax:       +totalTax.toFixed(2),
        ltcgExemption:  125000,
        ltcgTaxable:    +ltcgTaxable.toFixed(2),
        netGainAfterTax:+(totalGain - totalTax).toFixed(2),
        harvestOpportunity: +unrealized
          .filter(u => u.unrealized < 0)
          .reduce((s, u) => s + Math.abs(u.unrealized), 0)
          .toFixed(2),
      },
      stcgTrades:  stcg.sort((a, b) => new Date(b.sellDate) - new Date(a.sellDate)),
      ltcgTrades:  ltcg.sort((a, b) => new Date(b.sellDate) - new Date(a.sellDate)),
      unrealized:  unrealized.sort((a, b) => b.unrealized - a.unrealized),
      monthly:     Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)),
    });

  } catch (err) {
    console.error('TAX ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;