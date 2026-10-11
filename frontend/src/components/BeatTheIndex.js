import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const card = { background: 'rgba(26,31,53,0.6)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 16, padding: 20 };
const fmtINR = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function BeatTheIndex() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/benchmark/beat-the-index')
      .then(r => setData(r.data))
      .catch(() => setData({ hasData: false, message: 'Could not load benchmark right now.' }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div style={{ ...card, textAlign: 'center', color: '#64748b', padding: 40 }}>Comparing your trades against Nifty 50...</div>;
  }

  if (!data?.hasData) {
    return (
      <div style={{ ...card, textAlign: 'center', color: '#94a3b8', padding: 30 }}>
        📊 <b style={{ color: '#e2e8f0' }}>Beat the Index</b>
        <p style={{ fontSize: 13, marginTop: 8 }}>{data?.message}</p>
      </div>
    );
  }

  const won = data.beatIndex;

  return (
    <div style={{ ...card, border: won ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(239,68,68,0.3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>📊 Beat the Index</div>
        <div style={{ fontSize: 11, padding: '4px 10px', borderRadius: 6, fontWeight: 700,
          background: won ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: won ? '#10b981' : '#ef4444' }}>
          {won ? '🏆 YOU BEAT NIFTY' : '📉 NIFTY BEAT YOU'}
        </div>
      </div>
      <p style={{ color: '#94a3b8', fontSize: 13, marginBottom: 18 }}>
        You've invested <b style={{ color: '#e2e8f0' }}>{fmtINR(data.totalInvested)}</b> in real trades.
        {' '}Here's how that actually did vs. just buying Nifty 50 on the same dates.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 18 }}>
        <div style={{ background: 'rgba(10,14,26,0.5)', borderRadius: 10, padding: 14 }}>
          <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>YOUR ACTUAL RESULT</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: data.actualReturnPct >= 0 ? '#10b981' : '#ef4444' }}>
            {data.actualReturnPct >= 0 ? '+' : ''}{data.actualReturnPct}%
          </div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{fmtINR(data.actualValueToday)} today</div>
        </div>
        <div style={{ background: 'rgba(10,14,26,0.5)', borderRadius: 10, padding: 14 }}>
          <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, marginBottom: 6 }}>IF YOU'D BOUGHT NIFTY</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#6366f1' }}>
            {data.niftyReturnPct >= 0 ? '+' : ''}{data.niftyReturnPct}%
          </div>
          <div style={{ color: '#64748b', fontSize: 11, marginTop: 4 }}>{fmtINR(data.niftyEquivalentValueToday)} today</div>
        </div>
      </div>

      <div style={{ background: won ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${won ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`, borderRadius: 10, padding: '12px 16px', marginBottom: 18, fontSize: 14, fontWeight: 600, color: won ? '#10b981' : '#ef4444' }}>
        {won
          ? `🎉 You outperformed a simple Nifty 50 buy-and-hold by ${Math.abs(data.gapPct)} points.`
          : `The index beat your actual trading by ${Math.abs(data.gapPct)} points — most active traders underperform a simple index. This is worth reflecting on.`}
      </div>

      {data.timeline?.length > 1 && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={data.timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
            <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} width={50} />
            <Tooltip contentStyle={{ background: 'rgba(13,17,35,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, fontSize: 11 }}
              formatter={(v, name) => [fmtINR(v), name]} />
            <Line type="monotone" dataKey="cumulativeInvested" name="Invested" stroke="#94a3b8" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="cumulativeNiftyValue" name="Nifty equivalent" stroke="#6366f1" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}

      <div style={{ color: '#64748b', fontSize: 11, marginTop: 14, lineHeight: 1.5 }}>
        ℹ️ {data.disclaimer}
      </div>
    </div>
  );
}