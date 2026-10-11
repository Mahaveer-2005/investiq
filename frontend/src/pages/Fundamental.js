import React, { useState, useCallback } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts';

// ── Formatters ────────────────────────────────────────────────────────────────
const fmtINR = (n) => {
  const num = Number(n);
  if (!num || isNaN(num)) return '₹0';
  const abs = Math.abs(num);
  if (abs >= 1e12) return `₹${(num/1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `₹${(num/1e9).toFixed(2)}B`;
  if (abs >= 1e7)  return `₹${(num/1e7).toFixed(2)}Cr`;
  if (abs >= 1e5)  return `₹${(num/1e5).toFixed(2)}L`;
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};
const fmtNum  = (n, d=2) => { const v = Number(n); return isNaN(v) ? '0' : v.toFixed(d); };
const fmtPct  = (n) => { const v = Number(n); return `${v>=0?'+':''}${v.toFixed(2)}%`; };
const pColor  = (v) => Number(v) >= 0 ? '#10b981' : '#ef4444';
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'2-digit'}); } catch { return d; } };

const card = {
  background:   'rgba(13,17,35,0.88)',
  border:       '1px solid rgba(99,102,241,0.15)',
  borderRadius: 14,
  padding:      20,
};

const POPULAR = [
  'RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','SBIN','BHARTIARTL',
  'HINDUNILVR','ITC','KOTAKBANK','WIPRO','AXISBANK','MARUTI','TATAMOTORS',
  'SUNPHARMA','ONGC','LT','NTPC','BAJFINANCE','ADANIENT',
];

function ScoreGauge({ value, label, color }) {
  const angle = -135 + (value / 100) * 270;
  return (
    <div style={{ textAlign:'center' }}>
      <svg width="100" height="70" viewBox="0 0 100 70">
        <path d="M10 65 A 40 40 0 1 1 90 65" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="8" strokeLinecap="round"/>
        <path d="M10 65 A 40 40 0 1 1 90 65" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${(value/100)*188} 188`}/>
        <text x="50" y="62" textAnchor="middle" fill={color} fontSize="16" fontWeight="700">{Math.round(value)}</text>
      </svg>
      <div style={{ fontSize:11, color:'#64748b', marginTop:-4 }}>{label}</div>
    </div>
  );
}

function MetricRow({ label, value, hint, color }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
      <div>
        <div style={{ fontSize:13, color:'#94a3b8' }}>{label}</div>
        {hint && <div style={{ fontSize:11, color:'#475569' }}>{hint}</div>}
      </div>
      <div style={{ fontSize:14, fontWeight:700, color:color||'#e2e8f0' }}>{value}</div>
    </div>
  );
}

function RatingBadge({ value, thresholds, labels, reverse=false }) {
  const v = Number(value);
  if (!v || isNaN(v)) return <span style={{ color:'#475569', fontSize:12 }}>N/A</span>;
  let color = '#f59e0b', label = labels?.[1] || 'Moderate';
  if (!reverse) {
    if (v >= thresholds[1]) { color = '#10b981'; label = labels?.[2] || 'Good'; }
    else if (v < thresholds[0]) { color = '#ef4444'; label = labels?.[0] || 'Poor'; }
  } else {
    if (v <= thresholds[0]) { color = '#10b981'; label = labels?.[2] || 'Good'; }
    else if (v > thresholds[1]) { color = '#ef4444'; label = labels?.[0] || 'Poor'; }
  }
  return (
    <span style={{ background:`${color}18`, color, border:`1px solid ${color}40`, padding:'2px 9px', borderRadius:20, fontSize:11, fontWeight:700 }}>
      {label}
    </span>
  );
}

