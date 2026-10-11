import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function MarketTicker() {
  const [indices, setIndices] = useState({
    nifty: { value: 22450, change: 120, changePercent: 0.54 },
    sensex: { value: 73800, change: 380, changePercent: 0.52 },
    bankNifty: { value: 47200, change: 210, changePercent: 0.45 }
  });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/market/indices');
        if (res.data.success) setIndices(res.data.indices);
      } catch {}
    };
    fetch();
    const interval = setInterval(fetch, 30000);
    return () => clearInterval(interval);
  }, []);

  const items = [
    { label: 'NIFTY 50', ...indices.nifty },
    { label: 'SENSEX', ...indices.sensex },
    { label: 'BANKNIFTY', ...indices.bankNifty },
    { label: 'NIFTY IT', ...(indices.niftyIT || { value: 36500, change: 100, changePercent: 0.27 }) },
  ];

  return (
    <div style={{ display: 'flex', gap: '20px', overflow: 'hidden' }}>
      {items.map(item => (
        <div key={item.label} style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ color: '#64748b', fontSize: '0.75rem', fontWeight: 600 }}>{item.label}</span>
          <span style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 700 }}>
            {item.value?.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </span>
          <span style={{ color: item.changePercent >= 0 ? '#10b981' : '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>
            {item.changePercent >= 0 ? '▲' : '▼'} {Math.abs(item.changePercent || 0).toFixed(2)}%
          </span>
        </div>
      ))}
    </div>
  );
}
