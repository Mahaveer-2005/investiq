import React, { useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const card = { background: 'rgba(26,31,53,0.6)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: 20 };
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function Advisor() {
  const [amount, setAmount] = useState(5000);
  const [riskProfile, setRiskProfile] = useState('moderate');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyze = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await axios.post('/api/advisor/analyze', { amount, riskProfile }, { timeout: 30000 });
      setResult(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not generate analysis — please try again.');
    }
    setLoading(false);
  };

  const profiles = [
    { key: 'conservative', label: 'Conservative', icon: '🛡️', desc: 'Prioritizes stability — lower expected swings, lower expected growth.' },
    { key: 'moderate',     label: 'Moderate',     icon: '⚖️', desc: 'Balanced mix of stability and growth.' },
    { key: 'aggressive',   label: 'Aggressive',   icon: '🚀', desc: 'Prioritizes growth potential — accepts materially higher volatility.' },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 20px', color: '#e2e8f0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>🎯 What Should I Invest In?</h1>
      <p style={{ color: '#94a3b8', margin: '0 0 20px' }}>Enter an amount, pick a risk profile, and get an educational allocation illustration based on real fundamentals and live prices.</p>

      <div style={{ ...card, marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'end' }}>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Amount to Invest (₹)</label>
            <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))}
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 700, boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Risk Profile</label>
            <div style={{ display: 'flex', gap: 10 }}>
              {profiles.map(p => (
                <button key={p.key} onClick={() => setRiskProfile(p.key)} title={p.desc}
                  style={{ flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    border: riskProfile === p.key ? '2px solid #6366f1' : '1px solid rgba(99,102,241,0.2)',
                    background: riskProfile === p.key ? 'rgba(99,102,241,0.15)' : 'rgba(10,14,26,0.5)',
                    color: riskProfile === p.key ? '#818cf8' : '#94a3b8' }}>
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <button onClick={analyze} disabled={loading || amount < 500}
          style={{ marginTop: 16, width: '100%', padding: '14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', borderRadius: 10, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 15, opacity: loading ? 0.7 : 1 }}>
          {loading ? '🔍 Analyzing real market data...' : '🔍 Analyze'}
        </button>
        {amount < 500 && <div style={{ color: '#f59e0b', fontSize: 12, marginTop: 8 }}>Minimum ₹500</div>}
      </div>

      {error && <div style={{ ...card, background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#ef4444', marginBottom: 20 }}>{error}</div>}

      {result && (
        <>
          {result.aiExplanation && (
            <div style={{ ...card, marginBottom: 20, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>🤖 AI Summary</div>
              <p style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.6, margin: '0 0 10px' }}>{result.aiExplanation.summary}</p>
              {result.aiExplanation.keyRisk && (
                <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#f59e0b' }}>
                  ⚠️ Key risk: {result.aiExplanation.keyRisk}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Total Invested', value: fmtINR(result.totalInvested) },
              { label: 'Cash Reserve', value: fmtINR(result.cashReserve) },
              { label: 'Diversification', value: `${result.diversificationScore}/100` },
              { label: 'Risk Score', value: `${result.riskScore}/100` },
            ].map((s, i) => (
              <div key={i} style={card}>
                <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, marginBottom: 6 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontSize: 20, fontWeight: 900 }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, marginBottom: 14 }}>📦 Suggested Allocation</div>
            {result.allocation.map((a, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < result.allocation.length - 1 ? '1px solid rgba(99,102,241,0.1)' : 'none' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{a.name} <span style={{ color: '#64748b', fontWeight: 400, fontSize: 12 }}>({a.sector})</span></div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>{a.rationale}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 800 }}>{fmtINR(a.allocatedAmount)}</div>
                  <div style={{ color: '#64748b', fontSize: 11 }}>{a.quantity} × ₹{a.currentPrice}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ ...card, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>📈 Future Value Scenarios</div>
            <div style={{ color: '#64748b', fontSize: 12, marginBottom: 14 }}>Illustrative — not a prediction. Bear/Base/Bull assume different constant annual growth rates.</div>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={result.scenarios}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                <XAxis dataKey="horizon" stroke="#64748b" />
                <YAxis stroke="#64748b" tickFormatter={v => `₹${(v/1000).toFixed(1)}k`} />
                <Tooltip contentStyle={{ background: '#161a2e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8 }} formatter={v => fmtINR(v)} />
                <Legend />
                <Line type="monotone" dataKey="bull" name="Bull" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="base" name="Base" stroke="#6366f1" strokeWidth={2} />
                <Line type="monotone" dataKey="bear" name="Bear" stroke="#ef4444" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8, marginTop: 16 }}>
              {result.scenarios.map((s, i) => (
                <div key={i} style={{ background: 'rgba(10,14,26,0.5)', borderRadius: 8, padding: 10, textAlign: 'center' }}>
                  <div style={{ color: '#64748b', fontSize: 10, marginBottom: 6 }}>{s.horizon}</div>
                  <div style={{ color: '#10b981', fontSize: 11 }}>Bull {fmtINR(s.bull)}</div>
                  <div style={{ color: '#6366f1', fontSize: 11 }}>Base {fmtINR(s.base)}</div>
                  <div style={{ color: '#ef4444', fontSize: 11 }}>Bear {fmtINR(s.bear)}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ ...card, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#f59e0b' }}>
            ⚠️ {result.disclaimer}
          </div>
        </>
      )}
    </div>
  );
}