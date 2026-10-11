import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { stocksAPI, watchlistAPI } from '../services/api';
import toast from 'react-hot-toast';

export default function Stocks() {
  const navigate = useNavigate();
  const [stocks, setStocks] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState({ sector: '', country: '' });
  const [view, setView] = useState('grid');

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await stocksAPI.getAll({ page, limit: 30, ...filter });
      setStocks(res.stocks || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch { toast.error('Failed to load stocks'); }
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchStocks(); }, [fetchStocks]);
  useEffect(() => { stocksAPI.getSectors().then(setSectors).catch(() => {}); }, []);

  const handleSearch = async (q) => {
    setSearch(q);
    if (q.length < 2) return setSearchResults([]);
    try {
      const results = await stocksAPI.search(q);
      setSearchResults(results || []);
    } catch {}
  };

  const addToWatchlist = async (symbol, e) => {
    e.stopPropagation();
    try {
      await watchlistAPI.add(symbol);
      toast.success(`${symbol} added to watchlist`);
    } catch { toast.error('Failed to add to watchlist'); }
  };

  const displayStocks = search && searchResults.length > 0 ? searchResults : stocks;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28 }}>📈 Stock Market</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>{total}+ stocks across NSE, BSE, NASDAQ</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setView('grid')} className={view==='grid'?'btn-primary':'btn-secondary'} style={{ padding: '8px 16px', fontSize: 13 }}>⊞ Grid</button>
          <button onClick={() => setView('list')} className={view==='list'?'btn-primary':'btn-secondary'} style={{ padding: '8px 16px', fontSize: 13 }}>☰ List</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
          <input className="input" placeholder="🔍 Search stocks by name or symbol..." value={search} onChange={e => handleSearch(e.target.value)} style={{ paddingLeft: 16 }} />
          {searchResults.length > 0 && search && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, zIndex: 100, maxHeight: 300, overflowY: 'auto', marginTop: 4 }}>
              {searchResults.map((s, i) => (
                <div key={i} onClick={() => { navigate(`/stocks/${s.symbol}`); setSearch(''); setSearchResults([]); }} style={{ padding: '10px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{s.symbol.replace('.BSE','')}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.name}</div>
                  </div>
                  <div style={{ color: s.changePercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 12 }}>₹{s.price?.toFixed(2)} {s.changePercent >= 0 ? '▲' : '▼'}{Math.abs(s.changePercent||0).toFixed(2)}%</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <select className="input" style={{ width: 160 }} value={filter.sector} onChange={e => { setFilter({...filter, sector: e.target.value}); setPage(1); }}>
          <option value="">All Sectors</option>
          {sectors.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input" style={{ width: 140 }} value={filter.country} onChange={e => { setFilter({...filter, country: e.target.value}); setPage(1); }}>
          <option value="">All Markets</option>
          <option value="IN">🇮🇳 India</option>
          <option value="US">🇺🇸 USA</option>
        </select>
      </div>

      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {Array(12).fill(0).map((_, i) => (
            <div key={i} className="card" style={{ padding: 20, height: 140, animation: 'pulse 1.5s infinite' }}></div>
          ))}
        </div>
      ) : view === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {displayStocks.map((stock, i) => (
            <div key={i} className="card" onClick={() => navigate(`/stocks/${stock.symbol}`)} style={{ padding: 18, cursor: 'pointer', transition: 'all 0.2s', position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: `linear-gradient(135deg, ${['#00D4AA','#3B82F6','#8B5CF6','#F59E0B','#EF4444'][i%5]}15, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ['#00D4AA','#3B82F6','#8B5CF6','#F59E0B','#EF4444'][i%5], border: `1px solid ${['#00D4AA','#3B82F6','#8B5CF6','#F59E0B','#EF4444'][i%5]}30` }}>
                  {stock.symbol.replace('.BSE','').substring(0,4)}
                </div>
                <button onClick={e => addToWatchlist(stock.symbol, e)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 16 }}>☆</button>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{stock.symbol.replace('.BSE','')}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.name}</div>
              <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>₹{stock.price?.toFixed(2)}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, color: stock.changePercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                  {stock.changePercent >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent||0).toFixed(2)}%
                </span>
                <span className="badge badge-blue" style={{ fontSize: 9 }}>{stock.sector}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'rgba(255,255,255,0.03)' }}>
              <tr>{['Symbol','Company','Price','Change','Sector','Exchange','Actions'].map(h => <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, borderBottom: '1px solid var(--border)' }}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {displayStocks.map((stock, i) => (
                <tr key={i} onClick={() => navigate(`/stocks/${stock.symbol}`)} style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>{stock.symbol.replace('.BSE','')}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--text-secondary)', maxWidth: 200 }}>{stock.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>₹{stock.price?.toFixed(2)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 12, color: stock.changePercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                    {stock.changePercent >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent||0).toFixed(2)}%
                  </td>
                  <td style={{ padding: '12px 16px' }}><span className="badge badge-blue" style={{ fontSize: 10 }}>{stock.sector}</span></td>
                  <td style={{ padding: '12px 16px', fontSize: 11, color: 'var(--text-muted)' }}>{stock.exchange}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-primary" onClick={e => { e.stopPropagation(); navigate(`/stocks/${stock.symbol}`); }} style={{ fontSize: 11, padding: '4px 12px' }}>Trade</button>
                      <button onClick={e => addToWatchlist(stock.symbol, e)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 12, padding: '4px 8px' }}>☆</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {!search && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 }}>
          <button className="btn-secondary" disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '8px 16px', fontSize: 13 }}>← Prev</button>
          <span style={{ color: 'var(--text-secondary)', fontSize: 13, padding: '8px 16px' }}>Page {page} of {totalPages}</span>
          <button className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ padding: '8px 16px', fontSize: 13 }}>Next →</button>
        </div>
      )}
    </div>
  );
}
