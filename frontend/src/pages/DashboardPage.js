import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { indicesAPI, stocksAPI, ipoAPI } from '../services/api';

function IndexCard({ name, value, change, changePercent }) {
  const up = change >= 0;
  return (
    <div className="card" style={{ padding: '20px 24px', flex: 1, minWidth: 180 }}>
      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 500 }}>{name}</div>
      <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'JetBrains Mono', marginBottom: 4 }}>{value?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
      <div style={{ color: up ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 14, fontWeight: 600 }}>
        {up ? '▲' : '▼'} {Math.abs(change)?.toFixed(2)} ({Math.abs(changePercent)?.toFixed(2)}%)
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [indices, setIndices] = useState({});
  const [topStocks, setTopStocks] = useState([]);
  const [ipos, setIpos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock chart data for portfolio performance
  const chartData = Array.from({ length: 30 }, (_, i) => ({
    day: `D${i+1}`,
    value: 100000 + (Math.sin(i * 0.3) * 5000) + (i * 200) + (Math.random() * 2000 - 1000)
  }));

  useEffect(() => {
    async function load() {
      try {
        const [indRes, stockRes, ipoRes] = await Promise.allSettled([
          indicesAPI.getAll(),
          stocksAPI.getAll({ limit: 10 }),
          ipoAPI.getAll({ status: 'open' })
        ]);
        if (indRes.status === 'fulfilled') setIndices(indRes.value.data.data || {});
        if (stockRes.status === 'fulfilled') setTopStocks(stockRes.value.data.data || []);
        if (ipoRes.status === 'fulfilled') setIpos(ipoRes.value.data.data || []);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, []);

  const portfolioValue = user?.virtualCoins || 100000;

  return (
    <div style={{ padding: '28px 32px', background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Good Morning, {user?.name?.split(' ')[0]}! 👋</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Here's your investment overview for today</p>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Virtual Coins', value: `₹${(user?.virtualCoins || 100000).toLocaleString('en-IN')}`, icon: '💰', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
          { label: 'Portfolio Value', value: '₹1,00,000', icon: '📊', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
          { label: 'Total Trades', value: user?.behaviorProfile?.totalTrades || '0', icon: '🔄', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
          { label: 'Investor Type', value: user?.behaviorProfile?.investorType || 'Unknown', icon: '🧠', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
        ].map((stat, i) => (
          <div key={i} className="card" style={{ padding: '22px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>{stat.icon}</div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color, fontFamily: 'JetBrains Mono' }}>{stat.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Indices */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>📊 Market Indices</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          {loading ? Array(5).fill(0).map((_, i) => <div key={i} className="skeleton" style={{ height: 90, flex: 1, minWidth: 160 }} />) :
            Object.values(indices).map((idx, i) => <IndexCard key={i} {...idx} />)
          }
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24, marginBottom: 28 }}>
        {/* Portfolio Chart */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>📈 Portfolio Performance (30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="portfolioGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fill: '#4a5880', fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: '#4a5880', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={{ background: '#0d1832', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, color: '#f0f4ff' }} formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Value']} />
              <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} fill="url(#portfolioGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick Actions */}
        <div className="card" style={{ padding: 24 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 20 }}>⚡ Quick Actions</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              { to: '/stocks', label: '📈 Browse Stocks', color: '#3b82f6' },
              { to: '/ipo', label: '🚀 View IPOs', color: '#8b5cf6' },
              { to: '/futures', label: '⚡ Trade F&O', color: '#f59e0b' },
              { to: '/real-estate', label: '🏠 Real Estate', color: '#10b981' },
              { to: '/portfolio', label: '💼 My Portfolio', color: '#06b6d4' },
            ].map(a => (
              <Link key={a.to} to={a.to} style={{
                padding: '12px 16px', borderRadius: 10,
                background: `${a.color}15`, border: `1px solid ${a.color}30`,
                color: a.color, textDecoration: 'none', fontWeight: 600, fontSize: 14,
                display: 'flex', alignItems: 'center', transition: 'all 0.2s'
              }}>{a.label}</Link>
            ))}
          </div>
        </div>
      </div>

      {/* Top Stocks */}
      <div className="card" style={{ padding: 24, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontWeight: 700 }}>🔥 Top Stocks</h3>
          <Link to="/stocks" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>View All →</Link>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Company', 'Symbol', 'Price', 'Change', 'Sector'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? Array(6).fill(0).map((_, i) => (
                <tr key={i}><td colSpan={5} style={{ padding: 8 }}><div className="skeleton" style={{ height: 32 }} /></td></tr>
              )) : topStocks.slice(0, 8).map((s, i) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-card-hover)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '12px 12px' }}>
                    <Link to={`/stocks/${s.symbol}`} style={{ color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600 }}>{s.name}</Link>
                  </td>
                  <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', fontSize: 12, color: 'var(--text-secondary)' }}>{s.symbol?.replace('.NS', '')}</td>
                  <td style={{ padding: '12px', fontFamily: 'JetBrains Mono', fontWeight: 600 }}>₹{s.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
                  <td style={{ padding: '12px', color: (s.change || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                    {(s.change || 0) >= 0 ? '▲' : '▼'} {Math.abs(s.changePercent || 0).toFixed(2)}%
                  </td>
                  <td style={{ padding: '12px' }}><span className="badge badge-blue" style={{ fontSize: 11 }}>{s.sector}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* IPO Section */}
      {ipos.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>🚀 Open IPOs</h2>
            <Link to="/ipo" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>View All →</Link>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {ipos.slice(0, 3).map(ipo => (
              <div key={ipo._id} className="card" style={{ overflow: 'hidden' }}>
                <img src={ipo.imageUrl} alt={ipo.companyName} style={{ width: '100%', height: 140, objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                <div style={{ padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>{ipo.companyName}</div>
                      <span className="badge badge-green">OPEN NOW</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Price Band</div>
                      <div style={{ fontWeight: 700, color: '#3b82f6' }}>₹{ipo.issuePriceLow}–{ipo.issuePrice}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Closes: {new Date(ipo.closeDate).toLocaleDateString('en-IN')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
