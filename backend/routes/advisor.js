const router = require('express').Router();
const auth   = require('../middleware/auth');
const { STOCK_UNIVERSE } = require('./screener');
const { getLivePrice } = require('./stocks');
const { groqChatJSON } = require('../utils/groqClient');

// ─────────────────────────────────────────────────────────────────────────
// "What should I invest in?" — a transparent, rule-based allocation engine.
// This is NOT a black box: every stock is scored on real, visible factors
// (valuation, profitability, leverage, size, sector) weighted by the user's
// chosen risk profile, then only stocks the user can actually afford at
// least 1 real share of (using REAL current prices, not fabricated ones)
// are shortlisted, diversified across sectors. Nothing here is a
// recommendation to buy — it's an educational illustration of one
// reasonable way to think about allocation, clearly labeled as such.
// ─────────────────────────────────────────────────────────────────────────

const RISK_PROFILES = {
  conservative: {
    label: 'Conservative',
    preferSectors: ['Banking', 'FMCG', 'IT', 'Pharma'],
    maxPE: 35, minMcap: 100000, maxDebtEq: 1.0,
    scenario: { bear: 0.02, base: 0.07, bull: 0.10 },
  },
  moderate: {
    label: 'Moderate',
    preferSectors: null, // no restriction — broad mix
    maxPE: 50, minMcap: 30000, maxDebtEq: 2.5,
    scenario: { bear: 0.00, base: 0.12, bull: 0.16 },
  },
  aggressive: {
    label: 'Aggressive',
    preferSectors: ['Auto', 'NBFC', 'Consumer', 'Chemicals', 'Infra'],
    maxPE: 100, minMcap: 5000, maxDebtEq: 4.0,
    scenario: { bear: -0.05, base: 0.15, bull: 0.22 },
  },
};

function scoreStock(stock, profile) {
  let score = 50;
  // Valuation: lower PE relative to profile ceiling scores higher (value tilt)
  score += Math.max(0, (profile.maxPE - stock.pe) / profile.maxPE) * 20;
  // Quality: higher ROE scores higher
  score += Math.min(stock.roe, 40) / 40 * 20;
  // Leverage: lower debt/equity scores higher
  score += Math.max(0, (profile.maxDebtEq - stock.debtEq) / profile.maxDebtEq) * 15;
  // Size: within profile's acceptable market-cap floor
  if (stock.mcap >= profile.minMcap) score += 10;
  // Sector preference bonus
  if (profile.preferSectors && profile.preferSectors.includes(stock.sector)) score += 15;
  return +score.toFixed(1);
}

async function buildAllocation(amount, riskProfileKey) {
  const profile = RISK_PROFILES[riskProfileKey] || RISK_PROFILES.moderate;

  // Score and rank the full universe for this risk profile
  const ranked = STOCK_UNIVERSE
    .map(s => ({ ...s, score: scoreStock(s, profile) }))
    .sort((a, b) => b.score - a.score);

  // Walk down the ranked list, fetching REAL current prices, and only keep
  // candidates the user can actually afford ≥1 real share of, diversifying
  // across sectors (skip a sector once we already have a pick from it).
  const picks = [];
  const usedSectors = new Set();
  for (const stock of ranked) {
    if (picks.length >= 4) break;
    if (usedSectors.has(stock.sector)) continue;
    const quote = await getLivePrice(stock.symbol);
    if (!quote.price || quote.price > amount * 0.7) continue; // can't sensibly fit
    picks.push({ ...stock, currentPrice: quote.price, changePct: quote.changePct });
    usedSectors.add(stock.sector);
  }

  if (!picks.length) {
    throw new Error('Could not find any affordable, diversified picks for this amount — try a larger amount or check back later (live price lookups may be temporarily unavailable).');
  }

  // Allocate budget proportional to score, buying whole shares only
  const totalScore = picks.reduce((s, p) => s + p.score, 0);
  let remaining = amount;
  const allocation = picks.map((p, i) => {
    const isLast = i === picks.length - 1;
    const targetAmount = isLast ? remaining : Math.floor((p.score / totalScore) * amount);
    const quantity = Math.floor(targetAmount / p.currentPrice);
    const allocatedAmount = +(quantity * p.currentPrice).toFixed(2);
    remaining = +(remaining - allocatedAmount).toFixed(2);
    return {
      symbol: p.symbol.replace('.NS', ''), name: p.name, sector: p.sector,
      currentPrice: p.currentPrice, changePct: p.changePct,
      quantity, allocatedAmount,
      rationale: buildRationale(p, profile),
    };
  }).filter(a => a.quantity > 0);

  const cashReserve = +remaining.toFixed(2);
  const totalInvested = +(amount - cashReserve).toFixed(2);
  const diversificationScore = Math.min(100, allocation.length * 25);
  const riskScore = riskProfileKey === 'aggressive' ? 75 : riskProfileKey === 'conservative' ? 30 : 50;

  return { profile, allocation, cashReserve, totalInvested, diversificationScore, riskScore };
}

