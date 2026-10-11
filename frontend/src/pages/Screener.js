import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const SORT_OPTIONS = [
  { value:'mcap',        label:'Market Cap'  },
  { value:'pe',          label:'P/E Ratio'   },
  { value:'roe',         label:'ROE'         },
  { value:'rsi',         label:'RSI'         },
  { value:'momentum',    label:'Momentum'    },
  { value:'volumeSurge', label:'Vol Surge'   },
  { value:'changePct',   label:'% Change'    },
];

export default function Screener() {
  const navigate = useNavigate();
  const [stocks,   setStocks]   = useState([]);
  const [meta,     setMeta]     = useState({});
  const [presets,  setPresets]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);
  const [filters,  setFilters]  = useState({
    sector:'', index:'', minPE:'', maxPE:'', minROE:'',
    maxDebtEq:'', rsiMin:'', rsiMax:'', volumeSurge:'',
    near52High:'', near52Low:'', momentum:'',
    sortBy:'mcap', sortDir:'desc', search:'',
  });

  const fetchPresets = useCallback(async () => {
    try {
      const res = await axios.get('/api/screener/presets');
      setPresets(res.data);
    } catch {}
  }, []);

  const fetchStocks = useCallback(async (pg = 1) => {
    setLoading(true);
    try {
      const params = { ...filters, page: pg, limit: 40 };
      Object.keys(params).forEach(k => { if (!params[k]) delete params[k]; });
      const res = await axios.get('/api/screener', { params });
      setStocks(res.data.stocks || []);
      setMeta({ total: res.data.total, pages: res.data.pages, sectors: res.data.sectors || [], indices: res.data.indices || [] });
      setPage(pg);
    } catch (err) {
      toast.error('Failed to load screener');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchPresets(); fetchStocks(1); }, []);

  const applyPreset = (preset) => {
    setFilters(f => ({ ...f, sector:'', index:'', minPE:'', maxPE:'', minROE:'', maxDebtEq:'', rsiMin:'', rsiMax:'', volumeSurge:'', near52High:'', near52Low:'', momentum:'', ...preset.filters }));
    setTimeout(() => fetchStocks(1), 100);
    toast.success(`Applied: ${preset.label}`);
  };

  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));
  const resetFilters = () => { setFilters({ sector:'', index:'', minPE:'', maxPE:'', minROE:'', maxDebtEq:'', rsiMin:'', rsiMax:'', volumeSurge:'', near52High:'', near52Low:'', momentum:'', sortBy:'mcap', sortDir:'desc', search:'' }); setTimeout(() => fetchStocks(1), 100); };

  const s = {
    page: { padding: 24, maxWidth: 1400, margin: '0 auto' },
    card: { background: 'rgba(26,31,53,0.85)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 20, marginBottom: 16 },
    input: { background: 'rgba(10,14,26,0.7)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, color: '#e2e8f0', padding: '8px 12px', fontSize: 13, outline: 'none', width: '100%' },
    select: { background: 'rgba(10,14,26,0.7)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 8, color: '#e2e8f0', padding: '8px 10px', fontSize: 13, outline: 'none', cursor: 'pointer' },
    th: { padding: '10px 12px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700, borderBottom: '1px solid rgba(99,102,241,0.1)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' },
    td: { padding: '11px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 },
    rsiColor: (r) => r < 30 ? '#10b981' : r > 70 ? '#ef4444' : r > 60 ? '#f59e0b' : '#94a3b8',
  };

  const RSIBadge = ({ rsi }) => (
    <span style={{ background: rsi < 30 ? 'rgba(16,185,129,0.15)' : rsi > 70 ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.1)', color: s.rsiColor(rsi), padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
      {rsi?.toFixed(0) || '—'}
    </span>
  );

  const VolumeBadge = ({ surge }) => {
    const v = surge || 1;
    const color = v >= 3 ? '#ef4444' : v >= 2 ? '#f59e0b' : v >= 1.5 ? '#6366f1' : '#475569';
    return (
      <span style={{ background: `${color}20`, color, padding: '2px 8px', borderRadius: 6, fontSize: 12, fontWeight: 700 }}>
        {v.toFixed(1)}x
      </span>
    );
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>📱 Stock Screener</h1>
          <p style={{ color: '#94a3b8', fontSize: 14 }}>Real-time data · {meta.total || 0} stocks · Live prices, RSI, Volume from NSE/BSE</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={resetFilters} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
            🔄 Reset
          </button>
          <button onClick={() => fetchStocks(1)} style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
            {loading ? '⏳ Scanning...' : '🔍 Screen'}
          </button>
        </div>
      </div>

      {/* Preset Strategies */}
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>⚡ Quick Strategies</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {presets.map(p => (
            <button key={p.id} onClick={() => applyPreset(p)} style={{ background: `${p.color}18`, border: `1px solid ${p.color}40`, color: p.color, borderRadius: 20, padding: '7px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, transition: 'all 0.2s' }}>
              <span>{p.emoji}</span>
              <span>{p.label.split(' ').slice(1).join(' ')}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={s.card}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>🔧 Filters</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
          {/* Search */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>SEARCH</div>
            <input style={s.input} placeholder="TCS, HDFC..." value={filters.search} onChange={e => setFilter('search', e.target.value)} onKeyDown={e => e.key==='Enter' && fetchStocks(1)} />
          </div>
          {/* Sector */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>SECTOR</div>
            <select style={s.select} value={filters.sector} onChange={e => setFilter('sector', e.target.value)}>
              <option value="">All Sectors</option>
              {(meta.sectors||[]).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {/* Index */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>INDEX</div>
            <select style={s.select} value={filters.index} onChange={e => setFilter('index', e.target.value)}>
              <option value="">All Indices</option>
              {(meta.indices||[]).map(i => <option key={i} value={i}>{i}</option>)}
            </select>
          </div>
          {/* Min P/E */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>MIN P/E</div>
            <input style={s.input} type="number" placeholder="e.g. 10" value={filters.minPE} onChange={e => setFilter('minPE', e.target.value)} />
          </div>
          {/* Max P/E */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>MAX P/E</div>
            <input style={s.input} type="number" placeholder="e.g. 40" value={filters.maxPE} onChange={e => setFilter('maxPE', e.target.value)} />
          </div>
          {/* Min ROE */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>MIN ROE %</div>
            <input style={s.input} type="number" placeholder="e.g. 15" value={filters.minROE} onChange={e => setFilter('minROE', e.target.value)} />
          </div>
          {/* Max Debt/Eq */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>MAX D/E</div>
            <input style={s.input} type="number" placeholder="e.g. 1" value={filters.maxDebtEq} onChange={e => setFilter('maxDebtEq', e.target.value)} />
          </div>
          {/* RSI Min */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>RSI MIN</div>
            <input style={s.input} type="number" placeholder="e.g. 30" value={filters.rsiMin} onChange={e => setFilter('rsiMin', e.target.value)} />
          </div>
          {/* RSI Max */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>RSI MAX</div>
            <input style={s.input} type="number" placeholder="e.g. 70" value={filters.rsiMax} onChange={e => setFilter('rsiMax', e.target.value)} />
          </div>
          {/* Volume Surge */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>VOL SURGE</div>
            <input style={s.input} type="number" placeholder="e.g. 2" value={filters.volumeSurge} onChange={e => setFilter('volumeSurge', e.target.value)} />
          </div>
          {/* Momentum */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>MOMENTUM</div>
            <select style={s.select} value={filters.momentum} onChange={e => setFilter('momentum', e.target.value)}>
              <option value="">Any</option>
              <option value="strong">Strong (+5%)</option>
              <option value="positive">Positive</option>
              <option value="negative">Negative</option>
            </select>
          </div>
          {/* Near 52W Low */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>NEAR 52W LOW %</div>
            <input style={s.input} type="number" placeholder="e.g. 10" value={filters.near52Low} onChange={e => setFilter('near52Low', e.target.value)} />
          </div>
          {/* Near 52W High */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>NEAR 52W HIGH %</div>
            <input style={s.input} type="number" placeholder="e.g. 5" value={filters.near52High} onChange={e => setFilter('near52High', e.target.value)} />
          </div>
          {/* Sort */}
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>SORT BY</div>
            <select style={s.select} value={filters.sortBy} onChange={e => setFilter('sortBy', e.target.value)}>
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <div style={{ color:'#64748b', fontSize:11, marginBottom:4, fontWeight:600 }}>ORDER</div>
            <select style={s.select} value={filters.sortDir} onChange={e => setFilter('sortDir', e.target.value)}>
              <option value="desc">High → Low</option>
              <option value="asc">Low → High</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div style={s.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>
            📊 Results — <span style={{ color: '#6366f1' }}>{stocks.length}</span> stocks
            <span style={{ color:'#64748b', fontSize:12, marginLeft:8 }}>Live NSE data · refreshes every hour</span>
          </div>
          {loading && <div style={{ color:'#6366f1', fontSize:13 }}>⏳ Fetching live prices...</div>}
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['#','Company','Sector','Price','Change','P/E','ROE','D/E','RSI','Vol Surge','52W High','52W Low','5D Mom','Action'].map(h => (
                  <th key={h} style={s.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:8}).map((_,i) => (
                  <tr key={i}>
                    {Array.from({length:14}).map((_,j) => (
                      <td key={j} style={s.td}>
                        <div style={{ height:16, background:'rgba(99,102,241,0.08)', borderRadius:4, width:`${40+Math.random()*50}%`, animation:'shimmer 1.5s infinite' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : stocks.length === 0 ? (
                <tr><td colSpan={14} style={{ ...s.td, textAlign:'center', padding:60, color:'#64748b' }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>🔍</div>
                  No stocks match your filters. Try adjusting the criteria.
                </td></tr>
              ) : stocks.map((stock, i) => {
                const up = stock.changePct >= 0;
                return (
                  <tr key={stock.symbol}
                    onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background='transparent'}
                    style={{ cursor:'pointer' }}
                    onClick={() => navigate(`/stocks/${encodeURIComponent(stock.symbol.replace('.NS','.BSE'))}`)}
                  >
                    <td style={{ ...s.td, color:'#475569', fontSize:12 }}>{(page-1)*40+i+1}</td>
                    <td style={s.td}>
                      <div style={{ fontWeight:700, fontSize:13 }}>{stock.name}</div>
                      <div style={{ color:'#6366f1', fontSize:11, marginTop:1 }}>{stock.symbol.replace('.NS','')}</div>
                    </td>
                    <td style={s.td}>
                      <span style={{ background:'rgba(139,92,246,0.12)', color:'#a78bfa', padding:'2px 8px', borderRadius:4, fontSize:11, fontWeight:600 }}>{stock.sector}</span>
                    </td>
                    <td style={{ ...s.td, fontWeight:700 }}>
                      {stock.price > 0 ? `₹${stock.price.toLocaleString('en-IN',{maximumFractionDigits:0})}` : '—'}
                      {!stock.hasLiveData && <span style={{color:'#475569',fontSize:9,marginLeft:4}}>est</span>}
                    </td>
                    <td style={{ ...s.td, color: up ? '#10b981' : '#ef4444', fontWeight:700 }}>
                      {stock.changePct ? `${up?'▲':'▼'} ${Math.abs(stock.changePct).toFixed(2)}%` : '—'}
                    </td>
                    <td style={{ ...s.td, color: stock.pe < 20 ? '#10b981' : stock.pe > 50 ? '#ef4444' : '#e2e8f0' }}>
                      {stock.pe > 0 ? stock.pe.toFixed(1) : 'N/A'}
                    </td>
                    <td style={{ ...s.td, color: stock.roe > 20 ? '#10b981' : stock.roe < 10 ? '#ef4444' : '#e2e8f0' }}>
                      {stock.roe?.toFixed(1)}%
                    </td>
                    <td style={{ ...s.td, color: stock.debtEq < 0.5 ? '#10b981' : stock.debtEq > 2 ? '#ef4444' : '#f59e0b' }}>
                      {stock.debtEq?.toFixed(1)}
                    </td>
                    <td style={s.td}><RSIBadge rsi={stock.rsi} /></td>
                    <td style={s.td}><VolumeBadge surge={stock.volumeSurge} /></td>
                    <td style={{ ...s.td, color: stock.w52HighPct > -5 ? '#10b981' : '#94a3b8', fontSize:12 }}>
                      {stock.w52High > 0 ? `₹${stock.w52High.toFixed(0)}` : '—'}
                      <div style={{fontSize:10,color:stock.w52HighPct>-5?'#10b981':'#64748b'}}>{stock.w52HighPct?.toFixed(1)}%</div>
                    </td>
                    <td style={{ ...s.td, color: stock.w52LowPct < 20 ? '#f59e0b' : '#94a3b8', fontSize:12 }}>
                      {stock.w52Low > 0 ? `₹${stock.w52Low.toFixed(0)}` : '—'}
                      <div style={{fontSize:10,color:'#10b981'}}>+{stock.w52LowPct?.toFixed(1)}%</div>
                    </td>
                    <td style={{ ...s.td, color: stock.momentum > 0 ? '#10b981' : '#ef4444', fontWeight:700, fontSize:12 }}>
                      {stock.momentum > 0 ? '▲' : '▼'} {Math.abs(stock.momentum||0).toFixed(1)}%
                    </td>
                    <td style={s.td}>
                      <button onClick={e => { e.stopPropagation(); navigate(`/stocks/${encodeURIComponent(stock.symbol.replace('.NS','.BSE'))}`); }}
                        style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', padding:'5px 12px', borderRadius:7, cursor:'pointer', fontWeight:700, fontSize:12 }}>
                        Trade
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {meta.pages > 1 && (
          <div style={{ display:'flex', justifyContent:'center', gap:6, marginTop:16 }}>
            {Array.from({length: Math.min(meta.pages, 8)}, (_,i) => i+1).map(p => (
              <button key={p} onClick={() => fetchStocks(p)} style={{ width:34, height:34, borderRadius:8, border:'none', cursor:'pointer', fontWeight:700, fontSize:13, background: p===page ? '#6366f1' : 'rgba(10,14,26,0.6)', color: p===page ? '#fff' : '#94a3b8' }}>{p}</button>
            ))}
          </div>
        )}
      </div>

      <style>{`@keyframes shimmer{0%{opacity:0.4}50%{opacity:0.8}100%{opacity:0.4}}`}</style>
    </div>
  );
}