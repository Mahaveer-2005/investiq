import React, { useState, useEffect } from 'react';
import { futuresAPI } from '../services/api';

export default function FuturesOptions() {
  const [futures, setFutures] = useState([]);
  const [options, setOptions] = useState([]);
  const [tab, setTab] = useState('futures');

  useEffect(() => {
    futuresAPI.getFutures().then(setFutures).catch(() => {});
    futuresAPI.getOptions().then(setOptions).catch(() => {});
    const interval = setInterval(() => {
      futuresAPI.getFutures().then(setFutures).catch(() => {});
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ animation: 'slideUp 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, marginBottom: 6 }}>📊 Futures & Options</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Trade derivatives with virtual coins in a risk-free environment</p>
      </div>

      <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: 14, marginBottom: 24, fontSize: 13, color: 'var(--accent-orange)' }}>
        ⚠️ <strong>Educational Mode:</strong> F&O trading carries significant risk. Practice with virtual coins to learn before real trading.
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['futures', '📈 Futures'], ['options', '⚙️ Options Chain']].map(([val, label]) => (
          <button key={val} onClick={() => setTab(val)} className={tab === val ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 18px', fontSize: 13 }}>{label}</button>
        ))}
      </div>

      {tab === 'futures' ? (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
              <tr>{['Contract', 'Type', 'Price', 'Change', 'Lot Size', 'Expiry', 'Action'].map(h => <th key={h} style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {futures.map((f, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 13 }}>{f.symbol}</td>
                  <td style={{ padding: '12px 16px' }}><span className={`badge ${f.type==='INDEX'?'badge-blue':'badge-green'}`} style={{ fontSize: 10 }}>{f.type}</span></td>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>₹{f.price?.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', color: f.changePercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 12, fontWeight: 600 }}>
                    {f.changePercent >= 0 ? '▲' : '▼'} {Math.abs(f.changePercent||0).toFixed(2)}%
                  </td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 13 }}>{f.lotSize}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{f.expiry}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button style={{ padding: '4px 12px', background: 'rgba(0,212,170,0.15)', color: 'var(--accent-green)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }}>BUY</button>
                      <button style={{ padding: '4px 12px', background: 'rgba(239,68,68,0.15)', color: 'var(--accent-red)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }}>SELL</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
              <tr>{['Symbol', 'Type', 'Strike', 'Premium', 'Change', 'OI', 'IV', 'Action'].map(h => <th key={h} style={{ textAlign: 'left', padding: '14px 16px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {options.map((o, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', background: o.type === 'CE' ? 'rgba(0,212,170,0.02)' : 'rgba(239,68,68,0.02)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 12 }}>{o.symbol}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ background: o.type === 'CE' ? 'rgba(0,212,170,0.15)' : 'rgba(239,68,68,0.15)', color: o.type === 'CE' ? 'var(--accent-green)' : 'var(--accent-red)', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>{o.type}</span>
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, fontSize: 13 }}>₹{o.strike}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600 }}>₹{o.premium?.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', color: o.change >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 12 }}>{o.change >= 0 ? '▲' : '▼'} ₹{Math.abs(o.change||0).toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontSize: 12 }}>{(o.oi/1000).toFixed(0)}K</td>
                  <td style={{ padding: '12px 16px', color: 'var(--accent-orange)', fontSize: 12 }}>{o.iv}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <button style={{ padding: '4px 10px', background: o.type === 'CE' ? 'rgba(0,212,170,0.15)' : 'rgba(239,68,68,0.15)', color: o.type === 'CE' ? 'var(--accent-green)' : 'var(--accent-red)', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Space Grotesk, sans-serif' }}>Buy</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
