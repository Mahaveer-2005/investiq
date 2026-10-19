import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';

export default function Stocks() {
  const [stocks, setStocks] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [sectors, setSectors] = useState([]);
  const [indices, setIndices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('');
  const [indexFilter, setIndexFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (search) params.set('search', search);
      if (sector) params.set('sector', sector);
      if (indexFilter) params.set('index', indexFilter);
      const res = await axios.get(`/api/stocks?${params}`);
      const d = res.data;
      // Handle both old array response and new object response
      if (Array.isArray(d)) {
        setStocks(d);
        setTotal(d.length);
        setPages(1);
        const secs = [...new Set(d.map(s => s.sector))].sort();
        setSectors(secs);
        setIndices([]);
      } else {
        setStocks(Array.isArray(d.stocks) ? d.stocks : []);
        setTotal(d.total || 0);
        setPages(d.pages || 1);
        setSectors(Array.isArray(d.sectors) ? d.sectors : []);
        setIndices(Array.isArray(d.indices) ? d.indices : []);
      }
    } catch (err) {
      console.error('Stocks fetch error:', err);
      setStocks([]);
    }
    setLoading(false);
  }, [page, search, sector, indexFilter]);

  useEffect(() => { fetchStocks(); }, [fetchStocks]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const clearFilters = () => {
    setSearch(''); setSearchInput('');
    setSector(''); setIndexFilter('');
    setPage(1);
  };

  const indexColors = {
    NIFTY50: '#6366f1', NIFTYNEXT50: '#8b5cf6',
    MIDCAP: '#06b6d4', SMALLCAP: '#10b981', FNO: '#f59e0b'
  };

  const s = {
    page: { padding: 24, maxWidth: 1400, margin: '0 auto' },
    badge: (active, color = '#6366f1') => ({
      padding: '6px 14px', borderRadius: 20,
      border: `1px solid ${active ? color : 'rgba(99,102,241,0.25)'}`,
      background: active ? `${color}22` : 'rgba(26,31,53,0.6)',
      color: active ? color : '#94a3b8',
      cursor: 'pointer', fontSize: 13,
      fontWeight: active ? 700 : 400, whiteSpace: 'nowrap'
    }),
    table: { width: '100%', borderCollapse: 'collapse' },
    th: {
      padding: '12px 16px', textAlign: 'left', color: '#64748b',
      fontSize: 11, fontWeight: 700,
      borderBottom: '1px solid rgba(99,102,241,0.15)',
      textTransform: 'uppercase', letterSpacing: 0.5
    },
    td: { padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14 },
    pos: { color: '#10b981', fontWeight: 700 },
    neg: { color: '#ef4444', fontWeight: 700 },
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 4 }}>📈 Stock Market</h1>
        <p style={{ color: '#94a3b8' }}>
          {total} stocks · NSE/BSE · Invest with virtual coins
        </p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          style={{
            flex: 1, minWidth: 220, maxWidth: 360,
            padding: '11px 16px',
            background: 'rgba(26,31,53,0.8)',
            border: '1px solid rgba(99,102,241,0.3)',
            borderRadius: 10, color: '#e2e8f0', fontSize: 14, outline: 'none'
          }}
          placeholder="🔍 Search by name or symbol..."
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <button type="submit" style={{
          padding: '11px 22px', background: '#6366f1',
          border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, cursor: 'pointer'
        }}>Search</button>
        {(search || sector || indexFilter) && (
          <button type="button" onClick={clearFilters} style={{
            padding: '11px 16px',
            background: 'rgba(239,68,68,0.15)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, color: '#ef4444', cursor: 'pointer', fontSize: 13
          }}>✕ Clear Filters</button>
        )}
      </form>

      {/* Index filter */}
      {indices.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <button style={s.badge(!indexFilter)} onClick={() => { setIndexFilter(''); setPage(1); }}>
            All ({total})
          </button>
          {indices.map(idx => (
            <button key={idx}
              style={s.badge(indexFilter === idx, indexColors[idx] || '#6366f1')}
              onClick={() => { setIndexFilter(indexFilter === idx ? '' : idx); setPage(1); }}>
              {idx}
            </button>
          ))}
        </div>
      )}

      {/* Sector filter */}
      {sectors.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {sectors.slice(0, 20).map(sec => (
            <button key={sec}
              style={s.badge(sector === sec)}
              onClick={() => { setSector(sector === sec ? '' : sec); setPage(1); }}>
              {sec}
            </button>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{
        background: 'rgba(26,31,53,0.8)',
        border: '1px solid rgba(99,102,241,0.15)',
        borderRadius: 16, overflowX: 'auto', overflowY: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            <div style={{
              width: 40, height: 40,
              border: '3px solid rgba(99,102,241,0.3)',
              borderTop: '3px solid #6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px'
            }} />
            <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
            Loading {total || '500+'} stocks...
          </div>
        ) : stocks.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
            No stocks found. Try clearing filters.
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr style={{ background: 'rgba(10,14,26,0.5)' }}>
                <th style={s.th}>#</th>
                <th style={s.th}>Company</th>
                <th style={s.th}>Symbol</th>
                <th style={s.th}>Index</th>
                <th style={s.th}>Sector</th>
                <th style={s.th}>Price</th>
                <th style={s.th}>Change</th>
                <th style={s.th}>Volume</th>
                <th style={s.th}>Data</th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {stocks.map((stock, i) => (
                <tr key={`${stock.symbol}-${i}`}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(99,102,241,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  style={{ transition: 'background 0.15s' }}>
                  <td style={{ ...s.td, color: '#475569', fontSize: 12 }}>
                    {(page - 1) * 50 + i + 1}
                  </td>
                  <td style={s.td}>
                    <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{stock.name}</div>
                  </td>
                  <td style={s.td}>
                    <span style={{ color: '#6366f1', fontWeight: 700, fontSize: 13 }}>
                      {stock.nsSymbol || stock.symbol?.replace('.BSE', '')}
                    </span>
                  </td>
                  <td style={s.td}>
                    {stock.index && (
                      <span style={{
                        background: `${indexColors[stock.index] || '#6366f1'}22`,
                        color: indexColors[stock.index] || '#6366f1',
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700
                      }}>{stock.index}</span>
                    )}
                  </td>
                  <td style={s.td}>
                    <span style={{
                      background: 'rgba(99,102,241,0.1)', color: '#818cf8',
                      padding: '2px 8px', borderRadius: 4, fontSize: 12
                    }}>{stock.sector}</span>
                  </td>
                  <td style={{ ...s.td, fontWeight: 700 }}>
                    {Number(stock.price) > 0
                      ? `₹${Number(stock.price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : <span style={{ color: '#94a3b8', fontWeight: 500 }}>Price unavailable</span>}
                  </td>
                  <td style={s.td}>
                    {Number(stock.price) > 0 ? (
                      <span style={(stock.change || 0) >= 0 ? s.pos : s.neg}>
                        {(stock.change || 0) >= 0 ? '▲' : '▼'} {Math.abs(Number(stock.changePct ?? stock.changePercent ?? 0)).toFixed(2)}%
                      </span>
                    ) : <span style={{ color: '#64748b' }}>—</span>}
                  </td>
                  <td style={{ ...s.td, color: '#64748b', fontSize: 12 }}>
                    {stock.volume > 0 ? `${(stock.volume / 100000).toFixed(1)}L` : '—'}
                  </td>
                  <td style={s.td}>
                    <span style={{
                      fontSize: 10, padding: '2px 6px', borderRadius: 4,
                      color: stock.source?.includes('Yahoo') ? '#10b981'
                        : stock.source?.includes('Alpha') ? '#06b6d4' : '#64748b',
                      background: stock.source?.includes('Yahoo') ? 'rgba(16,185,129,0.1)'
                        : stock.source?.includes('Alpha') ? 'rgba(6,182,212,0.1)' : 'rgba(100,116,139,0.1)'
                    }}>
                      {Number(stock.price) <= 0 ? 'Unavailable'
                        : stock.source?.includes('Yahoo') ? '🟢 Live'
                        : stock.source?.includes('Alpha') ? '🔵 Live' : '⚪ Sim'}
                    </span>
                  </td>
                  <td style={s.td}>
                    <Link
                      to={`/stocks/${encodeURIComponent(stock.symbol)}`}
                      style={{
                        background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                        color: '#fff', padding: '6px 14px',
                        borderRadius: 8, textDecoration: 'none',
                        fontSize: 12, fontWeight: 700
                      }}>
                      Trade
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24, alignItems: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => setPage(1)} disabled={page === 1}
            style={{ padding: '8px 12px', background: 'rgba(26,31,53,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: page === 1 ? '#475569' : '#e2e8f0', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>«</button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '8px 14px', background: 'rgba(26,31,53,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: page === 1 ? '#475569' : '#e2e8f0', cursor: page === 1 ? 'not-allowed' : 'pointer' }}>‹ Prev</button>

          {Array.from({ length: Math.min(7, pages) }, (_, i) => {
            let p;
            if (page <= 4) p = i + 1;
            else if (page >= pages - 3) p = pages - 6 + i;
            else p = page - 3 + i;
            if (p < 1 || p > pages) return null;
            return (
              <button key={p} onClick={() => setPage(p)} style={{
                padding: '8px 14px',
                background: p === page ? '#6366f1' : 'rgba(26,31,53,0.8)',
                border: `1px solid ${p === page ? '#6366f1' : 'rgba(99,102,241,0.2)'}`,
                borderRadius: 8, color: '#fff', cursor: 'pointer',
                fontWeight: p === page ? 700 : 400
              }}>{p}</button>
            );
          })}

          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages}
            style={{ padding: '8px 14px', background: 'rgba(26,31,53,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: page === pages ? '#475569' : '#e2e8f0', cursor: page === pages ? 'not-allowed' : 'pointer' }}>Next ›</button>
          <button onClick={() => setPage(pages)} disabled={page === pages}
            style={{ padding: '8px 12px', background: 'rgba(26,31,53,0.8)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, color: page === pages ? '#475569' : '#e2e8f0', cursor: page === pages ? 'not-allowed' : 'pointer' }}>»</button>

          <span style={{ color: '#64748b', fontSize: 13, marginLeft: 8 }}>
            Page {page} of {pages} · {total} stocks
          </span>
        </div>
      )}
    </div>
  );
}