function buildRationale(stock, profile) {
  const reasons = [];
  if (stock.pe < profile.maxPE * 0.7) reasons.push(`reasonably valued (P/E ${stock.pe})`);
  if (stock.roe > 15) reasons.push(`strong profitability (ROE ${stock.roe}%)`);
  if (stock.debtEq < 0.5) reasons.push('low debt');
  if (profile.preferSectors?.includes(stock.sector)) reasons.push(`${stock.sector} fits a ${profile.label.toLowerCase()} profile`);
  return reasons.length ? reasons.join(', ') : `Selected for sector diversification (${stock.sector})`;
}

// Bull/base/bear future-value simulation — simple compound growth per
// scenario, explicitly NOT a single-point guaranteed prediction.
function simulateScenarios(amount, scenario) {
  const horizons = [
    { label: '6 Months', years: 0.5 },
    { label: '1 Year', years: 1 },
    { label: '2 Years', years: 2 },
    { label: '3 Years', years: 3 },
    { label: '5 Years', years: 5 },
  ];
  return horizons.map(h => ({
    horizon: h.label,
    bear: +(amount * Math.pow(1 + scenario.bear, h.years)).toFixed(0),
    base: +(amount * Math.pow(1 + scenario.base, h.years)).toFixed(0),
    bull: +(amount * Math.pow(1 + scenario.bull, h.years)).toFixed(0),
  }));
}

// ── POST /api/advisor/analyze ────────────────────────────────────────────
router.post('/analyze', auth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    const riskProfileKey = (req.body.riskProfile || 'moderate').toLowerCase();
    if (!amount || amount < 500) return res.status(400).json({ message: 'Enter an amount of at least ₹500' });
    if (!RISK_PROFILES[riskProfileKey]) return res.status(400).json({ message: 'riskProfile must be conservative, moderate, or aggressive' });

    const { profile, allocation, cashReserve, totalInvested, diversificationScore, riskScore } = await buildAllocation(amount, riskProfileKey);
    const scenarios = simulateScenarios(totalInvested, profile.scenario);

    // AI-generated plain-language explanation (best-effort — allocation
    // itself doesn't depend on this succeeding)
    let aiExplanation = null;
    try {
      const prompt = `You are an educational investing assistant. A user has ₹${amount} to invest with a ${profile.label} risk profile. Here is a rule-based allocation:
${allocation.map(a => `- ${a.name} (${a.sector}): ${a.quantity} shares @ ₹${a.currentPrice} = ₹${a.allocatedAmount}. Reason: ${a.rationale}`).join('\n')}
Cash reserve: ₹${cashReserve}

Write a short (max 100 words), encouraging but honest explanation of this allocation for a beginner investor, plus ONE key risk to be aware of. This is educational, not personalized financial advice — reflect that tone.
Respond ONLY with JSON, no other text: {"summary":"...", "keyRisk":"..."}`;
      aiExplanation = await groqChatJSON({ prompt, maxTokens: 300, temperature: 0.5 });
    } catch (err) {
      console.error('Advisor AI explanation error:', err.message);
    }

    res.json({
      amount, riskProfile: profile.label, allocation, cashReserve, totalInvested,
      diversificationScore, riskScore, scenarios, aiExplanation,
      disclaimer: 'This is an educational illustration based on public fundamentals and a simple rule-based scoring model — NOT personalized financial advice. Future-value scenarios are illustrative assumptions, not guarantees; actual returns can be lower, negative, or higher than shown. Please do your own research or consult a SEBI-registered advisor before investing real money.',
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;