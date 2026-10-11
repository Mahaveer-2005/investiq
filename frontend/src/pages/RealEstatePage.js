import React, { useState, useEffect } from 'react';
import { realEstateAPI } from '../services/api';

export default function RealEstatePage() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: '', purpose: '', city: '' });
  const [selected, setSelected] = useState(null);

  const load = () => {
    setLoading(true);
    realEstateAPI.getAll(filters).then(r => { setProperties(r.data.data || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const formatPrice = (p, purpose) => {
    if (purpose === 'rent') return `₹${p.toLocaleString('en-IN')}/mo`;
    if (p >= 10000000) return `₹${(p / 10000000).toFixed(2)} Cr`;
    if (p >= 100000) return `₹${(p / 100000).toFixed(1)} L`;
    return `₹${p.toLocaleString('en-IN')}`;
  };

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>🏠 Real Estate</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Browse properties across India with broker contacts</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})} style={{ maxWidth: 160 }}>
          <option value="">All Types</option>
          {['apartment', 'villa', 'plot', 'commercial', 'penthouse'].map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <select value={filters.purpose} onChange={e => setFilters({...filters, purpose: e.target.value})} style={{ maxWidth: 140 }}>
          <option value="">Buy / Rent</option>
          {['buy', 'rent', 'invest'].map(t => <option key={t} value={t} style={{ textTransform: 'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        <input placeholder="City..." value={filters.city} onChange={e => setFilters({...filters, city: e.target.value})} style={{ maxWidth: 160 }} />
        <button className="btn-primary" onClick={load} style={{ padding: '10px 20px' }}>Search</button>
        <button onClick={() => { setFilters({ type: '', purpose: '', city: '' }); setTimeout(load, 50); }} style={{ padding: '10px 20px', background: 'none', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'Outfit' }}>Clear</button>
      </div>

      {/* Properties Grid */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 400, borderRadius: 16 }} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {properties.map(prop => (
            <div key={prop._id} className="card" style={{ overflow: 'hidden', cursor: 'pointer' }} onClick={() => setSelected(prop)}>
              <div style={{ position: 'relative' }}>
                <img src={prop.images?.[0]} alt={prop.title} style={{ width: '100%', height: 200, objectFit: 'cover' }}
                  onError={e => { e.target.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600'; }} />
                <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', gap: 6 }}>
                  <span className="badge badge-blue" style={{ textTransform: 'capitalize', fontSize: 11 }}>{prop.type}</span>
                  {prop.purpose === 'rent' ? <span className="badge badge-green" style={{ fontSize: 11 }}>FOR RENT</span> :
                   prop.purpose === 'invest' ? <span className="badge badge-gold" style={{ fontSize: 11 }}>INVESTMENT</span> :
                   <span className="badge" style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.3)', fontSize: 11 }}>FOR SALE</span>}
                </div>
                {prop.isVerified && <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(16,185,129,0.9)', borderRadius: 8, padding: '3px 8px', fontSize: 11, color: 'white', fontWeight: 600 }}>✓ Verified</div>}
              </div>
              <div style={{ padding: '20px' }}>
                <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 16, lineHeight: 1.3 }}>{prop.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 12 }}>📍 {prop.location?.area}, {prop.location?.city}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#3b82f6', fontFamily: 'JetBrains Mono' }}>
                    {formatPrice(prop.price, prop.purpose)}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {prop.area && `${prop.area} sqft`}
                    {prop.pricePerSqft && ` · ₹${prop.pricePerSqft}/sqft`}
                  </div>
                </div>
                {(prop.bedrooms || prop.bathrooms) && (
                  <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>
                    {prop.bedrooms && <span>🛏 {prop.bedrooms} BHK</span>}
                    {prop.bathrooms && <span>🚿 {prop.bathrooms} Bath</span>}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{prop.broker?.name} {prop.broker?.verified && '✓'}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{prop.broker?.agency}</div>
                  </div>
                  <a href={`tel:${prop.broker?.phone}`} onClick={e => e.stopPropagation()} style={{
                    padding: '7px 14px', borderRadius: 8, background: 'rgba(16,185,129,0.15)', color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.3)', textDecoration: 'none', fontSize: 12, fontWeight: 600
                  }}>📞 Call</a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onClick={() => setSelected(null)}>
          <div style={{ background: 'var(--bg-card)', borderRadius: 20, padding: 0, maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', padding: '20px 28px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18 }}>{selected.title}</h2>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {selected.images?.slice(0, 2).map((img, i) => (
                <img key={i} src={img} alt="" style={{ width: '100%', height: 200, objectFit: 'cover' }} onError={e => e.target.style.display='none'} />
              ))}
            </div>
            <div style={{ padding: 28 }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#3b82f6', fontFamily: 'JetBrains Mono', marginBottom: 8 }}>{formatPrice(selected.price, selected.purpose)}</div>
              <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 20 }}>{selected.description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {[
                  ['Location', `${selected.location?.area}, ${selected.location?.city}`],
                  ['Pincode', selected.location?.pincode],
                  ['Area', selected.area ? `${selected.area} sqft` : null],
                  ['Price/sqft', selected.pricePerSqft ? `₹${selected.pricePerSqft}` : null],
                  ['Bedrooms', selected.bedrooms ? `${selected.bedrooms} BHK` : null],
                  ['Landmark', selected.location?.landmark],
                ].filter(([, v]) => v).map(([l, v]) => (
                  <div key={l} style={{ padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 2 }}>{l}</div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{v}</div>
                  </div>
                ))}
              </div>
              {selected.amenities?.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <h4 style={{ fontWeight: 700, marginBottom: 10 }}>Amenities</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {selected.amenities.map(a => <span key={a} className="badge badge-blue" style={{ fontSize: 12 }}>✓ {a}</span>)}
                  </div>
                </div>
              )}
              {/* Broker */}
              <div style={{ padding: '16px 20px', background: 'var(--bg-secondary)', borderRadius: 14, display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>👤</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700 }}>{selected.broker?.name} {selected.broker?.verified && '✅'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{selected.broker?.agency}</div>
                  <div style={{ fontSize: 13, color: '#10b981', marginTop: 2 }}>{selected.broker?.phone}</div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <a href={`tel:${selected.broker?.phone}`} style={{ padding: '10px 20px', background: '#10b981', color: 'white', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14, textAlign: 'center' }}>📞 Call Broker</a>
                  <a href={`mailto:${selected.broker?.email}`} style={{ padding: '10px 20px', background: 'rgba(59,130,246,0.1)', color: '#3b82f6', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 14, textAlign: 'center', border: '1px solid rgba(59,130,246,0.3)' }}>✉️ Email</a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
