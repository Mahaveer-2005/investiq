import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { ComposedChart, Bar, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useAuth } from '../context/AuthContext';

const card = { background: 'rgba(26,31,53,0.6)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: 20 };

const INDICES = [
  { symbol: '%5ENSEI',    label: 'NIFTY 50',   icon: '🔵', isIndex: true },
  { symbol: '%5EBSESN',   label: 'SENSEX',     icon: '🟣', isIndex: true },
  { symbol: '%5ENSEBANK', label: 'BANK NIFTY', icon: '🏦', isIndex: true },
];

const INTERVALS = [
  { label: '1D', interval: '5m',  range: '1d'  },
  { label: '5D', interval: '15m', range: '5d'  },
  { label: '1M', interval: '1d',  range: '1mo' },
  { label: '3M', interval: '1d',  range: '3mo' },
  { label: '6M', interval: '1d',  range: '6mo' },
  { label: '1Y', interval: '1wk', range: '1y'  },
  { label: '5Y', interval: '1mo', range: '5y'  },
];

const CHART_TYPES = [
  { key: 'candlestick', label: '🕯️ Candlestick' },
  { key: 'line',        label: '📈 Line' },
  { key: 'area',        label: '📊 Area' },
];

const BEGINNER_TERMS = [
  { term: 'Intraday', def: 'Buying and selling the same stock within the same trading day — position is squared off before market close.' },
  { term: 'Delivery', def: 'Buying a stock and holding it in your demat account beyond the trading day — you actually own the shares.' },
  { term: 'Stop-Loss', def: 'An automatic sell order that triggers if the price falls to a level you set, limiting your potential loss.' },
  { term: 'Target Price', def: 'The price at which you plan to book profit and exit a position.' },
  { term: 'Market Order', def: 'An order to buy/sell immediately at the best available current price.' },
  { term: 'Limit Order', def: 'An order that only executes at your specified price or better — may not fill immediately.' },
  { term: 'Volume', def: 'The number of shares traded in a given period — higher volume usually means higher liquidity and conviction behind a price move.' },
  { term: 'P&L', def: "Profit & Loss — the money you've made or lost on a position, either unrealized (still holding) or realized (after selling)." },
];

const TUTORIAL_STEPS = [
  { title: 'What is a Candlestick?', body: 'Each candle shows 4 prices for one time period: Open, High, Low, and Close (OHLC). The thick part is the "body" (open→close), the thin lines are "wicks" (the high/low extremes reached).' },
  { title: 'Green vs Red', body: 'A GREEN candle means the price closed HIGHER than it opened (bullish). A RED candle means it closed LOWER than it opened (bearish).' },
  { title: 'Reading the Wicks', body: 'Long wicks show the price moved a lot during the period but reversed — e.g. a long lower wick means buyers pushed the price back up after a dip.' },
  { title: 'Volume Matters', body: 'A big price move on LOW volume is less convincing than the same move on HIGH volume — volume shows how many traders backed the move.' },
  { title: 'The Prev Close Line', body: 'The dashed line marks yesterday\'s closing price — it tells you at a glance whether today is a gain or loss day so far.' },
  { title: 'Try It', body: 'Switch between 1D (intraday, 5-min candles) and longer ranges like 1M/1Y to see the same stock at different zoom levels. Try switching chart type too — Line and Area are simpler views of the same close-price data.' },
];

function fmtNum(n) { return Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 }); }

// Correct, working Recharts candlestick technique: Bar with an array-valued
// dataKey ([low, high]) renders as a "floating" bar — Recharts computes the
// pixel y/height for that data-space range automatically and passes them to
// the custom shape, which we then use to place the open/close body correctly
// inside that range. (The previous version tried to access a yAxis.scale()
// function that Recharts doesn't actually pass to shape props — that's why
// the chart rendered blank.)
function CandleShape(props) {
  const { x, y, width, height, payload } = props;
  if (payload.open == null || payload.close == null || height <= 0) return null;
  const isUp = payload.close >= payload.open;
  const color = isUp ? '#10b981' : '#ef4444';
  const range = payload.high - payload.low;
  const pxPerUnit = range > 0 ? height / range : 0;
  const openY = y + (payload.high - payload.open) * pxPerUnit;
  const closeY = y + (payload.high - payload.close) * pxPerUnit;
  const bodyTop = Math.min(openY, closeY);
  const bodyHeight = Math.max(1, Math.abs(closeY - openY));
  const cx = x + width / 2;
  const bodyWidth = Math.max(2, width * 0.7);
  const bodyX = cx - bodyWidth / 2;
  return (
    <g>
      <line x1={cx} x2={cx} y1={y} y2={y + height} stroke={color} strokeWidth={1} />
      <rect x={bodyX} y={bodyTop} width={bodyWidth} height={bodyHeight} fill={color} />
    </g>
  );
}

