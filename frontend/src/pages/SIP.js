import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const card = { background: 'rgba(26,31,53,0.6)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: 20 };
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

function parseReturnMidpoint(str) {
  const nums = String(str).match(/\d+(\.\d+)?/g)?.map(Number) || [];
  if (!nums.length) return 12;
  return +((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1));
}

export default function SIP() {
  const [presets, setPresets]   = useState(null);
  const [funds, setFunds]       = useState(null);
  const [tab, setTab]           = useState('calculator');

  const [monthlyAmount, setMonthlyAmount]   = useState(5000);
  const [years, setYears]                   = useState(10);
  const [expectedReturnPct, setReturn]      = useState(12);
  const [frequency, setFrequency]           = useState('monthly');
  const [stepUpPct, setStepUp]              = useState(0);
  const [inflationPct, setInflation]        = useState(0);
  const [result, setResult]                 = useState(null);
  const [loading, setLoading]               = useState(false);
  const [mySips, setMySips]                 = useState([]);
  const [starting, setStarting]             = useState(false);
  const [selectedType, setSelectedType]     = useState(null); // chosen fund category object

  const loadMySips = useCallback(() => {
    axios.get('/api/sip/my-sips').then(r => setMySips(r.data.sips || [])).catch(() => {});
  }, []);

  useEffect(() => { loadMySips(); }, [loadMySips]);

  const startInvestment = async () => {
    setStarting(true);
    try {
      const fundLabel = selectedType?.category
        || presets?.riskReturnRanges?.find(r => r.expectedReturnPct === expectedReturnPct)?.label
        || 'Custom SIP';
      const { data } = await axios.post('/api/sip/start', { monthlyAmount, expectedReturnPct, label: fundLabel });
      alert(data.message);
      loadMySips();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not start SIP');
    }
    setStarting(false);
  };

  const chooseType = (f) => {
    setSelectedType(f);
    setReturn(parseReturnMidpoint(f.historicalReturns.threeYear));
    if (monthlyAmount < f.minSip) setMonthlyAmount(f.minSip);
    setTab('calculator');
  };

  const stopSip = async (id) => {
    if (!window.confirm('Stop this SIP? No further installments will be deducted.')) return;
    try {
      await axios.post(`/api/sip/${id}/stop`);
      loadMySips();
    } catch (err) {
      alert(err.response?.data?.message || 'Could not stop SIP');
    }
  };

  useEffect(() => {
    axios.get('/api/sip/presets').then(r => setPresets(r.data)).catch(() => {});
    axios.get('/api/sip/funds').then(r => setFunds(r.data)).catch(() => {});
  }, []);

  const calculate = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.post('/api/sip/calculate', {
        monthlyAmount, years, expectedReturnPct, frequency, stepUpPct, inflationPct,
      });
      setResult(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not calculate');
    }
    setLoading(false);
  }, [monthlyAmount, years, expectedReturnPct, frequency, stepUpPct, inflationPct]);

  useEffect(() => { calculate(); }, [calculate]);

  const inputStyle = { width: '100%', padding: '10px 14px', background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#fff', fontSize: 14, boxSizing: 'border-box' };
  const labelStyle = { color: '#94a3b8', fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 };

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 20px', color: '#e2e8f0' }}>
      <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>💰 SIP Calculator</h1>
      <p style={{ color: '#94a3b8', margin: '0 0 20px' }}>Plan a Systematic Investment Plan — real compound-interest math, not guesses.</p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['calculator', '🧮 Calculator'], ['funds', '📊 Fund Categories']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: tab === id ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.1)', color: tab === id ? '#fff' : '#94a3b8' }}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'calculator' && (
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20 }}>
          <div style={card}>
            <div style={{ fontWeight: 800, marginBottom: 4 }}>Your SIP Plan</div>
            {selectedType && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: 12 }}>
                <span style={{ color: '#10b981', fontWeight: 700 }}>📌 {selectedType.category}</span>
                <button onClick={() => setSelectedType(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11 }}>Clear</button>
              </div>
            )}

            <label style={labelStyle}>Monthly Amount (₹)</label>
            <input type="number" value={monthlyAmount} onChange={e => setMonthlyAmount(Number(e.target.value))} style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {(presets?.amounts || [500, 1000, 2000, 5000, 10000]).map(a => (
                <button key={a} onClick={() => setMonthlyAmount(a)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)', background: monthlyAmount === a ? 'rgba(99,102,241,0.2)' : 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>
                  ₹{a}
                </button>
              ))}
            </div>

            <label style={labelStyle}>Duration (years)</label>
            <input type="number" value={years} onChange={e => setYears(Number(e.target.value))} style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {(presets?.durations || [1, 3, 5, 10, 15, 20]).map(y => (
                <button key={y} onClick={() => setYears(y)}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)', background: years === y ? 'rgba(99,102,241,0.2)' : 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>
                  {y}y
                </button>
              ))}
            </div>

            <label style={labelStyle}>Expected Annual Return (%)</label>
            <input type="number" value={expectedReturnPct} onChange={e => setReturn(Number(e.target.value))} style={{ ...inputStyle, marginBottom: 8 }} />
            <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
              {(presets?.riskReturnRanges || []).map(r => (
                <button key={r.profile} onClick={() => setReturn(r.expectedReturnPct)} title={r.note}
                  style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(99,102,241,0.25)', background: expectedReturnPct === r.expectedReturnPct ? 'rgba(99,102,241,0.2)' : 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>
                  {r.profile} ({r.expectedReturnPct}%)
                </button>
              ))}
            </div>

            <label style={labelStyle}>Frequency</label>
            <select value={frequency} onChange={e => setFrequency(e.target.value)} style={{ ...inputStyle, marginBottom: 14 }}>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="annual">Annual</option>
            </select>

            <label style={labelStyle}>Step-Up SIP (% increase / year, optional)</label>
            <input type="number" value={stepUpPct} onChange={e => setStepUp(Number(e.target.value))} style={{ ...inputStyle, marginBottom: 14 }} />

            <label style={labelStyle}>Inflation Adjustment (% / year, optional)</label>
            <input type="number" value={inflationPct} onChange={e => setInflation(Number(e.target.value))} style={{ ...inputStyle }} />
          </div>

          <div>
            {result && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
                  {[
                    { label: 'Total Invested', value: fmtINR(result.totalInvested), color: '#e2e8f0' },
                    { label: 'Estimated Returns', value: fmtINR(result.estimatedReturns), color: '#10b981' },
                    { label: 'Estimated Value', value: fmtINR(result.estimatedValue), color: '#6366f1' },
                  ].map((s, i) => (
                    <div key={i} style={card}>
                      <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, marginBottom: 8 }}>{s.label.toUpperCase()}</div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {result.inflationAdjustedValue && (
                  <div style={{ ...card, marginBottom: 16, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                    <div style={{ fontSize: 13, color: '#f59e0b' }}>
                      💡 In today's money (adjusted for {inflationPct}% inflation): <b>{fmtINR(result.inflationAdjustedValue)}</b>
                    </div>
                  </div>
                )}

                <div style={{ ...card, marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, marginBottom: 14 }}>Growth Over Time</div>
                  <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={result.chart}>
                      <defs>
                        <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
                      <XAxis dataKey="year" stroke="#64748b" tickFormatter={y => `Y${y}`} />
                      <YAxis stroke="#64748b" tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ background: '#161a2e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8 }}
                        formatter={(v) => fmtINR(v)} labelFormatter={y => `Year ${y}`} />
                      <Legend />
                      <Area type="monotone" dataKey="invested" name="Invested" stroke="#6366f1" fill="url(#investedGrad)" strokeWidth={2} />
                      <Area type="monotone" dataKey="value" name="Value" stroke="#10b981" fill="url(#valueGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                <div style={{ ...card, background: 'rgba(99,102,241,0.05)', fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>
                  ⚠️ {result.disclaimer}
                </div>

                <button onClick={startInvestment} disabled={starting}
                  style={{ width: '100%', padding: '14px', background: 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', borderRadius: 10, cursor: starting ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 15, opacity: starting ? 0.7 : 1 }}>
                  {starting ? 'Starting...' : `🚀 Start ${selectedType ? selectedType.category : 'This SIP'} — First Installment ₹${monthlyAmount}`}
                </button>
                <div style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginTop: 8 }}>
                  Deducts ₹{monthlyAmount} in virtual coins now; further monthly installments auto-process as real time passes.
                </div>

                {mySips.length > 0 && (
                  <div style={{ ...card, marginTop: 20 }}>
                    <div style={{ fontWeight: 800, marginBottom: 14 }}>📋 My Active SIPs</div>
                    {mySips.map(s => (
                      <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                        <div>
                          <div style={{ fontWeight: 700 }}>{s.label} <span style={{ color: s.status === 'active' ? '#10b981' : '#64748b', fontSize: 11, fontWeight: 700, marginLeft: 6 }}>{s.status.toUpperCase()}</span></div>
                          <div style={{ color: '#94a3b8', fontSize: 12 }}>₹{s.monthlyAmount}/mo · {s.installmentsPaid} installment(s) · Invested {fmtINR(s.totalInvested)}</div>
                        </div>
                        {s.status === 'active' && (
                          <button onClick={() => stopSip(s.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Stop</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {loading && !result && <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Calculating...</div>}
          </div>
        </div>
      )}

      {tab === 'funds' && funds && (
        <div>
          <div style={{ ...card, marginBottom: 16, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 12, color: '#f59e0b' }}>
            ⚠️ {funds.disclaimer}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px,1fr))', gap: 16 }}>
            {funds.categories.map((f, i) => (
              <div key={i} style={card}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>{f.category}</div>
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 12 }}>e.g. {f.fundHouseExamples.join(', ')}</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>{f.riskLevel} Risk</span>
                  <span style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>Min SIP ₹{f.minSip}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12, fontSize: 12 }}>
                  <div><span style={{ color: '#64748b' }}>3Y: </span><b>{f.historicalReturns.threeYear}</b></div>
                  <div><span style={{ color: '#64748b' }}>5Y: </span><b>{f.historicalReturns.fiveYear}</b></div>
                  <div style={{ gridColumn: '1/-1' }}><span style={{ color: '#64748b' }}>Expense ratio: </span><b>{f.expenseRatioRange}</b></div>
                </div>
                <p style={{ color: '#94a3b8', fontSize: 12, margin: '0 0 12px' }}>{f.note}</p>
                <button onClick={() => chooseType(f)}
                  style={{ width: '100%', padding: '10px', background: selectedType?.category === f.category ? 'linear-gradient(135deg,#10b981,#059669)' : 'rgba(99,102,241,0.15)', border: 'none', color: selectedType?.category === f.category ? '#fff' : '#818cf8', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 12 }}>
                  {selectedType?.category === f.category ? '✓ Selected — Go to Calculator' : `Invest in ${f.category} →`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}