import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#f97316','#14b8a6'];

const fmtINR = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '₹0';
  return `₹${Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
};
const fmtPct = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '0.00%';
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
};
const fmtNum = (n, d = 2) => {
  const num = Number(n);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
};

// Safe default for API response
const DEFAULT_DATA = {
  totalInvested:    0,
  totalCurrent:     0,
  totalPnL:         0,
  totalPnLPct:      0,
  xirr:             0,
  dayChange:        0,
  dayChangePct:     0,
  holdings:         [],
  sectorAllocation: [],
  monthlyPnL:       [],
  diversification:  { score: 0, grade: 'N/A', sectors: 0, stocks: 0 },
  topPerformer:     null,
  worstPerformer:   null,
};

export default function Analytics() {
  const [data,    setData]    = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [tab,     setTab]     = useState('overview');

  const loadAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await axios.get('/api/analytics', { timeout: 20000 });
      // Merge with defaults so no field is ever undefined
      setData({ ...DEFAULT_DATA, ...(res.data || {}) });
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load analytics');
      setData(DEFAULT_DATA);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);

  const card = {
    background:   'rgba(13,17,35,0.88)',
    border:       '1px solid rgba(99,102,241,0.15)',
    borderRadius: 14,
    padding:      20,
  };

  const pnlColor = (v) => Number(v) >= 0 ? '#10b981' : '#ef4444';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#6366f1', fontWeight: 700, fontSize: 16, animation: 'pulse 1.5s infinite' }}>Loading Analytics...</div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <div style={{ color: '#ef4444', fontWeight: 700, fontSize: 16 }}>{error}</div>
      <button onClick={loadAnalytics}
        style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
        Retry
      </button>
    </div>
  );

  const {
    totalInvested, totalCurrent, totalPnL, totalPnLPct,
    xirr, holdings, sectorAllocation, monthlyPnL,
    diversification, topPerformer, worstPerformer,
  } = data;

  const tabs = ['overview', 'holdings', 'sectors', 'monthly'];

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .tab-btn { transition: all 0.2s; cursor: pointer; border: none; }
        .tab-btn:hover { opacity: 0.85; }
        .row-hover:hover { background: rgba(99,102,241,0.06) !important; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24, animation: 'fadein 0.4s ease' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>📊 Portfolio Analytics</h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>Deep insights into your investment performance</p>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t} className="tab-btn" onClick={() => setTab(t)}
            style={{
              padding: '9px 20px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: tab === t ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.1)',
              color:      tab === t ? '#fff' : '#94a3b8',
              border:     tab === t ? 'none' : '1px solid rgba(99,102,241,0.2)',
            }}>
            {{ overview: '📈 Overview', holdings: '💼 Holdings', sectors: '🥧 Sectors', monthly: '📅 Monthly' }[t]}
          </button>
        ))}
        <button onClick={loadAnalytics}
          style={{ marginLeft: 'auto', padding: '9px 16px', borderRadius: 10, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
          🔄 Refresh
        </button>
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {tab === 'overview' && (
        <div style={{ animation: 'fadein 0.3s ease' }}>

          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Total Invested',   value: fmtINR(totalInvested),  sub: `${holdings.length} stocks`,       color: '#6366f1' },
              { label: 'Current Value',    value: fmtINR(totalCurrent),   sub: 'Live prices',                      color: '#06b6d4' },
              { label: 'Total P&L',        value: (totalPnL >= 0 ? '+' : '') + fmtINR(totalPnL), sub: fmtPct(totalPnLPct), color: pnlColor(totalPnL) },
              { label: 'XIRR Returns',     value: fmtPct(xirr),           sub: 'Annualised return',                color: pnlColor(xirr) },
            ].map((c, i) => (
              <div key={i} style={card}>
                <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>{c.label}</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: c.color }}>{c.value}</div>
                <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>{c.sub}</div>
              </div>
            ))}
          </div>

          {/* Diversification + Performers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14, marginBottom: 20 }}>

            {/* Diversification */}
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>🎯 Diversification</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                <div style={{ position: 'relative', width: 80, height: 80 }}>
                  <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: 80, height: 80 }}>
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(99,102,241,0.15)" strokeWidth="3"/>
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={diversification.score >= 70 ? '#10b981' : diversification.score >= 50 ? '#f59e0b' : '#ef4444'}
                      strokeWidth="3"
                      strokeDasharray={`${diversification.score} 100`}
                      strokeLinecap="round"/>
                  </svg>
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#e2e8f0' }}>{diversification.score}</div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#e2e8f0' }}>Grade {diversification.grade}</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>{diversification.stocks} stocks · {diversification.sectors} sectors</div>
                </div>
              </div>
              <div style={{ background: 'rgba(10,14,26,0.5)', borderRadius: 6, height: 8 }}>
                <div style={{
                  width: `${diversification.score}%`, height: '100%', borderRadius: 6,
                  background: diversification.score >= 70 ? 'linear-gradient(90deg,#10b981,#34d399)' : diversification.score >= 50 ? 'linear-gradient(90deg,#f59e0b,#fbbf24)' : 'linear-gradient(90deg,#ef4444,#f87171)',
                  transition: 'width 1s ease',
                }} />
              </div>
            </div>

            {/* Top Performer */}
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>🏆 Top Performer</div>
              {topPerformer ? (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', marginBottom: 4 }}>{topPerformer.name}</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>{topPerformer.symbol}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#10b981' }}>{fmtPct(topPerformer.pnlPct)}</div>
                  <div style={{ color: '#10b981', fontSize: 13, marginTop: 4 }}>+{fmtINR(topPerformer.pnl)} profit</div>
                </div>
              ) : (
                <div style={{ color: '#475569', fontSize: 14 }}>No holdings yet</div>
              )}
            </div>

            {/* Worst Performer */}
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14 }}>📉 Needs Attention</div>
              {worstPerformer && worstPerformer.symbol !== topPerformer?.symbol ? (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#e2e8f0', marginBottom: 4 }}>{worstPerformer.name}</div>
                  <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>{worstPerformer.symbol}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#ef4444' }}>{fmtPct(worstPerformer.pnlPct)}</div>
                  <div style={{ color: '#ef4444', fontSize: 13, marginTop: 4 }}>{fmtINR(Math.abs(worstPerformer.pnl))} loss</div>
                </div>
              ) : (
                <div style={{ color: '#475569', fontSize: 14 }}>No underperformers</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ HOLDINGS TAB ══ */}
      {tab === 'holdings' && (
        <div style={{ ...card, animation: 'fadein 0.3s ease' }}>
          <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 18 }}>💼 All Holdings</div>
          {holdings.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#475569', padding: '40px 0' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
              <div>No holdings yet. Start trading to see analytics!</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                    {['Stock', 'Sector', 'Qty', 'Avg Price', 'Live Price', 'Invested', 'Current', 'P&L', 'P&L %'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', color: '#64748b', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {holdings.map((h, i) => (
                    <tr key={i} className="row-hover"
                      style={{ borderBottom: '1px solid rgba(99,102,241,0.06)', transition: 'background 0.15s' }}>
                      <td style={{ padding: '12px 12px' }}>
                        <div style={{ fontWeight: 800, color: '#e2e8f0' }}>{h.symbol}</div>
                        <div style={{ color: '#64748b', fontSize: 11 }}>{h.name}</div>
                      </td>
                      <td style={{ padding: '12px 12px', color: '#94a3b8' }}>{h.sector || 'Other'}</td>
                      <td style={{ padding: '12px 12px', color: '#e2e8f0', fontWeight: 700 }}>{h.quantity}</td>
                      <td style={{ padding: '12px 12px', color: '#94a3b8' }}>{fmtINR(h.avgPrice)}</td>
                      <td style={{ padding: '12px 12px', color: '#e2e8f0' }}>{fmtINR(h.livePrice)}</td>
                      <td style={{ padding: '12px 12px', color: '#94a3b8' }}>{fmtINR(h.invested)}</td>
                      <td style={{ padding: '12px 12px', color: '#e2e8f0', fontWeight: 700 }}>{fmtINR(h.current)}</td>
                      <td style={{ padding: '12px 12px', color: pnlColor(h.pnl), fontWeight: 700 }}>
                        {h.pnl >= 0 ? '+' : ''}{fmtINR(h.pnl)}
                      </td>
                      <td style={{ padding: '12px 12px' }}>
                        <span style={{
                          background: h.pnlPct >= 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          color:      h.pnlPct >= 0 ? '#10b981' : '#ef4444',
                          border:     `1px solid ${h.pnlPct >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                          padding: '3px 10px', borderRadius: 20, fontWeight: 800, fontSize: 12, whiteSpace: 'nowrap',
                        }}>
                          {fmtPct(h.pnlPct)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid rgba(99,102,241,0.2)', background: 'rgba(99,102,241,0.05)' }}>
                    <td colSpan={5} style={{ padding: '12px 12px', fontWeight: 800, color: '#818cf8' }}>TOTAL</td>
                    <td style={{ padding: '12px 12px', fontWeight: 800, color: '#94a3b8' }}>{fmtINR(totalInvested)}</td>
                    <td style={{ padding: '12px 12px', fontWeight: 800, color: '#e2e8f0' }}>{fmtINR(totalCurrent)}</td>
                    <td style={{ padding: '12px 12px', fontWeight: 800, color: pnlColor(totalPnL) }}>
                      {totalPnL >= 0 ? '+' : ''}{fmtINR(totalPnL)}
                    </td>
                    <td style={{ padding: '12px 12px', fontWeight: 800, color: pnlColor(totalPnLPct) }}>
                      {fmtPct(totalPnLPct)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══ SECTORS TAB ══ */}
      {tab === 'sectors' && (
        <div style={{ animation: 'fadein 0.3s ease' }}>
          {sectorAllocation.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🥧</div>
              <div style={{ color: '#475569' }}>No sector data yet. Add holdings to see allocation.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {/* Pie chart */}
              <div style={card}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Sector Allocation</div>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={sectorAllocation} cx="50%" cy="50%" outerRadius={110}
                      dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {sectorAllocation.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'rgba(13,17,35,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                      formatter={(v, n) => [fmtINR(v), n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Sector table */}
              <div style={card}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Breakdown</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {sectorAllocation.map((s, i) => (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                          <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>{s.name}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontWeight: 700, color: '#e2e8f0', fontSize: 13 }}>{fmtINR(s.value)}</span>
                          <span style={{ color: '#64748b', fontSize: 12, marginLeft: 8 }}>{s.percent}%</span>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(10,14,26,0.5)', borderRadius: 4, height: 5 }}>
                        <div style={{ width: `${s.percent}%`, height: '100%', borderRadius: 4, background: COLORS[i % COLORS.length], transition: 'width 0.8s ease' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══ MONTHLY TAB ══ */}
      {tab === 'monthly' && (
        <div style={{ animation: 'fadein 0.3s ease' }}>
          {monthlyPnL.length === 0 ? (
            <div style={{ ...card, textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>📅</div>
              <div style={{ color: '#475569' }}>No transaction history yet.</div>
            </div>
          ) : (
            <div style={card}>
              <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>Monthly P&L (Last 12 Months)</div>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={monthlyPnL} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#475569', fontSize: 11 }} tickLine={false} axisLine={false}
                    tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} width={55} />
                  <Tooltip
                    contentStyle={{ background: 'rgba(13,17,35,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 12 }}
                    formatter={(v, n) => [fmtINR(v), n]}
                  />
                  <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
                  <Bar dataKey="invested" name="Invested"  fill="#6366f1" radius={[4,4,0,0]} />
                  <Bar dataKey="returned" name="Returned"  fill="#10b981" radius={[4,4,0,0]} />
                  <Bar dataKey="pnl"      name="P&L"
                    fill="#f59e0b" radius={[4,4,0,0]}
                    label={{ position: 'top', fill: '#94a3b8', fontSize: 10,
                      formatter: v => v !== 0 ? (v > 0 ? `+${Math.round(v/1000)}k` : `${Math.round(v/1000)}k`) : '' }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}