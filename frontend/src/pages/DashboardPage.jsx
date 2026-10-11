import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';
import { TrendingUp, TrendingDown, Zap, ArrowRight, Activity, Brain, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

const StatCard = ({ label, value, subtitle, icon, color, change }) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, right: 0, width: '80px', height: '80px', borderRadius: '0 0 0 80px', background: `${color}15` }} />
    <div style={{ fontSize: '1.8rem', marginBottom: '12px' }}>{icon}</div>
    <div style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500, marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
    <div style={{ fontSize: '1.7rem', fontWeight: 800, color: '#f1f5f9', marginBottom: '4px' }}>{value}</div>
    {subtitle && <div style={{ fontSize: '0.8rem', color: change >= 0 ? '#10b981' : '#ef4444' }}>{change >= 0 ? '▲' : '▼'} {subtitle}</div>}
  </div>
);

const generatePortfolioChart = () => {
  let val = 100000;
  return Array.from({ length: 30 }, (_, i) => {
    val += (Math.random() - 0.45) * 2000;
    return { day: i + 1, value: Math.round(val) };
  });
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { priceUpdates } = useSocket();
  const [portfolio, setPortfolio] = useState(null);
  const [gainers, setGainers] = useState([]);
  const [losers, setLosers] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [chartData] = useState(generatePortfolioChart);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [portRes, gainRes, lossRes] = await Promise.allSettled([
          api.get('/portfolio'),
          api.get('/stocks/top-gainers'),
          api.get('/stocks/top-losers'),
        ]);
        if (portRes.status === 'fulfilled') setPortfolio(portRes.value.data.portfolio);
        if (gainRes.status === 'fulfilled') setGainers(gainRes.value.data.gainers.slice(0, 5));
        if (lossRes.status === 'fulfilled') setLosers(lossRes.value.data.losers.slice(0, 5));
      } catch {}
      setLoading(false);
    };
    fetchData();

    // Fetch AI recommendations async
    api.post('/ai/recommend', { riskProfile: 'moderate' }).then(res => {
      if (res.data.success) setRecommendations(res.data.recommendations);
    }).catch(() => {});
  }, []);

  const biasProfile = user?.behaviouralProfile?.investorType || 'rational';
  const biasScore = user?.behaviouralProfile?.biasScore || {};
  const topBias = Object.entries(biasScore).sort((a, b) => b[1] - a[1])[0];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Welcome header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '4px' }}>
            Hey {user?.name?.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#64748b' }}>Here's your investment overview for today</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/stocks" style={{ padding: '10px 20px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={16} /> Trade Now
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        <StatCard label="Virtual Balance" value={`₹${(user?.virtualCoins || 0).toLocaleString('en-IN')}`} subtitle="Available to invest" icon="💰" color="#f59e0b" change={1} />
        <StatCard label="Portfolio Value" value={`₹${((portfolio?.currentValue || 0)).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} subtitle={`${portfolio?.overallReturnPercent >= 0 ? '+' : ''}${(portfolio?.overallReturnPercent || 0).toFixed(2)}% overall`} icon="📊" color="#7c3aed" change={portfolio?.overallReturnPercent || 0} />
        <StatCard label="Today's P&L" value={`₹${(portfolio?.dayChange || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`} subtitle={`${(portfolio?.dayChangePercent || 0).toFixed(2)}% today`} icon="📈" color="#10b981" change={portfolio?.dayChange || 0} />
        <StatCard label="Investor Type" value={biasProfile.charAt(0).toUpperCase() + biasProfile.slice(1)} subtitle="Based on trading history" icon="🧠" color="#0ea5e9" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Portfolio chart */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>Portfolio Performance</h2>
            <span style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>+2.4% this month</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" hide />
              <YAxis hide />
              <Tooltip formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Portfolio Value']} contentStyle={{ background: '#16161f', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: '#f1f5f9' }} />
              <Area type="monotone" dataKey="value" stroke="#7c3aed" strokeWidth={2} fill="url(#colorVal)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Behavioural Insight */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
            <Brain size={20} color="#a855f7" />
            <h2 style={{ fontWeight: 700, fontSize: '1rem' }}>AI Behaviour Insight</h2>
          </div>
          <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(124,58,237,0.08)', borderRadius: '10px', border: '1px solid rgba(124,58,237,0.15)' }}>
            <div style={{ fontSize: '0.8rem', color: '#a855f7', fontWeight: 600, marginBottom: '4px' }}>Your Profile</div>
            <div style={{ fontWeight: 700 }}>{biasProfile.charAt(0).toUpperCase() + biasProfile.slice(1)} Investor</div>
          </div>
          {Object.entries(biasScore).slice(0, 4).map(([key, val]) => (
            <div key={key} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '4px' }}>
                <span style={{ color: '#94a3b8', textTransform: 'capitalize' }}>{key.replace(/([A-Z])/g, ' $1')}</span>
                <span style={{ color: val > 50 ? '#ef4444' : '#10b981', fontWeight: 600 }}>{val}%</span>
              </div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${val}%`, borderRadius: '2px', background: val > 50 ? 'linear-gradient(90deg,#ef4444,#f97316)' : 'linear-gradient(90deg,#10b981,#0ea5e9)', transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}
          {topBias && topBias[1] > 30 && (
            <div style={{ padding: '10px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.15)', fontSize: '0.8rem', color: '#fca5a5' }}>
              ⚠️ High {topBias[0].replace(/([A-Z])/g, ' $1')} detected. <Link to="/learn" style={{ color: '#ef4444', fontWeight: 600 }}>Learn more</Link>
            </div>
          )}
        </div>
      </div>

      {/* Gainers & Losers + Recommendations */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '24px' }}>
        {/* Top Gainers */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingUp size={18} color="#10b981" />
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Top Gainers</h3>
          </div>
          {gainers.map(stock => (
            <Link key={stock.symbol} to={`/stocks/${stock.symbol}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', textDecoration: 'none', color: 'inherit' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{stock.symbol}</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{stock.name?.substring(0, 20)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>₹{stock.price?.toFixed(2)}</div>
                <div style={{ color: '#10b981', fontSize: '0.75rem', fontWeight: 600 }}>+{stock.changePercent?.toFixed(2)}%</div>
              </div>
            </Link>
          ))}
          {gainers.length === 0 && <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>Loading...</div>}
        </div>

        {/* Top Losers */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <TrendingDown size={18} color="#ef4444" />
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>Top Losers</h3>
          </div>
          {losers.map(stock => (
            <Link key={stock.symbol} to={`/stocks/${stock.symbol}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', textDecoration: 'none', color: 'inherit' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{stock.symbol}</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{stock.name?.substring(0, 20)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 700, fontSize: '0.875rem' }}>₹{stock.price?.toFixed(2)}</div>
                <div style={{ color: '#ef4444', fontSize: '0.75rem', fontWeight: 600 }}>{stock.changePercent?.toFixed(2)}%</div>
              </div>
            </Link>
          ))}
          {losers.length === 0 && <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>Loading...</div>}
        </div>

        {/* AI Recommendations */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Target size={18} color="#a855f7" />
            <h3 style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI Picks</h3>
          </div>
          {recommendations?.recommendations?.slice(0, 5).map(rec => (
            <Link key={rec.symbol} to={`/stocks/${rec.symbol}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', textDecoration: 'none', color: 'inherit' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{rec.symbol}</div>
                <div style={{ color: '#64748b', fontSize: '0.75rem' }}>{rec.timeHorizon}</div>
              </div>
              <div>
                <span style={{ padding: '3px 10px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700, background: rec.action === 'BUY' ? 'rgba(16,185,129,0.15)' : rec.action === 'SELL' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)', color: rec.action === 'BUY' ? '#10b981' : rec.action === 'SELL' ? '#ef4444' : '#f59e0b' }}>{rec.action}</span>
              </div>
            </Link>
          ))}
          {!recommendations && <div style={{ color: '#64748b', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>AI analyzing market...</div>}
          <Link to="/stocks" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '12px', color: '#a855f7', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
            See all stocks <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}