export default function Intraday() {
  const { user, setUser } = useAuth();
  const [instrument, setInstrument] = useState(INDICES[0]);
  const [interval, setInterval_] = useState(INTERVALS[0]);
  const [chartType, setChartType] = useState('candlestick');
  const [data, setData] = useState(null);
  const [indexQuotes, setIndexQuotes] = useState({});
  const [loading, setLoading] = useState(true);
  const [showTerms, setShowTerms] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [showTax, setShowTax] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  // Intraday tax calculator state
  const [taxBuy, setTaxBuy] = useState('10000');
  const [taxSell, setTaxSell] = useState('10500');
  const [taxSlab, setTaxSlab] = useState('30');
  const [taxResult, setTaxResult] = useState(null);
  const [taxLoading, setTaxLoading] = useState(false);

  // Live intraday paper-trading state
  const [tradeQty, setTradeQty] = useState(1);
  const [trading, setTrading] = useState(false);
  const [tradeMsg, setTradeMsg] = useState(null);

  useEffect(() => {
    INDICES.forEach(idx => {
      axios.get(`/api/market/index/${idx.symbol}`).then(r => {
        setIndexQuotes(prev => ({ ...prev, [idx.symbol]: r.data }));
      }).catch(() => {});
    });
  }, []);

  // Stock search — reuses the existing symbol search backend
  useEffect(() => {
    if (searchQuery.trim().length < 2) { setSearchResults([]); return; }
    const t = setTimeout(() => {
      axios.get(`/api/backtest/symbols?q=${encodeURIComponent(searchQuery)}`)
        .then(r => setSearchResults((r.data || []).slice(0, 8)))
        .catch(() => setSearchResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadCandles = useCallback(async () => {
    setLoading(true);
    try {
      const { data: d } = await axios.get(`/api/market/candles/${instrument.symbol}`, {
        params: { interval: interval.interval, range: interval.range },
      });
      setData(d);
    } catch {
      setData(null);
    }
    setLoading(false);
  }, [instrument, interval]);

  useEffect(() => { loadCandles(); }, [loadCandles]);

  useEffect(() => {
    if (!['1D', '5D'].includes(interval.label)) return;
    const id = window.setInterval(loadCandles, 30000);
    return () => window.clearInterval(id);
  }, [interval, loadCandles]);

  const isMarketOpen = data?.meta?.marketState === 'REGULAR';
  const canTrade = !instrument.isIndex; // indices aren't directly tradeable

  const executeTrade = async (action) => {
    setTrading(true);
    setTradeMsg(null);
    try {
      const { data: res } = await axios.post('/api/stocks/trade', {
        symbol: instrument.label, action, quantity: tradeQty, orderType: 'intraday',
      });
      setUser(prev => ({ ...prev, virtualCoins: res.newBalance }));
      setTradeMsg({ type: 'success', text: `✅ ${action.toUpperCase()} ${res.quantity} ${res.symbol} @ ₹${res.price} — ${action === 'buy' ? 'Spent' : 'Received'} ₹${res.totalAmount.toLocaleString('en-IN')}` });
    } catch (err) {
      setTradeMsg({ type: 'error', text: err.response?.data?.message || 'Trade failed' });
    }
    setTrading(false);
  };

  const runIntradayTax = async () => {
    setTaxLoading(true);
    try {
      const { data: d } = await axios.post('/api/tax/simulate-intraday', {
        buyValue: Number(taxBuy), sellValue: Number(taxSell), slabRatePct: Number(taxSlab),
      });
      setTaxResult(d);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not calculate');
    }
    setTaxLoading(false);
  };

  const chartData = (data?.candles || []).map(c => ({
    ...c,
    range: [c.low, c.high],
    label: interval.label === '1D' || interval.label === '5D'
      ? new Date(c.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      : new Date(c.time).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
  }));

  const selectStock = (s) => {
    setInstrument({ symbol: `${s}.NS`, label: s, icon: '📈', isIndex: false });
    setSearchQuery(''); setSearchResults([]);
  };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px', color: '#e2e8f0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 4 }}>📊 Intraday & Market</h1>
          <p style={{ color: '#94a3b8', margin: 0 }}>Real live indices & stocks, candlestick charts, auto-refreshes every 30s intraday.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowTutorial(true)}
            style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.1)', color: '#10b981', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            🎓 Tutorial
          </button>
          <button onClick={() => setShowTerms(s => !s)}
            style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(99,102,241,0.3)', background: 'rgba(99,102,241,0.1)', color: '#818cf8', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            💡 Terms
          </button>
          <button onClick={() => setShowTax(s => !s)}
            style={{ padding: '10px 18px', borderRadius: 10, border: '1px solid rgba(245,158,11,0.3)', background: 'rgba(245,158,11,0.1)', color: '#f59e0b', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            🧾 Intraday Tax
          </button>
        </div>
      </div>

      {/* Tutorial modal */}
      {showTutorial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setShowTutorial(false)}>
          <div onClick={e => e.stopPropagation()} style={{ ...card, maxWidth: 420, width: '90%' }}>
            <div style={{ color: '#64748b', fontSize: 11, marginBottom: 8 }}>STEP {tutorialStep + 1} OF {TUTORIAL_STEPS.length}</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 10 }}>{TUTORIAL_STEPS[tutorialStep].title}</div>
            <p style={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{TUTORIAL_STEPS[tutorialStep].body}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <button onClick={() => setTutorialStep(s => Math.max(0, s - 1))} disabled={tutorialStep === 0}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'rgba(99,102,241,0.1)', color: tutorialStep === 0 ? '#4b5563' : '#94a3b8', cursor: tutorialStep === 0 ? 'default' : 'pointer', fontWeight: 700 }}>← Back</button>
              {tutorialStep < TUTORIAL_STEPS.length - 1 ? (
                <button onClick={() => setTutorialStep(s => s + 1)} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Next →</button>
              ) : (
                <button onClick={() => { setShowTutorial(false); setTutorialStep(0); }} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>Done ✓</button>
              )}
            </div>
          </div>
        </div>
      )}

      {showTerms && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px,1fr))', gap: 12 }}>
            {BEGINNER_TERMS.map((t, i) => (
              <div key={i} style={{ background: 'rgba(10,14,26,0.5)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontWeight: 800, color: '#818cf8', marginBottom: 4, fontSize: 13 }}>{t.term}</div>
                <div style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.5 }}>{t.def}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Intraday tax calculator */}
      {showTax && (
        <div style={{ ...card, marginBottom: 20 }}>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>🧾 Intraday Tax Simulator</div>
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>Intraday profit is taxed differently from delivery — as Speculative Business Income at your slab rate, not capital gains.</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 16 }}>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Buy Value (₹)</label>
              <input type="number" value={taxBuy} onChange={e => setTaxBuy(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Sell Value (₹)</label>
              <input type="number" value={taxSell} onChange={e => setTaxSell(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Income Slab (%)</label>
              <select value={taxSlab} onChange={e => setTaxSlab(e.target.value)} style={{ width: '100%', padding: '10px 12px', background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#fff' }}>
                <option value="5">5%</option>
                <option value="20">20%</option>
                <option value="30">30%</option>
              </select>
            </div>
            <button onClick={runIntradayTax} disabled={taxLoading} style={{ padding: '10px 20px', background: 'linear-gradient(135deg,#f59e0b,#d97706)', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 700 }}>
              {taxLoading ? '...' : 'Calculate'}
            </button>
          </div>
          {taxResult && (
            <div>
              {taxResult.breakdown.map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: row.isTotal ? 'none' : '1px solid rgba(99,102,241,0.08)',
                  fontWeight: (row.isTotal || row.isSubtotal) ? 800 : 500, color: row.isTotal ? (taxResult.netProfitAfterTax >= 0 ? '#10b981' : '#ef4444') : '#94a3b8', fontSize: row.isTotal ? 14 : 12 }}>
                  <span>{row.label}</span><span>₹{fmtNum(row.amount)}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: 12, fontSize: 12, color: '#f59e0b' }}>
                ℹ️ {taxResult.note} Rates can change — not tax/legal advice, verify with current official guidance.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stock search */}
      <div style={{ position: 'relative', marginBottom: 20 }}>
        <input
          type="text" placeholder="🔍 Search any stock for intraday view (e.g. RELIANCE, TCS)..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          style={{ width: '100%', padding: '14px 16px', background: 'rgba(26,31,53,0.6)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, color: '#fff', fontSize: 14, boxSizing: 'border-box' }}
        />
        {searchResults.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#161a2e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, marginTop: 4, zIndex: 10, overflow: 'hidden' }}>
            {searchResults.map(s => (
              <div key={s} onClick={() => selectStock(s)} style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid rgba(99,102,241,0.1)' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {s}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Index cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {INDICES.map(idx => {
          const q = indexQuotes[idx.symbol];
          const isActive = instrument.symbol === idx.symbol;
          return (
            <div key={idx.symbol} onClick={() => setInstrument(idx)}
              style={{ ...card, cursor: 'pointer', border: isActive ? '2px solid #6366f1' : card.border, transition: 'all 0.15s' }}>
              <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>{idx.icon} {idx.label}</div>
              {q ? (
                <>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>{fmtNum(q.price)}</div>
                  <div style={{ color: q.change >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 14 }}>
                    {q.change >= 0 ? '+' : ''}{fmtNum(q.change)} ({q.changePct >= 0 ? '+' : ''}{q.changePct}%)
                  </div>
                </>
              ) : <div style={{ color: '#64748b', fontSize: 13 }}>Loading...</div>}
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>
            {instrument.icon} {instrument.label}
            {data?.meta?.marketState && (
              <span style={{ marginLeft: 10, fontSize: 11, padding: '3px 10px', borderRadius: 6, fontWeight: 700,
                background: data.meta.marketState === 'REGULAR' ? 'rgba(16,185,129,0.15)' : 'rgba(148,163,184,0.15)',
                color: data.meta.marketState === 'REGULAR' ? '#10b981' : '#94a3b8' }}>
                {data.meta.marketState === 'REGULAR' ? '● LIVE' : data.meta.marketState}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {CHART_TYPES.map(ct => (
                <button key={ct.key} onClick={() => setChartType(ct.key)}
                  style={{ padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 11,
                    background: chartType === ct.key ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.08)', color: chartType === ct.key ? '#fff' : '#94a3b8' }}>
                  {ct.label}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {INTERVALS.map(iv => (
                <button key={iv.label} onClick={() => setInterval_(iv)}
                  style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                    background: interval.label === iv.label ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.1)',
                    color: interval.label === iv.label ? '#fff' : '#94a3b8' }}>
                  {iv.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {data?.meta && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Open', value: chartData[0]?.open },
              { label: 'Prev Close', value: data.meta.prevClose },
              { label: 'Day High', value: data.meta.dayHigh },
              { label: 'Day Low', value: data.meta.dayLow },
              { label: '52W High', value: data.meta.w52High },
              { label: '52W Low', value: data.meta.w52Low },
            ].map((s, i) => (
              <div key={i} style={{ background: 'rgba(10,14,26,0.5)', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ color: '#64748b', fontSize: 10 }}>{s.label}</div>
                <div style={{ fontWeight: 800, fontSize: 13 }}>{s.value ? fmtNum(s.value) : '—'}</div>
              </div>
            ))}
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>Loading real market data...</div>}

        {!loading && chartData.length > 0 && (
          <ResponsiveContainer width="100%" height={380}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.08)" />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} minTickGap={40} />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" fontSize={11} tickFormatter={fmtNum} />
              {data?.meta?.prevClose ? (
                <ReferenceLine y={data.meta.prevClose} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Prev Close', fill: '#f59e0b', fontSize: 10, position: 'insideTopLeft' }} />
              ) : null}
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload;
                  return (
                    <div style={{ background: '#161a2e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, padding: 10, fontSize: 12 }}>
                      <div style={{ color: '#94a3b8', marginBottom: 4 }}>{label}</div>
                      <div>O: <b>{fmtNum(p.open)}</b>  H: <b>{fmtNum(p.high)}</b></div>
                      <div>L: <b>{fmtNum(p.low)}</b>  C: <b>{fmtNum(p.close)}</b></div>
                      {p.volume > 0 && <div style={{ color: '#64748b', marginTop: 4 }}>Vol: {fmtNum(p.volume)}</div>}
                    </div>
                  );
                }}
              />
              {chartType === 'candlestick' && <Bar dataKey="range" shape={<CandleShape />} isAnimationActive={false} />}
              {chartType === 'line' && <Line type="monotone" dataKey="close" stroke="#6366f1" strokeWidth={2} dot={false} isAnimationActive={false} />}
              {chartType === 'area' && (
                <>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="close" stroke="#6366f1" fill="url(#priceGrad)" strokeWidth={2} isAnimationActive={false} />
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        )}
        {!loading && chartData.length === 0 && (
          <div style={{ textAlign: 'center', padding: 80, color: '#64748b' }}>No data available right now — market may be closed or this symbol isn't found.</div>
        )}
      </div>

      {/* Live intraday paper trading — gated on real market-open status */}
      {!canTrade && (
        <div style={{ ...card, marginTop: 20, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
          ℹ️ <b>{instrument.label}</b> is a market index — indices aren't directly tradeable (same as real brokers; you'd trade an index fund or futures contract instead, which is a different product).
          <br />Search for a real stock above (e.g. RELIANCE, TCS, HDFCBANK) to unlock live practice trading.
        </div>
      )}

      {canTrade && (
        <div style={{ ...card, marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div style={{ fontWeight: 800, fontSize: 16 }}>⚡ Live Intraday Practice Trading</div>
            <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>📝 PRACTICE ONLY — NO REAL MONEY</div>
          </div>
          <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>Trades execute instantly at the real live price shown above, using your virtual coins.</div>

          {!isMarketOpen && (
            <div style={{ background: 'rgba(148,163,184,0.08)', border: '1px dashed rgba(148,163,184,0.25)', borderRadius: 10, padding: '14px 16px', color: '#94a3b8', fontSize: 13 }}>
              🔒 Market is currently <b>{data?.meta?.marketState || 'CLOSED'}</b> — live intraday trading unlocks automatically when NSE is open
              (9:15 AM – 3:30 PM IST, Monday–Friday, excluding holidays). You can still browse charts and switch stocks any time.
            </div>
          )}

          {isMarketOpen && (
            <>
              <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap', marginBottom: 14 }}>
                <div>
                  <label style={{ color: '#94a3b8', fontSize: 12, display: 'block', marginBottom: 6 }}>Quantity</label>
                  <input type="number" min="1" value={tradeQty} onChange={e => setTradeQty(Math.max(1, Number(e.target.value)))}
                    style={{ width: 120, padding: '10px 12px', background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#fff', boxSizing: 'border-box' }} />
                </div>
                <div style={{ color: '#94a3b8', fontSize: 13, paddingBottom: 10 }}>
                  @ ₹{fmtNum(chartData[chartData.length - 1]?.close || 0)} each ≈ <b style={{ color: '#e2e8f0' }}>₹{fmtNum((chartData[chartData.length - 1]?.close || 0) * tradeQty)}</b>
                </div>
                <div style={{ flex: 1 }} />
                <div style={{ color: '#64748b', fontSize: 12, paddingBottom: 10 }}>Balance: <b style={{ color: '#10b981' }}>₹{fmtNum(user?.virtualCoins)}</b></div>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => executeTrade('buy')} disabled={trading}
                  style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', borderRadius: 10, cursor: trading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 15, opacity: trading ? 0.7 : 1 }}>
                  {trading ? '...' : `📈 BUY ${instrument.label}`}
                </button>
                <button onClick={() => executeTrade('sell')} disabled={trading}
                  style={{ flex: 1, padding: '14px', background: 'linear-gradient(135deg,#ef4444,#dc2626)', border: 'none', color: '#fff', borderRadius: 10, cursor: trading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 15, opacity: trading ? 0.7 : 1 }}>
                  {trading ? '...' : `📉 SELL ${instrument.label}`}
                </button>
              </div>
              {tradeMsg && (
                <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                  background: tradeMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  color: tradeMsg.type === 'success' ? '#10b981' : '#ef4444' }}>
                  {tradeMsg.text}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}