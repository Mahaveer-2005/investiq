const router    = require('express').Router();
const axios     = require('axios');
const NodeCache = require('node-cache');
const auth      = require('../middleware/auth');

const cache = new NodeCache({ stdTTL: 1800 });

// ── Strip CDATA, HTML tags, and clean text ──────────────────────────────────
function cleanText(str) {
  if (!str) return '';
  return str
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, m => m.slice(9, -3))  // unwrap CDATA
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, '')                                       // strip HTML tags
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanTitle(str) {
  if (!str) return '';
  let t = cleanText(str);
  // Remove source suffix like " - Economic Times" or " | Mint"
  t = t.replace(/\s[-|]\s(Economic Times|Mint|MoneyControl|LiveMint|BusinessLine|NDTV|Reuters|Bloomberg|Hindu|Times of India|ET Markets|Yahoo Finance|Google News|Business Standard|Financial Express).*$/i, '');
  return t.trim();
}

function extractDescription(item) {
  const raw = item.description || item.summary || item['media:description'] || '';
  let text = cleanText(raw);
  // If description contains an href, extract just the first sentence
  if (text.includes('href=') || text.startsWith('<')) {
    text = '';
  }
  // Truncate to 160 chars
  if (text.length > 160) text = text.slice(0, 157) + '...';
  return text;
}

function extractDate(item) {
  const raw = item.pubDate || item.published || item.updated || '';
  if (!raw) return new Date().toISOString();
  try { return new Date(raw).toISOString(); } catch { return new Date().toISOString(); }
}

function extractImage(item) {
  // Try media:content, media:thumbnail, enclosure
  if (item['media:content']?.['$']?.url) return item['media:content']['$'].url;
  if (item['media:thumbnail']?.['$']?.url) return item['media:thumbnail']['$'].url;
  if (item.enclosure?.url) return item.enclosure.url;
  // Try extracting from description
  const imgMatch = (item.description || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch) return imgMatch[1];
  return null;
}

function detectCategory(title) {
  const t = title.toLowerCase();
  if (/nifty|sensex|nse|bse|index|market|dalal/.test(t)) return 'MARKET';
  if (/reliance|tcs|infosys|wipro|hdfc|icici|sbi|bajaj|adani|tata|ongc|itc/.test(t)) return 'STOCKS';
  if (/rbi|repo|rate|inflation|gdp|budget|government|sebi|policy|rupee|forex/.test(t)) return 'ECONOMY';
  if (/ipo|listing|issue|subscribe|allot/.test(t)) return 'IPO';
  if (/gold|silver|crude|oil|commodity/.test(t)) return 'COMMODITY';
  if (/result|earnings|profit|loss|revenue|quarter|q1|q2|q3|q4/.test(t)) return 'RESULTS';
  return 'GENERAL';
}

function detectSentiment(title, description = '') {
  const text = (title + ' ' + description).toLowerCase();
  const bullish = ['rise|rose|gain|jump|surge|rally|high|record|beat|strong|growth|profit|buy|bullish|up|positive|boom|soar|climb|advance'].join('|');
  const bearish = ['fall|fell|drop|crash|plunge|slide|loss|weak|fear|sell|bearish|down|negative|decline|dip|slump|drag|tank|worry|concern|cut|miss'].join('|');
  const bScore = (text.match(new RegExp(bullish, 'gi')) || []).length;
  const rScore = (text.match(new RegExp(bearish, 'gi')) || []).length;
  if (bScore > rScore + 1) return 'bullish';
  if (rScore > bScore + 1) return 'bearish';
  return 'neutral';
}

// ── Parse RSS XML manually ──────────────────────────────────────────────────
function parseRSS(xml) {
  const items = [];
  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  itemMatches.forEach(item => {
    const get = (tag) => {
      const m = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      if (!m) return '';
      let v = m[1].trim();
      // Unwrap CDATA
      v = v.replace(/^<!\[CDATA\[/, '').replace(/\]\]>$/, '').trim();
      return v;
    };
    const title       = cleanTitle(get('title'));
    const link        = get('link') || get('guid') || '';
    const description = get('description');
    const pubDate     = get('pubDate') || get('published') || '';
    const cleanLink   = link.replace(/<[^>]+>/g, '').trim();
    if (!title || title.length < 10) return;
    items.push({ title, link: cleanLink, description, pubDate });
  });
  return items;
}

// ── RSS Sources ─────────────────────────────────────────────────────────────
const RSS_SOURCES = [
  { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
  { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/stocks/rssfeeds/2146842.cms' },
  { name: 'Mint',           url: 'https://www.livemint.com/rss/markets' },
  { name: 'Business Standard', url: 'https://www.business-standard.com/rss/markets-106.rss' },
  { name: 'MoneyControl',   url: 'https://www.moneycontrol.com/rss/marketreports.xml' },
  { name: 'Google News',    url: 'https://news.google.com/rss/search?q=NSE+BSE+stock+market+India&hl=en-IN&gl=IN&ceid=IN:en' },
  { name: 'Google News',    url: 'https://news.google.com/rss/search?q=NIFTY+SENSEX+today&hl=en-IN&gl=IN&ceid=IN:en' },
];

async function fetchRSS(source) {
  try {
    const { data } = await axios.get(source.url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
    });
    const items = parseRSS(data);
    return items.slice(0, 12).map(item => {
      const title       = item.title;
      const description = extractDescription({ description: item.description });
      const sentiment   = detectSentiment(title, description);
      const category    = detectCategory(title);
      return {
        id:          Buffer.from(item.link || title).toString('base64').slice(0, 16),
        title,
        description,
        url:         item.link,
        source:      source.name,
        publishedAt: extractDate({ pubDate: item.pubDate }),
        sentiment,
        category,
        impact:      sentiment === 'bullish' || sentiment === 'bearish' ? 'high' : 'medium',
      };
    }).filter(n => n.title.length > 15);
  } catch (e) {
    console.error(`RSS fetch failed [${source.name}]:`, e.message);
    return [];
  }
}

// ── GET /api/news ───────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const cached = cache.get('news_all');
    if (cached) return res.json(cached);

    // Fetch all sources in parallel
    const results = await Promise.allSettled(RSS_SOURCES.map(fetchRSS));
    const allNews = [];
    results.forEach(r => {
      if (r.status === 'fulfilled') allNews.push(...r.value);
    });

    // Deduplicate by title similarity
    const seen  = new Set();
    const deduped = allNews.filter(n => {
      const key = n.title.slice(0, 40).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Sort by date desc
    deduped.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));

    const final = deduped.slice(0, 60);
    cache.set('news_all', final, 1800);
    res.json(final);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/news/refresh ───────────────────────────────────────────────────
router.get('/refresh', auth, async (req, res) => {
  cache.del('news_all');
  const results  = await Promise.allSettled(RSS_SOURCES.map(fetchRSS));
  const allNews  = [];
  results.forEach(r => { if (r.status === 'fulfilled') allNews.push(...r.value); });
  const seen     = new Set();
  const deduped  = allNews.filter(n => {
    const key = n.title.slice(0, 40).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  deduped.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
  const final = deduped.slice(0, 60);
  cache.set('news_all', final, 1800);
  res.json(final);
});

module.exports = router;