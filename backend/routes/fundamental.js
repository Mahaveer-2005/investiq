const router    = require('express').Router();
const axios     = require('axios');
const NodeCache = require('node-cache');
const auth      = require('../middleware/auth');

const cache = new NodeCache({ stdTTL: 3600 });

const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept':          'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Referer':         'https://finance.yahoo.com/',
  'Origin':          'https://finance.yahoo.com',
};

function toYahoo(symbol) {
  const s = (symbol || '').toString().trim().toUpperCase().replace(/\.(NS|BSE)$/i, '');
  return `${s}.NS`;
}

// ── Yahoo crumb + cookie session ──────────────────────────────────────────
// Yahoo's v7 quote and v10/v11 quoteSummary endpoints now require a session
// cookie plus a CSRF "crumb" token for unauthenticated requests — calling
// them with just a User-Agent (the old approach) now silently fails and
// returns null, which is why ratios/financials were showing as N/A while
// price (from the v8 chart endpoint, which doesn't need this) still worked.
let yahooSession = null; // { cookie, crumb, fetchedAt }

async function getYahooSession() {
  if (yahooSession && Date.now() - yahooSession.fetchedAt < 50 * 60 * 1000) return yahooSession;
  try {
    const cookieRes = await axios.get('https://fc.yahoo.com', { headers: HEADERS, timeout: 8000, validateStatus: () => true });
    const cookie = (cookieRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    const crumbRes = await axios.get('https://query1.finance.yahoo.com/v1/test/getcrumb', {
      headers: { ...HEADERS, Cookie: cookie }, timeout: 8000,
    });
    yahooSession = { cookie, crumb: crumbRes.data, fetchedAt: Date.now() };
    return yahooSession;
  } catch (e) {
    console.error('Yahoo crumb/cookie session failed:', e.message);
    yahooSession = { cookie: '', crumb: '', fetchedAt: Date.now() }; // cache the failure briefly too, avoid hammering
    return yahooSession;
  }
}

function safeNum(val) {
  if (val == null) return 0;
  if (typeof val === 'object' && val.raw != null) return Number(val.raw) || 0;
  return Number(val) || 0;
}

function safeFmt(val) {
  if (val == null) return '';
  if (typeof val === 'object' && val.fmt != null) return val.fmt;
  return String(val);
}

// ── Fetch via Yahoo Finance v8 chart (most reliable) ─────────────────────────
async function fetchChartData(yahoo) {
  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=1y&includePrePost=false`,
      { headers: HEADERS, timeout: 12000 }
    );
    const result = res.data?.chart?.result?.[0];
    if (!result) return null;

    const meta   = result.meta || {};
    const ts     = result.timestamp || [];
    const q      = result.indicators?.quote?.[0] || {};
    const closes = q.close || [];

    const priceHistory = ts.map((t, i) => ({
      date:  new Date(t * 1000).toISOString().slice(0, 10),
      price: closes[i] != null ? +closes[i].toFixed(2) : null,
    })).filter(p => p.price != null);

    return {
      price:         meta.regularMarketPrice   || meta.previousClose || 0,
      prevClose:     meta.previousClose        || 0,
      w52High:       meta.fiftyTwoWeekHigh     || Math.max(...closes.filter(Boolean)),
      w52Low:        meta.fiftyTwoWeekLow      || Math.min(...closes.filter(Boolean)),
      marketCap:     meta.marketCap            || 0,
      symbol:        meta.symbol               || yahoo,
      currency:      meta.currency             || 'INR',
      exchangeName:  meta.exchangeName         || 'NSE',
      shortName:     meta.shortName            || '',
      avgVolume:     meta.averageDailyVolume10Day || 0,
      priceHistory,
    };
  } catch (e) {
    console.error(`Chart fetch failed [${yahoo}]:`, e.message);
    return null;
  }
}

// ── Fetch via Yahoo Finance v10 quoteSummary ──────────────────────────────────
async function fetchQuoteSummary(yahoo) {
  const modules = [
    'summaryDetail', 'defaultKeyStatistics', 'financialData',
    'incomeStatementHistory', 'balanceSheetHistory', 'cashflowStatementHistory',
    'earningsTrend', 'institutionOwnership', 'majorHoldersBreakdown',
    'price', 'assetProfile',
  ].join(',');

  const session = await getYahooSession();
  const authHeaders = { ...HEADERS, Cookie: session.cookie };
  const crumbParam = session.crumb ? `&crumb=${encodeURIComponent(session.crumb)}` : '';

  // Try both query1 and query2, WITH the crumb+cookie session attached —
  // without this, Yahoo silently returns an empty/unauthorized response.
  for (const host of ['query1', 'query2']) {
    try {
      const res = await axios.get(
        `https://${host}.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(yahoo)}?modules=${modules}&formatted=true${crumbParam}`,
        { headers: authHeaders, timeout: 15000 }
      );
      const result = res.data?.quoteSummary?.result?.[0];
      if (result && Object.keys(result).length > 0) return result;
    } catch (e) {
      console.error(`quoteSummary [${host}] failed:`, e.response?.status, e.message);
    }
  }

  // Try v11
  try {
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v11/finance/quoteSummary/${encodeURIComponent(yahoo)}?modules=summaryDetail,defaultKeyStatistics,financialData,price,assetProfile${crumbParam}`,
      { headers: authHeaders, timeout: 12000 }
    );
    const result = res.data?.quoteSummary?.result?.[0];
    if (result) return result;
  } catch (e) {
    console.error(`v11 quoteSummary failed:`, e.response?.status, e.message);
  }

  return null;
}

// ── Fetch Yahoo Finance quote (fast price data) ───────────────────────────────
async function fetchQuote(yahoo) {
  try {
    const session = await getYahooSession();
    const crumbParam = session.crumb ? `&crumb=${encodeURIComponent(session.crumb)}` : '';
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(yahoo)}&fields=regularMarketPrice,regularMarketPreviousClose,fiftyTwoWeekHigh,fiftyTwoWeekLow,marketCap,trailingPE,forwardPE,priceToBook,trailingEps,bookValue,dividendYield,beta,averageVolume,shortName,longName,sector,industry,epsTrailingTwelveMonths${crumbParam}`,
      { headers: { ...HEADERS, Cookie: session.cookie }, timeout: 8000 }
    );
    const q = res.data?.quoteResponse?.result?.[0];
    return q || null;
  } catch (e) {
    console.error(`Quote fetch failed:`, e.response?.status, e.message);
    return null;
  }
}

