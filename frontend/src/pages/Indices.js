import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity } from 'lucide-react';

export default function Indices() {
  const [indices, setIndices] = useState({});
  const [intraday, setIntraday] = useState([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [idxRes, intRes] = await Promise.all([axios.get('/api/indices'), axios.get('/api/indices/intraday')]);
        setIndices(idxRes.data);
        setIntraday(intRes.data);
      } catch(e){}
    };
    fetch();
    const interval = setInterval(fetch, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="page-enter">
      <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
        <Activity size={28} style={{ color:'var(--accent-cyan)' }} /> Market Indices
      </h1>
      <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:28 }}>Live Indian & Global market indices. Updates every 15 seconds.</p>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px, 1fr))', gap:16, marginBottom:32 }}>
        {Object.entries(indices).map(([key, data]) => (
          <div key={key} className="glass glass-hover" style={{ borderRadius:16, padding:24, borderLeft:`4px solid ${data?.changePercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'}` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <p style={{ fontSize:12, color:'var(--text-muted)', marginBottom:6 }}>{data?.name || key}</p>
                <p style={{ fontSize:28, fontWeight:800, fontFamily:'var(--font-mono)' }}>{data?.value?.toLocaleString('en-IN')}</p>
              </div>
              <div style={{ textAlign:'right' }}>
                <span className={data?.changePercent >= 0 ? 'tag-up' : 'tag-down'} style={{ fontSize:14 }}>
                  {data?.changePercent >= 0 ? '▲' : '▼'} {Math.abs(data?.changePercent || 0).toFixed(2)}%
                </span>
                <p style={{ fontSize:12, color: data?.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginTop:4 }}>
                  {data?.change >= 0 ? '+' : ''}{data?.change?.toFixed(2)}
                </p>
              </div>
            </div>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:16, paddingTop:12, borderTop:'1px solid var(--border)' }}>
              <div>
                <p style={{ fontSize:10, color:'var(--text-muted)' }}>Open</p>
                <p style={{ fontSize:13, fontFamily:'var(--font-mono)' }}>{data?.open?.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p style={{ fontSize:10, color:'var(--text-muted)' }}>High</p>
                <p style={{ fontSize:13, fontFamily:'var(--font-mono)', color:'var(--accent-green)' }}>{data?.high?.toLocaleString('en-IN')}</p>
              </div>
              <div>
                <p style={{ fontSize:10, color:'var(--text-muted)' }}>Low</p>
                <p style={{ fontSize:13, fontFamily:'var(--font-mono)', color:'var(--accent-red)' }}>{data?.low?.toLocaleString('en-IN')}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Intraday Chart */}
      <div className="glass" style={{ borderRadius:16, padding:24 }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:700, marginBottom:20 }}>NIFTY 50 - Intraday</h3>
        <div style={{ position:'relative', height:200 }}>
          <svg width="100%" height="200" viewBox={`0 0 ${intraday.length} 200`} preserveAspectRatio="none">
            {intraday.length > 1 && (() => {
              const vals = intraday.map(p => p.value);
              const min = Math.min(...vals); const max = Math.max(...vals);
              const range = max - min || 1;
              const points = intraday.map((p, i) => `${i},${200 - ((p.value - min) / range) * 180}`).join(' ');
              const fillPoints = `0,200 ${points} ${intraday.length-1},200`;
              return (
                <>
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(0,212,255,0.4)" />
                      <stop offset="100%" stopColor="rgba(0,212,255,0)" />
                    </linearGradient>
                  </defs>
                  <polygon points={fillPoints} fill="url(#chartGrad)" />
                  <polyline points={points} fill="none" stroke="var(--accent-cyan)" strokeWidth="2" />
                </>
              );
            })()}
          </svg>
          <div style={{ position:'absolute', bottom:0, left:0, right:0, display:'flex', justifyContent:'space-between', padding:'0 8px' }}>
            {intraday.filter((_, i) => i % 60 === 0).slice(0, 6).map((p, i) => (
              <span key={i} style={{ fontSize:10, color:'var(--text-muted)' }}>{p.time}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
