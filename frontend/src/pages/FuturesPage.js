import React, { useState, useEffect } from 'react';
import { futuresAPI } from '../services/api';

export default function FuturesPage() {
  const [futures, setFutures] = useState([]);
  const [options, setOptions] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState('NIFTY');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('futures');

  useEffect(() => {
    futuresAPI.getAll().then(r => { setFutures(r.data.data || []); setLoading(false); });
  }, []);

  const loadOptions = async (symbol) => {
    setSelectedSymbol(symbol);
    setActiveTab('options');
    const res = await futuresAPI.getOptions(symbol);
    setOptions(res.data.data || []);
  };

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>⚡ Futures & Options</h1>
        <p style={{ color: 'var(--text-secondary)' }}>F&O market data — for educational and practice purposes</p>
      </div>

      {/* Info Banner */}
      <div style={{ padding: '14px 20px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div style={{ fontSize: 14, color: '#f59e0b', lineHeight: 1.5 }}>
          <strong>Educational Mode:</strong> F&O data shown is for learning purposes. Real F&O trading requires broker registration and involves significant risk.
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['futures', 'options'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', fontWeight: 600, fontSize: 14,
            border: activeTab === tab ? '1px solid #3b82f6' : '1px solid var(--border)',
            background: activeTab === tab ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: activeTab === tab ? '#3b82f6' : 'var(--text-secondary)', transition: 'all 0.2s', textTransform: 'uppercase'
          }}>{tab}</button>
        ))}
      </div>

      {activeTab === 'futures' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ fontWeight: 700 }}>Active Futures Contracts</h3>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['Symbol', 'LTP', 'Change', 'Expiry', 'Lot Size', 'OI', 'Margin Req', 'Options Chain'].map(h => (
                    <th key={h} style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? Array(8).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={8} style={{ padding: 8 }}><div className="skeleton" style={{ height: 36 }} /></td></tr>
                )) : futures.map((f, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '12px', fontWeight: 700 }}>{f.symbol}</td>
                    <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>₹{f.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                    <td style={{ padding: '12px', color: (f.change || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                      {(f.change || 0) >= 0 ? '+' : ''}{f.change?.toFixed(2)} ({f.changePercent?.toFixed(2)}%)
                    </td>
                    <td style={{ padding: '12px', color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(f.expiry).toLocaleDateString('en-IN')}</td>
                    <td style={{ padding: '12px', fontFamily: 'JetBrains Mono' }}>{f.lotSize}</td>
                    <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{(f.oi / 100000).toFixed(2)}L</td>
                    <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', color: '#f59e0b' }}>₹{f.marginRequired?.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px' }}>
                      <button onClick={() => loadOptions(f.symbol)} className="btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>View Chain</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'options' && (
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 700 }}>Options Chain — {selectedSymbol}</h3>
            <select value={selectedSymbol} onChange={e => loadOptions(e.target.value)} style={{ maxWidth: 160 }}>
              {['NIFTY', 'BANKNIFTY', 'RELIANCE', 'TCS', 'INFY'].map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  <th colSpan={4} style={{ padding: '10px', textAlign: 'center', color: '#3b82f6', borderRight: '2px solid var(--border)' }}>CALLS</th>
                  <th style={{ padding: '10px', textAlign: 'center', background: 'rgba(59,130,246,0.1)' }}>STRIKE</th>
                  <th colSpan={4} style={{ padding: '10px', textAlign: 'center', color: '#8b5cf6', borderLeft: '2px solid var(--border)' }}>PUTS</th>
                </tr>
                <tr style={{ background: 'var(--bg-secondary)' }}>
                  {['OI', 'Volume', 'IV', 'Premium', 'STRIKE PRICE', 'Premium', 'IV', 'Volume', 'OI'].map((h, i) => (
                    <th key={i} style={{ padding: '8px 10px', textAlign: 'center', color: 'var(--text-secondary)', fontWeight: 500, fontSize: 11, background: i === 4 ? 'rgba(59,130,246,0.1)' : 'transparent' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {options.map((opt, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: opt.isATM ? 'rgba(59,130,246,0.06)' : 'transparent' }}>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{(opt.callOI/1000).toFixed(0)}K</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{opt.callVolume}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{opt.callIV}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#3b82f6', fontFamily: 'JetBrains Mono' }}>₹{opt.callPremium}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, background: opt.isATM ? 'rgba(59,130,246,0.15)' : 'var(--bg-secondary)', borderLeft: '2px solid var(--border)', borderRight: '2px solid var(--border)', fontFamily: 'JetBrains Mono' }}>{opt.strike.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#8b5cf6', fontFamily: 'JetBrains Mono' }}>₹{opt.putPremium}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{opt.putIV}%</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{opt.putVolume}</td>
                    <td style={{ padding: '8px 10px', textAlign: 'center', fontFamily: 'JetBrains Mono', fontSize: 12 }}>{(opt.putOI/1000).toFixed(0)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
