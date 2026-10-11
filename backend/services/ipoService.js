const axios = require('axios');
const ipoCache = require('../config/cache'); // exposes { get, set, del, flush, stats }
const { groqChatJSON } = require('../utils/groqClient');

// ─────────────────────────────────────────────────────────────────────────
// NOTE ON DATA SOURCE:
// KFintech and MUFG Intime (the RTAs / registrars) do NOT publish a public
// developer API — they only expose registrar-specific "check allotment
// status" web forms meant for individual applicants, not bulk data feeds.
// The exchange itself (NSE India) DOES expose a public JSON API that
// aggregates every IPO across all registrars (including KFintech & MUFG
// Intime) — that's what real trading apps use, and what we call here.
// If NSE blocks the request (common from data-center IPs / no browser
// cookie), we fall back to the last successfully cached data, then to a
// curated snapshot so the UI never breaks.
// ─────────────────────────────────────────────────────────────────────────

const NSE_BASE = 'https://www.nseindia.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
  'Accept': 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer': 'https://www.nseindia.com/market-data/all-upcoming-issues-ipo',
  'Connection': 'keep-alive',
  // NSE's WAF checks these fetch-metadata / client-hint headers, which a
  // plain HTTP client doesn't send by default — mimicking them is the
  // standard, widely-documented fix for NSE returning 403 to script clients
  // even after a valid session cookie was minted.
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'X-Requested-With': 'XMLHttpRequest',
};

let sessionCookie = null;
let sessionFetchedAt = 0;

async function getNseSession() {
  // NSE requires a homepage visit first to mint anti-bot cookies.
  if (sessionCookie && Date.now() - sessionFetchedAt < 4 * 60 * 1000) return sessionCookie;
  const res = await axios.get(NSE_BASE, { headers: HEADERS, timeout: 8000, insecureHTTPParser: true });
  const setCookie = res.headers['set-cookie'];
  if (!setCookie) throw new Error('NSE homepage responded but sent no session cookie (likely blocked/CAPTCHA-gated the request)');
  sessionCookie = setCookie.map(c => c.split(';')[0]).join('; ');
  sessionFetchedAt = Date.now();
  return sessionCookie;
}

async function nseGet(path) {
  const cookie = await getNseSession();
  // A tiny delay between minting the session cookie and the first API call
  // makes the request pattern look less like an instant scripted fetch,
  // which some WAF heuristics key on.
  await new Promise(r => setTimeout(r, 400 + Math.random() * 300));
  const res = await axios.get(`${NSE_BASE}${path}`, {
    headers: { ...HEADERS, Cookie: cookie },
    timeout: 10000,
    insecureHTTPParser: true,
  });
  return res.data;
}

function describeAxiosError(err) {
  if (err.response) return `HTTP ${err.response.status}`;
  if (err.code) return err.code; // e.g. ECONNREFUSED, ETIMEDOUT, ECONNRESET
  return err.message || 'unknown error';
}

