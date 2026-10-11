import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ComposedChart, AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ReferenceLine, Legend, Cell,
} from 'recharts';

const fmt  = n => n >= 1e7 ? `${(n/1e7).toFixed(1)}Cr` : n >= 1e5 ? `${(n/1e5).toFixed(1)}L` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : (n||0).toFixed(0);
const fmtP = n => `₹${(n||0).toLocaleString('en-IN', { maximumFractionDigits:2 })}`;

const INTERVALS = [
  { label:'1D', value:'5m',  range:'1d'  },
  { label:'5D', value:'15m', range:'5d'  },
  { label:'1M', value:'1d',  range:'1mo' },
  { label:'3M', value:'1d',  range:'3mo' },
  { label:'6M', value:'1d',  range:'6mo' },
  { label:'1Y', value:'1wk', range:'1y'  },
  { label:'5Y', value:'1mo', range:'5y'  },
];

const OVERLAY_CONFIG = {
  SMA20:  { key:'sma20',  color:'#f59e0b', width:1.5 },
  SMA50:  { key:'sma50',  color:'#6366f1', width:1.5 },
  SMA200: { key:'sma200', color:'#ef4444', width:1.5 },
  EMA9:   { key:'ema9',   color:'#10b981', width:1   },
  EMA21:  { key:'ema21',  color:'#8b5cf6', width:1   },
  VWAP:   { key:'vwap',   color:'#06b6d4', width:1.5 },
};

const OVERLAYS   = ['SMA20','SMA50','SMA200','EMA9','EMA21','BB','VWAP'];
const INDICATORS = ['RSI','MACD','Volume','Stochastic'];

// ── Tooltip ────────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div style={{ background:'rgba(8,12,28,0.97)', border:'1px solid rgba(99,102,241,0.35)', borderRadius:10, padding:'10px 14px', fontSize:12, minWidth:160 }}>
      <div style={{ color:'#64748b', marginBottom:6, fontWeight:600 }}>{label}</div>
      {d?.open  != null && <div style={{color:'#94a3b8'}}>O: <strong style={{color:'#e2e8f0'}}>{fmtP(d.open)}</strong></div>}
      {d?.high  != null && <div style={{color:'#94a3b8'}}>H: <strong style={{color:'#10b981'}}>{fmtP(d.high)}</strong></div>}
      {d?.low   != null && <div style={{color:'#94a3b8'}}>L: <strong style={{color:'#ef4444'}}>{fmtP(d.low)}</strong></div>}
      {d?.close != null && <div style={{color:'#94a3b8'}}>C: <strong style={{color:'#e2e8f0'}}>{fmtP(d.close)}</strong></div>}
      {d?.volume!= null && <div style={{color:'#94a3b8'}}>Vol: <strong style={{color:'#6366f1'}}>{fmt(d.volume)}</strong></div>}
      {payload.filter(p=>p.name&&p.name!=='close'&&p.name!=='volume'&&p.value!=null).map((p,i)=>(
        <div key={i} style={{color:p.color||'#94a3b8',marginTop:2}}>{p.name}: <strong>{typeof p.value==='number'?p.value.toFixed(2):p.value}</strong></div>
      ))}
    </div>
  );
};

const RSIDot = (props) => {
  const { cx, cy, payload } = props;
  if (!payload?.rsi || !cy) return null;
  const color = payload.rsi < 30 ? '#10b981' : payload.rsi > 70 ? '#ef4444' : 'transparent';
  if (color === 'transparent') return null;
  return <circle cx={cx} cy={cy} r={3} fill={color} stroke="none" />;
};

