import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

const safe    = (v, d = 0)  => (v == null || isNaN(v)) ? d : v;
const safeStr = (v, d = '—') => (v == null || v === '') ? d : String(v);

const SEVERITY_COLOR = { high:'#ef4444', medium:'#f59e0b', low:'#10b981' };
const SEVERITY_BG    = { high:'rgba(239,68,68,0.08)', medium:'rgba(245,158,11,0.08)', low:'rgba(16,185,129,0.08)' };
const TYPE_COLOR     = { success:'#10b981', warning:'#f59e0b', danger:'#ef4444', info:'#6366f1' };
const TYPE_BG        = { success:'rgba(16,185,129,0.08)', warning:'rgba(245,158,11,0.08)', danger:'rgba(239,68,68,0.08)', info:'rgba(99,102,241,0.08)' };

// ── Score ring ────────────────────────────────────────────────────────────
function ScoreRing({ score }) {
  const r     = 54;
  const circ  = 2 * Math.PI * r;
  const pct   = safe(score, 50) / 100;
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444';
  const label = score >= 70 ? 'Excellent' : score >= 55 ? 'Good' : score >= 40 ? 'Average' : 'Needs Work';
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <svg width={140} height={140}>
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.6} />
            <stop offset="100%" stopColor={color} stopOpacity={1}   />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(99,102,241,0.12)" strokeWidth={10} />
        {/* Progress */}
        <circle cx={70} cy={70} r={r} fill="none" stroke="url(#ringGrad)" strokeWidth={10}
          strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
          strokeLinecap="round" transform="rotate(-90 70 70)"
          style={{ transition:'stroke-dashoffset 1.2s ease' }}
        />
        {/* Score text */}
        <text x={70} y={65} textAnchor="middle" fill={color} fontSize={28} fontWeight="900">{safe(score,50)}</text>
        <text x={70} y={84} textAnchor="middle" fill="#64748b" fontSize={11}>/100</text>
      </svg>
      <div style={{ fontWeight:800, fontSize:15, color }}>{label} Trader</div>
    </div>
  );
}

// ── Metric bar ────────────────────────────────────────────────────────────
function MetricBar({ label, value, max, color, suffix = '' }) {
  const pct = Math.min(100, (safe(value) / (max || 100)) * 100);
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ color:'#94a3b8', fontSize:12 }}>{label}</span>
        <span style={{ color, fontWeight:800, fontSize:12 }}>{safe(value)}{suffix}</span>
      </div>
      <div style={{ background:'rgba(10,14,26,0.6)', borderRadius:6, height:7, overflow:'hidden' }}>
        <div style={{ background:color, width:`${pct}%`, height:'100%', borderRadius:6, transition:'width 1s ease' }} />
      </div>
    </div>
  );
}