export default function Fundamental() {
  const [symbol,  setSymbol]  = useState('');
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('overview');
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);

  const search = useCallback(async (sym) => {
    if (!sym.trim()) return;
    setLoading(true); setError(null); setData(null);
    try {
      const { data: d } = await axios.get(`/api/fundamental/${sym.trim().toUpperCase()}`, { timeout: 20000 });
      setData(d);
      setTab('overview');
    } catch (e) {
      setError(e?.response?.data?.message || `Could not load data for ${sym}. Try a valid NSE symbol.`);
    } finally { setLoading(false); }
  }, []);

  const onSearch = (e) => {
    e.preventDefault();
    if (symbol.trim()) { setShowSug(false); search(symbol); }
  };

  const onInput = (val) => {
    setSymbol(val);
    if (val.length >= 1) {
      const q = val.toUpperCase();
      setSuggestions(POPULAR.filter(s => s.startsWith(q)).slice(0, 6));
      setShowSug(true);
    } else {
      setShowSug(false);
    }
  };

  const pick = (sym) => { setSymbol(sym); setShowSug(false); search(sym); };

  const tabs = ['overview','valuation','financials','growth','ownership','chart'];

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>
      <style>{`
        @keyframes fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:1} }
        .tab-btn { padding:9px 18px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;border:none;transition:all 0.2s; }
        .tab-btn:hover { opacity:.85; }
        .pop-chip { border:1px solid rgba(99,102,241,0.2);background:rgba(99,102,241,0.08);color:#818cf8;padding:5px 14px;border-radius:20px;font-size:12px;font-weight:700;cursor:pointer;transition:all 0.2s; }
        .pop-chip:hover { background:rgba(99,102,241,0.2); }
        .sug-item { padding:10px 14px;cursor:pointer;font-size:13px;color:#e2e8f0;transition:background 0.15s; }
        .sug-item:hover { background:rgba(99,102,241,0.1); }
        .search-box { width:100%;background:rgba(10,14,26,0.8);border:1.5px solid rgba(99,102,241,0.3);color:#e2e8f0;border-radius:12px;padding:14px 18px;font-size:16px;font-weight:700;outline:none;letter-spacing:1px; }
        .search-box:focus { border-color:rgba(99,102,241,0.6); }
        .search-btn { background:linear-gradient(135deg,#6366f1,#8b5cf6);border:none;color:#fff;padding:14px 28px;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;white-space:nowrap; }
        .search-btn:hover { opacity:.9; }
        .metric-card:hover { border-color:rgba(99,102,241,0.35) !important; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:24, animation:'fadein 0.4s ease' }}>
        <h1 style={{ fontSize:28, fontWeight:900, marginBottom:6 }}>📊 Fundamental Analysis</h1>
        <p style={{ color:'#94a3b8', margin:0 }}>
          Deep financial analysis — P/E, EPS, ROE, debt ratios, quarterly results, ownership & more
        </p>
      </div>

      {/* Search */}
      <div style={{ ...card, marginBottom:20 }}>
        <form onSubmit={onSearch} style={{ display:'flex', gap:10, marginBottom:16 }}>
          <div style={{ position:'relative', flex:1 }}>
            <input
              className="search-box"
              value={symbol}
              onChange={e => onInput(e.target.value)}
              onBlur={() => setTimeout(() => setShowSug(false), 200)}
              onFocus={() => symbol && setShowSug(true)}
              placeholder="Enter NSE symbol  e.g. RELIANCE, TCS, INFY"
              autoComplete="off"
            />
            {showSug && suggestions.length > 0 && (
              <div style={{ position:'absolute', top:'100%', left:0, right:0, background:'#0d1123', border:'1px solid rgba(99,102,241,0.3)', borderRadius:10, zIndex:100, overflow:'hidden', marginTop:4 }}>
                {suggestions.map(s => (
                  <div key={s} className="sug-item" onMouseDown={() => pick(s)}>
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
          <button type="submit" className="search-btn">Analyse →</button>
        </form>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          <span style={{ color:'#475569', fontSize:12, marginRight:4 }}>Popular:</span>
          {POPULAR.slice(0, 10).map(s => (
            <span key={s} className="pop-chip" onClick={() => pick(s)}>{s}</span>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ ...card, textAlign:'center', padding:'60px 20px' }}>
          <div style={{ width:52, height:52, border:'3px solid rgba(99,102,241,0.2)', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 16px' }}/>
          <div style={{ color:'#6366f1', fontWeight:700, fontSize:16, animation:'pulse 1.5s infinite' }}>
            Fetching fundamental data for {symbol}...
          </div>
          <div style={{ color:'#475569', fontSize:13, marginTop:8 }}>Pulling from Yahoo Finance — may take 5–10 seconds</div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{ ...card, textAlign:'center', padding:'50px 20px' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>⚠️</div>
          <div style={{ color:'#ef4444', fontWeight:700, marginBottom:12 }}>{error}</div>
          <div style={{ color:'#475569', fontSize:13, marginBottom:16 }}>Make sure you're using a valid NSE symbol (e.g. RELIANCE, TCS, HDFCBANK)</div>
          <div style={{ display:'flex', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
            {['RELIANCE','TCS','INFY','HDFCBANK'].map(s => (
              <span key={s} className="pop-chip" onClick={() => pick(s)}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {data && !loading && (
        <div style={{ animation:'fadein 0.4s ease' }}>

          {/* Honest data-quality note — Yahoo restricts free access to
              detailed ratios/financials at times; price/52-week data comes
              from a different, more reliable endpoint and stays available
              even when ratios don't. */}
          {data.dataQuality?.note && (
            <div style={{ ...card, marginBottom:16, background:'rgba(245,158,11,0.06)', border:'1px solid rgba(245,158,11,0.2)', padding:'12px 16px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#f59e0b' }}>
                <span>⚠️</span>
                <span>{data.dataQuality.note}</span>
              </div>
            </div>
          )}

          {/* Company header */}
          <div style={{ ...card, marginBottom:16, borderColor:'rgba(99,102,241,0.25)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:6, flexWrap:'wrap' }}>
                  <div style={{ width:44, height:44, borderRadius:12, background:'linear-gradient(135deg,#6366f1,#8b5cf6)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:15, color:'#fff', flexShrink:0 }}>
                    {data.symbol.slice(0,2)}
                  </div>
                  <div>
                    <h2 style={{ margin:0, fontSize:22, fontWeight:900, color:'#e2e8f0' }}>{data.name}</h2>
                    <div style={{ color:'#64748b', fontSize:13 }}>{data.symbol} · {data.exchange} · {data.sector}</div>
                  </div>
                </div>
                {data.description && (
                  <p style={{ color:'#64748b', fontSize:13, lineHeight:1.7, margin:'10px 0 0', maxWidth:700 }}>
                    {data.description.slice(0, 300)}{data.description.length > 300 ? '...' : ''}
                  </p>
                )}
              </div>
              <div style={{ textAlign:'right', flexShrink:0 }}>
                <div style={{ fontSize:36, fontWeight:900, color:'#e2e8f0' }}>₹{fmtNum(data.price)}</div>
                <div style={{ color:'#64748b', fontSize:13, marginTop:4 }}>Market Cap: {fmtINR(data.marketCap)}</div>
                {data.employees > 0 && (
                  <div style={{ color:'#64748b', fontSize:12, marginTop:2 }}>{data.employees.toLocaleString('en-IN')} employees</div>
                )}
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginTop:16 }}>
              {[
                { label:'52W High', value:`₹${fmtNum(data.w52High)}`, sub: `${fmtPct(data.w52HighPct)} from high`, color:pColor(data.w52HighPct) },
                { label:'52W Low',  value:`₹${fmtNum(data.w52Low)}`,  sub: `${fmtPct(data.w52LowPct)} from low`,  color:pColor(data.w52LowPct)  },
                { label:'Beta',     value:fmtNum(data.beta, 2),        sub:data.beta>1.2?'High volatility':data.beta<0.8?'Low volatility':'Moderate', color:'#94a3b8' },
                { label:'Div Yield',value:`${fmtNum(data.dividendYield, 2)}%`, sub:'Annual dividend', color:data.dividendYield>2?'#10b981':'#94a3b8' },
                { label:'Avg Vol',  value:data.avgVolume>1e6?`${(data.avgVolume/1e6).toFixed(1)}M`:`${(data.avgVolume/1e3).toFixed(0)}K`, sub:'Daily avg volume', color:'#94a3b8' },
                { label:'Industry', value:data.industry?.split(' ').slice(0,2).join(' ') || 'N/A', sub:data.sector, color:'#818cf8' },
              ].map((s,i) => (
                <div key={i} style={{ background:'rgba(10,14,26,0.6)', border:'1px solid rgba(99,102,241,0.1)', borderRadius:10, padding:'10px 12px' }}>
                  <div style={{ color:'#475569', fontSize:10, fontWeight:700, marginBottom:4 }}>{s.label.toUpperCase()}</div>
                  <div style={{ fontWeight:800, fontSize:14, color:s.color||'#e2e8f0' }}>{s.value}</div>
                  <div style={{ color:'#475569', fontSize:10, marginTop:2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            {tabs.map(t => (
              <button key={t} className="tab-btn" onClick={() => setTab(t)}
                style={{ background:tab===t?'linear-gradient(135deg,#6366f1,#8b5cf6)':'rgba(99,102,241,0.1)',
                  color:tab===t?'#fff':'#94a3b8', border:tab===t?'none':'1px solid rgba(99,102,241,0.2)' }}>
                {{overview:'🏠 Overview',valuation:'💎 Valuation',financials:'💰 Financials',growth:'📈 Growth',ownership:'🏦 Ownership',chart:'📊 Price Chart'}[t]}
              </button>
            ))}
          </div>

          {/* ══ OVERVIEW ══ */}
          {tab === 'overview' && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, animation:'fadein 0.3s ease' }}>
              {/* Profitability gauges */}
              <div style={card}>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:16 }}>📊 Key Ratios at a Glance</div>
                <div style={{ display:'flex', justifyContent:'space-around', marginBottom:16 }}>
                  <ScoreGauge value={Math.min(100,Math.max(0, data.roe > 0 ? Math.min(data.roe*3, 100) : 0))} label="ROE Score" color="#10b981"/>
                  <ScoreGauge value={Math.min(100,Math.max(0, data.npm > 0 ? Math.min(data.npm*4, 100) : 0))} label="Margin Score" color="#6366f1"/>
                  <ScoreGauge value={Math.min(100,Math.max(0, data.cr  > 0 ? Math.min(data.cr*40, 100) : 50))} label="Liquidity" color="#f59e0b"/>
                </div>
                <MetricRow label="P/E Ratio"       value={data.pe   > 0 ? fmtNum(data.pe,1)  : 'N/A'} hint="Price to Earnings"/>
                <MetricRow label="P/B Ratio"       value={data.pb   > 0 ? fmtNum(data.pb,2)  : 'N/A'} hint="Price to Book Value"/>
                <MetricRow label="EPS (TTM)"       value={data.eps  > 0 ? `₹${fmtNum(data.eps,2)}`  : 'N/A'} hint="Earnings Per Share"/>
                <MetricRow label="Book Value"      value={data.bookValue > 0 ? `₹${fmtNum(data.bookValue,2)}` : 'N/A'} hint="Per share"/>
                <MetricRow label="Return on Equity" value={data.roe > 0 ? `${fmtNum(data.roe,2)}%` : 'N/A'} hint="Net income / equity" color={data.roe>15?'#10b981':data.roe>8?'#f59e0b':'#ef4444'}/>
                <MetricRow label="Net Profit Margin" value={data.npm > 0 ? `${fmtNum(data.npm,2)}%` : 'N/A'} hint="Net income / revenue" color={data.npm>15?'#10b981':data.npm>8?'#f59e0b':'#ef4444'}/>
                <MetricRow label="Debt/Equity"      value={data.de  > 0 ? fmtNum(data.de,2)  : 'N/A'} hint="Total debt / equity"    color={data.de<0.5?'#10b981':data.de<1?'#f59e0b':'#ef4444'}/>
              </div>

              {/* Financial summary */}
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div style={card}>
                  <div style={{ fontWeight:800, fontSize:15, marginBottom:12 }}>💼 Financial Summary</div>
                  {[
                    { label:'Revenue (TTM)',   value:fmtINR(data.revenue),   color:'#e2e8f0' },
                    { label:'Net Income',      value:fmtINR(data.netIncome), color:data.netIncome>0?'#10b981':'#ef4444' },
                    { label:'EBITDA',          value:fmtINR(data.ebitda),    color:'#e2e8f0' },
                    { label:'Free Cash Flow',  value:fmtINR(data.fcf),       color:data.fcf>0?'#10b981':'#ef4444' },
                    { label:'Total Debt',      value:fmtINR(data.totalDebt), color:data.totalDebt>data.totalEquity?'#ef4444':'#e2e8f0' },
                    { label:'Total Equity',    value:fmtINR(data.totalEquity),color:'#e2e8f0' },
                  ].map((r,i) => <MetricRow key={i} {...r}/>)}
                </div>

                <div style={card}>
                  <div style={{ fontWeight:800, fontSize:15, marginBottom:12 }}>📈 Growth & Momentum</div>
                  <MetricRow label="Revenue Growth (YoY)"   value={data.revenueGrowth  ? fmtPct(data.revenueGrowth)  : 'N/A'} color={pColor(data.revenueGrowth)}/>
                  <MetricRow label="Earnings Growth (YoY)"  value={data.earningsGrowth ? fmtPct(data.earningsGrowth) : 'N/A'} color={pColor(data.earningsGrowth)}/>
                  <MetricRow label="Forward P/E"            value={data.forwardPE > 0  ? fmtNum(data.forwardPE,1)    : 'N/A'} hint="Next 12 months estimate"/>
                  <MetricRow label="PEG Ratio"              value={data.pegRatio  > 0  ? fmtNum(data.pegRatio,2)     : 'N/A'} hint="PE / growth rate" color={data.pegRatio>0&&data.pegRatio<1?'#10b981':data.pegRatio>2?'#ef4444':'#f59e0b'}/>
                </div>
              </div>
            </div>
          )}

          {/* ══ VALUATION ══ */}
          {tab === 'valuation' && (
            <div style={{ animation:'fadein 0.3s ease' }}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14, marginBottom:14 }}>
                {[
                  { title:'P/E Ratio', value:data.pe, fmt:`${fmtNum(data.pe,1)}x`, desc:'Price per ₹1 of earnings. Lower = cheaper.', good:'<20', thresholds:[15,30], labels:['Expensive','Fair','Cheap'], reverse:true },
                  { title:'P/B Ratio', value:data.pb, fmt:`${fmtNum(data.pb,2)}x`, desc:'Price vs book value. <1 = trading below assets.', good:'<3', thresholds:[1,4], labels:['Expensive','Fair','Cheap'], reverse:true },
                  { title:'P/S Ratio', value:data.ps, fmt:`${fmtNum(data.ps,2)}x`, desc:'Price per ₹1 of revenue. Industry varies widely.', good:'<5', thresholds:[2,8], labels:['Expensive','Fair','Cheap'], reverse:true },
                  { title:'EV/EBITDA', value:data.evEbitda, fmt:`${fmtNum(data.evEbitda,1)}x`, desc:'Enterprise value vs operating earnings. <12 is attractive.', good:'<12', thresholds:[8,20], labels:['Expensive','Fair','Cheap'], reverse:true },
                  { title:'PEG Ratio', value:data.pegRatio, fmt:fmtNum(data.pegRatio,2), desc:'P/E adjusted for growth. <1 = undervalued growth.', good:'<1', thresholds:[0.8,2], labels:['Expensive','Fair','Cheap'], reverse:true },
                  { title:'Forward P/E', value:data.forwardPE, fmt:`${fmtNum(data.forwardPE,1)}x`, desc:'Based on next year earnings estimate.', good:'<18', thresholds:[12,25], labels:['Expensive','Fair','Cheap'], reverse:true },
                ].map((r,i) => (
                  <div key={i} style={{ ...card, className:'metric-card', transition:'border-color 0.2s' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                      <div style={{ fontWeight:800, fontSize:15 }}>{r.title}</div>
                      <RatingBadge value={r.value} thresholds={r.thresholds} labels={r.labels} reverse={r.reverse}/>
                    </div>
                    <div style={{ fontSize:32, fontWeight:900, color:'#e2e8f0', marginBottom:6 }}>{r.value > 0 ? r.fmt : 'N/A'}</div>
                    <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6 }}>{r.desc}</div>
                    <div style={{ marginTop:8, fontSize:11, color:'#475569' }}>Healthy: <b style={{ color:'#10b981' }}>{r.good}</b></div>
                  </div>
                ))}
              </div>

              {/* Dividend */}
              <div style={{ ...card }}>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>💰 Dividend Analysis</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
                  {[
                    { label:'Dividend Yield',  value:`${fmtNum(data.dividendYield,2)}%`,  color:data.dividendYield>2?'#10b981':'#94a3b8', desc:'Annual div / price' },
                    { label:'Payout Ratio',    value:`${fmtNum(data.payoutRatio,1)}%`,    color:data.payoutRatio>80?'#ef4444':data.payoutRatio>40?'#f59e0b':'#10b981', desc:'Div / net income' },
                    { label:'EPS (TTM)',        value:`₹${fmtNum(data.eps,2)}`,            color:'#e2e8f0', desc:'Earnings per share' },
                    { label:'Book Value/Share', value:`₹${fmtNum(data.bookValue,2)}`,      color:'#e2e8f0', desc:'Net assets per share' },
                  ].map((s,i) => (
                    <div key={i} style={{ background:'rgba(10,14,26,0.6)', border:'1px solid rgba(99,102,241,0.1)', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ color:'#64748b', fontSize:10, fontWeight:700, marginBottom:6 }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
                      <div style={{ color:'#475569', fontSize:11, marginTop:3 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══ FINANCIALS ══ */}
          {tab === 'financials' && (
            <div style={{ animation:'fadein 0.3s ease' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                {/* Income statement */}
                <div style={card}>
                  <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>📋 Income Statement (TTM)</div>
                  {[
                    { label:'Total Revenue',        value:fmtINR(data.revenue),        color:'#e2e8f0'  },
                    { label:'EBITDA',               value:fmtINR(data.ebitda),         color:data.ebitda>0?'#10b981':'#ef4444' },
                    { label:'Operating Margin',     value:`${fmtNum(data.opm,2)}%`,    color:data.opm>15?'#10b981':data.opm>8?'#f59e0b':'#ef4444' },
                    { label:'Net Income',           value:fmtINR(data.netIncome),      color:data.netIncome>0?'#10b981':'#ef4444' },
                    { label:'Net Profit Margin',    value:`${fmtNum(data.npm,2)}%`,    color:data.npm>15?'#10b981':data.npm>8?'#f59e0b':'#ef4444' },
                    { label:'EPS (TTM)',            value:`₹${fmtNum(data.eps,2)}`,    color:'#e2e8f0'  },
                  ].map((r,i) => <MetricRow key={i} {...r}/>)}
                </div>

                {/* Balance sheet */}
                <div style={card}>
                  <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>🏦 Balance Sheet</div>
                  {[
                    { label:'Total Assets',         value:fmtINR(data.totalAssets),    color:'#e2e8f0'  },
                    { label:'Total Equity',         value:fmtINR(data.totalEquity),    color:'#10b981'  },
                    { label:'Total Debt',           value:fmtINR(data.totalDebt),      color:data.totalDebt>data.totalEquity?'#ef4444':'#f59e0b' },
                    { label:'Debt / Equity',        value:data.de > 0 ? fmtNum(data.de,2)+'x' : 'N/A', color:data.de<0.5?'#10b981':data.de<1?'#f59e0b':'#ef4444' },
                    { label:'Current Ratio',        value:data.cr > 0 ? fmtNum(data.cr,2)+'x' : 'N/A', color:data.cr>2?'#10b981':data.cr>1?'#f59e0b':'#ef4444', hint:'Current assets / liabilities' },
                    { label:'Book Value / Share',   value:`₹${fmtNum(data.bookValue,2)}`, color:'#e2e8f0' },
                  ].map((r,i) => <MetricRow key={i} {...r}/>)}
                </div>
              </div>

              {/* Cash flow */}
              <div style={{ ...card, marginBottom:14 }}>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>💵 Cash Flow</div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
                  {[
                    { label:'Operating Cash Flow', value:fmtINR(data.operatingCF), color:data.operatingCF>0?'#10b981':'#ef4444', desc:'Cash generated from business' },
                    { label:'Free Cash Flow',       value:fmtINR(data.fcf),        color:data.fcf>0?'#10b981':'#ef4444',        desc:'OCF minus capex' },
                    { label:'ROA',                  value:`${fmtNum(data.roa,2)}%`, color:data.roa>8?'#10b981':data.roa>4?'#f59e0b':'#ef4444', desc:'Return on assets' },
                    { label:'ROE',                  value:`${fmtNum(data.roe,2)}%`, color:data.roe>15?'#10b981':data.roe>8?'#f59e0b':'#ef4444', desc:'Return on equity' },
                  ].map((s,i) => (
                    <div key={i} style={{ background:'rgba(10,14,26,0.6)', border:'1px solid rgba(99,102,241,0.1)', borderRadius:10, padding:'12px 14px' }}>
                      <div style={{ color:'#64748b', fontSize:10, fontWeight:700, marginBottom:6 }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
                      <div style={{ color:'#475569', fontSize:11, marginTop:3 }}>{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quarterly income chart */}
              {data.quarterlyIncome?.length > 0 && (
                <div style={card}>
                  <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>📅 Quarterly Results</div>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={data.quarterlyIncome} margin={{ top:5,right:10,left:10,bottom:0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                      <XAxis dataKey="date" tick={{ fill:'#475569',fontSize:10 }} tickLine={false} axisLine={false}/>
                      <YAxis tick={{ fill:'#475569',fontSize:10 }} tickLine={false} axisLine={false}
                        tickFormatter={v=>v>=1e9?`₹${(v/1e9).toFixed(0)}B`:v>=1e7?`₹${(v/1e7).toFixed(0)}Cr`:'₹0'} width={60}/>
                      <Tooltip contentStyle={{ background:'rgba(13,17,35,0.95)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,color:'#e2e8f0',fontSize:11 }}
                        formatter={v=>[fmtINR(v)]}/>
                      <Bar dataKey="revenue"   name="Revenue"    fill="#6366f1" radius={[4,4,0,0]}/>
                      <Bar dataKey="netIncome" name="Net Income"  radius={[4,4,0,0]}>
                        {data.quarterlyIncome.map((e,i)=><Cell key={i} fill={e.netIncome>=0?'#10b981':'#ef4444'}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}

          {/* ══ GROWTH ══ */}
          {tab === 'growth' && (
            <div style={{ animation:'fadein 0.3s ease' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div style={card}>
                  <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>📈 Growth Metrics</div>
                  {[
                    { label:'Revenue Growth (YoY)',          value:data.revenueGrowth  ? fmtPct(data.revenueGrowth)  : 'N/A', color:pColor(data.revenueGrowth) },
                    { label:'Earnings Growth (YoY)',         value:data.earningsGrowth ? fmtPct(data.earningsGrowth) : 'N/A', color:pColor(data.earningsGrowth) },
                    { label:'Quarterly Earnings Growth',     value:data.earningsQuarterlyGrowth ? fmtPct(data.earningsQuarterlyGrowth) : 'N/A', color:pColor(data.earningsQuarterlyGrowth) },
                    { label:'Forward P/E',                   value:data.forwardPE > 0  ? `${fmtNum(data.forwardPE,1)}x` : 'N/A', hint:'Based on next year estimate' },
                    { label:'PEG Ratio',                     value:data.pegRatio  > 0  ? fmtNum(data.pegRatio,2)     : 'N/A', hint:'PE adjusted for growth', color:data.pegRatio>0&&data.pegRatio<1?'#10b981':data.pegRatio>2?'#ef4444':'#f59e0b' },
                  ].map((r,i) => <MetricRow key={i} {...r}/>)}
                </div>

                <div style={card}>
                  <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>🎯 Earnings Estimates</div>
                  {data.earningsTrend?.length > 0 ? (
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr style={{ borderBottom:'1px solid rgba(99,102,241,0.15)' }}>
                          {['Period','Estimate','Actual','Surprise'].map(h=>(
                            <th key={h} style={{ padding:'8px',color:'#64748b',fontWeight:700,textAlign:'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.earningsTrend.map((t,i)=>{
                          const surprise = t.estimate && t.actual ? ((t.actual-t.estimate)/Math.abs(t.estimate)*100) : null;
                          return (
                            <tr key={i} style={{ borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
                              <td style={{ padding:'8px',color:'#94a3b8' }}>{t.period}</td>
                              <td style={{ padding:'8px',color:'#e2e8f0' }}>{t.estimate!=null?`₹${t.estimate}`:'–'}</td>
                              <td style={{ padding:'8px',color:'#e2e8f0' }}>{t.actual!=null?`₹${t.actual}`:'–'}</td>
                              <td style={{ padding:'8px',color:surprise!=null?pColor(surprise):'#475569',fontWeight:700 }}>
                                {surprise!=null?fmtPct(surprise):'–'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ color:'#475569', textAlign:'center', padding:'30px 0' }}>No earnings estimate data available</div>
                  )}
                </div>
              </div>

              {/* 52W range visual */}
              <div style={card}>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:16 }}>📏 52-Week Price Range</div>
                <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                  <div style={{ textAlign:'center', minWidth:80 }}>
                    <div style={{ color:'#ef4444', fontWeight:800, fontSize:16 }}>₹{fmtNum(data.w52Low)}</div>
                    <div style={{ color:'#64748b', fontSize:11 }}>52W Low</div>
                  </div>
                  <div style={{ flex:1, position:'relative' }}>
                    <div style={{ height:8, background:'rgba(99,102,241,0.15)', borderRadius:4 }}>
                      <div style={{
                        position:'absolute', height:8, borderRadius:4,
                        background:'linear-gradient(90deg,#ef4444,#f59e0b,#10b981)',
                        width:`${data.w52High>data.w52Low?((data.price-data.w52Low)/(data.w52High-data.w52Low)*100):50}%`,
                      }}/>
                    </div>
                    <div style={{
                      position:'absolute', top:-24, left:`${data.w52High>data.w52Low?((data.price-data.w52Low)/(data.w52High-data.w52Low)*100):50}%`,
                      transform:'translateX(-50%)', background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      color:'#fff', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700, whiteSpace:'nowrap',
                    }}>
                      ₹{fmtNum(data.price)} (current)
                    </div>
                  </div>
                  <div style={{ textAlign:'center', minWidth:80 }}>
                    <div style={{ color:'#10b981', fontWeight:800, fontSize:16 }}>₹{fmtNum(data.w52High)}</div>
                    <div style={{ color:'#64748b', fontSize:11 }}>52W High</div>
                  </div>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:20, fontSize:12, color:'#64748b' }}>
                  <span>From 52W Low: <b style={{ color:pColor(data.w52LowPct) }}>{fmtPct(data.w52LowPct)}</b></span>
                  <span>From 52W High: <b style={{ color:pColor(data.w52HighPct) }}>{fmtPct(data.w52HighPct)}</b></span>
                </div>
              </div>
            </div>
          )}

          {/* ══ OWNERSHIP ══ */}
          {tab === 'ownership' && (
            <div style={{ animation:'fadein 0.3s ease' }}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
                <div style={card}>
                  <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>🏛️ Shareholding Pattern</div>
                  {[
                    { label:'Institutional Holding', value:`${fmtNum(data.institutionPct,2)}%`, color:'#6366f1',  hint:'FII + DII combined' },
                    { label:'Insider Holding',        value:`${fmtNum(data.insiderPct,2)}%`,    color:'#10b981',  hint:'Promoter + management' },
                    { label:'Float',                  value:`${fmtNum(data.floatPct,2)}%`,      color:'#f59e0b',  hint:'Publicly traded shares' },
                  ].map((r,i) => (
                    <div key={i} style={{ marginBottom:14 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                        <div>
                          <div style={{ fontSize:13, color:'#94a3b8' }}>{r.label}</div>
                          <div style={{ fontSize:11, color:'#475569' }}>{r.hint}</div>
                        </div>
                        <div style={{ fontSize:18, fontWeight:800, color:r.color }}>{r.value}</div>
                      </div>
                      <div style={{ background:'rgba(10,14,26,0.5)', borderRadius:4, height:8 }}>
                        <div style={{ width:r.value, height:'100%', borderRadius:4, background:r.color, transition:'width 1s ease' }}/>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={card}>
                  <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>🏦 Top Institutional Holders</div>
                  {data.topInstitutions?.length > 0 ? (
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                      <thead>
                        <tr style={{ borderBottom:'1px solid rgba(99,102,241,0.15)' }}>
                          {['Institution','% Held','Value'].map(h=>(
                            <th key={h} style={{ padding:'8px',color:'#64748b',fontWeight:700,textAlign:'left' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {data.topInstitutions.map((ins,i) => (
                          <tr key={i} style={{ borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
                            <td style={{ padding:'8px', color:'#e2e8f0', fontWeight:600 }}>{ins.name}</td>
                            <td style={{ padding:'8px', color:'#6366f1', fontWeight:700 }}>{fmtNum(ins.pct,2)}%</td>
                            <td style={{ padding:'8px', color:'#94a3b8' }}>{fmtINR(ins.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ color:'#475569', textAlign:'center', padding:'30px 0' }}>No institutional data available</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══ CHART ══ */}
          {tab === 'chart' && (
            <div style={{ animation:'fadein 0.3s ease' }}>
              <div style={card}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexWrap:'wrap', gap:8 }}>
                  <div>
                    <div style={{ fontWeight:800, fontSize:16 }}>{data.symbol} — 1 Year Price Chart</div>
                    <div style={{ color:'#64748b', fontSize:12, marginTop:2 }}>Daily closing prices — NSE</div>
                  </div>
                  {data.priceHistory?.length > 0 && (
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:26, fontWeight:900, color:'#e2e8f0' }}>₹{fmtNum(data.price)}</div>
                      <div style={{ color:pColor(data.w52HighPct), fontSize:13 }}>
                        {fmtPct(((data.price - data.priceHistory[0]?.price) / data.priceHistory[0]?.price * 100))} (1Y)
                      </div>
                    </div>
                  )}
                </div>

                {data.priceHistory?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={340}>
                    <AreaChart data={data.priceHistory} margin={{ top:10,right:10,left:10,bottom:0 }}>
                      <defs>
                        <linearGradient id="pcGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                      <XAxis dataKey="date" tick={{ fill:'#475569',fontSize:10 }} tickLine={false} axisLine={false}
                        tickFormatter={d=>{ try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short'}); } catch { return d; }}}
                        interval={Math.max(1,Math.floor(data.priceHistory.length/8))}/>
                      <YAxis tick={{ fill:'#475569',fontSize:10 }} tickLine={false} axisLine={false}
                        tickFormatter={v=>`₹${v>=1000?(v/1000).toFixed(0)+'k':v}`} width={60} domain={['auto','auto']}/>
                      <Tooltip contentStyle={{ background:'rgba(13,17,35,0.95)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,color:'#e2e8f0',fontSize:11 }}
                        formatter={v=>[`₹${fmtNum(v,2)}`,data.symbol]}
                        labelFormatter={d=>{ try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return d; }}}/>
                      <ReferenceLine y={data.priceHistory[0]?.price} stroke="rgba(255,255,255,0.1)" strokeDasharray="4 2"/>
                      <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2} fill="url(#pcGrad)" dot={false}/>
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ textAlign:'center', color:'#475569', padding:'60px 0' }}>
                    <div style={{ fontSize:32, marginBottom:10 }}>📉</div>
                    No price history available
                  </div>
                )}

                {/* Price stats below chart */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginTop:16 }}>
                  {[
                    { label:'Current',  value:`₹${fmtNum(data.price)}`,    color:'#e2e8f0' },
                    { label:'52W High', value:`₹${fmtNum(data.w52High)}`,  color:'#10b981' },
                    { label:'52W Low',  value:`₹${fmtNum(data.w52Low)}`,   color:'#ef4444' },
                    { label:'1Y Return',value:data.priceHistory?.length>1 ? fmtPct((data.price-data.priceHistory[0]?.price)/data.priceHistory[0]?.price*100) : 'N/A',
                      color:pColor(data.priceHistory?.length>1?(data.price-data.priceHistory[0]?.price)/data.priceHistory[0]?.price*100:0) },
                  ].map((s,i) => (
                    <div key={i} style={{ background:'rgba(10,14,26,0.6)', border:'1px solid rgba(99,102,241,0.1)', borderRadius:10, padding:'12px', textAlign:'center' }}>
                      <div style={{ color:'#64748b', fontSize:10, fontWeight:700, marginBottom:4 }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontWeight:800, fontSize:16, color:s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div style={{ ...card, textAlign:'center', padding:'60px 20px', animation:'fadein 0.4s ease' }}>
          <div style={{ fontSize:56, marginBottom:16 }}>🔍</div>
          <div style={{ fontWeight:800, fontSize:22, marginBottom:8 }}>Search any NSE stock</div>
          <div style={{ color:'#475569', fontSize:14, marginBottom:24 }}>
            Get deep financial analysis including P/E, ROE, debt ratios, quarterly results, ownership data and 1-year price charts.
          </div>
          <div style={{ display:'flex', gap:10, justifyContent:'center', flexWrap:'wrap' }}>
            {['RELIANCE','TCS','HDFCBANK','INFY','ICICIBANK','SBIN'].map(s => (
              <span key={s} className="pop-chip" onClick={() => pick(s)} style={{ fontSize:14, padding:'8px 18px' }}>{s}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}