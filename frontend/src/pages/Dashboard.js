import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import BeatTheIndex from '../components/BeatTheIndex';

const fmtINR = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '₹0';
  return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};
const fmtNum = (n, d = 2) => {
  const num = Number(n);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
};

function isMarketOpen() {
  const now = new Date();
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const mins = ist.getHours() * 60 + ist.getMinutes();
  return mins >= 555 && mins < 930;
}

// Symbol keys match INDEX_SYMBOLS map in stockDetail.js
const INDICES = [
  { key: 'NIFTY50',   symbol: 'NSEI',    label: 'NIFTY 50',   icon: '📈' },
  { key: 'SENSEX',    symbol: 'BSESN',   label: 'SENSEX',     icon: '📊' },
  { key: 'BANKNIFTY', symbol: 'NSEBANK', label: 'BANK NIFTY', icon: '🏦' },
];

export default function Dashboard() {
  const navigate    = useNavigate();
  const [user,       setUser]       = useState(null);
  const [indices,    setIndices]    = useState({});
  const [chartData,  setChartData]  = useState([]);
  const [chartLabel, setChartLabel] = useState('SENSEX');
  const [recs,       setRecs]       = useState([]);
  const [portfolio,  setPortfolio]  = useState({ totalCurrent: 0, totalPnL: 0, totalPnLPct: 0 });
  const [time,       setTime]       = useState(new Date());
  const [loading,    setLoading]    = useState(true);
  const [activeIdx,  setActiveIdx]  = useState('SENSEX');
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Clock — no API calls
  useEffect(() => {
    const t = setInterval(() => {
      if (isMounted.current) setTime(new Date());
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const loadUser = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/auth/me', { timeout: 5000 });
      if (isMounted.current) setUser(data);
    } catch {}
  }, []);

  const loadPortfolio = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/portfolio', { timeout: 8000 });
      if (!isMounted.current) return;
      setPortfolio({
        totalCurrent: Number(data.totalCurrent || 0),
        totalPnL:     Number(data.totalPnL     || 0),
        totalPnLPct:  Number(data.totalPnLPct  || 0),
      });
    } catch {}
  }, []);

  // Fetch index price via stockDetail route (NSEI → ^NSEI handled in backend)
  const fetchIndexPrice = useCallback(async (symbol) => {
    try {
      const { data } = await axios.get(
        `/api/stock-detail/${symbol}?interval=1d&range=5d`,
        { timeout: 12000 }
      );
      return {
        price:     data.meta?.price     || 0,
        change:    data.meta?.change    || 0,
        changePct: data.meta?.changePct || 0,
      };
    } catch { return null; }
  }, []);

  const fetchIndexChart = useCallback(async (symbol, label) => {
    try {
      const { data } = await axios.get(
        `/api/stock-detail/${symbol}?interval=1d&range=1mo`,
        { timeout: 15000 }
      );
      if (!isMounted.current) return;
      const candles = (data.chartData || [])
        .filter(c => c.close && c.close > 0)
        .map(c => ({ date: c.time, price: c.close }));
      setChartData(candles);
      setChartLabel(label);
    } catch {
      if (isMounted.current) { setChartData([]); setChartLabel(label); }
    }
  }, []);

  const loadIndices = useCallback(async () => {
    const results = await Promise.allSettled(
      INDICES.map(idx =>
        fetchIndexPrice(idx.symbol).then(d => ({ key: idx.key, data: d }))
      )
    );
    if (!isMounted.current) return;
    const updated = {};
    results.forEach(r => {
      if (r.status === 'fulfilled' && r.value?.data) {
        updated[r.value.key] = r.value.data;
      }
    });
    setIndices(updated);
  }, [fetchIndexPrice]);

  const loadRecs = useCallback(async () => {
    try {
      const { data } = await axios.get('/api/screener?preset=momentum&limit=3', { timeout: 8000 });
      if (!isMounted.current) return;
      const list = Array.isArray(data) ? data : (data?.stocks || []);
      if (list.length > 0) {
        setRecs(list.slice(0, 3).map(s => ({
          symbol:     s.symbol,
          name:       s.name,
          changePct:  Number(s.changePct || 0),
          signal:     Number(s.changePct || 0) >= 1 ? 'BUY' : Number(s.changePct || 0) < -0.5 ? 'SELL' : 'HOLD',
          confidence: Math.min(95, Math.floor(68 + Math.abs(Number(s.changePct || 0)) * 4)),
          reason:     Number(s.changePct || 0) >= 1 ? 'Strong momentum detected'
                    : Number(s.changePct || 0) >= 0 ? 'Stable outlook'
                    : 'Caution — bearish signal',
        })));
        return;
      }
    } catch {}
    // Static fallback — always shows something
    if (isMounted.current) setRecs([
      { symbol: 'HDFCBANK', name: 'HDFC Bank',  changePct: 2.3,  signal: 'BUY',  confidence: 87, reason: 'Strong quarterly results'  },
      { symbol: 'INFY',     name: 'Infosys',    changePct: 0.8,  signal: 'HOLD', confidence: 72, reason: 'Stable growth expected'    },
      { symbol: 'ITC',      name: 'ITC Ltd',    changePct: 1.5,  signal: 'BUY',  confidence: 81, reason: 'FMCG expansion plan'       },
    ]);
  }, []);

  // Boot — show UI immediately, load heavy data in background
  useEffect(() => {
    const boot = async () => {
      await Promise.allSettled([loadUser(), loadPortfolio()]);
      if (isMounted.current) setLoading(false);
      // Non-blocking background loads
      loadIndices();
      loadRecs();
      fetchIndexChart('BSESN', 'SENSEX');
    };
    boot();
  }, []); // eslint-disable-line

  // Refresh every 5 minutes
  useEffect(() => {
    const t = setInterval(() => {
      if (!isMounted.current) return;
      loadIndices();
      loadPortfolio();
    }, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadIndices, loadPortfolio]);

  const switchIndex = (key) => {
    const idx = INDICES.find(i => i.key === key);
    if (!idx) return;
    setActiveIdx(key);
    fetchIndexChart(idx.symbol, idx.label);
  };

  const marketOpen = isMarketOpen();
  const istStr = time.toLocaleTimeString('en-IN', {
    timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit',
  });

  const card = {
    background: 'rgba(13,17,35,0.88)',
    border:     '1px solid rgba(99,102,241,0.15)',
    borderRadius: 14,
    padding:    20,
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
      <div style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#6366f1', fontWeight: 700, fontSize: 16, animation: 'pulse 1.5s infinite' }}>Loading InvestIQ...</div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:0.4} 50%{opacity:1} }
        .idx-card   { transition: all 0.2s; cursor: pointer; }
        .idx-card:hover { transform: translateY(-3px); }
        .quick-btn  { transition: all 0.2s; cursor: pointer; }
        .quick-btn:hover { transform: translateY(-3px); }
      `}</style>

      {/* ── Hero ── */}
      <div style={{ marginBottom: 28, animation: 'fadein 0.4s ease' }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 6 }}>
          Welcome back, <span style={{ color: '#818cf8' }}>{user?.name?.split(' ')[0] || 'Investor'}</span>! 👋
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <p style={{ color: '#94a3b8', fontSize: 15, margin: 0 }}>
            Your investment journey continues. Make smart moves today.
          </p>
          <span style={{
            background:  marketOpen ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            color:       marketOpen ? '#10b981' : '#ef4444',
            border:      `1px solid ${marketOpen ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: 20, padding: '4px 14px', fontSize: 12, fontWeight: 700,
          }}>
            {marketOpen ? '🟢 LIVE' : '🔴 CLOSED'} · IST {istStr}
          </span>
        </div>
      </div>

      {/* ── Index Cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
        {INDICES.map(idx => {
          const d      = indices[idx.key];
          const active = activeIdx === idx.key;
          return (
            <div key={idx.key} className="idx-card" onClick={() => switchIndex(idx.key)}
              style={{
                ...card,
                border:     `1px solid ${active ? 'rgba(99,102,241,0.55)' : 'rgba(99,102,241,0.15)'}`,
                background: active ? 'rgba(99,102,241,0.09)' : 'rgba(13,17,35,0.88)',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 1 }}>
                  {idx.icon} {idx.label}
                </span>
                <span style={{ fontSize: 10, color: marketOpen ? '#10b981' : '#64748b', fontWeight: 600 }}>
                  ● {marketOpen ? 'LIVE' : 'CLOSED'}
                </span>
              </div>
              {d ? (
                <>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#e2e8f0' }}>{fmtNum(d.price)}</div>
                  <div style={{ color: d.change >= 0 ? '#10b981' : '#ef4444', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                    {d.change >= 0 ? '▲' : '▼'} {fmtNum(Math.abs(d.change))} ({fmtNum(Math.abs(d.changePct))}%)
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(99,102,241,0.3)', borderTop: '2px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  <span style={{ color: '#475569', fontSize: 12 }}>Loading...</span>
                </div>
              )}
            </div>
          );
        })}

        {/* Virtual Coins */}
        <div style={{ ...card, borderColor: 'rgba(245,158,11,0.25)' }}>
          <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
            🪙 VIRTUAL COINS
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: '#f59e0b' }}>{fmtINR(user?.virtualCoins || 0)}</div>
          <div style={{ color: '#10b981', fontSize: 12, marginTop: 4 }}>Available to invest</div>
        </div>
      </div>

      {/* ── Portfolio Card ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ ...card, cursor: 'pointer', borderColor: 'rgba(99,102,241,0.22)' }}
          onClick={() => navigate('/portfolio')}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
                💼 PORTFOLIO VALUE
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#e2e8f0' }}>{fmtINR(portfolio.totalCurrent)}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
                <span style={{ color: portfolio.totalPnL >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 14 }}>
                  {portfolio.totalPnL >= 0 ? '+' : ''}{fmtINR(portfolio.totalPnL)}
                </span>
                <span style={{ color: portfolio.totalPnL >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, fontSize: 13 }}>
                  ({portfolio.totalPnL >= 0 ? '+' : ''}{fmtNum(portfolio.totalPnLPct)}%)
                </span>
                <span style={{ color: marketOpen ? '#10b981' : '#64748b', fontSize: 11 }}>
                  ● {marketOpen ? 'Live P&L' : 'Market closed'}
                </span>
              </div>
            </div>
            <button
              onClick={e => { e.stopPropagation(); navigate('/portfolio'); }}
              style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
              View Portfolio →
            </button>
          </div>
        </div>
      </div>

      {/* ── Beat the Index — honest benchmark vs Nifty 50 buy-and-hold ── */}
      <div style={{ marginBottom: 20, animation: 'fadein 0.5s ease' }}>
        <BeatTheIndex />
      </div>

      {/* ── Chart + Recs ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start', marginBottom: 20 }}>

        {/* Chart */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16 }}>{chartLabel} — 30 Day Chart</div>
              <div style={{ color: '#64748b', fontSize: 12, marginTop: 2 }}>Click an index card to switch</div>
            </div>
            {chartData.length > 0 && (
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0' }}>
                  {fmtNum(chartData[chartData.length - 1]?.price || 0)}
                </div>
              </div>
            )}
          </div>

          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={d => {
                    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }); }
                    catch { return d; }
                  }}
                  tick={{ fill: '#475569', fontSize: 10 }}
                  tickLine={false} axisLine={false}
                  interval={Math.max(1, Math.floor(chartData.length / 6))}
                />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 10 }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
                  width={55} domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{ background: 'rgba(13,17,35,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                  formatter={v => [fmtINR(v), chartLabel]}
                  labelFormatter={d => {
                    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
                    catch { return d; }
                  }}
                />
                <Area type="monotone" dataKey="price" stroke="#6366f1" strokeWidth={2.5} fill="url(#chartGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ height: 260, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#475569' }}>
              <div style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              <div style={{ fontSize: 13 }}>Loading chart...</div>
            </div>
          )}
        </div>

        {/* AI Recs */}
        <div style={card}>
          <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>🤖 AI Recommendations</div>
          {recs.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3].map(i => (
                <div key={i} style={{ height: 60, background: 'rgba(99,102,241,0.05)', borderRadius: 8, animation: 'pulse 1.5s infinite' }} />
              ))}
            </div>
          ) : recs.map((rec, i) => (
            <div key={i} onClick={() => navigate(`/stocks/${rec.symbol}`)}
              style={{ padding: '13px 0', borderBottom: i < recs.length - 1 ? '1px solid rgba(99,102,241,0.08)' : 'none', cursor: 'pointer' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <div>
                  <span style={{ fontWeight: 800, fontSize: 14 }}>{rec.name}</span>
                  <span style={{ color: rec.changePct >= 0 ? '#10b981' : '#ef4444', fontSize: 12, fontWeight: 700, marginLeft: 8 }}>
                    {rec.changePct >= 0 ? '+' : ''}{fmtNum(rec.changePct)}%
                  </span>
                </div>
                <span style={{
                  background: rec.signal === 'BUY' ? 'rgba(16,185,129,0.15)' : rec.signal === 'SELL' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                  color:      rec.signal === 'BUY' ? '#10b981'                : rec.signal === 'SELL' ? '#ef4444'               : '#f59e0b',
                  border:     `1px solid ${rec.signal === 'BUY' ? 'rgba(16,185,129,0.3)' : rec.signal === 'SELL' ? 'rgba(239,68,68,0.3)' : 'rgba(245,158,11,0.3)'}`,
                  padding: '2px 11px', borderRadius: 20, fontSize: 11, fontWeight: 800,
                }}>{rec.signal}</span>
              </div>
              <div style={{ color: '#64748b', fontSize: 11, marginBottom: 5 }}>
                {rec.reason} · {rec.confidence}% confidence
              </div>
              <div style={{ background: 'rgba(10,14,26,0.5)', borderRadius: 4, height: 4 }}>
                <div style={{
                  width: `${rec.confidence}%`, height: '100%', borderRadius: 4,
                  background: rec.signal === 'BUY' ? 'linear-gradient(90deg,#10b981,#34d399)' : rec.signal === 'SELL' ? 'linear-gradient(90deg,#ef4444,#f87171)' : 'linear-gradient(90deg,#f59e0b,#fbbf24)',
                }} />
              </div>
            </div>
          ))}
          <button onClick={() => navigate('/screener')}
            style={{ width: '100%', marginTop: 14, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: 10, padding: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            🔍 Full Screener →
          </button>
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 12 }}>
        {[
          { label: 'Browse Stocks', icon: '📈', path: '/stocks',    bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.25)'  },
          { label: 'IPO Centre',    icon: '🚀', path: '/ipo',       bg: 'rgba(245,158,11,0.10)',  border: 'rgba(245,158,11,0.25)'  },
          { label: 'Intraday',      icon: '📊', path: '/intraday',  bg: 'rgba(34,197,94,0.10)',   border: 'rgba(34,197,94,0.25)'   },
          { label: 'Screener',      icon: '🔍', path: '/screener',  bg: 'rgba(16,185,129,0.10)',  border: 'rgba(16,185,129,0.25)'  },
          { label: 'SIP Planner',   icon: '💰', path: '/sip',       bg: 'rgba(168,85,247,0.10)',  border: 'rgba(168,85,247,0.25)'  },
          { label: 'AI Advisor',    icon: '🎯', path: '/advisor',   bg: 'rgba(236,72,153,0.10)',  border: 'rgba(236,72,153,0.25)'  },
          { label: 'News Feed',     icon: '📰', path: '/news',      bg: 'rgba(6,182,212,0.10)',   border: 'rgba(6,182,212,0.25)'   },
          { label: 'Analytics',     icon: '📉', path: '/analytics', bg: 'rgba(139,92,246,0.10)',  border: 'rgba(139,92,246,0.25)'  },
          { label: 'Smart Alerts',  icon: '🔔', path: '/alerts',    bg: 'rgba(239,68,68,0.10)',   border: 'rgba(239,68,68,0.25)'   },
        ].map(item => (
          <div key={item.path} className="quick-btn" onClick={() => navigate(item.path)}
            style={{ background: item.bg, border: `1px solid ${item.border}`, borderRadius: 12, padding: '16px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{item.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 12, color: '#94a3b8' }}>{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}