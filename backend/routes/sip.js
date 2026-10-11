const router = require('express').Router();
const auth   = require('../middleware/auth');

// ─────────────────────────────────────────────────────────────────────────
// Real SIP future-value math (compound interest formula for a monthly
// annuity), not fabricated numbers — the only assumption is the expected
// annual return rate, which the user supplies (or picks from illustrative
// conservative/moderate/aggressive historical index-linked ranges).
//
// Live mutual-fund NAV/AUM data requires a paid AMFI/data-vendor feed —
// there is no free, reliable, unauthenticated real-time API for this. Rather
// than fabricate fake fund names/NAVs (which would be actively misleading
// for a financial app), this uses real, well-known fund CATEGORIES with
// their real historical category-average return ranges (publicly
// documented), clearly labeled as historical/illustrative. Swap in a real
// AMFI NAV feed here if you have API access — getSipFunds() below is the
// one place to change.
// ─────────────────────────────────────────────────────────────────────────

function sipFutureValue(monthlyAmount, annualReturnPct, years, stepUpPct = 0) {
  const monthlyRate = annualReturnPct / 100 / 12;
  const months = years * 12;
  let futureValue = 0;
  let totalInvested = 0;
  let currentMonthly = monthlyAmount;

  for (let m = 1; m <= months; m++) {
    if (stepUpPct > 0 && m > 1 && (m - 1) % 12 === 0) {
      currentMonthly = +(currentMonthly * (1 + stepUpPct / 100)).toFixed(2);
    }
    futureValue = (futureValue + currentMonthly) * (1 + monthlyRate);
    totalInvested += currentMonthly;
  }

  return {
    totalInvested: +totalInvested.toFixed(0),
    estimatedValue: +futureValue.toFixed(0),
    estimatedReturns: +(futureValue - totalInvested).toFixed(0),
  };
}

function inflationAdjust(value, inflationPct, years) {
  return +(value / Math.pow(1 + inflationPct / 100, years)).toFixed(0);
}

function buildYearlyBreakdown(monthlyAmount, annualReturnPct, years, stepUpPct) {
  const points = [];
  for (let y = 1; y <= years; y++) {
    const r = sipFutureValue(monthlyAmount, annualReturnPct, y, stepUpPct);
    points.push({ year: y, invested: r.totalInvested, value: r.estimatedValue });
  }
  return points;
}

