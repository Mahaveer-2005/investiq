import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useSocket } from '../context/SocketContext';
import { Search, Filter, TrendingUp, TrendingDown, Star, BarChart2, Zap } from 'lucide-react';

const SECTORS = ['All', 'IT', 'Banking', 'FMCG', 'Pharma', 'Auto', 'Energy', 'Finance', 'Metals', 'Real Estate', 'Power', 'Infrastructure'];

export default function StocksPage() {
  const { priceUpdates } = useSocket();
  const [stocks, setStocks] = useState([]);
  const [prices, setPrices] = useState({});
  const [search, setSearch] = useState('');
  const [sector, setSector] = useState('All');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [tab, setTab] = useState('all'); // all, gainers, losers

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 50 });
      if (search) params.set('search', search);
      if (sector !== 'All') params.set('sector', sector);
      const res = await api.get(`/stocks?${params}`);
      setStocks(res.data.stocks);
      setTotal(res.data.total);

      // Fetch prices for visible stocks
      setLoadingPrices(true);
      const symbols = res.data.stocks.map(s => s.symbol);
      const priceRes = await api.post('/stocks/bulk-prices', { symbols: symbols.slice(0, 50) });
      const pMap = {};
      priceRes.data.prices.forEach(p => { pMap[p.symbol] = p; });
      setPrices(pMap);
    } catch {}
    setLoading(false);
    setLoadingPrices(false);
  }, [page, search, sector]);

  useEffect(() => { fetchStocks(); }, [fetchStocks]);

  // Merge socket updates
  useEffect(() => {
    if (Object.keys(priceUpdates).length > 0) {
      setPrices(prev => ({ ...prev, ...priceUpdates }));
    }
  }, [priceUpdates]);

  const getSectorClass = (sec) => `sector-${sec}` ;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800 }}>📈 Stock Market</h1>
          <p style={{ color: '#64748b', marginTop: '4px' }}>{total}+ NSE/BSE stocks with live prices</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', width: 'fit-content' }}>
        {[['all', 'All Stocks'], ['gainers', '🔥 Gainers'], ['losers', '📉 Losers']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{ padding: '8px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', background: tab === key ? 'linear-gradient(135deg, #7c3aed, #0ea5e9)' : 'transparent', color: tab === key ? 'white' : '#64748b', transition: 'all 0.2s' }}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search stocks (TCS, Reliance, HDFC...)" className="input-field" style={{ paddingLeft: '40px' }} />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {SECTORS.map(s => (
            <button key={s} onClick={() => { setSector(s); setPage(1); }} style={{ padding: '8px 14px', borderRadius: '20px', border: `1px solid ${sector === s ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.08)'}`, background: sector === s ? 'rgba(124,58,237,0.15)' : 'transparent', color: sector === s ? '#a855f7' : '#94a3b8', cursor: 'pointer', fontSize: '0.8rem', fontWeight: sector === s ? 600 : 400, whiteSpace: 'nowrap' }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Stock Table */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', overflow: 'hidden' }}>
        <table className="data-table">
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '14px 20px', textAlign: 'left' }}>Company</th>
              <th>Sector</th>
              <th>Price</th>
              <th>Change</th>
              <th>High</th>
              <th>Low</th>
              <th>Volume</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j}><div style={{ height: '16px', background: 'rgba(255,255,255,0.04)', borderRadius: '4px', width: j === 0 ? '140px' : '80px', animation: 'pulse 1.5s ease-in-out infinite' }} /></td>
                  ))}
                </tr>
              ))
            ) : stocks.map(stock => {
              const p = prices[stock.symbol];
              const change = p?.changePercent || 0;
              return (
                <tr key={stock.symbol} style={{ cursor: 'pointer', transition: 'background 0.2s' }} onClick={() => window.location.href = `/stocks/${stock.symbol}`}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `linear-gradient(135deg, ${change >= 0 ? '#10b981' : '#ef4444'}22, ${change >= 0 ? '#059669' : '#dc2626'}11)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${change >= 0 ? '#10b98122' : '#ef444422'}`, fontWeight: 700, fontSize: '0.7rem', color: change >= 0 ? '#10b981' : '#ef4444' }}>
                        {stock.symbol.substring(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{stock.symbol}</div>
                        <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{stock.name?.substring(0, 22)}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ padding: '3px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(124,58,237,0.1)', color: '#a855f7' }}>
                      {stock.sector}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700 }}>₹{p?.price?.toFixed(2) || '—'}</td>
                  <td>
                    <span style={{ color: change >= 0 ? '#10b981' : '#ef4444', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'flex-end' }}>
                      {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                      {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ color: '#94a3b8' }}>₹{p?.high?.toFixed(2) || '—'}</td>
                  <td style={{ color: '#94a3b8' }}>₹{p?.low?.toFixed(2) || '—'}</td>
                  <td style={{ color: '#64748b', fontSize: '0.85rem' }}>{p?.volume ? (p.volume / 1000).toFixed(0) + 'K' : '—'}</td>
                  <td>
                    <Link to={`/trade/${stock.symbol}`} onClick={e => e.stopPropagation()} style={{ padding: '6px 14px', borderRadius: '8px', background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(14,165,233,0.1))', border: '1px solid rgba(124,58,237,0.3)', color: '#a855f7', textDecoration: 'none', fontSize: '0.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      Trade
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <span style={{ color: '#64748b', fontSize: '0.85rem' }}>Showing {stocks.length} of {total} stocks</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>← Prev</button>
            <span style={{ padding: '6px 14px', color: '#a855f7', fontWeight: 600, fontSize: '0.85rem' }}>Page {page}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={stocks.length < 50} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}>Next →</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} } tr:hover td { background: rgba(255,255,255,0.02); }`}</style>
    </div>
  );
}
