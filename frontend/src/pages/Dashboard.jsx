import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import { stocksAPI, portfolioAPI, tradesAPI, marketAPI } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const StatCard = ({ icon, label, value, sub, color = 'var(--accent-green)', trend }) => (
  <div className="card" style={{ padding: 20, position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, ${color}20 0%, transparent 70%)` }} />
    <div style={{ fontSize: 24, marginBottom: 8 }}>{icon}</div>
    <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{sub}</div>}
    {trend !== undefined && (
      <div style={{ fontSize: 11, color: trend >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', marginTop: 4 }}>
        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(2)}%
      </div>
    )}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [portfolio, setPortfolio] = useState(null);
  const [topStocks, setTopStocks] = useState([]);
  const [recentTrades, setRecentTrades] = useState([]);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    portfolioAPI.get().then(setPortfolio).catch(() => {});
    stocksAPI.getAll({ limit: 8, country: 'IN' }).then(res => setTopStocks(res.stocks || [])).catch(() => {});
    tradesAPI.getHistory().then(t => setRecentTrades(t.slice(0, 5))).catch(() => {});

    // Generate portfolio performance chart
    const data = [];
    let val = 100000;
    for (let i = 30; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      val = val * (1 + (Math.random() - 0.47) * 0.02);
      data.push({ date: `${d.getDate()}/${d.getMonth()+1}`, value: parseFloat(val.toFixed(0)) });
    }
    setChartData(data);
  }, []);

  const COLORS = ['#00D4AA', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'];

  return (
    <div style={{ animation: 'slideUp 0.5s ease' }}>
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, rgba(0,212,170,0.15), rgba(59,130,246,0.15))', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 20, padding: 28, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', right: -40, top: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,170,0.1) 0%, transparent 70%)' }} />
        <img src="https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=300&h=100&fit=crop" alt="market" style={{ position: 'absolute', right: 0, top: 0, width: 200, height: '100%', objectFit: 'cover', opacity: 0.08, borderRadius: '0 20px 20px 0' }} />
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26, marginBottom: 6 }}>
          Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 16 }}>Markets are open. Your virtual portfolio is ready to grow.</p>
        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-primary" onClick={() => navigate('/stocks')} style={{ padding: '10px 20px' }}>📈 Trade Stocks</button>
          <button className="btn-secondary" onClick={() => navigate('/portfolio')} style={{ padding: '10px 20px' }}>💼 View Portfolio</button>
          <button className="btn-secondary" onClick={() => navigate('/ipo')} style={{ padding: '10px 20px' }}>🚀 View IPOs</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <StatCard icon="💰" label="Virtual Coins" value={`₹${(user?.virtualCoins || 100000).toLocaleString()}`} sub="Available to invest" color="var(--accent-green)" />
        <StatCard icon="📊" label="Portfolio Value" value={`₹${(portfolio?.currentValue || 0).toLocaleString()}`} sub={`${portfolio?.holdings?.length || 0} holdings`} trend={portfolio?.totalPnlPercent} />
        <StatCard icon="💹" label="Total P&L" value={`₹${(portfolio?.totalPnl || 0).toFixed(0)}`} sub="All time returns" color={portfolio?.totalPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
        <StatCard icon="🧠" label="Behavior Score" value={user?.behaviorProfile?.type || 'Unknown'} sub={`${user?.behaviorProfile?.totalTrades || 0} trades analyzed`} color="var(--accent-purple)" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* Portfolio Chart */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 16 }}>Portfolio Performance (30 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D4AA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00D4AA" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
              <Area type="monotone" dataKey="value" stroke="#00D4AA" fill="url(#colorValue)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Portfolio Allocation */}
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 16 }}>Allocation</h3>
          {portfolio?.holdings?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie data={portfolio.holdings.slice(0, 5)} dataKey="currentValue" cx="50%" cy="50%" outerRadius={60} innerRadius={35}>
                    {portfolio.holdings.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {portfolio.holdings.slice(0, 4).map((h, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: COLORS[i] }}>● {h.symbol?.replace('.BSE', '')}</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{((h.currentValue / portfolio.currentValue) * 100).toFixed(1)}%</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📊</div>
              <p style={{ fontSize: 12 }}>No holdings yet.<br />Start investing!</p>
              <button className="btn-primary" onClick={() => navigate('/stocks')} style={{ marginTop: 12, fontSize: 12, padding: '6px 14px' }}>Explore Stocks</button>
            </div>
          )}
        </div>
      </div>

      {/* Top Stocks */}
      <div className="card" style={{ padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontWeight: 600, fontSize: 16 }}>🔥 Top Indian Stocks</h3>
          <button className="btn-secondary" onClick={() => navigate('/stocks')} style={{ fontSize: 12, padding: '6px 14px' }}>View All</button>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Stock', 'Price', 'Change', 'Sector', 'Action'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topStocks.map((stock, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', cursor: 'pointer', transition: 'background 0.2s' }}
                  onClick={() => navigate(`/stocks/${stock.symbol}`)}>
                  <td style={{ padding: '10px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${['#00D4AA','#3B82F6','#8B5CF6','#F59E0B'][i%4]}20, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: ['#00D4AA','#3B82F6','#8B5CF6','#F59E0B'][i%4] }}>
                        {stock.symbol.replace('.BSE','').substring(0,3)}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{stock.symbol.replace('.BSE','')}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{stock.name?.substring(0,18)}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>₹{stock.price?.toFixed(2)}</td>
                  <td style={{ padding: '10px 12px' }}>
                    <span style={{ color: stock.changePercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontSize: 12, fontWeight: 600 }}>
                      {stock.changePercent >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent || 0).toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px' }}><span className="badge badge-blue" style={{ fontSize: 10 }}>{stock.sector}</span></td>
                  <td style={{ padding: '10px 12px' }}>
                    <button className="btn-primary" onClick={e => { e.stopPropagation(); navigate(`/stocks/${stock.symbol}`); }} style={{ fontSize: 11, padding: '4px 12px' }}>Trade</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Trades + Behavior */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>📋 Recent Trades</h3>
          {recentTrades.length > 0 ? recentTrades.map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < recentTrades.length-1 ? '1px solid var(--border)' : 'none' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.symbol?.replace('.BSE','')}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{new Date(t.tradeTime).toLocaleDateString()}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className={`badge ${t.type==='BUY'?'badge-green':'badge-red'}`} style={{fontSize:10}}>{t.type}</span>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>₹{t.totalAmount?.toFixed(0)}</div>
              </div>
            </div>
          )) : (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>No trades yet. Start trading!</div>
          )}
        </div>

        <div className="card" style={{ padding: 20 }}>
          <h3 style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>🧠 Behavior Insights</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            {[
              { label: 'Panic Sells', value: user?.behaviorProfile?.panicSellingCount || 0, color: 'var(--accent-red)' },
              { label: 'Total Trades', value: user?.behaviorProfile?.totalTrades || 0, color: 'var(--accent-blue)' },
              { label: 'Win Rate', value: `${user?.behaviorProfile?.winRate || 0}%`, color: 'var(--accent-green)' },
              { label: 'Profile', value: user?.behaviorProfile?.type || 'Unknown', color: 'var(--accent-purple)' }
            ].map(item => (
              <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: item.color }}>{item.value}</div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{item.label}</div>
              </div>
            ))}
          </div>
          <button className="btn-secondary" onClick={() => navigate('/behavior')} style={{ width: '100%', fontSize: 13 }}>View Full Analysis →</button>
        </div>
      </div>
    </div>
  );
}
