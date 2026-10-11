const router    = require('express').Router();
const axios     = require('axios');
const NodeCache = require('node-cache');
const auth      = require('../middleware/auth');

const cache = new NodeCache({ stdTTL: 3600 }); // 1hr cache

// ── Full 500+ stock universe with base fundamentals ───────────────────────
const STOCK_UNIVERSE = [
  // NIFTY 50
  { symbol:'RELIANCE.NS',  name:'Reliance Industries',   sector:'Energy',       index:'NIFTY50',    pe:28.4, pb:2.1, roe:14.2, debtEq:0.4, mcap:1920000 },
  { symbol:'TCS.NS',       name:'Tata Consultancy',       sector:'IT',           index:'NIFTY50',    pe:32.1, pb:14.2,roe:48.5, debtEq:0.0, mcap:1450000 },
  { symbol:'HDFCBANK.NS',  name:'HDFC Bank',              sector:'Banking',      index:'NIFTY50',    pe:18.2, pb:2.8, roe:16.8, debtEq:0.0, mcap:1240000 },
  { symbol:'INFY.NS',      name:'Infosys',                sector:'IT',           index:'NIFTY50',    pe:28.6, pb:8.4, roe:31.2, debtEq:0.0, mcap:780000  },
  { symbol:'ICICIBANK.NS', name:'ICICI Bank',             sector:'Banking',      index:'NIFTY50',    pe:19.4, pb:3.2, roe:17.4, debtEq:0.0, mcap:890000  },
  { symbol:'HINDUNILVR.NS',name:'Hindustan Unilever',     sector:'FMCG',         index:'NIFTY50',    pe:58.2, pb:11.4,roe:20.1, debtEq:0.0, mcap:620000  },
  { symbol:'BAJFINANCE.NS',name:'Bajaj Finance',          sector:'NBFC',         index:'NIFTY50',    pe:32.8, pb:6.2, roe:22.4, debtEq:3.2, mcap:440000  },
  { symbol:'WIPRO.NS',     name:'Wipro',                  sector:'IT',           index:'NIFTY50',    pe:24.2, pb:4.8, roe:17.8, debtEq:0.1, mcap:290000  },
  { symbol:'ASIANPAINT.NS',name:'Asian Paints',           sector:'Chemicals',    index:'NIFTY50',    pe:62.4, pb:18.2,roe:29.8, debtEq:0.1, mcap:320000  },
  { symbol:'MARUTI.NS',    name:'Maruti Suzuki',          sector:'Auto',         index:'NIFTY50',    pe:28.1, pb:4.2, roe:16.2, debtEq:0.0, mcap:380000  },
  { symbol:'TITAN.NS',     name:'Titan Company',          sector:'Consumer',     index:'NIFTY50',    pe:92.4, pb:22.1,roe:25.4, debtEq:0.1, mcap:260000  },
  { symbol:'SUNPHARMA.NS', name:'Sun Pharmaceutical',     sector:'Pharma',       index:'NIFTY50',    pe:38.2, pb:5.4, roe:14.8, debtEq:0.2, mcap:340000  },
  { symbol:'ULTRACEMCO.NS',name:'UltraTech Cement',       sector:'Cement',       index:'NIFTY50',    pe:42.1, pb:7.2, roe:17.2, debtEq:0.5, mcap:310000  },
  { symbol:'ONGC.NS',      name:'ONGC',                   sector:'Energy',       index:'NIFTY50',    pe:7.2,  pb:0.8, roe:12.1, debtEq:0.4, mcap:280000  },
  { symbol:'AXISBANK.NS',  name:'Axis Bank',              sector:'Banking',      index:'NIFTY50',    pe:16.8, pb:2.4, roe:15.2, debtEq:0.0, mcap:320000  },
  { symbol:'ITC.NS',       name:'ITC Limited',            sector:'FMCG',         index:'NIFTY50',    pe:28.4, pb:8.2, roe:29.8, debtEq:0.0, mcap:560000  },
  { symbol:'KOTAKBANK.NS', name:'Kotak Mahindra Bank',    sector:'Banking',      index:'NIFTY50',    pe:22.4, pb:3.8, roe:14.8, debtEq:0.0, mcap:380000  },
  { symbol:'TATAMOTORS.NS',name:'Tata Motors',            sector:'Auto',         index:'NIFTY50',    pe:9.8,  pb:3.4, roe:32.1, debtEq:1.8, mcap:320000  },
  { symbol:'LT.NS',        name:'Larsen & Toubro',        sector:'Infra',        index:'NIFTY50',    pe:34.2, pb:5.8, roe:17.4, debtEq:1.2, mcap:480000  },
  { symbol:'HCLTECH.NS',   name:'HCL Technologies',       sector:'IT',           index:'NIFTY50',    pe:26.4, pb:7.2, roe:24.8, debtEq:0.1, mcap:410000  },
  { symbol:'SBIN.NS',      name:'State Bank of India',    sector:'Banking',      index:'NIFTY50',    pe:10.2, pb:1.8, roe:18.2, debtEq:0.0, mcap:640000  },
  { symbol:'BAJAJFINSV.NS',name:'Bajaj Finserv',          sector:'NBFC',         index:'NIFTY50',    pe:28.4, pb:4.2, roe:14.8, debtEq:0.8, mcap:280000  },
  { symbol:'NESTLEIND.NS', name:'Nestle India',           sector:'FMCG',         index:'NIFTY50',    pe:82.4, pb:98.2,roe:112.4,debtEq:0.0, mcap:220000  },
  { symbol:'POWERGRID.NS', name:'Power Grid Corp',        sector:'Utilities',    index:'NIFTY50',    pe:18.2, pb:3.2, roe:18.2, debtEq:1.4, mcap:260000  },
  { symbol:'NTPC.NS',      name:'NTPC Limited',           sector:'Utilities',    index:'NIFTY50',    pe:14.2, pb:1.8, roe:12.8, debtEq:1.2, mcap:320000  },
  { symbol:'JSWSTEEL.NS',  name:'JSW Steel',              sector:'Metals',       index:'NIFTY50',    pe:18.4, pb:3.4, roe:18.4, debtEq:1.4, mcap:240000  },
  { symbol:'HINDALCO.NS',  name:'Hindalco Industries',    sector:'Metals',       index:'NIFTY50',    pe:12.4, pb:1.8, roe:14.2, debtEq:0.8, mcap:180000  },
  { symbol:'TATASTEEL.NS', name:'Tata Steel',             sector:'Metals',       index:'NIFTY50',    pe:14.2, pb:1.4, roe:9.8,  debtEq:1.8, mcap:160000  },
  { symbol:'GRASIM.NS',    name:'Grasim Industries',      sector:'Diversified',  index:'NIFTY50',    pe:28.4, pb:2.8, roe:9.8,  debtEq:0.6, mcap:180000  },
  { symbol:'ADANIPORTS.NS',name:'Adani Ports',            sector:'Infra',        index:'NIFTY50',    pe:32.4, pb:5.2, roe:16.4, debtEq:1.2, mcap:240000  },
  // NIFTY NEXT 50
  { symbol:'ADANIENT.NS',  name:'Adani Enterprises',      sector:'Diversified',  index:'NIFTYNEXT50',pe:82.4, pb:8.4, roe:9.8,  debtEq:1.8, mcap:320000  },
  { symbol:'DMART.NS',     name:'Avenue Supermarts',      sector:'Retail',       index:'NIFTYNEXT50',pe:98.2, pb:18.4,roe:18.8, debtEq:0.1, mcap:280000  },
  { symbol:'PIDILITIND.NS',name:'Pidilite Industries',    sector:'Chemicals',    index:'NIFTYNEXT50',pe:82.4, pb:22.4,roe:28.4, debtEq:0.1, mcap:140000  },
  { symbol:'SIEMENS.NS',   name:'Siemens India',          sector:'Infra',        index:'NIFTYNEXT50',pe:98.4, pb:14.2,roe:14.8, debtEq:0.0, mcap:120000  },
  { symbol:'BANKBARODA.NS',name:'Bank of Baroda',         sector:'Banking',      index:'NIFTYNEXT50',pe:7.2,  pb:1.2, roe:16.4, debtEq:0.0, mcap:140000  },
  { symbol:'INDUSINDBK.NS',name:'IndusInd Bank',          sector:'Banking',      index:'NIFTYNEXT50',pe:14.2, pb:1.8, roe:12.8, debtEq:0.0, mcap:120000  },
  { symbol:'HAVELLS.NS',   name:'Havells India',          sector:'Consumer',     index:'NIFTYNEXT50',pe:62.4, pb:12.4,roe:20.4, debtEq:0.0, mcap:100000  },
  { symbol:'DABUR.NS',     name:'Dabur India',            sector:'FMCG',         index:'NIFTYNEXT50',pe:48.4, pb:12.2,roe:24.8, debtEq:0.1, mcap:98000   },
  { symbol:'MARICO.NS',    name:'Marico',                 sector:'FMCG',         index:'NIFTYNEXT50',pe:52.4, pb:14.2,roe:28.4, debtEq:0.1, mcap:82000   },
  { symbol:'MCDOWELL-N.NS',name:'United Spirits',         sector:'Consumer',     index:'NIFTYNEXT50',pe:68.4, pb:8.4, roe:12.4, debtEq:0.2, mcap:72000   },
  { symbol:'VEDL.NS',      name:'Vedanta',                sector:'Metals',       index:'NIFTYNEXT50',pe:8.4,  pb:1.8, roe:22.4, debtEq:2.4, mcap:140000  },
  { symbol:'ZOMATO.NS',    name:'Zomato',                 sector:'Tech',         index:'NIFTYNEXT50',pe:284.2,pb:8.4, roe:2.8,  debtEq:0.1, mcap:180000  },
  { symbol:'NYKAA.NS',     name:'FSN E-Commerce (Nykaa)',  sector:'Tech',        index:'NIFTYNEXT50',pe:682.4,pb:22.4,roe:3.4,  debtEq:0.2, mcap:38000   },
  { symbol:'PAYTM.NS',     name:'One97 Communications',   sector:'Fintech',      index:'NIFTYNEXT50',pe:0,    pb:2.4, roe:-12.4,debtEq:0.4, mcap:28000   },
  { symbol:'TATAPOWER.NS', name:'Tata Power',             sector:'Utilities',    index:'NIFTYNEXT50',pe:32.4, pb:4.2, roe:12.8, debtEq:1.8, mcap:98000   },
  { symbol:'GODREJCP.NS',  name:'Godrej Consumer',        sector:'FMCG',         index:'NIFTYNEXT50',pe:48.4, pb:8.4, roe:18.4, debtEq:0.4, mcap:92000   },
  { symbol:'MUTHOOTFIN.NS',name:'Muthoot Finance',        sector:'NBFC',         index:'NIFTYNEXT50',pe:18.4, pb:3.8, roe:22.4, debtEq:2.8, mcap:72000   },
  { symbol:'RECLTD.NS',    name:'REC Limited',            sector:'NBFC',         index:'NIFTYNEXT50',pe:9.2,  pb:2.4, roe:28.4, debtEq:6.4, mcap:92000   },
  { symbol:'PFC.NS',       name:'Power Finance Corp',     sector:'NBFC',         index:'NIFTYNEXT50',pe:8.4,  pb:2.2, roe:26.4, debtEq:7.2, mcap:98000   },
  { symbol:'CHOLAFIN.NS',  name:'Cholamandalam Finance',  sector:'NBFC',         index:'NIFTYNEXT50',pe:28.4, pb:5.4, roe:20.4, debtEq:4.2, mcap:82000   },
  // MIDCAP
  { symbol:'ABCAPITAL.NS', name:'Aditya Birla Capital',   sector:'NBFC',         index:'MIDCAP',     pe:18.4, pb:2.4, roe:14.8, debtEq:2.8, mcap:42000   },
  { symbol:'APOLLOHOSP.NS',name:'Apollo Hospitals',       sector:'Healthcare',   index:'MIDCAP',     pe:82.4, pb:12.4,roe:14.8, debtEq:0.8, mcap:82000   },
  { symbol:'AUROPHARMA.NS',name:'Aurobindo Pharma',       sector:'Pharma',       index:'MIDCAP',     pe:18.4, pb:2.8, roe:14.8, debtEq:0.4, mcap:58000   },
  { symbol:'BALKRISIND.NS',name:'Balkrishna Industries',  sector:'Auto',         index:'MIDCAP',     pe:32.4, pb:6.4, roe:20.4, debtEq:0.4, mcap:42000   },
  { symbol:'BERGEPAINT.NS',name:'Berger Paints',          sector:'Chemicals',    index:'MIDCAP',     pe:62.4, pb:14.4,roe:22.4, debtEq:0.2, mcap:52000   },
  { symbol:'BIOCON.NS',    name:'Biocon',                 sector:'Pharma',       index:'MIDCAP',     pe:48.4, pb:4.2, roe:8.4,  debtEq:1.2, mcap:38000   },
  { symbol:'CANBK.NS',     name:'Canara Bank',            sector:'Banking',      index:'MIDCAP',     pe:6.4,  pb:1.2, roe:18.4, debtEq:0.0, mcap:72000   },
  { symbol:'COLPAL.NS',    name:'Colgate-Palmolive',      sector:'FMCG',         index:'MIDCAP',     pe:52.4, pb:28.4,roe:54.8, debtEq:0.0, mcap:48000   },
  { symbol:'CROMPTON.NS',  name:'Crompton Greaves',       sector:'Consumer',     index:'MIDCAP',     pe:48.4, pb:8.4, roe:18.4, debtEq:0.4, mcap:22000   },
  { symbol:'CUMMINSIND.NS',name:'Cummins India',          sector:'Infra',        index:'MIDCAP',     pe:48.4, pb:8.4, roe:18.4, debtEq:0.0, mcap:28000   },
  { symbol:'DEEPAKNTR.NS', name:'Deepak Nitrite',         sector:'Chemicals',    index:'MIDCAP',     pe:28.4, pb:5.4, roe:20.4, debtEq:0.4, mcap:22000   },
  { symbol:'DIXON.NS',     name:'Dixon Technologies',     sector:'Tech',         index:'MIDCAP',     pe:98.4, pb:18.4,roe:18.8, debtEq:0.4, mcap:18000   },
  { symbol:'ESCORTS.NS',   name:'Escorts Kubota',         sector:'Auto',         index:'MIDCAP',     pe:28.4, pb:4.4, roe:14.8, debtEq:0.2, mcap:22000   },
  { symbol:'FEDERALBNK.NS',name:'Federal Bank',           sector:'Banking',      index:'MIDCAP',     pe:12.4, pb:1.8, roe:14.8, debtEq:0.0, mcap:38000   },
  { symbol:'GLAXO.NS',     name:'GSK Pharmaceuticals',    sector:'Pharma',       index:'MIDCAP',     pe:38.4, pb:8.4, roe:22.4, debtEq:0.0, mcap:22000   },
  { symbol:'GODREJPROP.NS',name:'Godrej Properties',      sector:'Real Estate',  index:'MIDCAP',     pe:82.4, pb:8.4, roe:9.8,  debtEq:1.4, mcap:38000   },
  { symbol:'IDFCFIRSTB.NS',name:'IDFC First Bank',        sector:'Banking',      index:'MIDCAP',     pe:28.4, pb:2.4, roe:8.4,  debtEq:0.0, mcap:42000   },
  { symbol:'IRCTC.NS',     name:'IRCTC',                  sector:'Travel',       index:'MIDCAP',     pe:62.4, pb:18.4,roe:32.4, debtEq:0.0, mcap:52000   },
  { symbol:'JUBLFOOD.NS',  name:'Jubilant Foodworks',     sector:'Consumer',     index:'MIDCAP',     pe:82.4, pb:14.4,roe:16.8, debtEq:0.4, mcap:22000   },
  { symbol:'LICHSGFIN.NS', name:'LIC Housing Finance',    sector:'NBFC',         index:'MIDCAP',     pe:8.4,  pb:1.4, roe:16.8, debtEq:6.8, mcap:28000   },
  { symbol:'LUPIN.NS',     name:'Lupin',                  sector:'Pharma',       index:'MIDCAP',     pe:28.4, pb:4.4, roe:14.8, debtEq:0.4, mcap:58000   },
  { symbol:'MFSL.NS',      name:'Max Financial Services', sector:'Insurance',    index:'MIDCAP',     pe:48.4, pb:8.4, roe:12.4, debtEq:0.4, mcap:22000   },
  { symbol:'MINDTREE.NS',  name:'LTIMindtree',            sector:'IT',           index:'MIDCAP',     pe:32.4, pb:7.4, roe:22.4, debtEq:0.0, mcap:92000   },
  { symbol:'MOTHERSON.NS', name:'Samvardhana Motherson',  sector:'Auto',         index:'MIDCAP',     pe:48.4, pb:4.4, roe:8.4,  debtEq:1.8, mcap:52000   },
  { symbol:'MPHASIS.NS',   name:'Mphasis',                sector:'IT',           index:'MIDCAP',     pe:32.4, pb:7.4, roe:22.4, debtEq:0.0, mcap:42000   },
  { symbol:'NAUKRI.NS',    name:'Info Edge (Naukri)',      sector:'Tech',         index:'MIDCAP',     pe:82.4, pb:8.4, roe:8.4,  debtEq:0.0, mcap:68000   },
  { symbol:'OBEROIRLTY.NS',name:'Oberoi Realty',          sector:'Real Estate',  index:'MIDCAP',     pe:28.4, pb:4.4, roe:16.8, debtEq:0.4, mcap:42000   },
  { symbol:'OFSS.NS',      name:'Oracle Financial',       sector:'IT',           index:'MIDCAP',     pe:32.4, pb:8.4, roe:26.4, debtEq:0.0, mcap:68000   },
  { symbol:'PAGEIND.NS',   name:'Page Industries',        sector:'Consumer',     index:'MIDCAP',     pe:82.4, pb:28.4,roe:42.4, debtEq:0.2, mcap:38000   },
  { symbol:'PERSISTENT.NS',name:'Persistent Systems',     sector:'IT',           index:'MIDCAP',     pe:48.4, pb:9.4, roe:20.4, debtEq:0.0, mcap:48000   },
  { symbol:'PETRONET.NS',  name:'Petronet LNG',           sector:'Energy',       index:'MIDCAP',     pe:12.4, pb:2.8, roe:22.4, debtEq:0.4, mcap:38000   },
  { symbol:'PIIND.NS',     name:'PI Industries',          sector:'Chemicals',    index:'MIDCAP',     pe:42.4, pb:8.4, roe:20.4, debtEq:0.2, mcap:38000   },
  { symbol:'POLYCAB.NS',   name:'Polycab India',          sector:'Consumer',     index:'MIDCAP',     pe:42.4, pb:8.4, roe:22.4, debtEq:0.2, mcap:52000   },
  { symbol:'PVR.NS',       name:'PVR Inox',               sector:'Entertainment',index:'MIDCAP',     pe:82.4, pb:4.4, roe:4.8,  debtEq:2.4, mcap:18000   },
  { symbol:'RAJESHEXPO.NS',name:'Rajesh Exports',         sector:'Consumer',     index:'MIDCAP',     pe:8.4,  pb:1.4, roe:18.4, debtEq:0.2, mcap:12000   },
  { symbol:'SRF.NS',       name:'SRF Limited',            sector:'Chemicals',    index:'MIDCAP',     pe:28.4, pb:5.4, roe:18.4, debtEq:0.8, mcap:42000   },
  { symbol:'STARHEALTH.NS',name:'Star Health Insurance',  sector:'Insurance',    index:'MIDCAP',     pe:48.4, pb:4.4, roe:8.4,  debtEq:0.0, mcap:28000   },
  { symbol:'SUNTV.NS',     name:'Sun TV Network',         sector:'Media',        index:'MIDCAP',     pe:18.4, pb:3.4, roe:18.4, debtEq:0.0, mcap:22000   },
  { symbol:'TORNTPHARM.NS',name:'Torrent Pharmaceuticals',sector:'Pharma',       index:'MIDCAP',     pe:38.4, pb:7.4, roe:18.4, debtEq:0.8, mcap:42000   },
  { symbol:'TRENT.NS',     name:'Trent Limited',          sector:'Retail',       index:'MIDCAP',     pe:182.4,pb:28.4,roe:14.8, debtEq:0.4, mcap:82000   },
  { symbol:'UPL.NS',       name:'UPL Limited',            sector:'Chemicals',    index:'MIDCAP',     pe:14.4, pb:1.8, roe:8.4,  debtEq:2.4, mcap:28000   },
  { symbol:'VOLTAS.NS',    name:'Voltas',                 sector:'Consumer',     index:'MIDCAP',     pe:82.4, pb:7.4, roe:8.4,  debtEq:0.2, mcap:22000   },
  { symbol:'ZEEL.NS',      name:'Zee Entertainment',      sector:'Media',        index:'MIDCAP',     pe:18.4, pb:1.8, roe:8.4,  debtEq:0.4, mcap:12000   },
];

