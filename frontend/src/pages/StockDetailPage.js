import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { stocksAPI, tradeAPI, aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function StockDetailPage() {
  const { symbol } = useParams();
  const { user, updateUser } = useAuth();
  const [stock, setStock] = useState(null);
  const [intraday, setIntraday] = useState([]);
  const [recommendation, setRecommendation] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [trading, setTrading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [sRes, iRes] = await Promise.allSettled([
          stocksAPI.getOne(symbol), stocksAPI.getIntraday(symbol)
        ]);
        if (sRes.status === 'fulfilled') setStock(sRes.value.data.data);
        if (iRes.status === 'fulfilled') setIntraday(iRes.value.data.data || []);
      } catch (e) {}
      setLoading(false);
    }
    load();
  }, [symbol]);

  const getAIRecommendation = async () => {
    setAiLoading(true);
    try {
      const res = await aiAPI.recommend(symbol);
      setRecommendation(res.data.data);
    } catch (e) { toast.error('AI recommendation unavailable'); }
    setAiLoading(false);
  };

  const handleBuy = async () => {
    if (quantity <= 0) return;
    setTrading(true);
    try {
      const res = await tradeAPI.buy({ symbol, name: stock?.name, quantity });
      toast.success(res.data.message);
      const me = await import('../services/api').then(m => m.authAPI.getMe());
      updateUser(me.data.user);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trade failed');
    }
    setTrading(false);
  };

  const handleSell = async () => {
    setTrading(true);
    try {
      const res = await tradeAPI.sell({ symbol, name: stock?.name, quantity });
      toast.success(res.data.message);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Trade failed');
    }
    setTrading(false);
  };

  const recColor = { BUY: '#10b981', SELL: '#ef4444', HOLD: '#f59e0b' };
  const cost = (stock?.price || 0) * quantity;

  if (loading) return <div style={{ padding: 40, color: 'var(--text-secondary)' }}>Loading stock data...</div>;
  if (!stock) return <div style={{ padding: 40, color: 'var(--accent-red)' }}>Stock not found</div>;

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>{stock.name}</h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <span style={{ fontFamily: 'JetBrains Mono', color: '#3b82f6', fontWeight: 600 }}>{stock.symbol}</span>
            <span className="badge badge-blue">{stock.exchange}</span>
            <span className="badge badge-blue">{stock.sector}</span>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'JetBrains Mono' }}>₹{stock.price?.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</div>
          <div style={{ color: (stock.change || 0) >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600, fontSize: 16 }}>
            {(stock.change || 0) >= 0 ? '▲ +' : '▼ '}{(stock.change || 0).toFixed(2)} ({(stock.changePercent || 0).toFixed(2)}%)
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 24 }}>
        <div>
          {/* Chart */}
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>Intraday Chart</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={intraday.slice(-78)}>
                <defs>
                  <linearGradient id="stockGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="datetime" tick={{ fill: '#4a5880', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''} interval={15} />
                <YAxis tick={{ fill: '#4a5880', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `₹${v.toFixed(0)}`} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#0d1832', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 10, color: '#f0f4ff', fontSize: 12 }} formatter={v => [`₹${Number(v).toFixed(2)}`, 'Price']} />
                <Area type="monotone" dataKey="close" stroke="#3b82f6" strokeWidth={2} fill="url(#stockGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Stats */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Market Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {[
                ['Open', `₹${stock.open?.toFixed(2)}`], ['Previous Close', `₹${(stock.price - stock.change)?.toFixed(2)}`],
                ["Day's High", `₹${stock.high?.toFixed(2)}`], ["Day's Low", `₹${stock.low?.toFixed(2)}`],
                ['Volume', (stock.volume || 0).toLocaleString('en-IN')], ['Market Cap', stock.marketCap ? `₹${(stock.marketCap/1e9).toFixed(0)}B` : 'N/A'],
              ].map(([l, v]) => (
                <div key={l} style={{ padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontWeight: 600, fontFamily: 'JetBrains Mono' }}>{v || '--'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          {/* Trade Panel */}
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 20 }}>💹 Virtual Trade</h3>
            <div style={{ marginBottom: 16, padding: '12px 16px', background: 'var(--bg-secondary)', borderRadius: 10, fontSize: 14 }}>
              <div style={{ color: 'var(--text-secondary)' }}>Available Coins</div>
              <div style={{ fontWeight: 700, color: '#f59e0b', fontFamily: 'JetBrains Mono', fontSize: 16 }}>₹{(user?.virtualCoins || 0).toLocaleString('en-IN')}</div>
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Quantity</label>
              <input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(59,130,246,0.1)', borderRadius: 10, marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Total Cost</span>
              <span style={{ fontWeight: 700, color: '#3b82f6', fontFamily: 'JetBrains Mono' }}>₹{cost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn-success" onClick={handleBuy} disabled={trading} style={{ width: '100%', padding: '14px' }}>{trading ? '...' : '🟢 BUY'}</button>
              <button className="btn-danger" onClick={handleSell} disabled={trading} style={{ width: '100%', padding: '14px' }}>{trading ? '...' : '🔴 SELL'}</button>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>Virtual trading only — no real money involved</p>
          </div>

          {/* AI Recommendation */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 700 }}>🤖 AI Analysis</h3>
              {!recommendation && <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={getAIRecommendation} disabled={aiLoading}>{aiLoading ? 'Analyzing...' : 'Get Analysis'}</button>}
            </div>
            {recommendation ? (
              <div>
                <div style={{ textAlign: 'center', padding: '20px', background: `${recColor[recommendation.recommendation]}15`, borderRadius: 14, border: `1px solid ${recColor[recommendation.recommendation]}30`, marginBottom: 16 }}>
                  <div style={{ fontSize: 36, fontWeight: 900, color: recColor[recommendation.recommendation] }}>{recommendation.recommendation}</div>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Confidence: {recommendation.confidence}%</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
                  {[['1 Week', recommendation.returns?.['1week']], ['1 Month', recommendation.returns?.['1month']], ['3 Months', recommendation.returns?.['3months']]].map(([l, v]) => (
                    <div key={l} style={{ textAlign: 'center', background: 'var(--bg-secondary)', borderRadius: 10, padding: 12 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{l}</div>
                      <div style={{ fontWeight: 700, color: v >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>{v >= 0 ? '+' : ''}{v}%</div>
                    </div>
                  ))}
                </div>
                {recommendation.biasWarning && (
                  <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.1)', borderRadius: 10, border: '1px solid rgba(245,158,11,0.2)', fontSize: 13, color: '#f59e0b' }}>
                    ⚠️ {recommendation.biasWarning}
                  </div>
                )}
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>
                Get AI-powered analysis with estimated returns and behavioral bias warnings specific to your investor profile.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
