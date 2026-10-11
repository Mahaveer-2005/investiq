import React, { useState, useEffect } from 'react';
import { ipoAPI } from '../services/api';

const statusColor = { open: 'var(--accent-green)', upcoming: 'var(--accent-orange)', closed: 'var(--text-muted)' };
const statusBg = { open: 'rgba(0,212,170,0.15)', upcoming: 'rgba(245,158,11,0.15)', closed: 'rgba(71,85,105,0.15)' };

export default function IPO() {
  const [ipos, setIpos] = useState([]);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    ipoAPI.getAll().then(setIpos).catch(() => {});
  }, []);

  const filtered = filter === 'all' ? ipos : ipos.filter(i => i.status === filter);

  return (
    <div style={{ animation: 'slideUp 0.4s ease' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 28, marginBottom: 6 }}>🚀 IPO Center</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Discover and invest in upcoming Initial Public Offerings</p>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['all', 'All IPOs'], ['open', '🟢 Open'], ['upcoming', '🟡 Upcoming'], ['closed', '⚫ Closed']].map(([val, label]) => (
          <button key={val} onClick={() => setFilter(val)} className={filter === val ? 'btn-primary' : 'btn-secondary'} style={{ padding: '8px 18px', fontSize: 13 }}>{label}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
        {filtered.map(ipo => (
          <div key={ipo.id} className="card" style={{ overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s' }} onClick={() => setSelected(ipo)}>
            {/* Image */}
            <div style={{ height: 160, position: 'relative', overflow: 'hidden' }}>
              <img src={ipo.image} alt={ipo.company} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(10,14,26,0.9) 100%)' }} />
              <div style={{ position: 'absolute', top: 12, left: 12 }}>
                <span style={{ background: statusBg[ipo.status], color: statusColor[ipo.status], padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600 }}>● {ipo.status.toUpperCase()}</span>
              </div>
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <span style={{ background: 'rgba(0,212,170,0.15)', color: 'var(--accent-green)', padding: '4px 10px', borderRadius: 20, fontSize: 11 }}>GMP: {ipo.gmp}</span>
              </div>
              <div style={{ position: 'absolute', bottom: 12, left: 12 }}>
                <h3 style={{ fontWeight: 700, fontSize: 18 }}>{ipo.company}</h3>
                <span className="badge badge-blue" style={{ fontSize: 10 }}>{ipo.sector}</span>
              </div>
            </div>

            {/* Details */}
            <div style={{ padding: 20 }}>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 16 }}>{ipo.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                {[['Price Range', ipo.price], ['Lot Size', ipo.lotSize], ['Open', ipo.openDate], ['Close', ipo.closeDate]].map(([k, v]) => (
                  <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: 10 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>{k}</div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Min. Investment</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-green)' }}>₹{ipo.minInvestment.toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  {'★'.repeat(Math.floor(ipo.rating))}{'☆'.repeat(5-Math.floor(ipo.rating))}
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 4 }}>{ipo.rating}/5</span>
                </div>
              </div>
              {ipo.status === 'open' && (
                <button className="btn-primary" style={{ width: '100%', marginTop: 16, padding: '10px' }} onClick={e => e.stopPropagation()}>
                  Apply Now (Virtual)
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: 20 }} onClick={() => setSelected(null)}>
          <div className="card" style={{ maxWidth: 600, width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <img src={selected.image} alt={selected.company} style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: '16px 16px 0 0' }} />
            <div style={{ padding: 28 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, marginBottom: 4 }}>{selected.company}</h2>
                  <span className="badge badge-blue">{selected.sector}</span>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: 24, cursor: 'pointer' }}>✕</button>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>{selected.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[['Price Range', selected.price], ['Lot Size', selected.lotSize], ['Min Investment', `₹${selected.minInvestment.toLocaleString()}`], ['Open Date', selected.openDate], ['Close Date', selected.closeDate], ['GMP', selected.gmp || 'N/A']].map(([k, v]) => (
                  <div key={k} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{k}</div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
              {selected.status === 'open' && (
                <button className="btn-primary" style={{ width: '100%', marginTop: 20, padding: '12px', fontSize: 15 }}>🚀 Apply for IPO (Virtual)</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
