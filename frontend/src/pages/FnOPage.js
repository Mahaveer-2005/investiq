import React, { useEffect, useState } from 'react';
import API from '../utils/api';

export default function FnOPage() {
  const [tab, setTab] = useState('options');
  const [fnoStocks, setFnoStocks] = useState([]);
  const [selectedStock, setSelectedStock] = useState('');
  const [optionChain, setOptionChain] = useState(null);
  const [futures, setFutures] = useState([]);

  useEffect(() => {
    API.get('/fno/stocks').then(r => { setFnoStocks(r.data.stocks || []); if (r.data.stocks?.[0]) setSelectedStock(r.data.stocks[0].symbol); });
    API.get('/fno/futures').then(r => setFutures(r.data.futures || []));
  }, []);

  useEffect(() => {
    if (selectedStock) API.get('/fno/options', { params: { symbol: selectedStock } }).then(r => setOptionChain(r.data));
  }, [selectedStock]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 4 }}>📊 Futures & Options</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Option chains, futures data, and derivatives learning</p>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['options', '📊 Option Chain'], ['futures', '📈 Futures']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '9px 20px', borderRadius: 10, border: tab === t ? '1px solid var(--accent-blue)' : '1px solid var(--border)', background: tab === t ? 'rgba(59,130,246,0.15)' : 'transparent', color: tab === t ? 'var(--accent-blue)' : 'var(--text-secondary)', cursor: 'pointer', fontWeight: 700, fontSize: 14 }}>{label}</button>
        ))}
      </div>

      {tab === 'options' && (
        <div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={selectedStock} onChange={e => setSelectedStock(e.target.value)} className="input-field" style={{ maxWidth: 280 }}>
              {fnoStocks.map(s => <option key={s.symbol} value={s.symbol}>{s.name} ({s.symbol})</option>)}
            </select>
            {optionChain && (
              <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>SPOT </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 18 }}>₹{optionChain.spot?.toFixed(2)}</span>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '8px 16px', borderRadius: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>EXPIRY </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-gold)' }}>{optionChain.expiry}</span>
                </div>
              </div>
            )}
          </div>

          {optionChain && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      <th colSpan={5} style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--accent-green)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>CALLS</th>
                      <th style={{ padding: '10px 16px', textAlign: 'center', background: 'rgba(245,158,11,0.1)', color: 'var(--accent-gold)', fontWeight: 800, borderBottom: '1px solid var(--border)' }}>STRIKE</th>
                      <th colSpan={5} style={{ padding: '10px 16px', textAlign: 'center', color: 'var(--accent-red)', fontWeight: 700, borderBottom: '1px solid var(--border)' }}>PUTS</th>
                    </tr>
                    <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                      {['OI', 'Volume', 'IV', 'Delta', 'Premium', '', 'Premium', 'Delta', 'IV', 'Volume', 'OI'].map((h, i) => (
                        <th key={i} style={{ padding: '8px 10px', color: 'var(--text-muted)', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {optionChain.optionChain?.map((row, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: row.isATM ? 'rgba(245,158,11,0.07)' : 'transparent' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.callOI?.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.callVolume?.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--accent-green)' }}>{row.callIV?.toFixed(1)}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.callDelta?.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-green)' }}>₹{row.callPremium?.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 800, color: row.isATM ? 'var(--accent-gold)' : 'var(--text-primary)', background: row.isATM ? 'rgba(245,158,11,0.1)' : 'transparent', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>{row.strike}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-red)' }}>₹{row.putPremium?.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.putDelta?.toFixed(2)}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--accent-red)' }}>{row.putIV?.toFixed(1)}%</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.putVolume?.toLocaleString()}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-secondary)' }}>{row.putOI?.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'futures' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                {['Stock', 'Spot Price', 'Futures Price', 'Premium', 'Change', 'Lot Size', 'Open Interest'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {futures.map(f => {
                const premium = f.futures - f.spot;
                return (
                  <tr key={f.symbol} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{f.name?.split(' ').slice(0,2).join(' ')}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{f.symbol}</div>
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700 }}>₹{f.spot?.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-cyan)' }}>₹{f.futures?.toFixed(2)}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: premium >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {premium >= 0 ? '+' : ''}{premium?.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: (f.changePercent || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {(f.changePercent || 0) >= 0 ? '▲' : '▼'} {Math.abs(f.changePercent || 0).toFixed(2)}%
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{f.lotSize}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{(f.oi / 1000000).toFixed(2)}M</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
