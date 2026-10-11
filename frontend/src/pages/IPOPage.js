import React, { useState, useEffect } from 'react';
import { ipoAPI } from '../services/api';

const STATUS_COLORS = { upcoming: 'badge-blue', open: 'badge-green', closed: 'badge-red', listed: 'badge-gold' };
const REC_COLORS = { subscribe: '#10b981', avoid: '#ef4444', neutral: '#f59e0b' };

export default function IPOPage() {
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    ipoAPI.getAll().then(r => { setIpos(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? ipos : ipos.filter(i => i.status === filter);

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>🚀 IPO Center</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Track upcoming, open and listed IPOs with detailed analysis</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {['all', 'upcoming', 'open', 'closed', 'listed'].map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '8px 20px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 14,
            fontFamily: 'Outfit, sans-serif', border: filter === s ? '1px solid #3b82f6' : '1px solid var(--border)',
            background: filter === s ? 'rgba(59,130,246,0.15)' : 'transparent',
            color: filter === s ? '#3b82f6' : 'var(--text-secondary)', transition: 'all 0.2s', textTransform: 'capitalize'
          }}>{s === 'all' ? 'All IPOs' : s}</button>
        ))}
      </div>

      {/* IPO Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 340, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {filtered.map(ipo => (
            <div key={ipo._id} className="card" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => setSelected(ipo)}>
              <div style={{ position: 'relative' }}>
                <img src={ipo.imageUrl} alt={ipo.companyName} style={{ width: '100%', height: 160, objectFit: 'cover' }}
                  onError={e => { e.target.style.background = 'linear-gradient(135deg, #0f1e3d, #162347)'; e.target.style.display = 'block'; e.target.src = ''; }} />
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                  <span className={`badge ${STATUS_COLORS[ipo.status]}`} style={{ textTransform: 'uppercase', fontSize: 11 }}>{ipo.status}</span>
                </div>
                {ipo.logoUrl && <img src={ipo.logoUrl} alt="logo" style={{ position: 'absolute', bottom: -20, left: 16, width: 48, height: 48, borderRadius: 12, border: '2px solid var(--bg-card)', background: 'white', objectFit: 'contain' }} onError={e => e.target.style.display='none'} />}
              </div>
              <div style={{ padding: '28px 20px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontWeight: 700, marginBottom: 4 }}>{ipo.companyName}</h3>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className="badge badge-blue" style={{ fontSize: 11 }}>{ipo.sector}</span>
                      {ipo.recommendation && <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, color: REC_COLORS[ipo.recommendation], background: `${REC_COLORS[ipo.recommendation]}15`, border: `1px solid ${REC_COLORS[ipo.recommendation]}30` }}>{ipo.recommendation?.toUpperCase()}</span>}
                    </div>
                  </div>
                  {ipo.rating && (
                    <div style={{ fontSize: 22 }}>{'⭐'.repeat(Math.round(ipo.rating))}</div>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Price Band</div>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono', fontSize: 15, color: '#3b82f6' }}>₹{ipo.issuePriceLow || ipo.issuePrice}–{ipo.issuePrice}</div>
                  </div>
                  <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>Lot Size</div>
                    <div style={{ fontWeight: 700, fontFamily: 'JetBrains Mono' }}>{ipo.lotSize || '--'} shares</div>
                  </div>
                </div>
                {ipo.subscriptionRate && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text-secondary)' }}>
                    <span>Subscribed: <strong style={{ color: '#10b981' }}>{ipo.subscriptionRate}x</strong></span>
                    <span>Size: <strong style={{ color: 'var(--text-primary)' }}>{ipo.issueSize}</strong></span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {selected && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelected(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 32, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800 }}>{selected.companyName}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>{selected.description}</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                ['Issue Price', `₹${selected.issuePriceLow || selected.issuePrice}–${selected.issuePrice}`],
                ['Lot Size', `${selected.lotSize} shares`],
                ['Issue Size', selected.issueSize],
                ['Exchange', selected.exchange],
                ['Open Date', selected.openDate ? new Date(selected.openDate).toLocaleDateString('en-IN') : 'TBA'],
                ['Close Date', selected.closeDate ? new Date(selected.closeDate).toLocaleDateString('en-IN') : 'TBA'],
                ['Listing Date', selected.listingDate ? new Date(selected.listingDate).toLocaleDateString('en-IN') : 'TBA'],
                ['Subscription', selected.subscriptionRate ? `${selected.subscriptionRate}x` : '--'],
                ['GMP', selected.gmpPrice ? `₹${selected.gmpPrice}` : '--'],
                ['Registrar', selected.registrar || '--'],
              ].map(([l, v]) => v && (
                <div key={l} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>{l}</div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