// ── Trade Panel ────────────────────────────────────────────────────────────
function TradePanel({ symbol, price, onTradeComplete }) {
  const [action,   setAction]   = useState('buy');
  const [qty,      setQty]      = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [balance,  setBalance]  = useState(0);
  const [holding,  setHolding]  = useState(null);

  useEffect(() => { fetchUserData(); }, [symbol]);

  const fetchUserData = async () => {
    try {
      const res = await axios.get('/api/auth/me');
      setBalance(res.data.virtualCoins || 0);
      const port = res.data.portfolio || [];
      const sym  = symbol.toUpperCase();
      const h    = port.find(p =>
        (p.symbol||'').toUpperCase().replace('.NS','').replace('.BSE','') === sym ||
        (p.symbol||'').toUpperCase() === sym
      );
      setHolding(h || null);
    } catch {}
  };

  const total      = (price || 0) * (qty || 0);
  const canAfford  = balance >= total;
  const canSell    = holding && (holding.quantity || 0) >= qty;
  const maxBuy     = price > 0 ? Math.floor(balance / price) : 0;
  const maxSell    = holding?.quantity || 0;

  const handleTrade = async () => {
    if (!qty || qty <= 0) { toast.error('Enter valid quantity'); return; }
    if (action === 'buy'  && !canAfford) { toast.error(`Insufficient balance. Need ${fmtP(total)}`); return; }
    if (action === 'sell' && !canSell)   { toast.error(`You only have ${maxSell} shares`); return; }

    setLoading(true);
    try {
      const res = await axios.post('/api/stocks/trade', {
        symbol:      symbol.toUpperCase(),
        action,
        quantity:    Number(qty),
        price:       price,
      });
      toast.success(`✅ ${action === 'buy' ? 'Bought' : 'Sold'} ${qty} shares of ${symbol} @ ${fmtP(price)}`);
      setBalance(res.data.newBalance || res.data.virtualCoins || balance);
      fetchUserData();
      if (onTradeComplete) onTradeComplete();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trade failed');
    }
    setLoading(false);
  };

  return (
    <div style={{
      background: 'rgba(13,17,35,0.95)',
      border:     '1px solid rgba(99,102,241,0.25)',
      borderRadius: 16,
      padding:    20,
      marginBottom: 16,
      position:   'sticky',
      top:        80,
    }}>
      {/* Header */}
      <div style={{ fontWeight:800, fontSize:15, marginBottom:16, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span>⚡ Quick Trade</span>
        <span style={{ color:'#10b981', fontSize:13 }}>🪙 {fmtP(balance)}</span>
      </div>

      {/* Buy / Sell toggle */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginBottom:16 }}>
        {['buy','sell'].map(a => (
          <button key={a} onClick={() => setAction(a)} style={{
            padding:    '10px 0',
            borderRadius: 10,
            border:     'none',
            cursor:     'pointer',
            fontWeight: 800,
            fontSize:   14,
            transition: 'all 0.2s',
            background: action===a
              ? (a==='buy' ? 'linear-gradient(135deg,#10b981,#059669)' : 'linear-gradient(135deg,#ef4444,#dc2626)')
              : 'rgba(10,14,26,0.6)',
            color:      action===a ? '#fff' : '#64748b',
            boxShadow:  action===a ? (a==='buy'?'0 4px 15px rgba(16,185,129,0.3)':'0 4px 15px rgba(239,68,68,0.3)') : 'none',
          }}>
            {a === 'buy' ? '📈 BUY' : '📉 SELL'}
          </button>
        ))}
      </div>

      {/* Live price display */}
      <div style={{ background:'rgba(10,14,26,0.6)', borderRadius:10, padding:'10px 14px', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ color:'#64748b', fontSize:12 }}>Market Price</span>
        <span style={{ color:'#e2e8f0', fontWeight:900, fontSize:16 }}>{fmtP(price)}</span>
      </div>

      {/* Quantity input */}
      <div style={{ marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ color:'#64748b', fontSize:12, fontWeight:600 }}>QUANTITY</span>
          <span style={{ color:'#475569', fontSize:11 }}>
            Max: {action==='buy' ? maxBuy : maxSell}
          </span>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => setQty(q => Math.max(1, Number(q)-1))}
            style={{ background:'rgba(10,14,26,0.7)', border:'1px solid rgba(99,102,241,0.2)', color:'#94a3b8', width:36, borderRadius:8, cursor:'pointer', fontSize:18, fontWeight:700 }}>−</button>
          <input
            type="number" min={1} value={qty}
            onChange={e => setQty(Math.max(1, parseInt(e.target.value)||1))}
            style={{ flex:1, background:'rgba(10,14,26,0.7)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:8, color:'#e2e8f0', padding:'8px 12px', fontSize:16, fontWeight:800, textAlign:'center', outline:'none' }}
          />
          <button onClick={() => setQty(q => Number(q)+1)}
            style={{ background:'rgba(10,14,26,0.7)', border:'1px solid rgba(99,102,241,0.2)', color:'#94a3b8', width:36, borderRadius:8, cursor:'pointer', fontSize:18, fontWeight:700 }}>+</button>
        </div>
        {/* Quick qty buttons */}
        <div style={{ display:'flex', gap:4, marginTop:6 }}>
          {[1,5,10,25].map(n => (
            <button key={n} onClick={() => setQty(n)}
              style={{ flex:1, background: qty===n?'rgba(99,102,241,0.2)':'rgba(10,14,26,0.5)', border:`1px solid ${qty===n?'rgba(99,102,241,0.4)':'rgba(99,102,241,0.1)'}`, color: qty===n?'#818cf8':'#475569', borderRadius:6, padding:'4px 0', cursor:'pointer', fontSize:11, fontWeight:700 }}>
              {n}
            </button>
          ))}
          <button onClick={() => setQty(action==='buy'?maxBuy:maxSell)}
            style={{ flex:1, background:'rgba(10,14,26,0.5)', border:'1px solid rgba(99,102,241,0.1)', color:'#475569', borderRadius:6, padding:'4px 0', cursor:'pointer', fontSize:11, fontWeight:700 }}>
            Max
          </button>
        </div>
      </div>

      {/* Order summary */}
      <div style={{ background:'rgba(10,14,26,0.5)', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ color:'#64748b', fontSize:12 }}>Price per share</span>
          <span style={{ color:'#94a3b8', fontSize:12, fontWeight:700 }}>{fmtP(price)}</span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ color:'#64748b', fontSize:12 }}>Quantity</span>
          <span style={{ color:'#94a3b8', fontSize:12, fontWeight:700 }}>× {qty}</span>
        </div>
        <div style={{ borderTop:'1px solid rgba(99,102,241,0.1)', paddingTop:8, marginTop:4, display:'flex', justifyContent:'space-between' }}>
          <span style={{ color:'#e2e8f0', fontSize:13, fontWeight:700 }}>Total</span>
          <span style={{ color: action==='buy'?'#10b981':'#ef4444', fontSize:15, fontWeight:900 }}>{fmtP(total)}</span>
        </div>
        {action === 'buy' && (
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
            <span style={{ color:'#475569', fontSize:11 }}>Balance after</span>
            <span style={{ color: canAfford?'#64748b':'#ef4444', fontSize:11, fontWeight:700 }}>{fmtP(balance - total)}</span>
          </div>
        )}
        {action === 'sell' && holding && (
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:4 }}>
            <span style={{ color:'#475569', fontSize:11 }}>Shares remaining</span>
            <span style={{ color:'#64748b', fontSize:11, fontWeight:700 }}>{maxSell - qty}</span>
          </div>
        )}
      </div>

      {/* Holdings info */}
      {holding && (
        <div style={{ background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)', borderRadius:10, padding:'10px 14px', marginBottom:14 }}>
          <div style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:6 }}>YOUR POSITION</div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ color:'#94a3b8', fontSize:12 }}>Shares held</span>
            <span style={{ color:'#e2e8f0', fontWeight:700, fontSize:12 }}>{holding.quantity}</span>
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
            <span style={{ color:'#94a3b8', fontSize:12 }}>Avg buy price</span>
            <span style={{ color:'#e2e8f0', fontWeight:700, fontSize:12 }}>{fmtP(holding.avgPrice || holding.averagePrice)}</span>
          </div>
          {(() => {
            const avg = holding.avgPrice || holding.averagePrice || 0;
            const pnl = ((price - avg) / avg * 100);
            return (
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#94a3b8', fontSize:12 }}>Unrealised P&L</span>
                <span style={{ color: pnl>=0?'#10b981':'#ef4444', fontWeight:800, fontSize:12 }}>
                  {pnl>=0?'+':''}{pnl.toFixed(2)}%
                </span>
              </div>
            );
          })()}
        </div>
      )}

      {/* Trade button */}
      <button onClick={handleTrade} disabled={loading || (action==='buy'&&!canAfford) || (action==='sell'&&!canSell&&maxSell===0)}
        style={{
          width:      '100%',
          padding:    '13px 0',
          borderRadius: 12,
          border:     'none',
          cursor:     loading?'not-allowed':'pointer',
          fontWeight: 900,
          fontSize:   15,
          transition: 'all 0.2s',
          opacity:    loading?0.7:1,
          background: action==='buy'
            ? (canAfford ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(100,116,139,0.3)')
            : (canSell||maxSell>0 ? 'linear-gradient(135deg,#ef4444,#dc2626)' : 'rgba(100,116,139,0.3)'),
          color: '#fff',
          boxShadow: action==='buy'&&canAfford ? '0 6px 20px rgba(16,185,129,0.35)' : action==='sell'&&(canSell||maxSell>0) ? '0 6px 20px rgba(239,68,68,0.35)' : 'none',
        }}>
        {loading ? '⏳ Processing...' : action==='buy'
          ? (canAfford ? `📈 Buy ${qty} Share${qty>1?'s':''}` : '❌ Insufficient Balance')
          : (maxSell > 0 ? `📉 Sell ${qty} Share${qty>1?'s':''}` : '❌ No Shares to Sell')
        }
      </button>

      {/* Tax note */}
      <div style={{ color:'#334155', fontSize:10, textAlign:'center', marginTop:8 }}>
        {action==='sell' ? '📋 STCG 15% · LTCG 10% may apply' : '📋 Virtual trade — no real money'}
      </div>
    </div>
  );
}