// ── Fetch live price from Yahoo Finance ───────────────────────────────────
async function fetchLivePrice(symbol) {
  const cacheKey = `price_${symbol}`;
  const cached   = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=5d`;
    const res = await axios.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      timeout: 5000,
    });
    const q     = res.data.chart.result[0];
    const meta  = q.meta;
    const closes = q.indicators.quote[0].close.filter(Boolean);
    const highs  = q.indicators.quote[0].high.filter(Boolean);
    const lows   = q.indicators.quote[0].low.filter(Boolean);
    const vols   = q.indicators.quote[0].volume.filter(Boolean);

    const current   = meta.regularMarketPrice;
    const prev      = meta.chartPreviousClose || closes[closes.length - 2] || current;
    const change    = current - prev;
    const changePct = (change / prev) * 100;

    // 52-week high/low
    const w52High = meta.fiftyTwoWeekHigh || Math.max(...highs);
    const w52Low  = meta.fiftyTwoWeekLow  || Math.min(...lows);

    // Volume
    const volume    = meta.regularMarketVolume || vols[vols.length - 1] || 0;
    const avgVolume = vols.reduce((a,b) => a+b, 0) / vols.length;

    // Simple RSI (14-period) calculation
    let rsi = 50;
    if (closes.length >= 15) {
      let gains = 0, losses = 0;
      for (let i = closes.length - 14; i < closes.length; i++) {
        const diff = closes[i] - closes[i - 1];
        if (diff > 0) gains  += diff;
        else          losses -= diff;
      }
      const avgGain = gains  / 14;
      const avgLoss = losses / 14;
      rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
    }

    // Momentum (5d return %)
    const momentum = closes.length >= 2
      ? ((closes[closes.length-1] - closes[0]) / closes[0]) * 100
      : 0;

    // Volume surge ratio
    const volumeSurge = avgVolume > 0 ? volume / avgVolume : 1;

    const data = {
      symbol, current, prev, change, changePct,
      w52High, w52Low,
      w52HighPct: ((current - w52High) / w52High) * 100,
      w52LowPct:  ((current - w52Low)  / w52Low)  * 100,
      volume, avgVolume, volumeSurge,
      rsi:      +rsi.toFixed(1),
      momentum: +momentum.toFixed(2),
      fetchedAt: new Date(),
    };

    cache.set(cacheKey, data, 3600);
    return data;
  } catch {
    return null;
  }
}

// ── GET /api/screener ─────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const {
      sector, index, minPE, maxPE, minROE, maxDebtEq,
      rsiMin, rsiMax, volumeSurge, near52High, near52Low,
      momentum, sortBy = 'mcap', sortDir = 'desc',
      search, page = 1, limit = 50,
    } = req.query;

    let stocks = [...STOCK_UNIVERSE];

    // ── Static filters (instant) ──────────────────────────────────────────
    if (sector)     stocks = stocks.filter(s => s.sector.toLowerCase()  === sector.toLowerCase());
    if (index)      stocks = stocks.filter(s => s.index.toLowerCase()   === index.toLowerCase());
    if (search)     stocks = stocks.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.symbol.toLowerCase().includes(search.toLowerCase()));
    if (minPE)      stocks = stocks.filter(s => s.pe  >= parseFloat(minPE)  && s.pe > 0);
    if (maxPE)      stocks = stocks.filter(s => s.pe  <= parseFloat(maxPE)  && s.pe > 0);
    if (minROE)     stocks = stocks.filter(s => s.roe >= parseFloat(minROE));
    if (maxDebtEq)  stocks = stocks.filter(s => s.debtEq <= parseFloat(maxDebtEq));

    // ── Fetch live prices for filtered stocks (paginated) ─────────────────
    const pageNum   = parseInt(page);
    const limitNum  = Math.min(parseInt(limit), 50);
    const start     = (pageNum - 1) * limitNum;
    const pageStocks = stocks.slice(start, start + limitNum);

    const enriched = await Promise.all(
      pageStocks.map(async stock => {
        const live = await fetchLivePrice(stock.symbol);
        return {
          ...stock,
          price:      live?.current    || 0,
          change:     live?.change     || 0,
          changePct:  live?.changePct  || 0,
          w52High:    live?.w52High    || 0,
          w52Low:     live?.w52Low     || 0,
          w52HighPct: live?.w52HighPct || 0,
          w52LowPct:  live?.w52LowPct  || 0,
          volume:     live?.volume     || 0,
          volumeSurge:live?.volumeSurge|| 1,
          rsi:        live?.rsi        || 50,
          momentum:   live?.momentum   || 0,
          fetchedAt:  live?.fetchedAt  || null,
          hasLiveData: !!live,
        };
      })
    );

    // ── Live data filters ─────────────────────────────────────────────────
    let filtered = enriched;
    if (rsiMin)      filtered = filtered.filter(s => s.rsi >= parseFloat(rsiMin));
    if (rsiMax)      filtered = filtered.filter(s => s.rsi <= parseFloat(rsiMax));
    if (volumeSurge) filtered = filtered.filter(s => s.volumeSurge >= parseFloat(volumeSurge));
    if (near52High)  filtered = filtered.filter(s => s.w52HighPct >= -parseFloat(near52High));
    if (near52Low)   filtered = filtered.filter(s => s.w52LowPct  <= parseFloat(near52Low));
    if (momentum === 'positive') filtered = filtered.filter(s => s.momentum > 0);
    if (momentum === 'negative') filtered = filtered.filter(s => s.momentum < 0);
    if (momentum === 'strong')   filtered = filtered.filter(s => s.momentum > 5);

    // ── Sort ──────────────────────────────────────────────────────────────
    const dir = sortDir === 'asc' ? 1 : -1;
    filtered.sort((a, b) => {
      const map = {
        mcap: (s) => s.mcap,  pe: (s) => s.pe,   roe: (s) => s.roe,
        rsi:  (s) => s.rsi,   momentum: (s) => s.momentum,
        volumeSurge: (s) => s.volumeSurge,
        changePct:   (s) => s.changePct,
        w52LowPct:   (s) => s.w52LowPct,
        w52HighPct:  (s) => s.w52HighPct,
      };
      return ((map[sortBy]?.(b) || 0) - (map[sortBy]?.(a) || 0)) * dir;
    });

    // ── Metadata ──────────────────────────────────────────────────────────
    const sectors = [...new Set(STOCK_UNIVERSE.map(s => s.sector))].sort();
    const indices = [...new Set(STOCK_UNIVERSE.map(s => s.index))];

    res.json({
      stocks:   filtered,
      total:    stocks.length,
      page:     pageNum,
      pages:    Math.ceil(stocks.length / limitNum),
      sectors,
      indices,
      fetchedAt: new Date(),
    });
  } catch (err) {
    console.error('SCREENER ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/screener/presets ─────────────────────────────────────────────
router.get('/presets', auth, (req, res) => {
  res.json([
    {
      id: 'value',
      label: '💎 Value Picks',
      desc: 'Low P/E, High ROE, Low Debt',
      emoji: '💎',
      color: '#10b981',
      filters: { maxPE: 20, minROE: 15, maxDebtEq: 1 },
    },
    {
      id: 'momentum',
      label: '🚀 Momentum Stocks',
      desc: 'RSI 50-70, Strong 5d momentum',
      emoji: '🚀',
      color: '#6366f1',
      filters: { rsiMin: 50, rsiMax: 70, momentum: 'strong' },
    },
    {
      id: 'oversold',
      label: '📉 Oversold Bounce',
      desc: 'RSI < 35, near 52W low',
      emoji: '📉',
      color: '#f59e0b',
      filters: { rsiMax: 35, near52Low: 10 },
    },
    {
      id: 'breakout',
      label: '⚡ Near 52W High',
      desc: 'Within 5% of 52-week high',
      emoji: '⚡',
      color: '#ef4444',
      filters: { near52High: 5 },
    },
    {
      id: 'volume_surge',
      label: '📊 Volume Surge',
      desc: '2x+ average volume today',
      emoji: '📊',
      color: '#8b5cf6',
      filters: { volumeSurge: 2 },
    },
    {
      id: 'quality',
      label: '🏆 Quality Growth',
      desc: 'High ROE, Low Debt, IT/Pharma',
      emoji: '🏆',
      color: '#06b6d4',
      filters: { minROE: 20, maxDebtEq: 0.5 },
    },
    {
      id: 'banking',
      label: '🏦 Banking Sector',
      desc: 'All banking stocks',
      emoji: '🏦',
      color: '#f97316',
      filters: { sector: 'Banking' },
    },
    {
      id: 'it',
      label: '💻 IT Sector',
      desc: 'Top IT companies',
      emoji: '💻',
      color: '#3b82f6',
      filters: { sector: 'IT' },
    },
  ]);
});

module.exports = router;
module.exports.STOCK_UNIVERSE = STOCK_UNIVERSE;