// ── Bias card ─────────────────────────────────────────────────────────────
function BiasCard({ bias }) {
  const [open, setOpen] = useState(false);
  const sev   = (bias.severity || 'medium').toLowerCase();
  const color = SEVERITY_COLOR[sev] || '#f59e0b';
  const bg    = SEVERITY_BG[sev]    || SEVERITY_BG.medium;
  return (
    <div style={{ background:bg, border:`1px solid ${color}30`, borderRadius:12, overflow:'hidden', marginBottom:10 }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', cursor:'pointer' }}>
        <span style={{ fontSize:24 }}>{bias.icon || '⚠️'}</span>
        <div style={{ flex:1 }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:800, fontSize:14, color:'#e2e8f0' }}>{safeStr(bias.name)}</span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ background:`${color}20`, color, padding:'2px 10px', borderRadius:20, fontSize:11, fontWeight:700, textTransform:'uppercase' }}>
                {sev}
              </span>
              <span style={{ color:'#475569', fontSize:12 }}>{open ? '▲' : '▼'}</span>
            </div>
          </div>
          <div style={{ color:'#64748b', fontSize:12, marginTop:3 }}>{safeStr(bias.description)}</div>
        </div>
      </div>
      {open && (
        <div style={{ padding:'0 16px 14px 52px', borderTop:`1px solid ${color}15` }}>
          <div style={{ color:'#94a3b8', fontSize:13, marginTop:10, lineHeight:1.7 }}>
            💡 <strong style={{ color:'#e2e8f0' }}>Suggestion:</strong> {safeStr(bias.suggestion, 'Review your trading strategy and keep a trading journal.')}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Coaching card ─────────────────────────────────────────────────────────
function CoachingCard({ item }) {
  const type  = item.type || 'info';
  const color = TYPE_COLOR[type] || '#6366f1';
  const bg    = TYPE_BG[type]    || TYPE_BG.info;
  return (
    <div style={{ background:bg, border:`1px solid ${color}25`, borderRadius:12, padding:'14px 16px', display:'flex', gap:12 }}>
      <span style={{ fontSize:22, flexShrink:0 }}>{item.icon || '💡'}</span>
      <div>
        <div style={{ fontWeight:700, fontSize:13, color, marginBottom:4 }}>{safeStr(item.tip)}</div>
        <div style={{ color:'#64748b', fontSize:12, lineHeight:1.6 }}>{safeStr(item.detail)}</div>
      </div>
    </div>
  );
}

export default function Behavior() {
  const navigate    = useNavigate();
  const [data,      setData]    = useState(null);
  const [loading,   setLoading] = useState(true);
  const [tab,       setTab]     = useState('overview');
  const [refreshing,setRefresh] = useState(false);
  const [deepDive,     setDeepDive]     = useState(null);
  const [deepDiveLoading, setDeepDiveLoading] = useState(false);

  const fetchDeepDive = async () => {
    setDeepDiveLoading(true);
    setDeepDive(null);
    try {
      const res = await axios.get('/api/behavior/deep-dive', { timeout: 25000 });
      setDeepDive(res.data);
    } catch (err) {
      setDeepDive({ available: false, reason: err.response?.data?.reason || 'Could not generate the detailed report.' });
    }
    setDeepDiveLoading(false);
  };

  useEffect(() => { fetchBehavior(); }, []);

  const fetchBehavior = async (refresh = false) => {
    if (refresh) setRefresh(true); else setLoading(true);
    try {
      const res = await axios.get('/api/behavior');
      setData(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load behavioral analysis');
    }
    setLoading(false);
    setRefresh(false);
  };

  const st = {
    page: { padding:'24px', maxWidth:1200, margin:'0 auto' },
    card: { background:'rgba(13,17,35,0.9)', border:'1px solid rgba(99,102,241,0.18)', borderRadius:16, padding:22, marginBottom:16 },
    tab:  (a) => ({ padding:'8px 18px', borderRadius:9, border:'none', cursor:'pointer', fontWeight:700, fontSize:13, background:a?'#6366f1':'rgba(10,14,26,0.5)', color:a?'#fff':'#94a3b8', transition:'all 0.2s' }),
  };

  // ── Loading ───────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'80vh', flexDirection:'column', gap:16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}`}</style>
      <div style={{ width:48, height:48, border:'3px solid rgba(99,102,241,0.2)', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ color:'#6366f1', fontWeight:700, animation:'pulse 1.5s infinite' }}>Analyzing your trading psychology...</div>
    </div>
  );

  if (!data) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'60vh', flexDirection:'column', gap:12 }}>
      <div style={{ fontSize:48 }}>🧠</div>
      <h2>Could not load analysis</h2>
      <button onClick={() => fetchBehavior()} style={{ background:'#6366f1', border:'none', color:'#fff', padding:'10px 20px', borderRadius:10, cursor:'pointer' }}>Retry</button>
    </div>
  );

  const { score, source, mlOnline, riskProfile, features:f, biases, strengths, coaching, aiInsight, summary:sm } = data;

  const riskColor = riskProfile==='Aggressive'?'#ef4444':riskProfile==='Conservative'?'#10b981':'#f59e0b';

  return (
    <div style={st.page}>
      <style>{`
        @keyframes spin   { to { transform:rotate(360deg) } }
        @keyframes fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes glow   { 0%,100%{box-shadow:0 0 8px rgba(99,102,241,0.15)} 50%{box-shadow:0 0 24px rgba(99,102,241,0.4)} }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, marginBottom:4 }}>🧠 Behavioral Analysis</h1>
          <p style={{ color:'#94a3b8' }}>ML-powered insights into your trading psychology</p>
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* ML / Rules badge */}
          <div style={{ background: source==='ml'?'rgba(16,185,129,0.1)':'rgba(99,102,241,0.1)', border:`1px solid ${source==='ml'?'#10b981':'#6366f1'}40`, borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:700, color:source==='ml'?'#10b981':'#818cf8', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:source==='ml'?'#10b981':'#6366f1', display:'inline-block' }} />
            {source === 'ml' ? '🤖 ML Powered' : '📐 Rule-Based'}
          </div>
          {/* ML server status */}
          <div style={{ background: mlOnline?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)', border:`1px solid ${mlOnline?'#10b981':'#ef4444'}40`, borderRadius:8, padding:'5px 12px', fontSize:12, fontWeight:700, color:mlOnline?'#10b981':'#ef4444', display:'flex', alignItems:'center', gap:5 }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:mlOnline?'#10b981':'#ef4444', display:'inline-block', animation: mlOnline?'pulse 2s infinite':'' }} />
            {mlOnline ? 'ML Server Online' : 'ML Server Offline'}
          </div>
          <button onClick={() => fetchBehavior(true)} disabled={refreshing}
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', borderRadius:10, padding:'8px 18px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
            {refreshing ? '⏳' : '🔄'} Refresh
          </button>
        </div>
      </div>

      {/* ── Top row: Score + Risk + Quick stats ── */}
      <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:16, marginBottom:16 }}>

        {/* Score card */}
        <div style={{ ...st.card, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minWidth:200, animation:'glow 3s infinite' }}>
          <div style={{ color:'#64748b', fontSize:11, fontWeight:700, letterSpacing:1, marginBottom:12 }}>TRADING SCORE</div>
          <ScoreRing score={safe(score, 50)} />
          <div style={{ marginTop:12, background:`${riskColor}15`, border:`1px solid ${riskColor}30`, borderRadius:8, padding:'5px 14px', fontSize:12, fontWeight:700, color:riskColor }}>
            {riskProfile || 'Moderate'} Risk
          </div>
        </div>

        {/* Stats grid */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, alignContent:'start' }}>
          {[
            { label:'Total Trades',     value:safe(sm?.totalTrades,0),          color:'#6366f1', icon:'🔄', suffix:'' },
            { label:'Win Rate',         value:`${safe(sm?.winRate,0).toFixed(1)}%`, color: safe(sm?.winRate,0)>=50?'#10b981':'#ef4444', icon:'🎯', suffix:'' },
            { label:'Avg Hold Days',    value:`${safe(sm?.avgHoldDays,0)}d`,     color:'#f59e0b', icon:'📅', suffix:'' },
            { label:'Holdings',         value:safe(sm?.numHoldings,0),           color:'#8b5cf6', icon:'💼', suffix:'' },
            { label:'Monthly Trades',   value:safe(sm?.tradingFreq,0),           color:'#06b6d4', icon:'📊', suffix:'' },
            { label:'Biases Detected',  value:safe(sm?.biasCount,0),             color: safe(sm?.biasCount,0)===0?'#10b981':'#f59e0b', icon:'⚠️', suffix:'' },
          ].map(item => (
            <div key={item.label} style={{ background:'rgba(10,14,26,0.6)', border:'1px solid rgba(99,102,241,0.12)', borderRadius:12, padding:'12px 14px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ color:'#475569', fontSize:10, fontWeight:600 }}>{item.label}</div>
                <span style={{ fontSize:16 }}>{item.icon}</span>
              </div>
              <div style={{ color:item.color, fontWeight:900, fontSize:20, marginTop:4 }}>{item.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
        {[
          ['overview', '📊 Overview'],
          ['biases',   `⚠️ Biases (${(biases||[]).length})`],
          ['coaching', `💡 Coaching (${(coaching||[]).length})`],
          ['details',  '🔬 Deep Analysis'],
        ].map(([id, label]) => (
          <button key={id} style={st.tab(tab===id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ══════════════════════ OVERVIEW ══════════════════════ */}
      {tab === 'overview' && (
        <div style={{ animation:'fadein 0.3s ease' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* Strengths */}
            <div style={st.card}>
              <div style={{ fontWeight:800, fontSize:15, color:'#10b981', marginBottom:16 }}>✅ Your Strengths</div>
              {(strengths||[]).length === 0 ? (
                <div style={{ color:'#475569', fontSize:13 }}>Make more trades to discover your strengths.</div>
              ) : (strengths||[]).map((s, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 12px', background:'rgba(16,185,129,0.06)', borderRadius:10, marginBottom:8, border:'1px solid rgba(16,185,129,0.12)' }}>
                  <span style={{ fontSize:20 }}>{s.icon || '✅'}</span>
                  <div>
                    <div style={{ fontWeight:700, fontSize:13, color:'#e2e8f0' }}>{safeStr(s.label)}</div>
                    <div style={{ color:'#10b981', fontSize:12, fontWeight:700 }}>{safeStr(s.value)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Top biases preview */}
            <div style={st.card}>
              <div style={{ fontWeight:800, fontSize:15, color:'#f59e0b', marginBottom:16 }}>⚠️ Detected Biases</div>
              {(biases||[]).length === 0 ? (
                <div style={{ textAlign:'center', padding:'20px 0' }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>🎉</div>
                  <div style={{ color:'#10b981', fontWeight:700 }}>No significant biases detected!</div>
                  <div style={{ color:'#64748b', fontSize:12, marginTop:4 }}>Keep trading to maintain this record.</div>
                </div>
              ) : (biases||[]).slice(0,3).map((bias, i) => {
                const sev   = (bias.severity||'medium').toLowerCase();
                const color = SEVERITY_COLOR[sev] || '#f59e0b';
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:SEVERITY_BG[sev]||SEVERITY_BG.medium, borderRadius:10, marginBottom:8, border:`1px solid ${color}20` }}>
                    <span style={{ fontSize:20 }}>{bias.icon||'⚠️'}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{safeStr(bias.name)}</div>
                      <div style={{ color:'#64748b', fontSize:11 }}>{safeStr(bias.description).slice(0,60)}...</div>
                    </div>
                    <span style={{ background:`${color}20`, color, padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700 }}>{sev}</span>
                  </div>
                );
              })}
              {(biases||[]).length > 3 && (
                <button onClick={() => setTab('biases')} style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:12, fontWeight:700, padding:0, marginTop:4 }}>
                  +{biases.length - 3} more biases →
                </button>
              )}
            </div>
          </div>

          {/* AI-generated personalized note (Claude) — distinct from the
              deterministic rule/ML score above */}
          {aiInsight && (
            <div style={{ ...st.card, background:'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.06))', border:'1px solid rgba(99,102,241,0.25)' }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:8 }}>🤖 AI Coach Says</div>
              <div style={{ color:'#e2e8f0', fontSize:14, lineHeight:1.6, marginBottom:10 }}>{aiInsight.note}</div>
              {aiInsight.actionThisWeek && (
                <div style={{ background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)', borderRadius:10, padding:'8px 12px', color:'#10b981', fontSize:13, fontWeight:600 }}>
                  ✅ This week: {aiInsight.actionThisWeek}
                </div>
              )}
            </div>
          )}

          {/* Deep-dive detailed AI report — on-demand, longer & more specific
              than the short "AI Coach Says" note above */}
          <div style={{ ...st.card, background:'rgba(99,102,241,0.05)', border:'1px dashed rgba(99,102,241,0.25)' }}>
            {!deepDive && !deepDiveLoading && (
              <button onClick={fetchDeepDive}
                style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', borderRadius:10, padding:'10px 20px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
                🔬 Generate Detailed AI Report
              </button>
            )}
            {deepDiveLoading && <div style={{ color:'#94a3b8', fontSize:13 }}>🔬 Analyzing your full trading history in depth…</div>}
            {deepDive && !deepDive.available && (
              <div style={{ color:'#f59e0b', fontSize:13 }}>{deepDive.reason}</div>
            )}
            {deepDive && deepDive.available && (
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                  <div style={{ fontWeight:800, fontSize:16 }}>🔬 Detailed Behaviour Report</div>
                  <button onClick={fetchDeepDive} style={{ background:'none', border:'none', color:'#6366f1', cursor:'pointer', fontSize:12, fontWeight:700 }}>↻ Regenerate</button>
                </div>
                <div style={{ fontSize:14, fontWeight:700, color:'#e2e8f0', marginBottom:14 }}>{deepDive.headline}</div>

                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:4 }}>Why this happens</div>
                  <div style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.6 }}>{deepDive.rootCauseAnalysis}</div>
                </div>

                <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:10, padding:12, marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#ef4444', textTransform:'uppercase', marginBottom:4 }}>⚠️ Biggest risk to fix first</div>
                  <div style={{ fontSize:13, color:'#e2e8f0', lineHeight:1.6 }}>{deepDive.biggestRisk}</div>
                </div>

                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', marginBottom:8 }}>Your 30-day plan</div>
                  {(deepDive.thirtyDayPlan||[]).map((step, i) => (
                    <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', marginBottom:8 }}>
                      <span style={{ background:'rgba(99,102,241,0.15)', color:'#6366f1', borderRadius:'50%', width:22, height:22, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:800, flexShrink:0 }}>{i+1}</span>
                      <span style={{ fontSize:13, color:'#cbd5e1', lineHeight:1.5 }}>{step}</span>
                    </div>
                  ))}
                </div>

                <div style={{ background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:10, padding:12, fontSize:13, color:'#10b981' }}>
                  🌟 {deepDive.encouragement}
                </div>
              </div>
            )}
          </div>

          {/* Coaching preview */}
          {(coaching||[]).length > 0 && (
            <div style={st.card}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>💡 AI Coaching Tips</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:10 }}>
                {(coaching||[]).slice(0,4).map((c,i) => <CoachingCard key={i} item={c} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ BIASES ══════════════════════ */}
      {tab === 'biases' && (
        <div style={{ animation:'fadein 0.3s ease' }}>
          {(biases||[]).length === 0 ? (
            <div style={{ ...st.card, textAlign:'center', padding:60 }}>
              <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
              <h2 style={{ color:'#10b981', marginBottom:8 }}>No Biases Detected!</h2>
              <p style={{ color:'#94a3b8' }}>Your trading shows disciplined, rational behavior. Keep it up!</p>
            </div>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
                {['high','medium','low'].map(sev => {
                  const count = (biases||[]).filter(b=>(b.severity||'medium').toLowerCase()===sev).length;
                  return (
                    <div key={sev} style={{ background:SEVERITY_BG[sev], border:`1px solid ${SEVERITY_COLOR[sev]}25`, borderRadius:12, padding:'12px 16px', textAlign:'center' }}>
                      <div style={{ color:SEVERITY_COLOR[sev], fontWeight:900, fontSize:24 }}>{count}</div>
                      <div style={{ color:'#64748b', fontSize:12, fontWeight:600, marginTop:2 }}>{sev.toUpperCase()} severity</div>
                    </div>
                  );
                })}
              </div>
              {(biases||[]).sort((a,b) => {
                const order = { high:0, medium:1, low:2 };
                return (order[(a.severity||'medium').toLowerCase()]||1) - (order[(b.severity||'medium').toLowerCase()]||1);
              }).map((bias, i) => <BiasCard key={i} bias={bias} />)}
            </>
          )}
        </div>
      )}

      {/* ══════════════════════ COACHING ══════════════════════ */}
      {tab === 'coaching' && (
        <div style={{ animation:'fadein 0.3s ease' }}>
          {(coaching||[]).length === 0 ? (
            <div style={{ ...st.card, textAlign:'center', padding:40 }}>
              <div style={{ fontSize:40 }}>🤔</div>
              <p style={{ color:'#94a3b8', marginTop:8 }}>Trade more to receive personalized coaching.</p>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(340px,1fr))', gap:12 }}>
              {(coaching||[]).map((c, i) => <CoachingCard key={i} item={c} />)}
            </div>
          )}

          {/* CTA if new user */}
          {safe(sm?.totalTrades,0) < 3 && (
            <div style={{ ...st.card, textAlign:'center', padding:30, marginTop:16, background:'rgba(99,102,241,0.05)', borderColor:'rgba(99,102,241,0.3)' }}>
              <div style={{ fontSize:36, marginBottom:8 }}>🚀</div>
              <h3 style={{ marginBottom:8 }}>Unlock Full ML Analysis</h3>
              <p style={{ color:'#94a3b8', marginBottom:16 }}>Make at least 5 trades to unlock your personalized ML behavioral analysis and bias detection.</p>
              <button onClick={() => navigate('/stocks')}
                style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', padding:'11px 28px', borderRadius:10, cursor:'pointer', fontWeight:800, fontSize:14 }}>
                Start Trading →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════ DEEP ANALYSIS ══════════════════════ */}
      {tab === 'details' && (
        <div style={{ animation:'fadein 0.3s ease' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* Trading metrics */}
            <div style={st.card}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:16 }}>📊 Trading Metrics</div>
              <MetricBar label="Win Rate"          value={safe(f?.winRate,0)}           max={100} color="#10b981" suffix="%" />
              <MetricBar label="Avg Hold Days"     value={safe(f?.avgHoldDays,0)}        max={90}  color="#f59e0b" suffix="d" />
              <MetricBar label="Monthly Frequency" value={safe(f?.tradingFrequency,0)}   max={50}  color="#6366f1" />
              <MetricBar label="Portfolio Size"    value={safe(f?.numHoldings,0)}         max={20}  color="#8b5cf6" suffix=" stocks" />
              <MetricBar label="Profit Factor"     value={safe(f?.profitFactor,0)*50}     max={100} color="#06b6d4" />
            </div>

            {/* Risk indicators */}
            <div style={st.card}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:16 }}>⚡ Risk Indicators</div>
              <MetricBar label="Panic Sell Count"  value={safe(f?.panicSellCount,0)}      max={10} color="#ef4444" />
              <MetricBar label="Short-term Trades" value={safe(f?.shortTermTrades,0)}     max={20} color="#f59e0b" />
              <MetricBar label="Herd Behavior Days"value={safe(f?.herdDays,0)}            max={10} color="#8b5cf6" />
              <MetricBar label="Recency Bias Score"value={safe(f?.recencyBiasScore,0)}    max={100}color="#06b6d4" suffix="%" />
              <MetricBar label="Concentration Risk"value={safe(f?.maxPortfolioWeight,0)*100} max={100} color="#ef4444" suffix="%" />
            </div>

            {/* Raw features table */}
            <div style={{ ...st.card, gridColumn:'1/-1' }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:16 }}>🔬 Feature Breakdown</div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
                {[
                  { label:'Total Trades',         value: safe(f?.totalTrades,0) },
                  { label:'Buy Count',             value: safe(f?.buyCount,0) },
                  { label:'Sell Count',            value: safe(f?.sellCount,0) },
                  { label:'Avg Hold Days',         value: `${safe(f?.avgHoldDays,0)}d` },
                  { label:'Win Rate',              value: `${safe(f?.winRate,0)}%` },
                  { label:'Loss Rate',             value: `${safe(f?.lossRate,0)}%` },
                  { label:'Profit Factor',         value: safe(f?.profitFactor,0) },
                  { label:'Monthly Trades',        value: safe(f?.tradingFrequency,0) },
                  { label:'Weekly Trades',         value: safe(f?.avgTradesPerWeek,0) },
                  { label:'Short-term Trades',     value: safe(f?.shortTermTrades,0) },
                  { label:'Panic Sell Count',      value: safe(f?.panicSellCount,0) },
                  { label:'Sell After Loss',       value: safe(f?.sellAfterLoss,0) },
                  { label:'Hold After Loss',       value: safe(f?.holdAfterLoss,0) },
                  { label:'Herd Days',             value: safe(f?.herdDays,0) },
                  { label:'Recency Bias Score',    value: `${safe(f?.recencyBiasScore,0)}%` },
                  { label:'Max Portfolio Weight',  value: `${(safe(f?.maxPortfolioWeight,0)*100).toFixed(0)}%` },
                  { label:'Num Holdings',          value: safe(f?.numHoldings,0) },
                  { label:'Portfolio Value',       value: `₹${(safe(f?.totalPortfolioValue,0)).toLocaleString('en-IN')}` },
                ].map(item => (
                  <div key={item.label} style={{ background:'rgba(10,14,26,0.5)', borderRadius:8, padding:'10px 12px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ color:'#64748b', fontSize:12 }}>{item.label}</span>
                    <span style={{ color:'#e2e8f0', fontWeight:700, fontSize:12 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}