export default function StockDetail() {
  const { symbol }    = useParams();
  const navigate      = useNavigate();
  const [data,        setData]       = useState(null);
  const [loading,     setLoading]    = useState(true);
  const [interval,    setInterval_]  = useState({ label:'6M', value:'1d', range:'6mo' });
  const [overlays,    setOverlays]   = useState(['SMA20','SMA50','BB']);
  const [indicators,  setIndicators] = useState(['RSI','Volume']);
  const [chartType,   setChartType]  = useState('area');
  const [tab,         setTab]        = useState('chart');
  const [tradeKey,    setTradeKey]   = useState(0); // force re-render after trade

  const sym = decodeURIComponent(symbol || '').replace('.BSE','').replace('.NS','').toUpperCase();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`/api/stock-detail/${sym}?interval=${interval.value}&range=${interval.range}`);
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to load ${sym}`);
    }
    setLoading(false);
  }, [sym, interval]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleOverlay   = o => setOverlays(v => v.includes(o) ? v.filter(x=>x!==o) : [...v,o]);
  const toggleIndicator = i => setIndicators(v => v.includes(i) ? v.filter(x=>x!==i) : [...v,i]);

  const st = {
    page:  { padding:'20px 16px', maxWidth:1600, margin:'0 auto' },
    card:  { background:'rgba(13,17,35,0.92)', border:'1px solid rgba(99,102,241,0.18)', borderRadius:14, padding:18, marginBottom:14 },
    tab:   (a) => ({ padding:'7px 16px', borderRadius:8, border:'none', cursor:'pointer', fontWeight:700, fontSize:12, background:a?'#6366f1':'rgba(10,14,26,0.6)', color:a?'#fff':'#94a3b8', transition:'all 0.15s' }),
    chip:  (a, color='#6366f1') => ({ padding:'4px 10px', borderRadius:6, border:`1px solid ${a?color+'80':'rgba(99,102,241,0.2)'}`, cursor:'pointer', fontWeight:700, fontSize:11, background:a?`${color}20`:'rgba(10,14,26,0.5)', color:a?color:'#64748b', transition:'all 0.15s' }),
    stat:  { background:'rgba(10,14,26,0.6)', borderRadius:10, padding:'10px 14px' },
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'80vh', flexDirection:'column', gap:16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
      <div style={{ width:48, height:48, border:'3px solid rgba(99,102,241,0.2)', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ color:'#6366f1', fontWeight:700, animation:'pulse 1.5s infinite' }}>Loading {sym}...</div>
    </div>
  );

  if (!data) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:48 }}>📭</div>
      <h2>No data for {sym}</h2>
      <button onClick={() => navigate(-1)} style={{ background:'#6366f1', border:'none', color:'#fff', padding:'10px 20px', borderRadius:10, cursor:'pointer' }}>← Go Back</button>
    </div>
  );

  const { meta:m, chartData, support, resistance, patterns, signal } = data;

  const displayData = (chartData||[]).slice(-200).map(d => ({ ...d, time:(d.time||'').slice(5) }));
  const step    = Math.max(1, Math.floor(displayData.length/8));
  const xTicks  = displayData.filter((_,i) => i%step===0).map(d=>d.time);
  const prices  = displayData.map(d=>d.close).filter(Boolean);
  const priceMin= prices.length ? Math.min(...prices)*0.995 : 0;
  const priceMax= prices.length ? Math.max(...prices)*1.005 : 0;

  return (
    <div style={st.page}>
      <style>{`
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow   { 0%,100%{box-shadow:0 0 10px rgba(99,102,241,0.15)} 50%{box-shadow:0 0 28px rgba(99,102,241,0.45)} }
        input[type=number]::-webkit-inner-spin-button { opacity:0 }
      `}</style>

      {/* ── Layout: Main content + Trade sidebar ── */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, alignItems:'start' }}>

        {/* ── LEFT: main content ── */}
        <div>
          {/* Header */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18, flexWrap:'wrap', gap:12 }}>
            <div style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
              <button onClick={() => navigate(-1)} style={{ background:'rgba(10,14,26,0.7)', border:'1px solid rgba(99,102,241,0.2)', color:'#94a3b8', padding:'8px 14px', borderRadius:9, cursor:'pointer', fontWeight:700, fontSize:13, marginTop:4 }}>← Back</button>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                  <h1 style={{ fontSize:26, fontWeight:900 }}>{sym}</h1>
                  <span style={{ background:'rgba(99,102,241,0.15)', color:'#818cf8', padding:'3px 10px', borderRadius:6, fontSize:12, fontWeight:700 }}>NSE</span>
                  <span style={{ background:m.changePct>=0?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)', color:m.changePct>=0?'#10b981':'#ef4444', padding:'3px 10px', borderRadius:6, fontSize:13, fontWeight:800 }}>
                    {m.changePct>=0?'▲':'▼'} {Math.abs(m.changePct||0).toFixed(2)}%
                  </span>
                </div>
                <div style={{ fontSize:30, fontWeight:900, color:'#e2e8f0', marginTop:2 }}>
                  ₹{(m.price||0).toLocaleString('en-IN',{maximumFractionDigits:2})}
                  <span style={{ color:m.change>=0?'#10b981':'#ef4444', fontSize:15, fontWeight:700, marginLeft:10 }}>
                    {m.change>=0?'+':''}{(m.change||0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* AI Signal */}
            <div style={{ background:`${signal?.verdictColor||'#f59e0b'}15`, border:`2px solid ${signal?.verdictColor||'#f59e0b'}40`, borderRadius:14, padding:'12px 20px', textAlign:'center', animation:'glow 3s infinite', minWidth:160 }}>
              <div style={{ color:'#64748b', fontSize:10, fontWeight:700, letterSpacing:1, marginBottom:4 }}>AI SIGNAL</div>
              <div style={{ fontSize:20, fontWeight:900, color:signal?.verdictColor }}>{signal?.verdictEmoji} {signal?.verdict}</div>
              <div style={{ color:'#64748b', fontSize:11, marginTop:4 }}>
                <span style={{color:'#10b981'}}>↑{signal?.bull}</span> · <span style={{color:'#ef4444'}}>↓{signal?.bear}</span>
              </div>
              <div style={{ background:'rgba(10,14,26,0.5)', borderRadius:4, height:4, marginTop:6, overflow:'hidden' }}>
                <div style={{ background:signal?.verdictColor, height:'100%', width:`${signal?.strength||50}%`, borderRadius:4 }} />
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(110px,1fr))', gap:8, marginBottom:14 }}>
            {[
              { label:'Open',     value:`₹${(m.open||0).toFixed(2)}`,   color:'#e2e8f0' },
              { label:'High',     value:`₹${(m.high||0).toFixed(2)}`,   color:'#10b981' },
              { label:'Low',      value:`₹${(m.low||0).toFixed(2)}`,    color:'#ef4444' },
              { label:'Volume',   value:fmt(m.volume||0),               color:m.volumeSurge>=2?'#f59e0b':'#94a3b8', sub:`${(m.volumeSurge||1).toFixed(1)}x` },
              { label:'52W High', value:`₹${(m.w52High||0).toFixed(0)}`,color:'#10b981', sub:`${(m.w52HighPct||0).toFixed(1)}%` },
              { label:'52W Low',  value:`₹${(m.w52Low||0).toFixed(0)}`, color:'#ef4444', sub:`+${(m.w52LowPct||0).toFixed(0)}%` },
              { label:'RSI (14)', value:(m.rsiCurrent||50).toFixed(1),  color:m.rsiCurrent<30?'#10b981':m.rsiCurrent>70?'#ef4444':'#f59e0b', sub:m.rsiCurrent<30?'Oversold':m.rsiCurrent>70?'Overbought':'Neutral' },
              { label:'ATR',      value:m.atrCurrent?`₹${m.atrCurrent.toFixed(1)}`:'—', color:'#8b5cf6' },
              { label:'VWAP',     value:m.vwapCurrent?`₹${m.vwapCurrent.toFixed(0)}`:'—', color:'#06b6d4', sub:m.price>=m.vwapCurrent?'Above':'Below' },
            ].map(item => (
              <div key={item.label} style={st.stat}>
                <div style={{ color:'#475569', fontSize:10, fontWeight:600, marginBottom:3 }}>{item.label}</div>
                <div style={{ color:item.color, fontWeight:800, fontSize:13 }}>{item.value}</div>
                {item.sub && <div style={{ color:'#334155', fontSize:10, marginTop:2 }}>{item.sub}</div>}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:14, flexWrap:'wrap' }}>
            {[['chart','📈 Chart'],['signals','🎯 Signals'],['patterns','🕯 Patterns'],['levels','📏 S&R']].map(([id,label]) => (
              <button key={id} style={st.tab(tab===id)} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>

          {/* ── CHART TAB ── */}
          {tab === 'chart' && (
            <div style={{ animation:'fadein 0.3s ease' }}>
              {/* Controls */}
              <div style={{ ...st.card, padding:'12px 16px' }}>
                <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
                  <div style={{ display:'flex', gap:3 }}>
                    {INTERVALS.map(iv => <button key={iv.label} style={st.tab(interval.label===iv.label)} onClick={() => setInterval_(iv)}>{iv.label}</button>)}
                  </div>
                  <div style={{ width:1, height:22, background:'rgba(99,102,241,0.2)' }} />
                  <div style={{ display:'flex', gap:3 }}>
                    {[['area','📈'],['candle','🕯'],['line','📉']].map(([t,e]) => (
                      <button key={t} style={st.tab(chartType===t)} onClick={() => setChartType(t)}>{e} {t}</button>
                    ))}
                  </div>
                  <div style={{ width:1, height:22, background:'rgba(99,102,241,0.2)' }} />
                  <div style={{ display:'flex', gap:3, flexWrap:'wrap', alignItems:'center' }}>
                    <span style={{ color:'#475569', fontSize:11, fontWeight:600 }}>Overlays:</span>
                    {OVERLAYS.map(o => <button key={o} style={st.chip(overlays.includes(o),'#6366f1')} onClick={() => toggleOverlay(o)}>{o}</button>)}
                  </div>
                </div>
                <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:8, alignItems:'center' }}>
                  <span style={{ color:'#475569', fontSize:11, fontWeight:600 }}>Indicators:</span>
                  {INDICATORS.map(i => <button key={i} style={st.chip(indicators.includes(i),'#8b5cf6')} onClick={() => toggleIndicator(i)}>{i}</button>)}
                </div>
              </div>

              {/* Main chart */}
              <div style={st.card}>
                <div style={{ fontWeight:700, fontSize:13, marginBottom:12, display:'flex', justifyContent:'space-between' }}>
                  <span>{sym} · {interval.label}</span>
                  <span style={{ color:'#475569', fontSize:11 }}>{displayData.length} bars</span>
                </div>
                <ResponsiveContainer width="100%" height={360}>
                  <ComposedChart data={displayData} margin={{ top:5, right:8, left:8, bottom:5 }}>
                    <defs>
                      <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="bbGradFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%"  stopColor="#8b5cf6" stopOpacity={0.06} />
                        <stop offset="100%"stopColor="#8b5cf6" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="2 8" stroke="rgba(99,102,241,0.06)" />
                    <XAxis dataKey="time" ticks={xTicks} tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[priceMin,priceMax]} tick={{ fill:'#475569', fontSize:10 }} axisLine={false} tickLine={false} tickFormatter={v=>`₹${v.toFixed(0)}`} width={65} />
                    <Tooltip content={<ChartTooltip />} />

                    {overlays.includes('BB') && <>
                      <Area dataKey="bbUpper"  stroke="#8b5cf640" strokeWidth={1} fill="none" dot={false} />
                      <Area dataKey="bbLower"  stroke="#8b5cf640" strokeWidth={1} fill="url(#bbGradFill)" dot={false} />
                      <Line dataKey="bbMiddle" stroke="#8b5cf660" strokeWidth={1} dot={false} />
                    </>}

                    {chartType==='area' && <Area dataKey="close" name="Price" stroke="#6366f1" strokeWidth={2} fill="url(#priceGrad)" dot={false} activeDot={{r:4}} />}
                    {chartType==='line' && <Line dataKey="close" name="Price" stroke="#6366f1" strokeWidth={2} dot={false} activeDot={{r:4}} />}
                    {chartType==='candle' && <Area dataKey="close" name="Price" stroke="#6366f1" strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />}

                    {Object.entries(OVERLAY_CONFIG).map(([name,cfg]) =>
                      overlays.includes(name) && name!=='BB'
                        ? <Line key={name} dataKey={cfg.key} name={name} stroke={cfg.color} strokeWidth={cfg.width} dot={false} />
                        : null
                    )}

                    {(support||[]).map((lvl,i) => <ReferenceLine key={`s${i}`} y={lvl} stroke="#10b98160" strokeDasharray="4 4" label={{value:`S:${lvl}`,fill:'#10b981',fontSize:9,position:'right'}} />)}
                    {(resistance||[]).map((lvl,i) => <ReferenceLine key={`r${i}`} y={lvl} stroke="#ef444460" strokeDasharray="4 4" label={{value:`R:${lvl}`,fill:'#ef4444',fontSize:9,position:'right'}} />)}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* Volume */}
              {indicators.includes('Volume') && (
                <div style={{ ...st.card, padding:'12px 18px' }}>
                  <div style={{ fontWeight:700, fontSize:12, marginBottom:8, color:'#94a3b8' }}>📊 Volume</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <BarChart data={displayData} margin={{ top:0, right:8, left:8, bottom:0 }}>
                      <CartesianGrid strokeDasharray="2 8" stroke="rgba(99,102,241,0.05)" />
                      <XAxis dataKey="time" ticks={xTicks} tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} tickFormatter={v=>fmt(v)} width={45} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="volume" name="Volume" radius={[2,2,0,0]}>
                        {displayData.map((d,i) => <Cell key={i} fill={(d.close||0)>=(d.open||0)?'#10b98155':'#ef444455'} />)}
                      </Bar>
                      <ReferenceLine y={m.avgVolume} stroke="#f59e0b60" strokeDasharray="4 4" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* RSI */}
              {indicators.includes('RSI') && (
                <div style={{ ...st.card, padding:'12px 18px' }}>
                  <div style={{ fontWeight:700, fontSize:12, marginBottom:8, color:'#94a3b8', display:'flex', justifyContent:'space-between' }}>
                    <span>📐 RSI (14)</span>
                    <span style={{ color:m.rsiCurrent<30?'#10b981':m.rsiCurrent>70?'#ef4444':'#f59e0b', fontWeight:800 }}>{(m.rsiCurrent||50).toFixed(1)}</span>
                  </div>
                  <ResponsiveContainer width="100%" height={100}>
                    <ComposedChart data={displayData} margin={{ top:0, right:8, left:8, bottom:0 }}>
                      <CartesianGrid strokeDasharray="2 8" stroke="rgba(99,102,241,0.05)" />
                      <XAxis dataKey="time" ticks={xTicks} tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0,100]} ticks={[30,50,70]} tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={70} stroke="#ef444440" strokeDasharray="3 3" />
                      <ReferenceLine y={30} stroke="#10b98140" strokeDasharray="3 3" />
                      <defs>
                        <linearGradient id="rsiGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#f59e0b" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area dataKey="rsi" name="RSI" stroke="#f59e0b" strokeWidth={1.5} fill="url(#rsiGrad)" dot={<RSIDot />} activeDot={{r:3}} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* MACD */}
              {indicators.includes('MACD') && (
                <div style={{ ...st.card, padding:'12px 18px' }}>
                  <div style={{ fontWeight:700, fontSize:12, marginBottom:8, color:'#94a3b8' }}>📊 MACD (12,26,9)</div>
                  <ResponsiveContainer width="100%" height={120}>
                    <ComposedChart data={displayData} margin={{ top:0, right:8, left:8, bottom:0 }}>
                      <CartesianGrid strokeDasharray="2 8" stroke="rgba(99,102,241,0.05)" />
                      <XAxis dataKey="time" ticks={xTicks} tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} width={42} tickFormatter={v=>v?.toFixed(1)} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.08)" />
                      <Bar dataKey="histogram" name="Histogram">
                        {displayData.map((d,i) => <Cell key={i} fill={(d.histogram||0)>=0?'#10b98166':'#ef444466'} />)}
                      </Bar>
                      <Line dataKey="macd"   name="MACD"   stroke="#6366f1" strokeWidth={1.5} dot={false} />
                      <Line dataKey="signal" name="Signal" stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Stochastic */}
              {indicators.includes('Stochastic') && (
                <div style={{ ...st.card, padding:'12px 18px' }}>
                  <div style={{ fontWeight:700, fontSize:12, marginBottom:8, color:'#94a3b8' }}>🎯 Stochastic (14,3)</div>
                  <ResponsiveContainer width="100%" height={100}>
                    <ComposedChart data={displayData} margin={{ top:0, right:8, left:8, bottom:0 }}>
                      <CartesianGrid strokeDasharray="2 8" stroke="rgba(99,102,241,0.05)" />
                      <XAxis dataKey="time" ticks={xTicks} tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0,100]} ticks={[20,50,80]} tick={{ fill:'#475569', fontSize:9 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip content={<ChartTooltip />} />
                      <ReferenceLine y={80} stroke="#ef444440" strokeDasharray="3 3" />
                      <ReferenceLine y={20} stroke="#10b98140" strokeDasharray="3 3" />
                      <Line dataKey="stochK" name="%K" stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                      <Line dataKey="stochD" name="%D" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ── SIGNALS TAB ── */}
          {tab === 'signals' && (
            <div style={{ animation:'fadein 0.3s ease' }}>
              <div style={{ ...st.card, display:'flex', gap:20, alignItems:'center', flexWrap:'wrap', borderColor:`${signal?.verdictColor||'#f59e0b'}40` }}>
                <div style={{ textAlign:'center', minWidth:90 }}>
                  <svg width={90} height={90}>
                    {(() => {
                      const r=35,circ=2*Math.PI*r,pct=(signal?.strength||50)/100,color=signal?.verdictColor||'#f59e0b';
                      return <>
                        <circle cx={45} cy={45} r={r} fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth={8}/>
                        <circle cx={45} cy={45} r={r} fill="none" stroke={color} strokeWidth={8}
                          strokeDasharray={circ} strokeDashoffset={circ*(1-pct)} strokeLinecap="round" transform="rotate(-90 45 45)"/>
                        <text x={45} y={50} textAnchor="middle" fill={color} fontSize={18} fontWeight="900">{signal?.strength}%</text>
                      </>;
                    })()}
                  </svg>
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:24, fontWeight:900, color:signal?.verdictColor }}>{signal?.verdictEmoji} {signal?.verdict}</div>
                  <div style={{ color:'#94a3b8', marginTop:4 }}>
                    <span style={{color:'#10b981',fontWeight:700}}>↑{signal?.bull} bullish</span> · <span style={{color:'#ef4444',fontWeight:700}}>↓{signal?.bear} bearish</span>
                  </div>
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
                {(signal?.signals||[]).map((sig,i) => (
                  <div key={i} style={{ background:sig.type==='bullish'?'rgba(16,185,129,0.06)':'rgba(239,68,68,0.06)', border:`1px solid ${sig.type==='bullish'?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`, borderRadius:10, padding:'12px 14px', display:'flex', gap:10, alignItems:'center' }}>
                    <span style={{ fontSize:18 }}>{sig.type==='bullish'?'🟢':'🔴'}</span>
                    <div>
                      <div style={{ fontWeight:800, fontSize:12, color:sig.type==='bullish'?'#10b981':'#ef4444' }}>{sig.indicator}</div>
                      <div style={{ color:'#94a3b8', fontSize:11 }}>{sig.signal}</div>
                      <div style={{ color:'#475569', fontSize:10, marginTop:2 }}>{sig.value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── PATTERNS TAB ── */}
          {tab === 'patterns' && (
            <div style={{ animation:'fadein 0.3s ease' }}>
              {(patterns||[]).length === 0 ? (
                <div style={{ ...st.card, textAlign:'center', padding:40 }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>🕯</div>
                  <div style={{ color:'#94a3b8' }}>No significant candlestick patterns detected.</div>
                </div>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                  {patterns.map((p,i) => (
                    <div key={i} style={{ ...st.card, marginBottom:0, borderColor:p.type==='bullish'?'rgba(16,185,129,0.3)':p.type==='bearish'?'rgba(239,68,68,0.3)':'rgba(245,158,11,0.3)' }}>
                      <div style={{ fontSize:28, marginBottom:6 }}>{p.emoji}</div>
                      <div style={{ fontWeight:800, fontSize:14, color:p.type==='bullish'?'#10b981':p.type==='bearish'?'#ef4444':'#f59e0b', marginBottom:4 }}>{p.name}</div>
                      <div style={{ color:'#94a3b8', fontSize:12 }}>{p.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── S&R TAB ── */}
          {tab === 'levels' && (
            <div style={{ animation:'fadein 0.3s ease' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div style={st.card}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#10b981', marginBottom:14 }}>🛡 Support Levels</div>
                  {(support||[]).length === 0 ? <div style={{color:'#475569'}}>Insufficient data</div>
                    : [...support].reverse().map((lvl,i) => {
                      const dist = ((m.price-lvl)/m.price*100);
                      return (
                        <div key={i} style={{ marginBottom:10 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontWeight:800, color:'#10b981' }}>₹{lvl.toLocaleString('en-IN')}</span>
                            <span style={{ color:'#10b981', fontSize:12 }}>{dist.toFixed(1)}% away</span>
                          </div>
                          <div style={{ background:'rgba(10,14,26,0.6)', borderRadius:4, height:5, overflow:'hidden' }}>
                            <div style={{ background:'#10b981', height:'100%', width:`${Math.min(100,100-dist*3)}%`, borderRadius:4 }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
                <div style={st.card}>
                  <div style={{ fontWeight:800, fontSize:14, color:'#ef4444', marginBottom:14 }}>🚧 Resistance Levels</div>
                  {(resistance||[]).length === 0 ? <div style={{color:'#475569'}}>Insufficient data</div>
                    : resistance.map((lvl,i) => {
                      const dist = ((lvl-m.price)/m.price*100);
                      return (
                        <div key={i} style={{ marginBottom:10 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontWeight:800, color:'#ef4444' }}>₹{lvl.toLocaleString('en-IN')}</span>
                            <span style={{ color:'#ef4444', fontSize:12 }}>{dist.toFixed(1)}% away</span>
                          </div>
                          <div style={{ background:'rgba(10,14,26,0.6)', borderRadius:4, height:5, overflow:'hidden' }}>
                            <div style={{ background:'#ef4444', height:'100%', width:`${Math.min(100,100-dist*3)}%`, borderRadius:4 }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT: Trade panel (sticky sidebar) ── */}
        <div>
          <TradePanel
            key={tradeKey}
            symbol={sym}
            price={m.price || 0}
            onTradeComplete={() => setTradeKey(k => k+1)}
          />

          {/* Quick info card */}
          <div style={st.card}>
            <div style={{ fontWeight:700, fontSize:13, marginBottom:12 }}>📋 Stock Info</div>
            {[
              { label:'Symbol',   value:sym },
              { label:'Exchange', value:'NSE / BSE' },
              { label:'Sector',   value:'—' },
              { label:'52W High', value:`₹${(m.w52High||0).toFixed(0)}` },
              { label:'52W Low',  value:`₹${(m.w52Low||0).toFixed(0)}` },
              { label:'Avg Vol',  value:fmt(m.avgVolume||0) },
            ].map(item => (
              <div key={item.label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
                <span style={{ color:'#64748b', fontSize:12 }}>{item.label}</span>
                <span style={{ color:'#e2e8f0', fontWeight:700, fontSize:12 }}>{item.value}</span>
              </div>
            ))}
          </div>

          {/* Alert shortcut */}
          <div style={{ ...st.card, textAlign:'center', background:'rgba(245,158,11,0.05)', borderColor:'rgba(245,158,11,0.2)', cursor:'pointer' }}
            onClick={() => navigate('/alerts')}>
            <div style={{ fontSize:22, marginBottom:4 }}>🔔</div>
            <div style={{ fontWeight:700, fontSize:12, color:'#f59e0b' }}>Set Price Alert</div>
            <div style={{ color:'#64748b', fontSize:11, marginTop:2 }}>Get notified when {sym} hits your target</div>
          </div>
        </div>
      </div>
    </div>
  );
}