// ── POST /api/sip/calculate ──────────────────────────────────────────────
router.post('/calculate', auth, (req, res) => {
  try {
    const {
      monthlyAmount, years, expectedReturnPct = 12,
      frequency = 'monthly', stepUpPct = 0, inflationPct = 0,
    } = req.body;

    const amt = Number(monthlyAmount);
    const yrs = Number(years);
    if (!amt || amt <= 0) return res.status(400).json({ message: 'Enter a valid SIP amount' });
    if (!yrs || yrs <= 0) return res.status(400).json({ message: 'Enter a valid duration' });

    let effectiveMonthly = amt;
    if (frequency === 'quarterly') effectiveMonthly = amt / 3;
    if (frequency === 'annual') effectiveMonthly = amt / 12;

    const result = sipFutureValue(effectiveMonthly, expectedReturnPct, yrs, stepUpPct);
    const inflationAdjustedValue = inflationPct > 0 ? inflationAdjust(result.estimatedValue, inflationPct, yrs) : null;

    res.json({
      inputs: { monthlyAmount: amt, years: yrs, expectedReturnPct, frequency, stepUpPct, inflationPct },
      ...result,
      inflationAdjustedValue,
      chart: buildYearlyBreakdown(effectiveMonthly, expectedReturnPct, yrs, stepUpPct),
      disclaimer: 'These are illustrative projections based on a constant assumed annual return — actual mutual fund/equity returns fluctuate and are never guaranteed. Historical returns do not predict future performance.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/sip/presets — quick-pick amounts & durations for the UI ──────
router.get('/presets', auth, (req, res) => {
  res.json({
    amounts: [500, 1000, 2000, 5000, 10000],
    durations: [1, 3, 5, 10, 15, 20],
    riskReturnRanges: [
      { profile: 'Conservative', label: 'Debt-oriented / Conservative Hybrid', expectedReturnPct: 7,  note: 'Historical category-average range 6-8% p.a.' },
      { profile: 'Moderate',     label: 'Large Cap / Index Fund',              expectedReturnPct: 12, note: 'Historical Nifty 50 long-term CAGR range 10-13% p.a.' },
      { profile: 'Aggressive',   label: 'Mid/Small Cap Equity',                expectedReturnPct: 15, note: 'Historical category-average range 13-18% p.a., with materially higher volatility' },
    ],
  });
});

// ── GET /api/sip/funds — curated real fund CATEGORIES (see note above) ────
router.get('/funds', auth, (req, res) => {
  const FUND_CATEGORIES = [
    {
      category: 'Nifty 50 Index Fund', fundHouseExamples: ['UTI', 'HDFC', 'ICICI Prudential', 'SBI'],
      riskLevel: 'Moderate', minSip: 100, expenseRatioRange: '0.10% – 0.20%',
      historicalReturns: { threeYear: '~13-15% CAGR (historical)', fiveYear: '~14-16% CAGR (historical)' },
      note: 'Tracks Nifty 50 — broad large-cap index exposure, low cost.',
    },
    {
      category: 'Flexi Cap Fund', fundHouseExamples: ['Parag Parikh', 'HDFC', 'Kotak'],
      riskLevel: 'Moderate-High', minSip: 100, expenseRatioRange: '0.6% – 2.2%',
      historicalReturns: { threeYear: '~14-18% CAGR (historical)', fiveYear: '~15-19% CAGR (historical)' },
      note: 'Actively managed across large/mid/small cap for diversification.',
    },
    {
      category: 'Mid Cap Fund', fundHouseExamples: ['Kotak', 'Axis', 'DSP'],
      riskLevel: 'High', minSip: 100, expenseRatioRange: '0.5% – 2.3%',
      historicalReturns: { threeYear: '~18-22% CAGR (historical)', fiveYear: '~18-23% CAGR (historical)' },
      note: 'Higher growth potential, materially higher volatility and drawdowns.',
    },
    {
      category: 'Corporate Bond / Debt Fund', fundHouseExamples: ['ICICI Prudential', 'HDFC', 'Aditya Birla SL'],
      riskLevel: 'Low-Moderate', minSip: 500, expenseRatioRange: '0.3% – 1.0%',
      historicalReturns: { threeYear: '~6-7.5% CAGR (historical)', fiveYear: '~6.5-7.5% CAGR (historical)' },
      note: 'Lower volatility, income-oriented — suited to conservative allocations.',
    },
    {
      category: 'Balanced/Hybrid Aggressive Fund', fundHouseExamples: ['ICICI Prudential', 'SBI', 'Canara Robeco'],
      riskLevel: 'Moderate', minSip: 100, expenseRatioRange: '0.4% – 2.1%',
      historicalReturns: { threeYear: '~11-14% CAGR (historical)', fiveYear: '~12-15% CAGR (historical)' },
      note: 'Mix of equity (65-80%) and debt — moderates volatility vs pure equity.',
    },
  ];

  res.json({
    categories: FUND_CATEGORIES,
    disclaimer: 'Historical returns / illustrative ranges only — not guaranteed, and not live NAV data. For current NAV, AUM and exact scheme performance, check a licensed source (AMFI, the fund house, or your broker) before investing.',
  });
});

// ── POST /api/sip/start ──────────────────────────────────────────────────
// "Start Investment" — commits the user's virtual coins to a recurring SIP.
// The first installment is deducted immediately; subsequent installments
// are processed via /api/sip/process-due (called on login/dashboard load)
// once a real calendar month has actually passed, so this behaves like a
// real SIP timeline rather than an instant fake credit.
router.post('/start', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const { monthlyAmount, expectedReturnPct, label } = req.body;
    const amt = Number(monthlyAmount);
    if (!amt || amt <= 0) return res.status(400).json({ message: 'Enter a valid monthly SIP amount' });

    const user = await User.findById(req.user._id);
    if (user.virtualCoins < amt) return res.status(400).json({ message: 'Insufficient virtual coins for the first installment' });

    const sip = {
      id: `sip_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      label: label || 'Custom SIP',
      monthlyAmount: amt,
      expectedReturnPct: Number(expectedReturnPct) || 12,
      startDate: new Date(),
      lastInstallmentDate: new Date(),
      installmentsPaid: 1,
      totalInvested: amt,
      status: 'active',
    };

    user.virtualCoins -= amt;
    user.sips.push(sip);
    user.transactions.push({
      symbol: 'SIP', name: `SIP Started: ${sip.label} — Installment #1`,
      type: 'sip', action: 'buy', quantity: 1, price: amt, totalAmount: amt, date: new Date(),
    });
    await user.save();

    res.json({ success: true, sip, newBalance: user.virtualCoins, message: `SIP started! First installment of ₹${amt.toLocaleString('en-IN')} deducted.` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/sip/my-sips ─────────────────────────────────────────────────
router.get('/my-sips', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id).select('sips virtualCoins');
    res.json({ sips: user.sips || [], virtualCoins: user.virtualCoins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/sip/process-due ─────────────────────────────────────────────
// Processes any installments that are actually due (>= 30 days since the
// last one) for all of the user's active SIPs — call this on app load so
// SIPs behave like a real recurring commitment over time, not a one-off.
router.post('/process-due', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const now = new Date();
    let processed = 0;
    const skipped = [];

    for (const sip of user.sips || []) {
      if (sip.status !== 'active') continue;
      const daysSince = (now - new Date(sip.lastInstallmentDate)) / (1000 * 3600 * 24);
      if (daysSince < 30) continue;

      const installmentsDue = Math.floor(daysSince / 30);
      for (let i = 0; i < installmentsDue; i++) {
        if (user.virtualCoins < sip.monthlyAmount) { skipped.push(sip.label); break; }
        user.virtualCoins -= sip.monthlyAmount;
        sip.installmentsPaid += 1;
        sip.totalInvested += sip.monthlyAmount;
        sip.lastInstallmentDate = new Date(new Date(sip.lastInstallmentDate).getTime() + 30 * 24 * 3600 * 1000);
        user.transactions.push({
          symbol: 'SIP', name: `SIP Installment: ${sip.label} — #${sip.installmentsPaid}`,
          type: 'sip', action: 'buy', quantity: 1, price: sip.monthlyAmount, totalAmount: sip.monthlyAmount, date: new Date(),
        });
        processed++;
      }
    }

    if (processed > 0) await user.save();
    res.json({ processed, skipped, newBalance: user.virtualCoins });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/sip/:id/stop ──────────────────────────────────────────────
router.post('/:id/stop', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const sip = (user.sips || []).find(s => s.id === req.params.id);
    if (!sip) return res.status(404).json({ message: 'SIP not found' });
    sip.status = 'stopped';
    await user.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;