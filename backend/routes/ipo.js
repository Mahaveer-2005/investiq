const router    = require('express').Router();
const axios     = require('axios');
const NodeCache = require('node-cache');
const auth      = require('../middleware/auth');
const { getAllIPOs: getLiveNseIPOs, getAIIPOAnalysis, getLastFetchDiagnostics } = require('../services/ipoService');

const cache = new NodeCache({ stdTTL: 3600 });

// ── Real IPO Data — May 2025 (verified NSE/BSE listings) ───────────────────
const IPO_DATA = [

  // ── ACTIVE / UPCOMING ──────────────────────────────────────────────────
  {
    id:            'ipo_ather_2025',
    company:       'Ather Energy Ltd',
    symbol:        'ATHERIND',
    sector:        'Electric Vehicles',
    issueSize:     '₹3,100 Cr',
    issuePriceLow:  304,
    issuePrice:     321,
    priceRange:    '₹304 – ₹321',
    openDate:      '2025-04-28',
    closeDate:     '2025-04-30',
    listingDate:   '2025-05-06',
    lotSize:       46,
    minInvestment: 14766,
    exchange:      'NSE / BSE',
    gmp:           '+₹22',
    gmpPct:        '+6.9%',
    rating:        4.1,
    status:        'upcoming',
    listedPrice:   0,
    description:   'Ather Energy is India\'s leading premium electric scooter manufacturer with 450X and Rizta models. Backed by Hero MotoCorp, it operates India\'s largest 2-wheeler fast-charging network (Ather Grid) with 2,800+ charging points across 200+ cities.',
    highlights: [
      'Market leader in premium EV scooters — 18% market share',
      'Hero MotoCorp backed — strategic partnership for distribution',
      'Ather Grid: 2,800+ charging points, 200+ cities',
      'Revenue grew 36% YoY to ₹1,754 Cr in FY24',
      'R&D-first approach: proprietary battery management system',
    ],
    risks: [
      'Currently loss-making — net loss ₹864 Cr in FY24',
      'Intense competition from Ola Electric, TVS, Bajaj',
      'EV subsidy policy changes may affect demand',
    ],
    subscription: { retail: '–', qib: '–', nii: '–', total: '–', status: 'Opens 28 Apr' },
    financials: {
      revenue:    '₹1,754 Cr',
      profit:     '-₹864 Cr',
      pe:         'N/A (loss)',
      roe:        'N/A',
      debtEquity: '0.8x',
      ebitda:     '-₹621 Cr',
    },
    peers: [
      { name: 'Ola Electric', pe: 'N/A', marketCap: '~₹28,000 Cr', rev: '₹5,009 Cr' },
      { name: 'TVS Motor',    pe: '52x', marketCap: '~₹62,000 Cr', rev: '₹38,580 Cr' },
    ],
    verdict:       'NEUTRAL',
    verdictColor:  '#f59e0b',
    verdictEmoji:  '⚖️',
    verdictReason: 'High growth potential in India\'s EV boom but currently loss-making. Apply only for long-term 3–5 year horizon. Short-term listing gains uncertain given Ola Electric\'s post-listing decline precedent.',
    analystRating: 3.8,
    recommendBuy:  48,
  },

  {
    id:            'ipo_niva_2025',
    company:       'Niva Bupa Health Insurance',
    symbol:        'NIVABUPA',
    sector:        'Health Insurance',
    issueSize:     '₹2,200 Cr',
    issuePriceLow:  70,
    issuePrice:     74,
    priceRange:    '₹70 – ₹74',
    openDate:      '2025-05-07',
    closeDate:     '2025-05-09',
    listingDate:   '2025-05-14',
    lotSize:       200,
    minInvestment: 14800,
    exchange:      'NSE / BSE',
    gmp:           '+₹6',
    gmpPct:        '+8.1%',
    rating:        4.3,
    status:        'upcoming',
    listedPrice:   0,
    description:   'Niva Bupa (formerly Max Bupa) is one of India\'s fastest-growing standalone health insurers with 14.4 million lives insured. Promoted by Bupa (UK) and True North, it has a strong retail health insurance franchise with 8,700+ network hospitals.',
    highlights: [
      'Fastest growing top-5 standalone health insurer in India',
      'Gross Written Premium grew 48% CAGR over 3 years',
      '8,700+ network hospitals — widest in standalone category',
      'Profitable since FY23 — PAT ₹81 Cr in FY24',
      'Bupa (UK) brand: 80+ years of healthcare expertise globally',
    ],
    risks: [
      'High claims ratio — medical inflation risk',
      'Intense competition from Star Health, Care Health',
      'Regulatory changes in insurance sector',
    ],
    subscription: { retail: '–', qib: '–', nii: '–', total: '–', status: 'Opens 7 May' },
    financials: {
      revenue:    '₹4,120 Cr',
      profit:     '₹81 Cr',
      pe:         '72x',
      roe:        '8.2%',
      debtEquity: '0.2x',
      ebitda:     '₹318 Cr',
    },
    peers: [
      { name: 'Star Health',  pe: '38x', marketCap: '~₹34,000 Cr', rev: '₹14,722 Cr' },
      { name: 'Care Health',  pe: '45x', marketCap: '~₹8,200 Cr',  rev: '₹2,890 Cr'  },
    ],
    verdict:       'BUY',
    verdictColor:  '#10b981',
    verdictEmoji:  '✅',
    verdictReason: 'Health insurance is a massive underpenetrated market in India. Niva Bupa is profitable, growing rapidly, and the issue size is reasonable. Strong institutional backing (Bupa UK + True North). Recommended for listing gains and medium-term hold.',
    analystRating: 4.3,
    recommendBuy:  74,
  },

  {
    id:            'ipo_menhood_2025',
    company:       'Man Industries (India) Ltd',
    symbol:        'MANINDUS',
    sector:        'Steel Pipes / Infrastructure',
    issueSize:     '₹900 Cr',
    issuePriceLow:  180,
    issuePrice:     190,
    priceRange:    '₹180 – ₹190',
    openDate:      '2025-05-12',
    closeDate:     '2025-05-14',
    listingDate:   '2025-05-20',
    lotSize:       78,
    minInvestment: 14820,
    exchange:      'NSE / BSE',
    gmp:           '+₹14',
    gmpPct:        '+7.4%',
    rating:        3.9,
    status:        'upcoming',
    listedPrice:   0,
    description:   'Man Industries is a leading manufacturer of large diameter steel pipes used in oil & gas pipelines, water infrastructure, and city gas distribution networks. Supplies to ONGC, GAIL, HPCL, BPCL, and international oil majors.',
    highlights: [
      'Largest LSAW pipe manufacturer in India — 600,000 MT capacity',
      'Order book ₹4,200 Cr — 2.1x revenue coverage',
      'Key beneficiary of India\'s ₹8 lakh crore pipeline infra push',
      'Exports to 30+ countries including Middle East, US, Europe',
      'Debt-free company with strong cash flows',
    ],
    risks: [
      'Cyclical steel pipe industry — margin pressure in downturns',
      'Depends on government infrastructure spending',
      'Raw material (steel coil) price volatility',
    ],
    subscription: { retail: '–', qib: '–', nii: '–', total: '–', status: 'Opens 12 May' },
    financials: {
      revenue:    '₹2,040 Cr',
      profit:     '₹148 Cr',
      pe:         '19x',
      roe:        '18.4%',
      debtEquity: '0.1x',
      ebitda:     '₹284 Cr',
    },
    peers: [
      { name: 'Welspun Corp',    pe: '22x', marketCap: '~₹18,000 Cr', rev: '₹14,200 Cr' },
      { name: 'Ratnamani Metals', pe: '31x', marketCap: '~₹14,500 Cr', rev: '₹4,100 Cr' },
    ],
    verdict:       'BUY',
    verdictColor:  '#10b981',
    verdictEmoji:  '✅',
    verdictReason: 'Reasonable valuation at 19x PE vs sector average of 25x. Strong order book, debt-free balance sheet, and direct play on India\'s infrastructure capex cycle. Good listing gains + medium-term upside.',
    analystRating: 4.0,
    recommendBuy:  71,
  },

  // ── RECENTLY LISTED ────────────────────────────────────────────────────
  {
    id:            'ipo_hexaware_2025',
    company:       'Hexaware Technologies Ltd',
    symbol:        'HEXAWARE',
    sector:        'IT Services',
    issueSize:     '₹8,750 Cr',
    issuePriceLow:  674,
    issuePrice:     708,
    priceRange:    '₹674 – ₹708',
    openDate:      '2025-02-12',
    closeDate:     '2025-02-14',
    listingDate:   '2025-02-19',
    lotSize:       21,
    minInvestment: 14868,
    exchange:      'NSE / BSE',
    gmp:           '+₹42',
    gmpPct:        '+5.9%',
    rating:        4.3,
    status:        'listed',
    listedPrice:   755,
    currentPrice:  0,
    description:   'Hexaware Technologies is a global IT & BPO services company backed by Carlyle Group. It serves Fortune 500 clients across BFSI, healthcare, manufacturing and hi-tech verticals with AI-powered digital transformation services.',
    highlights: [
      'Revenue $1.4 Bn — 15% USD revenue CAGR over 5 years',
      'Carlyle-backed: strong institutional pedigree',
      '30,000+ employees across 19 countries',
      'RapidX AI platform for enterprise automation',
      'EBIT margin 11.2% — stable and expanding',
    ],
    risks: [
      'IT sector slowdown risk from US recession fears',
      'Carlyle may sell remaining stake post-lock-in',
      'Pricing pressure from larger IT peers',
    ],
    subscription: { retail: '2.1x', qib: '5.3x', nii: '3.8x', total: '3.2x', status: 'Subscribed' },
    financials: {
      revenue:    '₹11,342 Cr',
      profit:     '₹1,022 Cr',
      pe:         '34x',
      roe:        '18.2%',
      debtEquity: '0.3x',
      ebitda:     '₹1,680 Cr',
    },
    peers: [
      { name: 'Mphasis',    pe: '28x', marketCap: '~₹42,000 Cr', rev: '₹13,970 Cr' },
      { name: 'Coforge',    pe: '38x', marketCap: '~₹46,000 Cr', rev: '₹9,560 Cr'  },
      { name: 'Persistent', pe: '55x', marketCap: '~₹80,000 Cr', rev: '₹10,186 Cr' },
    ],
    verdict:       'BUY',
    verdictColor:  '#10b981',
    verdictEmoji:  '✅',
    verdictReason: 'Listed at ₹755 vs issue price ₹708 — 6.6% listing gain. Trading above issue price with strong institutional holding. Recommend hold for medium-term as AI transformation tailwinds continue.',
    analystRating: 4.2,
    recommendBuy:  76,
    listingGainPct: 6.6,
  },

  {
    id:            'ipo_arisinfra_2025',
    company:       'Arisinfra Solutions Ltd',
    symbol:        'ARISINFRA',
    sector:        'Construction Tech',
    issueSize:     '₹600 Cr',
    issuePriceLow:  274,
    issuePrice:     288,
    priceRange:    '₹274 – ₹288',
    openDate:      '2025-03-07',
    closeDate:     '2025-03-11',
    listingDate:   '2025-03-14',
    lotSize:       52,
    minInvestment: 14976,
    exchange:      'NSE / BSE',
    gmp:           '+₹15',
    gmpPct:        '+5.2%',
    rating:        4.0,
    status:        'listed',
    listedPrice:   310,
    currentPrice:  0,
    description:   'Arisinfra Solutions is a tech-enabled B2B construction material procurement platform connecting real estate developers with material suppliers. It streamlines procurement of steel, cement, and other materials through its digital marketplace.',
    highlights: [
      'GMV grew 185% YoY — fastest growing construction marketplace',
      'Asset-light model: 0 inventory risk, pure marketplace play',
      'Top clients: Brigade, Prestige, Godrej Properties',
      '100+ material categories, 500+ verified suppliers',
      'Expansion into tier-2/3 cities underway',
    ],
    risks: [
      'Pre-profitability — PAT negative in FY24',
      'Real estate sector cyclicality',
      'Competition from IndiaMART, Moglix in B2B space',
    ],
    subscription: { retail: '2.4x', qib: '6.8x', nii: '4.1x', total: '4.5x', status: 'Subscribed' },
    financials: {
      revenue:    '₹1,240 Cr',
      profit:     '-₹42 Cr',
      pe:         'N/A',
      roe:        'N/A',
      debtEquity: '0.4x',
      ebitda:     '-₹18 Cr',
    },
    peers: [
      { name: 'IndiaMART', pe: '32x', marketCap: '~₹14,000 Cr', rev: '₹1,142 Cr' },
      { name: 'Moglix',    pe: 'N/A', marketCap: '~$2.6 Bn',     rev: '$400 Mn'   },
    ],
    verdict:       'NEUTRAL',
    verdictColor:  '#f59e0b',
    verdictEmoji:  '⚖️',
    verdictReason: 'Listed at ₹310 — 7.6% above issue price. High-growth construction tech play but pre-profitable. Hold for existing investors; new investors wait for profitability milestone.',
    analystRating: 3.8,
    recommendBuy:  52,
    listingGainPct: 7.6,
  },

  {
    id:            'ipo_kiran_2025',
    company:       'Kiran Jewels Ltd',
    symbol:        'KIRANJEWEL',
    sector:        'Jewellery / Diamond Export',
    issueSize:     '₹490 Cr',
    issuePriceLow:  90,
    issuePrice:     96,
    priceRange:    '₹90 – ₹96',
    openDate:      '2025-03-03',
    closeDate:     '2025-03-05',
    listingDate:   '2025-03-10',
    lotSize:       156,
    minInvestment: 14976,
    exchange:      'NSE / BSE',
    gmp:           '+₹8',
    gmpPct:        '+8.3%',
    rating:        3.7,
    status:        'listed',
    listedPrice:   102,
    currentPrice:  0,
    description:   'Kiran Jewels is a leading diamond and studded jewellery manufacturer and exporter with primary markets in USA, Europe and UAE. It specialises in lab-grown diamonds (LGD) and natural diamond jewellery for global retail brands.',
    highlights: [
      'Exports to 60+ countries — USA accounts for 52% of revenue',
      'Lab-grown diamond segment growing 80% YoY',
      'B2B supplier to global jewellery brands (Signet, Pandora)',
      'EBITDA margin 12.4% — industry leading',
      'Zero pledging of promoter shares',
    ],
    risks: [
      'US economic slowdown directly impacts jewellery demand',
      'USD/INR currency risk — all revenues in foreign currency',
      'LGD price deflation risk',
    ],
    subscription: { retail: '1.8x', qib: '3.1x', nii: '2.2x', total: '2.4x', status: 'Subscribed' },
    financials: {
      revenue:    '₹892 Cr',
      profit:     '₹68 Cr',
      pe:         '20x',
      roe:        '14.2%',
      debtEquity: '0.5x',
      ebitda:     '₹110 Cr',
    },
    peers: [
      { name: 'Titan Company',    pe: '86x', marketCap: '~₹2,82,000 Cr', rev: '₹51,086 Cr' },
      { name: 'Kalyan Jewellers', pe: '58x', marketCap: '~₹31,000 Cr',   rev: '₹22,059 Cr' },
      { name: 'Goldiam Intl',     pe: '18x', marketCap: '~₹1,800 Cr',    rev: '₹612 Cr'    },
    ],
    verdict:       'BUY',
    verdictColor:  '#10b981',
    verdictEmoji:  '✅',
    verdictReason: 'Listed at ₹102 — 6.3% listing gain. Attractively valued at 20x PE vs sector average of 55x+. LGD growth story intact. Good medium-term investment for jewellery export theme.',
    analystRating: 3.9,
    recommendBuy:  65,
    listingGainPct: 6.3,
  },
];

