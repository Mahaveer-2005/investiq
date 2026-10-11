import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const SENTIMENT_STYLE = {
  bullish: { bg: 'rgba(16,185,129,0.15)',  color: '#10b981', border: 'rgba(16,185,129,0.3)',  label: '🟢 Bullish'  },
  bearish: { bg: 'rgba(239,68,68,0.15)',   color: '#ef4444', border: 'rgba(239,68,68,0.3)',   label: '🔴 Bearish'  },
  neutral: { bg: 'rgba(245,158,11,0.15)',  color: '#f59e0b', border: 'rgba(245,158,11,0.3)',  label: '🟡 Neutral'  },
};

const CATEGORY_COLOR = {
  MARKET:    '#6366f1', STOCKS:  '#10b981', ECONOMY: '#f59e0b',
  IPO:       '#8b5cf6', RESULTS: '#06b6d4', COMMODITY: '#ef4444', GENERAL: '#64748b',
};

function timeAgo(iso) {
  try {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60)   return `${Math.floor(diff)}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400)return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  } catch { return ''; }
}

const card = {
  background:   'rgba(13,17,35,0.88)',
  border:       '1px solid rgba(99,102,241,0.15)',
  borderRadius: 14,
  padding:      20,
};

export default function News() {
  const [news,       setNews]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState(null);
  const [filter,     setFilter]     = useState('all');
  const [impact,     setImpact]     = useState('all');
  const [search,     setSearch]     = useState('');

  const loadNews = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const url = forceRefresh ? '/api/news/refresh' : '/api/news';
      const { data } = await axios.get(url, { timeout: 20000 });
      setNews(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Failed to load news. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadNews(); }, [loadNews]);

  // Filter logic
  const filtered = news.filter(n => {
    if (filter !== 'all' && n.sentiment !== filter) return false;
    if (impact === 'high' && n.sentiment === 'neutral') return false;
    if (impact === 'max' && n.sentiment !== 'bearish' && n.sentiment !== 'bullish') return false;
    if (search && !n.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const bullCount   = news.filter(n => n.sentiment === 'bullish').length;
  const bearCount   = news.filter(n => n.sentiment === 'bearish').length;
  const neutCount   = news.filter(n => n.sentiment === 'neutral').length;
  const sentiment   = bullCount > bearCount + 2 ? 'Bullish 🟢' : bearCount > bullCount + 2 ? 'Bearish 🔴' : 'Mixed 🟡';
  const sentColor   = bullCount > bearCount + 2 ? '#10b981' : bearCount > bullCount + 2 ? '#ef4444' : '#f59e0b';

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: 16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{ width: 48, height: 48, border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ color: '#6366f1', fontWeight: 700, fontSize: 16, animation: 'pulse 1.5s infinite' }}>Loading Market News...</div>
    </div>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .news-card { transition: all 0.2s; cursor: pointer; }
        .news-card:hover { transform: translateY(-3px); border-color: rgba(99,102,241,0.4) !important; }
        .filter-btn { border: none; cursor: pointer; border-radius: 20px; padding: 6px 16px; font-size: 12px; font-weight: 700; transition: all 0.2s; }
        .filter-btn:hover { opacity: 0.85; }
        .search-input { background: rgba(10,14,26,0.7); border: 1px solid rgba(99,102,241,0.2); color: #e2e8f0; border-radius: 10px; padding: 9px 14px; font-size: 13px; outline: none; width: 220px; }
        .search-input:focus { border-color: rgba(99,102,241,0.5); }
      `}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12, animation: 'fadein 0.4s ease' }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>📰 Market News</h1>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: 14 }}>
            Live from Economic Times, Mint, Business Standard · Sentiment AI · Updated every 30 mins
          </p>
        </div>
        <button onClick={() => loadNews(true)} disabled={refreshing}
          style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '10px 20px', borderRadius: 10, cursor: refreshing ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, opacity: refreshing ? 0.7 : 1 }}>
          {refreshing
            ? <><span style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}/> Refreshing...</>
            : '🔄 Refresh'}
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Overall Market', value: sentiment,             color: sentColor,   bg: 'rgba(13,17,35,0.88)' },
          { label: '🟢 Positive News', value: bullCount,           color: '#10b981',   bg: 'rgba(16,185,129,0.06)' },
          { label: '🔴 Negative News', value: bearCount,           color: '#ef4444',   bg: 'rgba(239,68,68,0.06)' },
          { label: '🟡 Neutral News',  value: neutCount,           color: '#f59e0b',   bg: 'rgba(245,158,11,0.06)' },
        ].map((s, i) => (
          <div key={i} style={{ ...card, background: s.bg }}>
            <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, letterSpacing: 0.8, marginBottom: 8 }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ ...card, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>Filter:</span>
        {[
          { key: 'all',     label: 'All',     bg: filter === 'all'     ? '#6366f1' : 'rgba(99,102,241,0.1)',  color: filter === 'all'     ? '#fff' : '#94a3b8' },
          { key: 'bullish', label: '🟢 Bullish', bg: filter === 'bullish' ? '#10b981' : 'rgba(16,185,129,0.1)', color: filter === 'bullish' ? '#fff' : '#94a3b8' },
          { key: 'bearish', label: '🔴 Bearish', bg: filter === 'bearish' ? '#ef4444' : 'rgba(239,68,68,0.1)',  color: filter === 'bearish' ? '#fff' : '#94a3b8' },
          { key: 'neutral', label: '🟡 Neutral', bg: filter === 'neutral' ? '#f59e0b' : 'rgba(245,158,11,0.1)', color: filter === 'neutral' ? '#fff' : '#94a3b8' },
        ].map(f => (
          <button key={f.key} className="filter-btn" onClick={() => setFilter(f.key)}
            style={{ background: f.bg, color: f.color }}>
            {f.label}
          </button>
        ))}
        <div style={{ width: 1, height: 24, background: 'rgba(99,102,241,0.2)' }} />
        {[
          { key: 'all',  label: 'All',         icon: '' },
          { key: 'high', label: 'High Impact',  icon: '⚡' },
          { key: 'max',  label: 'Max Impact',   icon: '🔥' },
        ].map(f => (
          <button key={f.key} className="filter-btn" onClick={() => setImpact(f.key)}
            style={{ background: impact === f.key ? '#f59e0b' : 'rgba(245,158,11,0.1)', color: impact === f.key ? '#fff' : '#94a3b8' }}>
            {f.icon} {f.label}
          </button>
        ))}
        <input
          className="search-input"
          placeholder="🔍 Search news..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 'auto' }}
        />
      </div>

      {error && (
        <div style={{ ...card, textAlign: 'center', padding: '40px 20px', marginBottom: 20 }}>
          <div style={{ fontSize: 36, marginBottom: 10 }}>⚠️</div>
          <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 12 }}>{error}</div>
          <button onClick={() => loadNews(true)}
            style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
            Try Again
          </button>
        </div>
      )}

      {/* News Grid */}
      {filtered.length === 0 && !error ? (
        <div style={{ ...card, textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
          <div style={{ color: '#475569' }}>No news matching your filters.</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(340px,1fr))', gap: 16, animation: 'fadein 0.3s ease' }}>
          {filtered.map((item, i) => {
            const ss = SENTIMENT_STYLE[item.sentiment] || SENTIMENT_STYLE.neutral;
            const catColor = CATEGORY_COLOR[item.category] || '#64748b';
            return (
              <div key={item.id || i} className="news-card"
                onClick={() => item.url && window.open(item.url, '_blank', 'noopener')}
                style={{ ...card, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 10 }}>

                {/* Top accent bar */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: item.sentiment === 'bullish' ? 'linear-gradient(90deg,#10b981,#34d399)'
                    : item.sentiment === 'bearish' ? 'linear-gradient(90deg,#ef4444,#f87171)'
                    : 'linear-gradient(90deg,#f59e0b,#fbbf24)' }} />

                {/* Category tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                  {item.category && item.category !== 'GENERAL' ? (
                    <span style={{ background: `${catColor}22`, color: catColor, border: `1px solid ${catColor}44`, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, letterSpacing: 0.5 }}>
                      {item.category}
                    </span>
                  ) : <span />}
                  <span style={{ color: '#475569', fontSize: 11 }}>{timeAgo(item.publishedAt)}</span>
                </div>

                {/* Title */}
                <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0', lineHeight: 1.5 }}>
                  {item.title}
                </div>

                {/* Description */}
                {item.description && (
                  <div style={{ color: '#64748b', fontSize: 12, lineHeight: 1.6 }}>
                    {item.description}
                  </div>
                )}

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                  <span style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                    {ss.label}
                  </span>
                  <span style={{ color: '#475569', fontSize: 11 }}>{item.source}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{ textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 20 }}>
          Showing {filtered.length} of {news.length} articles
        </div>
      )}
    </div>
  );
}