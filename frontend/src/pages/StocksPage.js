import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { stocksAPI } from '../services/api';

export default function StocksPage() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [sectors, setSectors] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const loadStocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stocksAPI.getAll({ page, limit: 30, search, sector });
      setStocks(res.data.data || []);
      setTotal(res.data.total || 0);
    } catch (e) {}
    setLoading(false);
  }, [page, search, sector]);

  useEffect(() => { loadStocks(); }, [loadStocks]);
  useEffect(() => {
    stocksAPI.getSectors().then(r => setSectors(r.data.sectors || [])).catch(() => {});
  }, []);

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>📈 Stock Market</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Browse {total}+ stocks with live NSE/BSE prices</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <input placeholder="🔍 Search stocks..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ maxWidth: 280 }} />
        <select value={sector} onChange={e => { setSector(e.target.value); setPage(1); }} style={{ maxWidth: 200 }}>
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-primary" onClick={loadStocks} style={{ padding: '10px 20px' }}>Refresh</button>
      </div>

      {/* Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
                {['#', 'Company', 'Symbol', 'Price', 'Change', '% Change', 'High', 'Low', 'Sector', 'Action'].map(h => (
                  <th key={h} style={{ padding: '14px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(15).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={10} style={{ padding: 8 }}><div className="skeleton" style={{ height: 36 }} /></td></tr>
              )) : stocks.map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px', color: 'var(--text-muted)', width: 40 }}>{(page-1)*30 + i + 1}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{s.exchange}</div>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>{s.symbol?.replace('.NS', '')}</td>
                  <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', fontWeight: 700 }}>₹{s.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 }) || '--'}</td>
                  <td style={{ padding: '12px', color: (s.change || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                    {(s.change || 0) >= 0 ? '+' : ''}{(s.change || 0).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span className={`badge ${(s.changePercent || 0) >= 0 ? 'badge-green' : 'badge-red'}`}>
                      {(s.changePercent || 0) >= 0 ? '▲' : '▼'} {Math.abs(s.changePercent || 0).toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-secondary)' }}>₹{s.high?.toFixed(0) || '--'}</td>
                  <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-secondary)' }}>₹{s.low?.toFixed(0) || '--'}</td>
                  <td style={{ padding: '12px' }}><span className="badge badge-blue" style={{ fontSize: 11 }}>{s.sector}</span></td>
                  <td style={{ padding: '12px' }}>
                    <Link to={`/stocks/${s.symbol}`} className="btn-primary" style={{ padding: '7px 16px', fontSize: 13, textDecoration: 'none', display: 'inline-block' }}>View</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Showing {stocks.length} of {total} stocks</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1} className="btn-primary" style={{ padding: '8px 16px', opacity: page === 1 ? 0.5 : 1 }}>← Prev</button>
            <span style={{ padding: '8px 16px', fontFamily: 'JetBrains Mono', color: 'var(--text-secondary)' }}>Page {page}</span>
            <button onClick={() => setPage(p => p+1)} disabled={stocks.length < 30} className="btn-primary" style={{ padding: '8px 16px', opacity: stocks.length < 30 ? 0.5 : 1 }}>Next →</button>
          </div>
        </div>
      </div>
    </div>
  );
}