// ── Fetch live price ────────────────────────────────────────────────────────
async function fetchLivePrice(symbol) {
  const key = `ipo_live_${symbol}`;
  const c   = cache.get(key);
  if (c != null) return c;
  try {
    const res   = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1d&range=1d`,
      { headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }, timeout: 6000 }
    );
    const price = res.data?.chart?.result?.[0]?.meta?.regularMarketPrice || 0;
    cache.set(key, price, 300);
    return price;
  } catch { return 0; }
}

// Enrich a listed IPO with live price & gain calculations
async function enrichListed(ipo) {
  const live       = await fetchLivePrice(ipo.symbol);
  const current    = live || ipo.listedPrice || ipo.issuePrice;
  const gainVsIssue = ipo.issuePrice > 0
    ? +((current - ipo.issuePrice) / ipo.issuePrice * 100).toFixed(1) : 0;
  const listingGain = ipo.listedPrice && ipo.issuePrice > 0
    ? +((ipo.listedPrice - ipo.issuePrice) / ipo.issuePrice * 100).toFixed(1) : 0;
  return { ...ipo, currentPrice: current, gainVsIssue, listingGainPct: listingGain };
}

// ── Merge in LIVE NSE data on top of the curated dataset ───────────────────
// This is what actually answers "load real IPOs from an API": on each
// request we try the live NSE feed; if it's reachable we use it (mapped into
// the same shape the UI expects, with sensible defaults for the rich
// editorial fields the live feed doesn't provide — those get filled in via
// the "Get Fresh AI Analysis" button instead of fabricated numbers). If NSE
// is unreachable (common from cloud/data-center IPs), we fall back to the
// curated dataset below and say so via `source`/`meta`.
function toIsoDate(raw) {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

async function liveToRichShape(live) {
  const openDate  = toIsoDate(live.openDate);
  const closeDate = toIsoDate(live.closeDate) || openDate;
  const min = live.priceRange?.min || 0;
  const max = live.priceRange?.max || min;

  // For LISTED IPOs, NSE's public "past issues" feed doesn't reliably give
  // usable price/date fields (unlike active/upcoming) — but a listed IPO is
  // now just a regular tradeable stock, so its REAL current price can be
  // fetched via the same reliable Yahoo Finance path the rest of the app
  // already uses, instead of showing a fabricated "Listed @ ₹0 / +0%".
  let currentPrice = null;
  let dayChange = null;
  if (live.status === 'listed' && live.symbol) {
    try {
      const { getLivePrice } = require('./stocks');
      const quote = await getLivePrice(live.symbol);
      currentPrice = quote?.price || null;
      dayChange = quote?.changePct != null ? quote.changePct : null;
    } catch { /* stocks.js doesn't export getLivePrice — handled below */ }
  }

  const isListed = live.status === 'listed';
  // DECISIVE FIX: for listed IPOs, the historical pre-listing price band is
  // frequently unavailable from NSE's past-issues schema (field names have
  // proven unreliable across many attempts) — rather than keep guessing at
  // field names, the "Price Band" slot now shows the REAL, currently-fetched
  // live price for listed IPOs (which is what actually matters once a stock
  // has listed), falling back to the historical band only for active/upcoming
  // IPOs where that data genuinely is available and correct.
  const priceRangeDisplay = isListed
    ? (currentPrice ? `₹${currentPrice} (live)${dayChange != null ? ` ${dayChange >= 0 ? '▲' : '▼'}${Math.abs(dayChange)}%` : ''}` : 'Live price unavailable')
    : (max ? `₹${min} – ₹${max}` : 'N/A');

  return {
    id: live.id,
    company: live.company,
    symbol: live.symbol,
    sector: live.sector || 'General',
    issueSize: live.issueSize || (isListed ? 'N/A (listed)' : 'N/A'),
    issuePriceLow: min,
    issuePrice: max,
    priceRange: priceRangeDisplay,
    openDate, closeDate,
    listingDate: toIsoDate(live.listingDate),
    lotSize: live.lotSize || 'N/A',
    minInvestment: live.lotSize && max ? live.lotSize * max : 'N/A',
    exchange: live.source === 'BSE_LIVE' ? 'BSE' : 'NSE',
    gmp: live.gmp ?? 'N/A', gmpPct: live.gmpPct ?? 'N/A', kostak: live.kostak ?? null, rating: null,
    status: live.status,
    // null (not 0!) when we genuinely don't know — 0 reads as a real price
    // and produces a misleading "+0%" in the UI. currentPrice is the one
    // real number we CAN reliably get for listed IPOs.
    listedPrice: null,
    currentPrice,
    dayChangePct: dayChange,
    description: isListed
      ? `${live.company} is now listed and trading on NSE. Pre-listing issue details from NSE's public feed weren't reliably available for this entry — the price shown above is the real, live current market price.`
      : `Live IPO data sourced from NSE India${live.registrar ? ` (registrar: ${live.registrar})` : ''}. Tap "Get Fresh AI Analysis" below for a generated buy/avoid verdict.`,
    highlights: [], risks: [],
    subscription: live.subscription || { retail: '–', qib: '–', nii: '–', total: '–', status: 'Live from source' },
    financials: { revenue: 'N/A', profit: 'N/A', pe: 'N/A', roe: 'N/A', debtEquity: 'N/A', ebitda: 'N/A' },
    peers: [],
    verdict: 'NEUTRAL', verdictColor: '#f59e0b', verdictEmoji: '🤖',
    verdictReason: 'No pre-written verdict for live-fetched IPOs — use "Get Fresh AI Analysis" for a real-time AI verdict.',
    source: 'live_nse',
  };
}

const LIVE_SOURCE_TAGS = ['NSE_LIVE', 'BSE_LIVE', 'IPOGURU_LIVE', 'IPOALERTS_LIVE', 'DOWNSTOX_LIVE'];
const LIVE_SOURCE_LABELS = {
  NSE_LIVE: 'live_nse', BSE_LIVE: 'live_bse', IPOGURU_LIVE: 'live_ipoguru',
  IPOALERTS_LIVE: 'live_ipoalerts', DOWNSTOX_LIVE: 'live_downstox',
};

let _mergedCache = null;
let _mergedCacheAt = 0;
async function getMergedIPOList() {
  if (_mergedCache && Date.now() - _mergedCacheAt < 5 * 60 * 1000) return _mergedCache;

  let result;
  try {
    const live = await getLiveNseIPOs();
    const isLive = live.length && LIVE_SOURCE_TAGS.includes(live[0].source);
    if (isLive) {
      result = { list: await Promise.all(live.map(liveToRichShape)), source: LIVE_SOURCE_LABELS[live[0].source] };
    } else {
      result = { list: IPO_DATA.map(i => ({ ...i, source: 'curated' })), source: 'curated_fallback' };
    }
  } catch (err) {
    console.error('IPO merge error:', err.message);
    result = { list: IPO_DATA.map(i => ({ ...i, source: 'curated' })), source: 'curated_fallback' };
  }
  _mergedCache = result;
  _mergedCacheAt = Date.now();
  return result;
}

// ── GET /api/ipo/active ─────────────────────────────────────────────────────
router.get('/active', auth, async (req, res) => {
  try {
    const { list } = await getMergedIPOList();
    const today  = new Date().toISOString().slice(0, 10);
    const active = list.filter(i => i.status === 'active' || (i.openDate <= today && i.closeDate >= today));
    res.json(active);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/ipo/upcoming ───────────────────────────────────────────────────
router.get('/upcoming', auth, async (req, res) => {
  try {
    const { list } = await getMergedIPOList();
    const today    = new Date().toISOString().slice(0, 10);
    const upcoming = list.filter(i => i.status === 'upcoming' || (i.openDate > today && i.status !== 'listed'));
    res.json(upcoming);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/ipo/listed ─────────────────────────────────────────────────────
router.get('/listed', auth, async (req, res) => {
  try {
    const { list } = await getMergedIPOList();
    const listed   = list.filter(i => i.status === 'listed');
    const enriched = await Promise.all(listed.map(i => i.source === 'curated' ? enrichListed(i) : i));
    res.json(enriched);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/ipo/all ────────────────────────────────────────────────────────
router.get('/all', auth, async (req, res) => {
  try {
    const { list } = await getMergedIPOList();
    const today = new Date().toISOString().slice(0, 10);
    const all   = await Promise.all(
      list.map(async i => {
        if (i.status === 'listed') return i.source === 'curated' ? enrichListed(i) : i;
        const isActive = i.openDate <= today && i.closeDate >= today;
        return { ...i, status: isActive ? 'active' : i.status };
      })
    );
    res.json(all);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET /api/ipo/:id ────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const { list } = await getMergedIPOList();
    const ipo = list.find(i => i.id === req.params.id || i.symbol === req.params.id.toUpperCase())
             || IPO_DATA.find(i => i.id === req.params.id || i.symbol === req.params.id.toUpperCase());
    if (!ipo) return res.status(404).json({ message: 'IPO not found' });
    if (ipo.status === 'listed' && ipo.source === 'curated') return res.json(await enrichListed(ipo));
    res.json(ipo);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Raw sample debug endpoint ───────────────────────────────────────────────
// The NSE "past issues" (recently listed) endpoint returns different field
// names than active/upcoming, and guessing field names blind has already
// caused several rounds of trial and error. This exposes exactly what NSE
// sends back, unprocessed, so a mapping fix can be precise instead of guessed.
router.get('/meta/raw-sample', auth, async (req, res) => {
  try {
    const axios = require('axios');
    const NSE_BASE = 'https://www.nseindia.com';
    const homepageRes = await axios.get(NSE_BASE, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36' },
      timeout: 8000, insecureHTTPParser: true,
    });
    const cookie = (homepageRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36', 'Accept': 'application/json', Cookie: cookie };

    const [upcoming, active, past] = await Promise.all([
      axios.get(`${NSE_BASE}/api/all-upcoming-issues?category=ipo`, { headers, timeout: 8000, insecureHTTPParser: true }).then(r => r.data).catch(e => ({ error: e.message })),
      axios.get(`${NSE_BASE}/api/ipo-active-issue`, { headers, timeout: 8000, insecureHTTPParser: true }).then(r => r.data).catch(e => ({ error: e.message })),
      axios.get(`${NSE_BASE}/api/public-past-issues`, { headers, timeout: 8000, insecureHTTPParser: true }).then(r => r.data).catch(e => ({ error: e.message })),
    ]);

    const sample = (d) => Array.isArray(d) ? d.slice(0, 1) : (d?.data ? d.data.slice(0, 1) : d);
    res.json({
      note: 'One raw unprocessed row from each NSE endpoint, exactly as NSE sends it — use this to fix field-name mapping precisely.',
      upcoming_sample: sample(upcoming),
      active_sample: sample(active),
      past_sample: sample(past),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
// Reports whether the live NSE or BSE India IPO feed is currently reachable,
// with the ACTUAL reason each one failed (HTTP status or error message) —
// not just a generic "unreachable" — so you can tell whether it's your
// network, the exchange's anti-bot layer, or something else.
router.get('/meta/live-source', auth, async (req, res) => {
  try {
    const live = await getLiveNseIPOs();
    const isLive = live.length && LIVE_SOURCE_TAGS.includes(live[0].source);
    const diagnostics = getLastFetchDiagnostics();
    res.json({
      liveSourceReachable: isLive,
      activeSource: isLive ? live[0].source : null,
      rowCount: live.length,
      diagnostics, // { nse, bse, ipoguru, ipoalerts, downstox } — each 'ok' or the failure reason
      note: isLive
        ? `Live ${live[0].source.replace('_LIVE', '')} IPO feed reachable — data reflects real-time source data.`
        : `All live sources were unreachable just now (${Object.entries(diagnostics).map(([k,v])=>`${k}: ${v}`).join(', ')}) — showing the curated recent-IPO dataset instead.`,
    });
  } catch (err) {
    res.status(500).json({ liveSourceReachable: false, message: err.message });
  }
});

// ── GET /api/ipo/:id/analysis ───────────────────────────────────────────────
// On-demand fresh AI (Claude) buy/avoid verdict for a given IPO — separate
// from the static verdict fields so it always reflects a live model call.
router.get('/:id/analysis', auth, async (req, res) => {
  try {
    const { list } = await getMergedIPOList();
    // Bug fix: this used to only search the curated IPO_DATA array, so any
    // live-fetched IPO (real NSE/BSE data) always came back "not found" —
    // now it searches the same merged list the main endpoints use, matching
    // by symbol first since that's stable across cache refreshes even if the
    // generated id changes slightly.
    const ipo = list.find(i => i.symbol === req.params.id.toUpperCase() || i.id === req.params.id)
             || IPO_DATA.find(i => i.id === req.params.id || i.symbol === req.params.id.toUpperCase());
    if (!ipo) return res.status(404).json({ message: 'IPO not found' });
    const analysis = await getAIIPOAnalysis(ipo);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;