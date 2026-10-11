import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const VERDICT_STYLE = {
  BUY:     { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', border: 'rgba(16,185,129,0.3)'  },
  NEUTRAL: { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', border: 'rgba(245,158,11,0.3)'  },
  AVOID:   { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)'   },
};

const card = {
  background:   'rgba(13,17,35,0.88)',
  border:       '1px solid rgba(99,102,241,0.15)',
  borderRadius: 14,
  padding:      20,
};

function fmtDate(d) {
  if (!d) return 'N/A'; // new Date(null)/new Date(undefined) silently become 1970-01-01, not an error — must guard explicitly
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return 'N/A';
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return 'N/A'; }
}

export default function IPO() {
  const [active,   setActive]   = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [listed,   setListed]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [tab,      setTab]      = useState('upcoming');
  const [selected, setSelected] = useState(null);
  const [detailTab,setDetailTab]= useState('overview');
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading,  setAiLoading]  = useState(false);
  const [dataSource, setDataSource] = useState(null); // { liveSourceReachable, note }

  const fetchAiAnalysis = async (ipo) => {
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const res = await axios.get(`/api/ipo/${ipo.id}/analysis`, { timeout: 20000 });
      setAiAnalysis(res.data);
    } catch (err) {
      const msg = err.response?.data?.message || 'Could not reach the AI analysis service.';
      setAiAnalysis({ verdict: 'NEUTRAL', summary: msg, reasons: [], source: 'error' });
    }
    setAiLoading(false);
  };

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, u, l, meta] = await Promise.allSettled([
        axios.get('/api/ipo/active',   { timeout: 10000 }),
        axios.get('/api/ipo/upcoming', { timeout: 10000 }),
        axios.get('/api/ipo/listed',   { timeout: 10000 }),
        axios.get('/api/ipo/meta/live-source', { timeout: 10000 }),
      ]);
      if (a.status === 'fulfilled') setActive(a.value.data   || []);
      if (u.status === 'fulfilled') setUpcoming(u.value.data || []);
      if (l.status === 'fulfilled') setListed(l.value.data   || []);
      if (meta.status === 'fulfilled') setDataSource(meta.value.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Auto-select tab with data
  useEffect(() => {
    if (active.length > 0)   setTab('active');
    else if (upcoming.length > 0) setTab('upcoming');
    else setTab('listed');
  }, [active, upcoming]);

  const tabs = [
    { key: 'active',   label: `🟢 Active (${active.length})`,         sub: 'Open Now'     },
    { key: 'upcoming', label: `🔵 Upcoming (${upcoming.length})`,      sub: 'Opening Soon' },
    { key: 'listed',   label: `📋 Recent Listed (${listed.length})`,   sub: 'Performance'  },
  ];

  const currentList = tab === 'active' ? active : tab === 'upcoming' ? upcoming : listed;

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#6366f1', fontWeight: 700, fontSize: 16, animation: 'pulse 1.5s infinite' }}>Loading IPO Centre...</div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .ipo-card { transition: all 0.2s; cursor: pointer; }
        .ipo-card:hover { transform: translateY(-4px); border-color: rgba(99,102,241,0.45) !important; }
        .overlay { position:fixed;inset:0;background:rgba(0,0,0,0.75);z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;overflow-y:auto; }
        .modal  { background:#0d1123;border:1px solid rgba(99,102,241,0.3);border-radius:18px;padding:28px;max-width:680px;width:100%;max-height:92vh;overflow-y:auto; }
        .dtab { padding:8px 16px;border-radius:8px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:all 0.2s; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadein 0.4s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>🚀 IPO Centre</h1>
            <p style={{ color: '#94a3b8', margin: 0 }}>
              Real NSE/BSE IPOs · GMP · Subscription · Peer comparison · AI buy/avoid verdict
            </p>
            {dataSource && (
              <div style={{ marginTop: 8, fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
                background: dataSource.liveSourceReachable ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
                border: `1px solid ${dataSource.liveSourceReachable ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`,
                color: dataSource.liveSourceReachable ? '#10b981' : '#f59e0b',
                borderRadius: 8, padding: '4px 10px' }}
                title={dataSource.diagnostics ? `NSE: ${dataSource.diagnostics.nse} | BSE: ${dataSource.diagnostics.bse}` : ''}
              >
                {dataSource.liveSourceReachable
                  ? `🟢 Live ${dataSource.activeSource === 'NSE_LIVE' ? 'NSE' : 'BSE'} feed`
                  : `🟡 Curated dataset — NSE: ${dataSource.diagnostics?.nse || '?'}, BSE: ${dataSource.diagnostics?.bse || '?'}`}
              </div>
            )}
          </div>
          <button onClick={loadAll}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            🔄 Refresh Data
          </button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 24 }}>
        {[
          { label: '🟢 Active IPOs',    value: active.length,   sub: 'Open for subscription', color: '#10b981' },
          { label: '🔵 Upcoming IPOs',  value: upcoming.length, sub: 'Opening soon',           color: '#6366f1' },
          { label: '📋 Recently Listed',value: listed.length,   sub: 'Track performance',      color: '#f59e0b' },
          { label: '💡 How to Use',     value: null,            sub: 'Click any IPO for full analysis, GMP, peer comparison, subscription data and AI verdict.', color: '#818cf8' },
        ].map((s, i) => (
          <div key={i} style={card}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>{s.label}</div>
            {s.value !== null
              ? <div style={{ fontSize: 32, fontWeight: 900, color: s.color }}>{s.value}</div>
              : <div style={{ color: '#818cf8', fontSize: 12, lineHeight: 1.6 }}>{s.sub}</div>}
            {s.value !== null && <div style={{ color: '#475569', fontSize: 12, marginTop: 4 }}>{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: '10px 22px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: tab === t.key ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.1)',
              color:      tab === t.key ? '#fff' : '#94a3b8',
              border:     tab === t.key ? 'none' : '1px solid rgba(99,102,241,0.2)' }}>
            <div>{t.label}</div>
            <div style={{ fontSize: 10, opacity: 0.7, marginTop: 1 }}>{t.sub}</div>
          </button>
        ))}
      </div>

      {/* IPO Cards */}
      {currentList.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 20px', animation: 'fadein 0.3s ease' }}>
          <div style={{ fontSize: 48, marginBottom: 14 }}>🎯</div>
          <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
            {tab === 'active' ? 'No active IPOs right now' : tab === 'upcoming' ? 'No upcoming IPOs announced yet' : 'No recent listings'}
          </div>
          <div style={{ color: '#475569', fontSize: 14 }}>Check back soon — new IPOs are added as announced by NSE/BSE.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16, animation: 'fadein 0.3s ease' }}>
          {currentList.map(ipo => {
            const vs = VERDICT_STYLE[ipo.verdict] || VERDICT_STYLE.NEUTRAL;
            return (
              <div key={ipo.id} className="ipo-card" onClick={() => { setSelected(ipo); setDetailTab('overview'); setAiAnalysis(null); }}
                style={{ ...card, position: 'relative', overflow: 'hidden' }}>

                {/* Accent bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: ipo.verdict === 'BUY' ? 'linear-gradient(90deg,#10b981,#34d399)'
                    : ipo.verdict === 'AVOID' ? 'linear-gradient(90deg,#ef4444,#f87171)'
                    : 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} />

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 6, marginBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 900, fontSize: 15, color: '#e2e8f0', marginBottom: 3 }}>{ipo.company}</div>
                    <div style={{ color: '#64748b', fontSize: 11 }}>{ipo.sector} · {ipo.exchange}</div>
                  </div>
                  <span style={{ background: vs.bg, color: vs.color, border: `1px solid ${vs.border}`,
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {ipo.verdictEmoji} {ipo.verdict}
                  </span>
                </div>

                {/* Key metrics grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  {[
                    { label: ipo.status === 'listed' ? 'Current Price' : 'Price Band', value: ipo.priceRange },
                    { label: 'Issue Size',   value: ipo.issueSize || 'N/A' },
                    { label: 'Lot Size',     value: ipo.lotSize && ipo.lotSize !== 'N/A' ? `${ipo.lotSize} shares` : 'N/A' },
                    { label: 'Min Invest',   value: (typeof ipo.minInvestment === 'number') ? `₹${ipo.minInvestment.toLocaleString('en-IN')}` : (ipo.issuePrice && ipo.lotSize && ipo.lotSize !== 'N/A' ? `₹${(ipo.issuePrice*ipo.lotSize).toLocaleString('en-IN')}` : 'N/A') },
                    { label: 'GMP',          value: ipo.gmp || 'N/A' },
                    { label: 'GMP %',        value: ipo.gmpPct || 'N/A' },
                  ].map((f, i) => (
                    <div key={i} style={{ background: 'rgba(10,14,26,0.6)', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ color: '#475569', fontSize: 9, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>{f.label}</div>
                      <div style={{ color: '#e2e8f0', fontWeight: 800, fontSize: 13 }}>{f.value}</div>
                    </div>
                  ))}
                </div>

                {/* Dates */}
                <div style={{ display: 'flex', gap: 14, fontSize: 11, color: '#64748b', marginBottom: 12, flexWrap: 'wrap' }}>
                  <span>📅 Open: <b style={{ color: '#94a3b8' }}>{fmtDate(ipo.openDate)}</b></span>
                  <span>Close: <b style={{ color: '#94a3b8' }}>{fmtDate(ipo.closeDate)}</b></span>
                  <span>List: <b style={{ color: '#94a3b8' }}>{fmtDate(ipo.listingDate)}</b></span>
                </div>

                {/* Listed gain — only shown when we actually have real numbers.
                    Previously this always rendered with listedPrice hardcoded
                    to 0, producing a fabricated "+0%" for every live IPO. */}
                {ipo.status === 'listed' && ipo.listedPrice > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    background: (ipo.gainVsIssue || 0) >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                    border: `1px solid ${(ipo.gainVsIssue || 0) >= 0 ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
                    <div>
                      <div style={{ color: '#64748b', fontSize: 10, marginBottom: 2 }}>Listed @ ₹{ipo.listedPrice}</div>
                      <div style={{ color: '#64748b', fontSize: 10 }}>Current ≈ ₹{ipo.currentPrice || ipo.listedPrice}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ color: (ipo.gainVsIssue || 0) >= 0 ? '#10b981' : '#ef4444', fontWeight: 900, fontSize: 18 }}>
                        {(ipo.gainVsIssue || 0) >= 0 ? '+' : ''}{ipo.gainVsIssue || 0}%
                      </div>
                      <div style={{ color: '#64748b', fontSize: 10 }}>vs issue price</div>
                    </div>
                  </div>
                )}
                {ipo.status === 'listed' && !(ipo.listedPrice > 0) && (
                  <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 10 }}>
                    {ipo.currentPrice
                      ? <div style={{ fontSize: 13 }}>📈 Now trading at <b style={{ color: '#e2e8f0' }}>₹{ipo.currentPrice}</b> — pre-listing price history not available from NSE's public feed.</div>
                      : <div style={{ fontSize: 12, color: '#64748b' }}>This IPO has listed — check <button onClick={() => window.location.href = `/stocks?q=${ipo.symbol}`} style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', padding:0, fontWeight:700 }}>{ipo.symbol} on the Stocks page</button> for its live price.</div>}
                  </div>
                )}

                {/* Subscription */}
                {ipo.subscription?.total !== '–' && (
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                    {[
                      { label: 'QIB',   val: ipo.subscription?.qib },
                      { label: 'NII',   val: ipo.subscription?.nii },
                      { label: 'Retail',val: ipo.subscription?.retail },
                      { label: 'Total', val: ipo.subscription?.total },
                    ].map((s, i) => (
                      <div key={i} style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 6, padding: '4px 8px', fontSize: 10 }}>
                        <span style={{ color: '#475569' }}>{s.label}: </span>
                        <span style={{ color: '#818cf8', fontWeight: 800 }}>{s.val}</span>
                      </div>
                    ))}
                  </div>
                )}
                {ipo.subscription?.status && ipo.subscription?.total === '–' && (
                  <div style={{ background: 'rgba(99,102,241,0.08)', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#818cf8', fontWeight: 700, marginBottom: 10 }}>
                    📅 {ipo.subscription.status}
                  </div>
                )}

                {/* Analyst rating */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 2 }}>
                    {[1,2,3,4,5].map(s => (
                      <span key={s} style={{ fontSize: 12, color: s <= Math.round(ipo.rating) ? '#f59e0b' : '#334155' }}>★</span>
                    ))}
                    <span style={{ color: '#64748b', fontSize: 11, marginLeft: 4 }}>{ipo.rating}/5</span>
                  </div>
                  <span style={{ color: '#6366f1', fontSize: 12, fontWeight: 700 }}>Full Analysis →</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ══ DETAIL MODAL ══ */}
      {selected && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#e2e8f0', marginBottom: 4 }}>{selected.company}</div>
                <div style={{ color: '#64748b', fontSize: 13 }}>{selected.sector} · {selected.exchange} · {selected.symbol}</div>
              </div>
              <button onClick={() => setSelected(null)}
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, flexShrink: 0 }}>
                ✕ Close
              </button>
            </div>

            {/* Verdict banner */}
            {(() => { const vs = VERDICT_STYLE[selected.verdict] || VERDICT_STYLE.NEUTRAL; return (
              <div style={{ background: vs.bg, border: `1px solid ${vs.border}`, borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ color: vs.color, fontWeight: 900, fontSize: 17, marginBottom: 4 }}>
                  {selected.verdictEmoji} AI Verdict: {selected.verdict}
                </div>
                <div style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{selected.verdictReason}</div>
                <div style={{ marginTop: 10, display: 'flex', gap: 16 }}>
                  <div>
                    <div style={{ color: '#64748b', fontSize: 10, marginBottom: 2 }}>ANALYST RATING</div>
                    <div style={{ color: '#f59e0b', fontWeight: 800 }}>★ {selected.analystRating}/5</div>
                  </div>
                  <div>
                    <div style={{ color: '#64748b', fontSize: 10, marginBottom: 2 }}>ANALYSTS RECOMMENDING BUY</div>
                    <div style={{ color: vs.color, fontWeight: 800 }}>{selected.recommendBuy}%</div>
                  </div>
                </div>
              </div>
            ); })()}

            {/* ── Live AI (Claude) analysis — on-demand, separate from the
                 static verdict above so it always reflects a fresh model call ── */}
            <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 12, padding: 14, marginBottom: 16 }}>
              {!aiAnalysis && !aiLoading && (
                <button onClick={() => fetchAiAnalysis(selected)}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  🤖 Get Fresh AI Analysis
                </button>
              )}
              {aiLoading && <div style={{ color: '#94a3b8', fontSize: 13 }}>🤖 Analyzing {selected.company} with AI…</div>}
              {aiAnalysis && (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontWeight: 800, color: (VERDICT_STYLE[aiAnalysis.verdict] || VERDICT_STYLE.NEUTRAL).color }}>
                      🤖 Live AI Verdict: {aiAnalysis.verdict} {aiAnalysis.confidence ? `(${aiAnalysis.confidence}% confidence)` : ''}
                    </div>
                    <button onClick={() => fetchAiAnalysis(selected)} style={{ background: 'none', border: 'none', color: '#6366f1', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>↻ Refresh</button>
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 8 }}>{aiAnalysis.summary}</div>
                  {aiAnalysis.reasons?.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: 18, color: '#cbd5e1', fontSize: 12 }}>
                      {aiAnalysis.reasons.map((r, i) => <li key={i}>{r}</li>)}
                    </ul>
                  )}
                  {aiAnalysis.riskLevel && <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>Risk level: <b>{aiAnalysis.riskLevel}</b></div>}
                </div>
              )}
            </div>

            {/* Detail tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
              {['overview','financials','peers','highlights'].map(t => (
                <button key={t} className="dtab" onClick={() => setDetailTab(t)}
                  style={{ background: detailTab === t ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.1)',
                    color: detailTab === t ? '#fff' : '#94a3b8', border: detailTab === t ? 'none' : '1px solid rgba(99,102,241,0.2)' }}>
                  {{ overview:'📋 Overview', financials:'💰 Financials', peers:'⚖️ Peer Compare', highlights:'✨ Pros & Risks' }[t]}
                </button>
              ))}
            </div>

            {/* ── OVERVIEW ── */}
            {detailTab === 'overview' && (
              <div>
                <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.7, marginBottom: 16 }}>{selected.description}</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                  {[
                    { label: selected.status === 'listed' ? 'Current Price' : 'Price Band', value: selected.priceRange },
                    { label: 'Issue Size',       value: selected.issueSize || 'N/A' },
                    { label: 'Lot Size',         value: selected.lotSize && selected.lotSize !== 'N/A' ? `${selected.lotSize} shares` : 'N/A' },
                    { label: 'Min Investment',   value: `₹${(selected.minInvestment || 0).toLocaleString('en-IN')}` },
                    { label: 'Open Date',        value: fmtDate(selected.openDate) },
                    { label: 'Close Date',       value: fmtDate(selected.closeDate) },
                    { label: 'Listing Date',     value: fmtDate(selected.listingDate) },
                    { label: 'Exchange',         value: selected.exchange },
                    { label: 'GMP (Grey Market)',value: `${selected.gmp} (${selected.gmpPct})` },
                    { label: 'Estimated Kostak', value: selected.gmp ? `~${selected.gmp} per application` : 'N/A' },
                  ].map((f, i) => (
                    <div key={i} style={{ background: 'rgba(10,14,26,0.6)', borderRadius: 8, padding: '10px 12px' }}>
                      <div style={{ color: '#475569', fontSize: 10, fontWeight: 700, marginBottom: 3, textTransform: 'uppercase' }}>{f.label}</div>
                      <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 13 }}>{f.value}</div>
                    </div>
                  ))}
                </div>
                {/* Subscription */}
                <div style={{ fontWeight: 800, fontSize: 13, color: '#818cf8', marginBottom: 10 }}>📊 Subscription Status</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                  {[
                    { label: 'Retail', val: selected.subscription?.retail },
                    { label: 'QIB',    val: selected.subscription?.qib    },
                    { label: 'NII/HNI',val: selected.subscription?.nii    },
                    { label: 'Total',  val: selected.subscription?.total  },
                  ].map((s, i) => (
                    <div key={i} style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
                      <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>{s.label}</div>
                      <div style={{ color: '#6366f1', fontWeight: 900, fontSize: 18 }}>{s.val || '–'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── FINANCIALS ── */}
            {detailTab === 'financials' && (
              <div>
                {selected.source === 'live_nse' && (
                  <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.25)', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 12, color: '#94a3b8' }}>
                    ℹ️ NSE's public IPO feed doesn't include company financials (revenue/profit/ratios) — that level of detail typically requires the draft prospectus (DRHP), which isn't part of this live feed. Showing what's confirmed available below.
                  </div>
                )}
                <div style={{ fontWeight: 800, fontSize: 13, color: '#818cf8', marginBottom: 12 }}>📈 Key Financial Metrics</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
                  {[
                    { label: 'Revenue',      value: selected.financials?.revenue,     color: '#e2e8f0' },
                    { label: 'Net Profit',   value: selected.financials?.profit,      color: selected.financials?.profit?.startsWith('-') ? '#ef4444' : '#10b981' },
                    { label: 'EBITDA',       value: selected.financials?.ebitda,      color: '#e2e8f0' },
                    { label: 'P/E Ratio',    value: selected.financials?.pe,          color: '#818cf8' },
                    { label: 'ROE',          value: selected.financials?.roe,         color: '#10b981' },
                    { label: 'Debt/Equity',  value: selected.financials?.debtEquity,  color: '#f59e0b' },
                  ].map((f, i) => (
                    <div key={i} style={{ background: 'rgba(10,14,26,0.6)', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                      <div style={{ color: '#64748b', fontSize: 10, marginBottom: 6, textTransform: 'uppercase' }}>{f.label}</div>
                      <div style={{ color: f.color, fontWeight: 900, fontSize: 18 }}>{f.value || 'N/A'}</div>
                    </div>
                  ))}
                </div>
                {selected.status === 'listed' && selected.listedPrice > 0 && (
                  <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 800, fontSize: 13, color: '#10b981', marginBottom: 10 }}>📋 Post-Listing Performance</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>Issue Price</div>
                        <div style={{ fontWeight: 900, color: '#e2e8f0' }}>₹{selected.issuePrice}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>Listed Price</div>
                        <div style={{ fontWeight: 900, color: '#f59e0b' }}>₹{selected.listedPrice}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 10, marginBottom: 4 }}>Current Price</div>
                        <div style={{ fontWeight: 900, color: '#10b981' }}>₹{selected.currentPrice || selected.listedPrice}</div>
                      </div>
                    </div>
                  </div>
                )}
                {selected.status === 'listed' && !(selected.listedPrice > 0) && (
                  <div style={{ background: 'rgba(99,102,241,0.06)', border: '1px dashed rgba(99,102,241,0.25)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#94a3b8' }}>
                    {selected.currentPrice
                      ? <>📈 Now trading at <b style={{ color: '#e2e8f0' }}>₹{selected.currentPrice}</b> — pre-listing price history isn't available from NSE's public feed for this IPO.</>
                      : <>This IPO has listed on NSE — check the <b style={{ color: '#6366f1' }}>Stocks</b> page for {selected.symbol}'s live price.</>}
                  </div>
                )}
              </div>
            )}

            {/* ── PEERS ── */}
            {detailTab === 'peers' && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#818cf8', marginBottom: 12 }}>⚖️ Peer Comparison</div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                        {['Company', 'P/E', 'Market Cap', 'Revenue'].map(h => (
                          <th key={h} style={{ padding: '8px 10px', color: '#64748b', fontWeight: 700, textAlign: 'left' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ background: 'rgba(99,102,241,0.06)', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                        <td style={{ padding: '10px', fontWeight: 800, color: '#818cf8' }}>{selected.company} (IPO)</td>
                        <td style={{ padding: '10px', color: '#e2e8f0' }}>{selected.financials?.pe}</td>
                        <td style={{ padding: '10px', color: '#e2e8f0' }}>–</td>
                        <td style={{ padding: '10px', color: '#e2e8f0' }}>{selected.financials?.revenue}</td>
                      </tr>
                      {(selected.peers || []).map((p, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(99,102,241,0.06)' }}>
                          <td style={{ padding: '10px', color: '#94a3b8', fontWeight: 600 }}>{p.name}</td>
                          <td style={{ padding: '10px', color: '#94a3b8' }}>{p.pe}</td>
                          <td style={{ padding: '10px', color: '#94a3b8' }}>{p.marketCap}</td>
                          <td style={{ padding: '10px', color: '#94a3b8' }}>{p.rev}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div style={{ marginTop: 16, background: 'rgba(99,102,241,0.06)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: '#818cf8', fontSize: 13, marginBottom: 8 }}>📌 Valuation Summary</div>
                  <p style={{ color: '#94a3b8', fontSize: 12, lineHeight: 1.7 }}>
                    {selected.financials?.pe !== 'N/A (loss)' && selected.financials?.pe !== 'N/A'
                      ? `${selected.company} is priced at ${selected.financials?.pe} P/E. ${(selected.peers || []).length > 0 ? `Compared to peers like ${selected.peers[0]?.name} (${selected.peers[0]?.pe}), the issue ${parseFloat(selected.financials?.pe) < parseFloat(selected.peers[0]?.pe) ? 'appears attractively priced' : 'is at a premium'}. ` : ''}Investors should consider sector growth trajectory alongside absolute valuations.`
                      : `${selected.company} is currently pre-profitability. Valuation should be assessed on revenue growth trajectory (${selected.financials?.revenue} revenue) and path to profitability rather than earnings multiples.`}
                  </p>
                </div>
              </div>
            )}

            {/* ── HIGHLIGHTS / RISKS ── */}
            {detailTab === 'highlights' && (
              <div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#10b981', marginBottom: 12 }}>✅ Key Strengths</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                  {(selected.highlights || []).map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                      <span style={{ color: '#10b981', fontSize: 16, flexShrink: 0 }}>✓</span>
                      <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{h}</span>
                    </div>
                  ))}
                </div>
                <div style={{ fontWeight: 800, fontSize: 13, color: '#ef4444', marginBottom: 12 }}>⚠️ Key Risks</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(selected.risks || []).map((r, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: 8, padding: '10px 12px' }}>
                      <span style={{ color: '#ef4444', fontSize: 16, flexShrink: 0 }}>⚠</span>
                      <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>{r}</span>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: '#f59e0b', marginBottom: 6, fontSize: 13 }}>⚡ Quick Decision Guide</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      <div style={{ color: '#10b981', fontWeight: 700, marginBottom: 4 }}>Apply if:</div>
                      <div>• Long-term investor (3+ years)</div>
                      <div>• Believe in sector growth</div>
                      <div>• Risk appetite is moderate-high</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#94a3b8' }}>
                      <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 4 }}>Skip if:</div>
                      <div>• Listing gain is your only goal</div>
                      <div>• Low risk appetite</div>
                      <div>• Already high sector exposure</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}