function normalizeNseIpo(raw, status) {
  const symbol = (raw.symbol || raw.companyName || raw.company_name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

  // NSE's real payload gives price as a text string like "Rs.408 to Rs.429"
  // — parse the actual numbers out, requiring a match to START with a digit
  // (NOT [\d.]+, which was the bug: that greedily grabbed the period right
  // after "Rs." as part of the number, turning "408" into "0.408").
  const priceRaw = String(raw.issuePrice || raw.issuePriceRange || raw.finalIssuePrice || raw.offerPrice || '');
  const priceNums = priceRaw.match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  let min = priceNums[0] || Number(raw.issuePriceLow || raw.minPrice || 0);
  let max = priceNums[1] || priceNums[0] || Number(raw.issuePriceHigh || raw.maxPrice || min);

  // Sanity guard: real Indian IPO share prices are essentially never below
  // ₹1. A value like "0.408" means we parsed the wrong field entirely (NSE's
  // exact field name for this endpoint is still unconfirmed — see the
  // console.log below and /api/ipo/meta/raw-sample) — show N/A honestly
  // rather than a clearly-wrong number.
  if (max > 0 && max < 1) { min = 0; max = 0; }

  // One-time diagnostic PER STATUS CATEGORY: prints the actual raw field
  // names NSE sent for the first row of each of active/upcoming/listed, so
  // the mapping can be fixed precisely for whichever category is still
  // wrong (the "past issues"/listed endpoint uses different field names
  // than active/upcoming — a single global flag was only ever catching the
  // first category processed, never the others).
  normalizeNseIpo._loggedStatuses = normalizeNseIpo._loggedStatuses || new Set();
  if (!normalizeNseIpo._loggedStatuses.has(status)) {
    console.log(`🔍 RAW NSE ROW SAMPLE [status=${status}] (for field-mapping diagnosis):`, JSON.stringify(raw, null, 2));
    normalizeNseIpo._loggedStatuses.add(status);
  }

  const lotSize = Number(raw.marketLot || raw.lotSize || raw.lot_size || 0) || null;
  const sharesOffered = Number(raw.noOfSharesOffered || raw.issueSize || raw.no_of_shares || 0) || null;
  const issueSizeCr = sharesOffered && max ? +(sharesOffered * max / 1e7).toFixed(1) : null;

  return {
    id: `ipo_${symbol || Math.random().toString(36).slice(2, 8)}`,
    company: raw.companyName || raw.company || raw.company_name || raw.symbol || 'Unknown',
    symbol,
    sector: raw.series || raw.sector || raw.industry || 'General',
    priceRange: { min, max },
    lotSize,
    sharesOffered,
    issueSize: issueSizeCr ? `₹${issueSizeCr} Cr` : (sharesOffered ? `${sharesOffered.toLocaleString('en-IN')} shares` : null),
    openDate: raw.issueStartDate || raw.startDate || raw.issue_start_date || null,
    closeDate: raw.issueEndDate || raw.endDate || raw.issue_end_date || null,
    listingDate: raw.listingDate || raw.dateOfListing || raw.listing_date || null,
    status,
    registrar: raw.registrar || null, // e.g. "KFin Technologies", "Link Intime (MUFG Intime)"
    source: 'NSE_LIVE',
  };
}

// ── Secondary live source: BSE India's public IPO API ──────────────────────
// BSE's AJAX endpoint (used by their own website widgets) generally has
// lighter bot-protection than NSE's WAF, so it's tried as a fallback before
// giving up and using the curated dataset.
const BSE_URL = 'https://api.bseindia.com/BseIndiaAPI/api/IPODetails/w?filter=A';
const BSE_HEADERS = {
  'User-Agent': HEADERS['User-Agent'],
  'Accept': 'application/json',
  'Referer': 'https://www.bseindia.com/publicissue/IPODetails.aspx',
  'Origin': 'https://www.bseindia.com',
};

function normalizeBseIpo(raw) {
  const symbol = (raw.SCRIP_NAME || raw.Company_Name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const min = Number(raw.Price_Range_Min || raw.MinPrice || 0);
  const max = Number(raw.Price_Range_Max || raw.MaxPrice || min);
  const today = new Date().toISOString().slice(0, 10);
  const open  = raw.Start_Date ? new Date(raw.Start_Date).toISOString().slice(0, 10) : null;
  const close = raw.End_Date   ? new Date(raw.End_Date).toISOString().slice(0, 10)   : null;
  const status = close && close < today ? 'listed' : (open && open <= today ? 'active' : 'upcoming');
  return {
    id: `ipo_bse_${symbol || Math.random().toString(36).slice(2, 8)}`,
    company: raw.Company_Name || raw.SCRIP_NAME || 'Unknown',
    symbol, sector: raw.Sector || 'General',
    priceRange: { min, max },
    lotSize: Number(raw.Lot_Size || 0) || null,
    issueSize: raw.Issue_Size || null,
    openDate: open, closeDate: close, listingDate: null,
    status, registrar: raw.Registrar || null, source: 'BSE_LIVE',
  };
}

async function fetchLiveFromBSE() {
  // BSE's server occasionally sends a header that Node's strict HTTP parser
  // rejects with "Unexpected whitespace after header value" — insecureHTTPParser
  // relaxes that validation (this is about tolerating BSE's response, not a
  // security-relevant setting for a read-only public data fetch).
  const res = await axios.get(BSE_URL, { headers: BSE_HEADERS, timeout: 10000, insecureHTTPParser: true });
  const rows = Array.isArray(res.data) ? res.data : res.data?.Table || [];
  if (!rows.length) throw new Error('BSE returned no IPO rows');
  return rows.map(normalizeBseIpo);
}

async function fetchLiveFromNSE() {
  const subErrors = {};
  const [upcoming, active, past] = await Promise.all([
    nseGet('/api/all-upcoming-issues?category=ipo').catch(e => { subErrors.upcoming = describeAxiosError(e); return []; }),
    nseGet('/api/ipo-active-issue').catch(e => { subErrors.active = describeAxiosError(e); return []; }),
    nseGet('/api/public-past-issues').catch(e => { subErrors.past = describeAxiosError(e); return []; }),
  ]);

  const upcomingList = (Array.isArray(upcoming) ? upcoming : upcoming?.data || []).map(r => normalizeNseIpo(r, 'upcoming'));
  const activeList   = (Array.isArray(active)   ? active   : active?.data   || []).map(r => normalizeNseIpo(r, 'active'));
  const listedList   = (Array.isArray(past)     ? past     : past?.data     || []).slice(0, 15).map(r => normalizeNseIpo(r, 'listed'));

  const all = [...activeList, ...upcomingList, ...listedList];
  if (all.length === 0) {
    const detail = Object.entries(subErrors).map(([k, v]) => `${k}: ${v}`).join(', ') || 'all 3 endpoints returned empty with no error (unusual — NSE may have changed its response shape)';
    throw new Error(`NSE returned no IPO rows (${detail})`);
  }
  return all;
}

// ── Additional fallback sources ─────────────────────────────────────────────
// NOTE: these three were suggested by the user, not independently verified by
// this code's author — DNS resolves for all three domains, but the exact
// endpoint paths, auth scheme, and "free tier" claims are unconfirmed. Each
// is wrapped defensively: a wrong assumption about response shape just fails
// into the next source rather than breaking anything. If one of these turns
// out to work, tell me its actual response shape and I'll tighten the parser.

// 1) IPO Guru — https://www.ipoguru.in (needs IPOGURU_API_KEY per the docs shared)
async function fetchLiveFromIpoGuru() {
  if (!process.env.IPOGURU_API_KEY) throw new Error('IPOGURU_API_KEY not configured');
  const res = await axios.get('https://www.ipoguru.in/api/v1/ipos', {
    params: { type: 'mainboard', status: 'open' },
    headers: { 'X-API-KEY': process.env.IPOGURU_API_KEY },
    timeout: 8000, insecureHTTPParser: true,
  });
  const rows = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.ipos || [];
  if (!rows.length) throw new Error('IPO Guru returned no rows');
  return rows.map(r => normalizeGenericIpo(r, 'IPOGURU_LIVE'));
}

// 2) IPOAlerts — https://ipoalerts.in (needs IPOALERTS_API_KEY per the docs shared)
async function fetchLiveFromIpoAlerts() {
  if (!process.env.IPOALERTS_API_KEY) throw new Error('IPOALERTS_API_KEY not configured');
  const res = await axios.get('https://api.ipoalerts.in/ipos', {
    params: { status: 'open', limit: 20 },
    headers: { 'x-api-key': process.env.IPOALERTS_API_KEY },
    timeout: 8000, insecureHTTPParser: true,
  });
  const rows = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.ipos || [];
  if (!rows.length) throw new Error('IPOAlerts returned no rows');
  return rows.map(r => normalizeGenericIpo(r, 'IPOALERTS_LIVE'));
}

// 3) "Downstox" — unauthenticated per the docs shared. Flagged above: double
// check this isn't confused with Upstox (a real, unrelated broker) before
// trusting it in production.
async function fetchLiveFromDownstox() {
  const res = await axios.get('https://downstox.com/api/ipo/gmp', { timeout: 8000, insecureHTTPParser: true });
  const rows = Array.isArray(res.data) ? res.data : res.data?.data || res.data?.ipos || [];
  if (!rows.length) throw new Error('Downstox returned no rows');
  return rows.map(r => normalizeGenericIpo(r, 'DOWNSTOX_LIVE'));
}

// Generic normalizer that tries several common field-name variants, since
// the exact schema of these three sources is unverified.
function normalizeGenericIpo(raw, source) {
  const company = raw.companyName || raw.company || raw.name || 'Unknown';
  const symbol  = (raw.symbol || company).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
  const min = Number(raw.priceRangeMin || raw.minPrice || raw.issuePriceLow  || raw.price_min || 0);
  const max = Number(raw.priceRangeMax || raw.maxPrice || raw.issuePriceHigh || raw.price_max || min);
  return {
    id: `ipo_${source.toLowerCase()}_${symbol || Math.random().toString(36).slice(2, 8)}`,
    company, symbol,
    sector: raw.sector || raw.industry || 'General',
    priceRange: { min, max },
    lotSize: Number(raw.lotSize || raw.lot_size || 0) || null,
    issueSize: raw.issueSize || raw.issue_size || null,
    openDate: raw.openDate || raw.startDate || raw.open_date || null,
    closeDate: raw.closeDate || raw.endDate || raw.close_date || null,
    listingDate: raw.listingDate || raw.listing_date || null,
    status: raw.status || 'upcoming',
    gmp: raw.gmp ?? null,
    registrar: raw.registrar || null,
    source,
  };
}

// Tries NSE first, then BSE, then the three user-suggested sources (only if
// their API keys are configured), and records why each attempt failed.
let lastFetchDiagnostics = { nse: null, bse: null, ipoguru: null, ipoalerts: null, downstox: null };

async function fetchLiveIPOs() {
  const sources = [
    { key: 'nse',       fn: fetchLiveFromNSE },
    { key: 'bse',       fn: fetchLiveFromBSE },
    { key: 'ipoguru',   fn: fetchLiveFromIpoGuru },
    { key: 'ipoalerts', fn: fetchLiveFromIpoAlerts },
    { key: 'downstox',  fn: fetchLiveFromDownstox },
  ];
  for (const { key, fn } of sources) {
    try {
      const data = await fn();
      lastFetchDiagnostics[key] = 'ok';
      return data;
    } catch (err) {
      lastFetchDiagnostics[key] = err.response?.status ? `HTTP ${err.response.status}` : err.message;
    }
  }
  throw new Error(Object.entries(lastFetchDiagnostics).map(([k, v]) => `${k}: ${v}`).join('; '));
}

// ── Curated fallback snapshot (used only if NSE is unreachable, e.g. from a
//    cloud data-center IP that NSE's WAF blocks). Kept intentionally small
//    and clearly labelled so it's never confused with live data. ──────────
const FALLBACK_IPOS = [
  {
    id: 'ipo_fallback_1', company: 'Sample Upcoming IPO', symbol: 'SAMPLEIPO', sector: 'General',
    priceRange: { min: 100, max: 110 }, lotSize: 100, issueSize: '500 Cr',
    openDate: null, closeDate: null, listingDate: null, status: 'upcoming',
    registrar: 'KFin Technologies', source: 'FALLBACK_STATIC',
    note: 'Live NSE feed unavailable right now — showing a placeholder. Retry shortly.',
  },
];

async function getAllIPOs() {
  const cacheKey = 'live_ipos_v2';
  const cached = ipoCache.get(cacheKey);
  if (cached) return cached;

  try {
    const live = await fetchLiveIPOs();
    ipoCache.set(cacheKey, live, 900); // 15 min — IPO data doesn't change second-to-second
    // Bug fix: this "stale" fallback was being READ below but never WRITTEN
    // anywhere, so it was always empty and every failed fetch fell straight
    // through to the generic single-item placeholder instead of the last
    // real live data. Now it's actually saved on every success, with a much
    // longer 24h TTL, so a temporary NSE/BSE block shows genuinely fresh
    // (if slightly older) data instead of an obviously fake placeholder.
    ipoCache.set(`${cacheKey}_stale`, live, 24 * 60 * 60);
    return live;
  } catch (err) {
    console.error('IPO live fetch failed (both NSE and BSE), using fallback:', err.message);
    const stale = ipoCache.get(`${cacheKey}_stale`);
    if (stale) console.log('Using last known-good live IPO data (stale cache) instead of the placeholder.');
    return stale || FALLBACK_IPOS;
  }
}

function getLastFetchDiagnostics() {
  return lastFetchDiagnostics;
}

function bucketByStatus(all) {
  return {
    active:   all.filter(i => i.status === 'active'),
    upcoming: all.filter(i => i.status === 'upcoming'),
    listed:   all.filter(i => i.status === 'listed'),
  };
}

// ── AI analysis (Groq — free API, no credit card required) ────────────────
// Buy/avoid verdict + reasoning, using Groq's free-tier Llama model instead
// of a paid API. Get a free key at https://console.groq.com/keys
async function getAIIPOAnalysis(ipo) {
  const cacheKey = `ipo_ai_${ipo.id}`;
  const cached = ipoCache.get(cacheKey);
  if (cached) return cached;

  if (!process.env.GROQ_API_KEY) {
    return {
      verdict: 'NEUTRAL',
      summary: 'AI analysis unavailable — GROQ_API_KEY is not configured on the server. Get a free key at console.groq.com/keys.',
      reasons: [],
      riskLevel: 'Unknown',
      source: 'unavailable',
    };
  }

  const prompt = `You are an Indian IPO analyst. Give a concise BUY/AVOID/NEUTRAL verdict for this IPO for a retail investor applying for listing gains.

Company: ${ipo.company} (${ipo.symbol})
Sector: ${ipo.sector}
Price band: ₹${ipo.priceRange?.min || '?'}–₹${ipo.priceRange?.max || '?'}
Lot size: ${ipo.lotSize || 'unknown'}
Issue size: ${ipo.issueSize || 'unknown'}
Status: ${ipo.status}
Registrar: ${ipo.registrar || 'unknown'}

Respond ONLY with JSON, no other text:
{"verdict":"BUY|AVOID|NEUTRAL","confidence":0-100,"reasons":["reason1","reason2","reason3"],"riskLevel":"Low|Medium|High","summary":"two sentence summary"}`;

  try {
    const parsed = await groqChatJSON({ prompt, maxTokens: 500, temperature: 0.3 });
    const result = { ...parsed, source: 'ai' };
    ipoCache.set(cacheKey, result, 3600);
    return result;
  } catch (err) {
    const apiMsg = err.response?.data?.error?.message;
    console.error('IPO AI analysis error:', apiMsg || err.message);
    return {
      verdict: 'NEUTRAL',
      summary: apiMsg ? `Groq API error: ${apiMsg}` : 'Could not generate AI analysis right now. Please try again shortly.',
      reasons: [],
      riskLevel: 'Unknown',
      source: 'error',
    };
  }
}

module.exports = { getAllIPOs, bucketByStatus, getAIIPOAnalysis, getLastFetchDiagnostics };