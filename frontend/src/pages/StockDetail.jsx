import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { stocksAPI, tradesAPI } from '../services/api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [stock, setStock] = useState(null);
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(true);
  const [tradeForm, setTradeForm] = useState({ type: 'BUY', quantity: 1 });
  const [trading, setTrading] = useState(false);
  const [advisory, setAdvisory] = useState(null);
  const [confirmTrade, setConfirmTrade] = useState(false);

  useEffect(() => {
    stocksAPI.getOne(symbol).then(s => { setStock(s); setLoading(false); }).catch(() => { setLoading(false); });
  }, [symbol]);

  const getAnalysis = async () => {
    setAnalysis('Loading AI analysis...');
    try {
      const res = await stocksAPI.analyze(symbol);
      setAnalysis(res.analysis);
    } catch { setAnalysis('AI analysis unavailable. Configure Anthropic API key.'); }
  };

  const handleTrade = async (force = false) => {
    if (!stock) return;
    setTrading(true);
    try {
      const res = await tradesAPI.execute({ symbol, type: tradeForm.type, quantity: tradeForm.quantity, skipWarning: force });
      if (res.requiresConfirmation) {
        setAdvisory(res.advisory);
        setConfirmTrade(true);
      } else {
        toast.success(`${tradeForm.type} order executed! ₹${res.trade.totalAmount?.toFixed(0)}`);
        updateUser({ virtualCoins: res.remainingCoins });
        setAdvisory(res.advisory);
        setConfirmTrade(false);
      }
    } catch (err) {
      toast.error(err?.error || 'Trade failed');
    }
    setTrading(false);
  };

  const totalCost = stock ? stock.price * tradeForm.quantity : 0;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>;
  if (!stock) return <div style={{ padding: 40, textAlign: 'center' }}><button className="btn-secondary" onClick={() => navigate('/stocks')}>← Back to Stocks</button></div>;

  return (
    <div style={{ animation: 'slideUp 0.4s ease' }}>
      <button className="btn-secondary" onClick={() => navigate('/stocks')} style={{ marginBottom: 20, fontSize: 13, padding: '8px 16px' }}>← Back</button>

      {/* Stock Header */}
      <div className="card" style={{ padding: 28, marginBottom: 20, background: 'linear-gradient(135deg, rgba(0,212,170,0.05), rgba(59,130,246,0.05))' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg, rgba(0,212,170,0.2), rgba(59,130,246,0.2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: 'var(--accent-green)' }}>
                {symbol.replace('.BSE','').substring(0,3)}
              </div>
              <div>
                <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 26 }}>{symbol.replace('.BSE','')}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{stock.name} · {stock.exchange}</p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
              <span style={{ fontSize: 36, fontWeight: 800 }}>₹{stock.price?.toFixed(2)}</span>
              <span style={{ fontSize: 16, color: stock.changePercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                {stock.changePercent >= 0 ? '▲' : '▼'} {Math.abs(stock.changePercent||0).toFixed(2)}% (₹{Math.abs(stock.change||0).toFixed(2)})
              </span>
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: 12, color: 'var(--text-secondary)' }}>
              {[['Open', `₹${stock.open?.toFixed(2)}`], ['High', `₹${stock.high?.toFixed(2)}`], ['Low', `₹${stock.low?.toFixed(2)}`], ['Vol', (stock.volume/1000).toFixed(0)+'K'], ['P/E', stock.pe]].map(([k,v]) => (
                <span key={k}>{k}: <strong style={{ color: 'var(--text-primary)' }}>{v}</strong></span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-blue">{stock.sector}</span>
            <span className="badge badge-green">{stock.country === 'IN' ? '🇮🇳 NSE' : '🇺🇸 NASDAQ'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
        <div>
          {/* Chart */}
          <div className="card" style={{ padding: 20, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 16, fontSize: 16 }}>Price Chart (30 Days)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={stock.chartData || []}>
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={stock.changePercent >= 0 ? '#00D4AA' : '#EF4444'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={stock.changePercent >= 0 ? '#00D4AA' : '#EF4444'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} />
                <YAxis tick={{ fill: '#475569', fontSize: 10 }} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8 }} />
                <Area type="monotone" dataKey="price" stroke={stock.changePercent >= 0 ? '#00D4AA' : '#EF4444'} fill="url(#cg)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* AI Analysis */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600, fontSize: 16 }}>🤖 AI Analysis</h3>
              {!analysis && <button className="btn-primary" onClick={getAnalysis} style={{ fontSize: 12, padding: '6px 14px' }}>Analyze with AI</button>}
            </div>
            {analysis ? (
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{analysis}</div>
            ) : (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 13 }}>Click "Analyze with AI" for intelligent stock analysis, estimated returns, and buy/sell recommendation.</div>
            )}
          </div>
        </div>

        {/* Trade Panel */}
        <div>
          <div className="card" style={{ padding: 24, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 20 }}>Place Order</h3>
            
            {/* Buy/Sell Toggle */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              {['BUY', 'SELL'].map(t => (
                <button key={t} onClick={() => setTradeForm({...tradeForm, type: t})} style={{ padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: tradeForm.type === t ? (t === 'BUY' ? 'var(--accent-green)' : 'var(--accent-red)') : 'rgba(255,255,255,0.05)', color: tradeForm.type === t ? '#0A0E1A' : 'var(--text-secondary)', transition: 'all 0.2s', fontFamily: 'Space Grotesk, sans-serif' }}>{t}</button>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Quantity</label>
              <input className="input" type="number" min="1" value={tradeForm.quantity} onChange={e => setTradeForm({...tradeForm, quantity: parseInt(e.target.value)||1})} />
            </div>

            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, marginBottom: 20 }}>
              {[['Price per share', `₹${stock.price?.toFixed(2)}`], ['Quantity', tradeForm.quantity], ['Total Cost', `₹${totalCost.toFixed(2)}`], ['Available', `₹${(user?.virtualCoins||100000).toLocaleString()}`]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>

            {/* AI Advisory warnings */}
            {advisory && advisory.warnings.length > 0 && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'var(--accent-orange)', fontWeight: 600, marginBottom: 6 }}>⚡ AI Advisory</div>
                {advisory.warnings.map((w, i) => <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>{w}</p>)}
              </div>
            )}

            {confirmTrade ? (
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12, background: 'rgba(245,158,11,0.1)', borderRadius: 8, padding: 12 }}>⚠️ AI has flagged this trade. Proceed anyway?</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <button className="btn-secondary" onClick={() => setConfirmTrade(false)} style={{ padding: '10px' }}>Cancel</button>
                  <button onClick={() => handleTrade(true)} disabled={trading} style={{ padding: '10px', background: 'var(--accent-orange)', border: 'none', color: '#0A0E1A', borderRadius: 10, cursor: 'pointer', fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif' }}>{trading ? '...' : 'Confirm'}</button>
                </div>
              </div>
            ) : (
              <button className="btn-primary" onClick={() => handleTrade()} disabled={trading} style={{ width: '100%', padding: '14px', fontSize: 15, background: tradeForm.type === 'BUY' ? 'linear-gradient(135deg, var(--accent-green), #00a882)' : 'linear-gradient(135deg, var(--accent-red), #cc3333)' }}>
                {trading ? 'Processing...' : `${tradeForm.type} ${tradeForm.quantity} share${tradeForm.quantity > 1 ? 's' : ''}`}
              </button>
            )}

            <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12 }}>⚠️ Virtual trading only. Not real money.</p>
          </div>

          {/* Key Stats */}
          <div className="card" style={{ padding: 20 }}>
            <h3 style={{ fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Key Statistics</h3>
            {[['EPS', `₹${stock.eps}`], ['Div. Yield', `${stock.dividendYield}%`], ['52W High', `₹${(stock.price*1.2)?.toFixed(0)}`], ['52W Low', `₹${(stock.price*0.75)?.toFixed(0)}`], ['Volume', `${((stock.volume||0)/1000).toFixed(0)}K`]].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <strong style={{ color: 'var(--text-primary)' }}>{v}</strong>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