// ── Main fetcher combining all sources ────────────────────────────────────────
async function fetchFundamentals(symbol) {
  const yahoo = toYahoo(symbol);
  const key   = `fund2_${yahoo}`;
  const c     = cache.get(key);
  if (c) return c;

  console.log(`Fetching fundamentals for ${yahoo}...`);

  // Fetch all sources in parallel
  const [chartData, quoteSummary, quoteData] = await Promise.all([
    fetchChartData(yahoo),
    fetchQuoteSummary(yahoo),
    fetchQuote(yahoo),
  ]);

  if (!chartData && !quoteData && !quoteSummary) {
    throw new Error(`No data found for ${symbol}. Check if it's a valid NSE symbol.`);
  }

  // Extract from quoteSummary
  const sd  = quoteSummary?.summaryDetail          || {};
  const ks  = quoteSummary?.defaultKeyStatistics   || {};
  const fd  = quoteSummary?.financialData          || {};
  const is0 = quoteSummary?.incomeStatementHistory?.incomeStatementHistory?.[0] || {};
  const bs0 = quoteSummary?.balanceSheetHistory?.balanceSheetStatements?.[0]    || {};
  const cf0 = quoteSummary?.cashflowStatementHistory?.cashflowStatements?.[0]   || {};
  const et  = quoteSummary?.earningsTrend?.trend   || [];
  const io  = quoteSummary?.institutionOwnership?.ownershipList || [];
  const mh  = quoteSummary?.majorHoldersBreakdown  || {};
  const pr  = quoteSummary?.price                  || {};
  const ap  = quoteSummary?.assetProfile           || {};

  // Quarterly income (last 4 quarters)
  const quarterlyIncome = (quoteSummary?.incomeStatementHistory?.incomeStatementHistory || [])
    .slice(0, 4).map(q => ({
      date:      safeFmt(q.endDate) || '',
      revenue:   safeNum(q.totalRevenue),
      netIncome: safeNum(q.netIncome),
      ebitda:    safeNum(q.ebitda) || safeNum(q.operatingIncome),
    })).reverse();

  // Price — priority: quoteData > chartData > quoteSummary
  const price     = quoteData?.regularMarketPrice  || chartData?.price       || safeNum(pr.regularMarketPrice) || 0;
  const marketCap = quoteData?.marketCap           || chartData?.marketCap   || safeNum(pr.marketCap)          || 0;
  const w52High   = quoteData?.fiftyTwoWeekHigh    || chartData?.w52High     || safeNum(sd.fiftyTwoWeekHigh)   || 0;
  const w52Low    = quoteData?.fiftyTwoWeekLow     || chartData?.w52Low      || safeNum(sd.fiftyTwoWeekLow)    || 0;
  const avgVol    = quoteData?.averageVolume        || chartData?.avgVolume   || safeNum(sd.averageVolume)      || 0;
  const name      = quoteData?.shortName || quoteData?.longName || chartData?.shortName || safeFmt(pr.shortName) || safeFmt(pr.longName) || symbol;
  const sector    = quoteData?.sector    || ap?.sector    || safeFmt(pr.sector)    || 'N/A';
  const industry  = quoteData?.industry  || ap?.industry  || safeFmt(pr.industry)  || 'N/A';
  const beta      = quoteData?.beta      || safeNum(sd.beta) || safeNum(ks.beta)   || 0;

  // EPS & ratios — multiple fallbacks
  const eps      = quoteData?.epsTrailingTwelveMonths || quoteData?.trailingEps || safeNum(ks.trailingEps) || safeNum(pr.epsTrailingTwelveMonths) || 0;
  const bookVal  = quoteData?.bookValue  || safeNum(ks.bookValue)  || 0;
  const pe       = quoteData?.trailingPE || safeNum(sd.trailingPE) || safeNum(ks.trailingPE) || (eps > 0 && price > 0 ? +(price/eps).toFixed(2) : 0);
  const pb       = quoteData?.priceToBook|| safeNum(sd.priceToBook)|| safeNum(ks.priceToBook)|| (bookVal > 0 && price > 0 ? +(price/bookVal).toFixed(2) : 0);
  const forwardPE = quoteData?.forwardPE || safeNum(sd.forwardPE)  || safeNum(ks.forwardPE)  || 0;
  const divYield  = (quoteData?.dividendYield || safeNum(sd.dividendYield) || 0) * (quoteData?.dividendYield > 0.1 ? 1 : 100);

  // Financial data
  const revenue      = safeNum(is0.totalRevenue)  || safeNum(fd.totalRevenue)     || 0;
  const netIncome    = safeNum(is0.netIncome)      || safeNum(fd.netIncomeToCommon)|| 0;
  const ebitda       = safeNum(fd.ebitda)          || safeNum(is0.ebitda)          || 0;
  const totalDebt    = safeNum(bs0.longTermDebt)   || safeNum(fd.totalDebt)        || 0;
  const totalEquity  = safeNum(bs0.totalStockholderEquity) || 0;
  const totalAssets  = safeNum(bs0.totalAssets)    || 0;
  const fcf          = safeNum(fd.freeCashflow)    || safeNum(cf0.freeCashFlow)    || 0;
  const operatingCF  = safeNum(cf0.totalCashFromOperatingActivities) || safeNum(fd.operatingCashflow) || 0;

  // Computed ratios
  const revenue4Q    = quarterlyIncome.reduce((s, q) => s + (q.revenue || 0), 0);
  const netIncome4Q  = quarterlyIncome.reduce((s, q) => s + (q.netIncome || 0), 0);
  const finalRevenue = revenue || revenue4Q;
  const finalNI      = netIncome || netIncome4Q;

  const ps  = finalRevenue > 0 && marketCap > 0 ? +(marketCap/finalRevenue).toFixed(2) : safeNum(ks.priceToSalesTrailing12Months) || 0;
  const de  = totalEquity > 0 ? +(totalDebt/totalEquity).toFixed(2) : safeNum(fd.debtToEquity)/100 || 0;
  const roe = totalEquity > 0 && finalNI > 0 ? +((finalNI/totalEquity)*100).toFixed(2) : safeNum(fd.returnOnEquity)*100 || 0;
  const roa = totalAssets > 0 && finalNI > 0 ? +((finalNI/totalAssets)*100).toFixed(2) : safeNum(fd.returnOnAssets)*100 || 0;
  const npm = finalRevenue > 0 && finalNI > 0 ? +((finalNI/finalRevenue)*100).toFixed(2) : safeNum(fd.profitMargins)*100 || 0;
  const opm = finalRevenue > 0 && ebitda > 0  ? +((ebitda/finalRevenue)*100).toFixed(2)  : safeNum(fd.operatingMargins)*100 || 0;
  const cr  = safeNum(fd.currentRatio) || 0;
  const evEbitda = safeNum(ks.enterpriseToEbitda) || 0;
  const pegRatio = safeNum(ks.pegRatio) || 0;
  const payoutRatio = (safeNum(sd.payoutRatio) || 0) * 100;

  // Ownership
  const insiderPct     = (safeNum(mh.insidersPercentHeld)     || 0) * 100;
  const institutionPct = (safeNum(mh.institutionsPercentHeld) || 0) * 100;
  const topInstitutions = io.slice(0, 5).map(o => ({
    name:  o.organization || '',
    pct:   +((safeNum(o.pctHeld) || 0) * 100).toFixed(2),
    value: safeNum(o.value),
  }));

  // Earnings trend
  const earningsTrend = et.slice(0, 4).map(t => ({
    period:   t.period || '',
    estimate: t.earningsEstimate ? +safeNum(t.earningsEstimate.avg).toFixed(2) : null,
    actual:   t.earningsActual   ? +safeNum(t.earningsActual.avg).toFixed(2)   : null,
  }));

  const result = {
    symbol: symbol.toUpperCase(),
    name,
    sector,
    industry,
    exchange:    'NSE',
    website:     ap?.website || '',
    employees:   safeNum(ap.fullTimeEmployees) || 0,
    description: ap?.longBusinessSummary || '',
    dataQuality: {
      priceData: !!chartData,
      ratiosData: !!(quoteSummary && Object.keys(quoteSummary).length),
      note: !(quoteSummary && Object.keys(quoteSummary).length)
        ? "Yahoo Finance is currently restricting free access to detailed ratios/financials for this session — price and 52-week range are still live. Retrying may help once Yahoo's session refreshes."
        : null,
    },

    price, marketCap, w52High, w52Low, beta, avgVolume: avgVol,
    w52HighPct: w52High > 0 ? +((price-w52High)/w52High*100).toFixed(1) : 0,
    w52LowPct:  w52Low  > 0 ? +((price-w52Low) /w52Low *100).toFixed(1) : 0,
    dividendYield: +divYield.toFixed(2),
    payoutRatio:   +payoutRatio.toFixed(2),

    pe: +pe.toFixed(2), pb: +pb.toFixed(2), ps: +ps.toFixed(2),
    evEbitda: +evEbitda.toFixed(2), forwardPE: +forwardPE.toFixed(2),
    pegRatio:  +pegRatio.toFixed(2),

    revenue:     finalRevenue,
    netIncome:   finalNI,
    ebitda,
    eps:         +eps.toFixed(2),
    bookValue:   +bookVal.toFixed(2),
    fcf, operatingCF, totalDebt, totalEquity, totalAssets,

    npm: +npm.toFixed(2), opm: +opm.toFixed(2),
    roe: +roe.toFixed(2), roa: +roa.toFixed(2),
    cr:  +cr.toFixed(2),  de:  +de.toFixed(2),

    revenueGrowth:  (safeNum(fd.revenueGrowth)  || 0) * 100,
    earningsGrowth: (safeNum(fd.earningsGrowth) || 0) * 100,
    earningsQuarterlyGrowth: (safeNum(ks.earningsQuarterlyGrowth) || 0) * 100,

    insiderPct:     +insiderPct.toFixed(2),
    institutionPct: +institutionPct.toFixed(2),
    floatPct:       0,
    topInstitutions,
    earningsTrend,
    quarterlyIncome,
    priceHistory: chartData?.priceHistory || [],
  };

  console.log(`Fundamentals for ${symbol}: price=${result.price}, pe=${result.pe}, revenue=${result.revenue}, npm=${result.npm}`);
  cache.set(key, result, 3600);
  return result;
}

// ── GET /api/fundamental/:symbol ─────────────────────────────────────────────
router.get('/:symbol', auth, async (req, res) => {
  try {
    const symbol = req.params.symbol.toUpperCase().replace(/\.(NS|BSE)$/i, '');
    if (!symbol) return res.status(400).json({ message: 'Invalid symbol' });
    const data = await fetchFundamentals(symbol);
    res.json(data);
  } catch (err) {
    console.error('FUNDAMENTAL ROUTE ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;