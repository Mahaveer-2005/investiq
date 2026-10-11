import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

export default function PortfolioPage() {
  const { user } = useAuth();
  const [portfolio, setPortfolio] = useState(null);
  const [trades, setTrades] = useState([]);
  const [behavior, setBehavior] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([axios.get('/api/portfolio'), axios.get('/api/portfolio/trades'), axios.get('/api/ai/behavior')])
      .then(([pRes, tRes, bRes]) => { setPortfolio(pRes.data); setTrades(tRes.data); setBehavior(bRes.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const pnlColor = (v) => v >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:26, fontWeight:800, marginBottom:4 }}>💼 My Portfolio</h1>
        <p style={{ color:'#94a3b8' }}>Your holdings, P&L, trade history, and behavioral analysis</p>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16, marginBottom:24 }}>
        {[
          { icon:'💰', label:'Available Coins', value:`Rs.${(user?.virtualCoins||0).toLocaleString('en-IN')}`, color:'#6c63ff' },
          { icon:'📊', label:'Portfolio Value', value:`Rs.${(portfolio?.currentValue||0).toLocaleString('en-IN')}`, color:'#00d4aa' },
          { icon:'💼', label:'Total Invested', value:`Rs.${(portfolio?.totalInvested||0).toLocaleString('en-IN')}`, color:'#f59e0b' },
          { icon:'📈', label:'Total P&L', value:`${portfolio?.totalPnL>=0?'+':''}Rs.${(portfolio?.totalPnL||0).toLocaleString('en-IN')}`, color: pnlColor(portfolio?.totalPnL||0) },
        ].map(s => (
          <div key={s.label} style={{ padding:20, background:'#111827', border:`1px solid ${s.color}33`, borderRadius:16 }}>
            <div style={{ fontSize:28, marginBottom:8 }}>{s.icon}</div>
            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.value}</div>
            <div style={{ fontSize:12, color:'#94a3b8', marginTop:4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Holdings */}
      <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:24, marginBottom:24 }}>
        <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Current Holdings</h2>
        {loading ? <div style={{ color:'#94a3b8', textAlign:'center', padding:40 }}>Loading...</div> :
        portfolio?.holdings?.length === 0 ? (
          <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>
            <div style={{ fontSize:48, marginBottom:16 }}>📭</div>
            <div>No holdings yet. Start trading to build your portfolio!</div>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr>
                  {['Stock','Qty','Avg Price','Current Price','Invested','Value','P&L','P&L %'].map(h => (
                    <th key={h} style={{ padding:'10px 12px', color:'#94a3b8', fontWeight:600, fontSize:12, textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {portfolio?.holdings?.map(h => (
                  <tr key={h.symbol} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding:'12px', fontWeight:700 }}>{h.symbol.replace('.NS','')}</td>
                    <td style={{ padding:'12px', color:'#94a3b8' }}>{h.quantity}</td>
                    <td style={{ padding:'12px' }}>Rs.{h.avgBuyPrice?.toFixed(2)}</td>
                    <td style={{ padding:'12px' }}>Rs.{h.currentPrice?.toFixed(2)}</td>
                    <td style={{ padding:'12px' }}>Rs.{h.totalInvested?.toLocaleString('en-IN')}</td>
                    <td style={{ padding:'12px' }}>Rs.{h.currentValue?.toLocaleString('en-IN')}</td>
                    <td style={{ padding:'12px', color: pnlColor(h.pnl), fontWeight:600 }}>{h.pnl>=0?'+':''}Rs.{h.pnl?.toFixed(0)}</td>
                    <td style={{ padding:'12px', color: pnlColor(h.pnlPercent), fontWeight:600 }}>{h.pnlPercent>=0?'+':''}{h.pnlPercent?.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Trade History */}
      <div style={{ background:'#111827', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:24, marginBottom:24 }}>
        <h2 style={{ fontSize:18, fontWeight:700, marginBottom:20 }}>Trade History</h2>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr>
                {['Date','Symbol','Type','Qty','Price','Amount'].map(h => (
                  <th key={h} style={{ padding:'10px 12px', color:'#94a3b8', fontWeight:600, fontSize:12, textAlign:'left', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {trades.slice(0,20).map(t => (
                <tr key={t._id} style={{ borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding:'10px 12px', color:'#94a3b8', fontSize:12 }}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td style={{ padding:'10px 12px', fontWeight:600 }}>{t.symbol.replace('.NS','')}</td>
                  <td style={{ padding:'10px 12px' }}>
                    <span style={{ padding:'2px 10px', borderRadius:6, background: t.type==='buy'?'rgba(34,197,94,0.15)':'rgba(239,68,68,0.15)', color: t.type==='buy'?'#22c55e':'#ef4444', fontSize:12, fontWeight:700 }}>{t.type.toUpperCase()}</span>
                  </td>
                  <td style={{ padding:'10px 12px', color:'#94a3b8' }}>{t.quantity}</td>
                  <td style={{ padding:'10px 12px' }}>Rs.{t.price?.toFixed(2)}</td>
                  <td style={{ padding:'10px 12px', fontWeight:600 }}>Rs.{t.totalAmount?.toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {trades.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:30, color:'#94a3b8' }}>No trades yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
