import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16','#14b8a6'];

const fmt    = (n, d=2) => isNaN(Number(n)) ? '—' : Number(n).toLocaleString('en-IN', { minimumFractionDigits:d, maximumFractionDigits:d });
const fmtINR = (n)      => isNaN(Number(n)) ? '₹—' : `₹${fmt(n)}`;
const fmtPct = (n)      => isNaN(Number(n)) ? '—%' : `${Number(n)>=0?'+':''}${fmt(n)}%`;
const color  = (n)      => Number(n) >= 0 ? '#10b981' : '#ef4444';

export default function Portfolio() {
  const navigate = useNavigate();
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('holdings');
  const [sellModal, setSellModal] = useState(null);
  const [sellQty,   setSellQty]   = useState(1);
  const [trading,   setTrading]   = useState(false);
  const [fixing,    setFixing]    = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/portfolio');
      setData(res.data);
    } catch (err) {
      toast.error('Failed to load portfolio');
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const fixData = async () => {
    setFixing(true);
    try {
      await axios.post('/api/portfolio/fix');
      toast.success('✅ Portfolio data fixed! Reloading...');
      setTimeout(load, 800);
    } catch { toast.error('Fix failed'); }
    setFixing(false);
  };

  const handleSell = async () => {
    if (!sellModal || sellQty <= 0 || sellQty > sellModal.quantity) return;
    setTrading(true);
    try {
      const res = await axios.post('/api/stocks/trade', {
        symbol:   sellModal.symbol,
        action:   'sell',
        quantity: sellQty,
        price:    sellModal.currentPrice,
      });
      toast.success(res.data.message);
      setSellModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Sell failed');
    }
    setTrading(false);
  };

  const s = {
    page:  { padding:'24px', maxWidth:1400, margin:'0 auto' },
    card:  { background:'rgba(13,17,35,0.92)', border:'1px solid rgba(99,102,241,0.18)', borderRadius:14, padding:20 },
    tab:   (a) => ({ padding:'9px 22px', borderRadius:10, border:'none', cursor:'pointer', fontWeight:700, fontSize:13, background:a?'#6366f1':'rgba(10,14,26,0.6)', color:a?'#fff':'#94a3b8' }),
    th:    { padding:'10px 14px', textAlign:'left', color:'#64748b', fontSize:11, fontWeight:700, borderBottom:'1px solid rgba(99,102,241,0.1)', textTransform:'uppercase' },
    td:    { padding:'12px 14px', borderBottom:'1px solid rgba(255,255,255,0.03)', fontSize:13, color:'#e2e8f0' },
  };

  if (loading) return (
    <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'80vh', flexDirection:'column', gap:16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:44, height:44, border:'3px solid rgba(99,102,241,0.2)', borderTop:'3px solid #6366f1', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <div style={{ color:'#6366f1', fontWeight:700 }}>Loading portfolio...</div>
    </div>
  );

  const holdings     = data?.holdings     || [];
  const transactions = data?.transactions || [];
  const balance      = Number(data?.virtualCoins  || 0);
  const totalInvested= Number(data?.totalInvested || 0);
  const totalCurrent = Number(data?.totalCurrent  || 0);
  const totalPnL     = Number(data?.totalPnL      || 0);
  const totalPnLPct  = Number(data?.totalPnLPct   || 0);

  const hasBadData = holdings.some(h => h.hasBadData);
  const pieData    = holdings.filter(h => h.current > 0).map(h => ({ name: h.symbol, value: h.current }));

  return (
    <div style={s.page}>
      <style>{`@keyframes fadein{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, margin:0 }}>💼 My Portfolio</h1>
          <div style={{ color:'#94a3b8', fontSize:13, marginTop:4 }}>{holdings.length} holdings</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          {hasBadData && (
            <button onClick={fixData} disabled={fixing}
              style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', border:'none', color:'#000', borderRadius:10, padding:'9px 18px', cursor:'pointer', fontWeight:800, fontSize:13 }}>
              {fixing ? '⏳ Fixing...' : '🔧 Fix P&L Data'}
            </button>
          )}
          <button onClick={() => navigate('/stocks')}
            style={{ background:'linear-gradient(135deg,#10b981,#059669)', border:'none', color:'#fff', borderRadius:10, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
            📈 Buy Stocks
          </button>
          <button onClick={load}
            style={{ background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#818cf8', borderRadius:10, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Bad data warning */}
      {hasBadData && (
        <div style={{ background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:12, padding:'12px 18px', marginBottom:18, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20 }}>⚠️</span>
          <div>
            <div style={{ color:'#f59e0b', fontWeight:800, fontSize:13 }}>Old trades have missing price data</div>
            <div style={{ color:'#94a3b8', fontSize:12 }}>Click "Fix P&L Data" to patch with real prices. P&L may show ₹0 until fixed.</div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))', gap:14, marginBottom:20 }}>
        {[
          { label:'Total Invested',  val:fmtINR(totalInvested), icon:'💰', col:'#e2e8f0' },
          { label:'Current Value',   val:fmtINR(totalCurrent),  icon:'📊', col:'#e2e8f0' },
          { label:'Total P&L',       val:fmtINR(totalPnL),      icon:totalPnL>=0?'📈':'📉', col:color(totalPnL), sub:fmtPct(totalPnLPct) },
          { label:'P&L %',           val:fmtPct(totalPnLPct),   icon:'🎯', col:color(totalPnLPct) },
          { label:'Virtual Coins',   val:fmtINR(balance),       icon:'🪙', col:'#f59e0b' },
        ].map(item => (
          <div key={item.label} style={{ ...s.card, padding:'16px 18px' }}>
            <div style={{ display:'flex', justifyContent:'space-between' }}>
              <div style={{ color:'#64748b', fontSize:11, fontWeight:600 }}>{item.label}</div>
              <span>{item.icon}</span>
            </div>
            <div style={{ color:item.col, fontWeight:900, fontSize:18, marginTop:6 }}>{item.val}</div>
            {item.sub && <div style={{ color:item.col, fontSize:11, marginTop:2, fontWeight:700 }}>{item.sub}</div>}
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:6, marginBottom:18 }}>
        {[['holdings','📋 Holdings'],['analytics','📊 Analytics'],['transactions','🔄 Transactions']].map(([id,label])=>(
          <button key={id} style={s.tab(tab===id)} onClick={()=>setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── HOLDINGS ── */}
      {tab==='holdings' && (
        <div style={{ animation:'fadein 0.3s ease' }}>
          {holdings.length === 0 ? (
            <div style={{ ...s.card, textAlign:'center', padding:60 }}>
              <div style={{ fontSize:52, marginBottom:12 }}>📭</div>
              <h2>No Holdings Yet</h2>
              <p style={{ color:'#94a3b8', marginBottom:20 }}>Buy stocks to start your portfolio</p>
              <button onClick={()=>navigate('/stocks')}
                style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', padding:'12px 28px', borderRadius:12, cursor:'pointer', fontWeight:800, fontSize:14 }}>
                📈 Browse Stocks
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, alignItems:'start' }}>
              {/* Table */}
              <div style={s.card}>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>📋 Holdings</div>
                <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>
                        {['Stock','Qty','Avg Buy','Current','P&L','P&L %','Value','Action'].map(h=>(
                          <th key={h} style={s.th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {holdings.map(h=>(
                        <tr key={h.symbol}
                          onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,0.05)'}
                          onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                          <td style={s.td} onClick={()=>navigate(`/stocks/${h.symbol}`)} className="cursor-pointer">
                            <div style={{ fontWeight:800 }}>{h.symbol}</div>
                            <div style={{ color:'#64748b', fontSize:11 }}>{h.name}</div>
                          </td>
                          <td style={{ ...s.td, color:'#94a3b8', fontWeight:700 }}>{h.quantity}</td>
                          <td style={{ ...s.td, color:'#94a3b8' }}>
                            {h.hasBadData
                              ? <span style={{ color:'#f59e0b', fontSize:11 }}>⚠️ Unknown</span>
                              : fmtINR(h.avgPrice)}
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight:700 }}>{fmtINR(h.currentPrice)}</div>
                            {h.changePct!==0 && (
                              <div style={{ color:color(h.changePct), fontSize:10 }}>
                                {h.changePct>=0?'▲':'▼'} {Math.abs(h.changePct).toFixed(2)}%
                              </div>
                            )}
                          </td>
                          <td style={{ ...s.td, color:h.hasBadData?'#64748b':color(h.pnl), fontWeight:700 }}>
                            {h.hasBadData ? '—' : fmtINR(h.pnl)}
                          </td>
                          <td style={s.td}>
                            {h.hasBadData
                              ? <span style={{ color:'#64748b' }}>—</span>
                              : <span style={{ background:h.pnlPct>=0?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)', color:color(h.pnlPct), padding:'3px 10px', borderRadius:8, fontWeight:800, fontSize:12 }}>
                                  {fmtPct(h.pnlPct)}
                                </span>
                            }
                          </td>
                          <td style={{ ...s.td, fontWeight:700 }}>{fmtINR(h.current)}</td>
                          <td style={s.td}>
                            <div style={{ display:'flex', gap:5 }}>
                              <button onClick={()=>navigate(`/stocks/${h.symbol}`)}
                                style={{ background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#818cf8', padding:'4px 9px', borderRadius:7, cursor:'pointer', fontWeight:700, fontSize:11 }}>
                                Buy
                              </button>
                              <button onClick={()=>{ setSellModal(h); setSellQty(1); }}
                                style={{ background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.3)', color:'#ef4444', padding:'4px 9px', borderRadius:7, cursor:'pointer', fontWeight:700, fontSize:11 }}>
                                Sell
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pie */}
              <div style={s.card}>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>🥧 Allocation</div>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie data={pieData} dataKey="value" cx="50%" cy="50%" outerRadius={85}
                          label={({name,percent})=>percent>0.06?`${name} ${(percent*100).toFixed(0)}%`:''}>
                          {pieData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                        </Pie>
                        <Tooltip formatter={v=>fmtINR(v)}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ marginTop:10 }}>
                      {holdings.map((h,i)=>(
                        <div key={h.symbol} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                            <div style={{ width:9, height:9, borderRadius:'50%', background:COLORS[i%COLORS.length] }}/>
                            <span style={{ color:'#94a3b8', fontSize:12 }}>{h.symbol}</span>
                          </div>
                          <div style={{ textAlign:'right' }}>
                            <div style={{ color:'#e2e8f0', fontWeight:700, fontSize:12 }}>{fmtINR(h.current)}</div>
                            {!h.hasBadData && <div style={{ color:color(h.pnlPct), fontSize:10 }}>{fmtPct(h.pnlPct)}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                ) : <div style={{ color:'#475569', textAlign:'center', padding:30 }}>No data</div>}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS ── */}
      {tab==='analytics' && (
        <div style={{ animation:'fadein 0.3s ease', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))', gap:14 }}>
          <div style={s.card}>
            <div style={{ color:'#10b981', fontWeight:700, fontSize:14, marginBottom:12 }}>🚀 Best Performers</div>
            {holdings.filter(h=>!h.hasBadData).sort((a,b)=>b.pnlPct-a.pnlPct).slice(0,4).map(h=>(
              <div key={h.symbol} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{h.symbol}</div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:color(h.pnlPct), fontWeight:800, fontSize:12 }}>{fmtPct(h.pnlPct)}</div>
                  <div style={{ color:'#475569', fontSize:11 }}>{fmtINR(h.pnl)}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={s.card}>
            <div style={{ color:'#ef4444', fontWeight:700, fontSize:14, marginBottom:12 }}>📉 Worst Performers</div>
            {holdings.filter(h=>!h.hasBadData).sort((a,b)=>a.pnlPct-b.pnlPct).slice(0,4).map(h=>(
              <div key={h.symbol} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
                <div style={{ fontWeight:700, fontSize:13 }}>{h.symbol}</div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ color:color(h.pnlPct), fontWeight:800, fontSize:12 }}>{fmtPct(h.pnlPct)}</div>
                  <div style={{ color:'#475569', fontSize:11 }}>{fmtINR(h.pnl)}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={s.card}>
            <div style={{ fontWeight:700, fontSize:14, marginBottom:12 }}>📊 Summary</div>
            {[
              ['Holdings',       holdings.length],
              ['Total Invested', fmtINR(totalInvested)],
              ['Current Value',  fmtINR(totalCurrent)],
              ['Total P&L',      fmtINR(totalPnL),      color(totalPnL)],
              ['P&L %',          fmtPct(totalPnLPct),   color(totalPnLPct)],
              ['Cash Balance',   fmtINR(balance),        '#f59e0b'],
              ['Total Assets',   fmtINR(totalCurrent+balance)],
            ].map(([label,val,col])=>(
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
                <span style={{ color:'#64748b', fontSize:12 }}>{label}</span>
                <span style={{ color:col||'#e2e8f0', fontWeight:700, fontSize:12 }}>{val}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── TRANSACTIONS ── */}
      {tab==='transactions' && (
        <div style={{ animation:'fadein 0.3s ease' }}>
          <div style={s.card}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>🔄 Transaction History</div>
            {transactions.length===0
              ? <div style={{ textAlign:'center', padding:40, color:'#94a3b8' }}>No transactions yet</div>
              : <div style={{ overflowX:'auto' }}>
                  <table style={{ width:'100%', borderCollapse:'collapse' }}>
                    <thead>
                      <tr>{['Date','Stock','Action','Qty','Price','Total'].map(h=>(
                        <th key={h} style={s.th}>{h}</th>
                      ))}</tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx,i)=>{
                        const act   = (tx.action||tx.type||'').toLowerCase();
                        const price = Number(tx.price      || 0);
                        const qty   = Number(tx.quantity   || 0);
                        const total = Number(tx.totalAmount|| tx.total || price*qty || 0);
                        return (
                          <tr key={i}
                            onMouseEnter={e=>e.currentTarget.style.background='rgba(99,102,241,0.04)'}
                            onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                            <td style={{ ...s.td, color:'#64748b', fontSize:11 }}>
                              {new Date(tx.date||tx.createdAt||Date.now()).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                            </td>
                            <td style={s.td}>
                              <div style={{ fontWeight:700 }}>{tx.symbol}</div>
                              <div style={{ color:'#64748b', fontSize:11 }}>{tx.name}</div>
                            </td>
                            <td style={s.td}>
                              <span style={{ background:act==='buy'?'rgba(16,185,129,0.12)':'rgba(239,68,68,0.12)', color:act==='buy'?'#10b981':'#ef4444', padding:'3px 12px', borderRadius:20, fontWeight:800, fontSize:11 }}>
                                {act==='buy'?'📈 BUY':'📉 SELL'}
                              </span>
                            </td>
                            <td style={{ ...s.td, color:'#94a3b8', fontWeight:700 }}>{qty}</td>
                            <td style={{ ...s.td, color:'#94a3b8' }}>
                              {price>0 ? fmtINR(price) : <span style={{color:'#f59e0b',fontSize:11}}>⚠️ Unknown</span>}
                            </td>
                            <td style={{ ...s.td, color:act==='buy'?'#ef4444':'#10b981', fontWeight:700 }}>
                              {act==='buy'?'-':'+'}{total>0?fmtINR(total):'—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
            }
          </div>
        </div>
      )}

      {/* ── Sell Modal ── */}
      {sellModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:9999, backdropFilter:'blur(8px)' }}>
          <div style={{ background:'rgba(13,17,35,0.98)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:18, padding:28, width:360, maxWidth:'92vw' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontWeight:900, fontSize:18 }}>📉 Sell {sellModal.symbol}</div>
              <button onClick={()=>setSellModal(null)} style={{ background:'none', border:'none', color:'#64748b', cursor:'pointer', fontSize:22 }}>✕</button>
            </div>
            {[
              ['Current Price', fmtINR(sellModal.currentPrice), '#e2e8f0'],
              ['Avg Buy Price', sellModal.hasBadData?'⚠️ Unknown':fmtINR(sellModal.avgPrice), '#94a3b8'],
              ['Shares Held',   sellModal.quantity, '#94a3b8'],
              ['Unrealised P&L',sellModal.hasBadData?'—':fmtPct(sellModal.pnlPct), color(sellModal.pnlPct)],
            ].map(([label,val,col])=>(
              <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(99,102,241,0.08)' }}>
                <span style={{ color:'#64748b', fontSize:13 }}>{label}</span>
                <span style={{ color:col, fontWeight:700, fontSize:13 }}>{val}</span>
              </div>
            ))}
            <div style={{ margin:'18px 0' }}>
              <div style={{ color:'#64748b', fontSize:12, fontWeight:600, marginBottom:8 }}>QUANTITY</div>
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <button onClick={()=>setSellQty(q=>Math.max(1,q-1))}
                  style={{ background:'rgba(10,14,26,0.7)', border:'1px solid rgba(99,102,241,0.2)', color:'#94a3b8', width:36, height:36, borderRadius:8, cursor:'pointer', fontSize:18, fontWeight:700 }}>−</button>
                <input type="number" min={1} max={sellModal.quantity} value={sellQty}
                  onChange={e=>setSellQty(Math.min(sellModal.quantity,Math.max(1,parseInt(e.target.value)||1)))}
                  style={{ flex:1, background:'rgba(10,14,26,0.7)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:8, color:'#e2e8f0', padding:8, fontSize:16, fontWeight:800, textAlign:'center', outline:'none' }}/>
                <button onClick={()=>setSellQty(q=>Math.min(sellModal.quantity,q+1))}
                  style={{ background:'rgba(10,14,26,0.7)', border:'1px solid rgba(99,102,241,0.2)', color:'#94a3b8', width:36, height:36, borderRadius:8, cursor:'pointer', fontSize:18, fontWeight:700 }}>+</button>
              </div>
              <div style={{ display:'flex', gap:6, marginTop:8 }}>
                {[1,Math.ceil(sellModal.quantity/2),sellModal.quantity].filter((v,i,a)=>a.indexOf(v)===i&&v>0).map(n=>(
                  <button key={n} onClick={()=>setSellQty(n)}
                    style={{ flex:1, background:sellQty===n?'rgba(239,68,68,0.15)':'rgba(10,14,26,0.5)', border:`1px solid ${sellQty===n?'rgba(239,68,68,0.4)':'rgba(99,102,241,0.1)'}`, color:sellQty===n?'#ef4444':'#475569', borderRadius:6, padding:'5px 0', cursor:'pointer', fontSize:11, fontWeight:700 }}>
                    {n===sellModal.quantity?'All':n}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.15)', borderRadius:10, padding:'12px 16px', marginBottom:18 }}>
              <div style={{ display:'flex', justifyContent:'space-between' }}>
                <span style={{ color:'#64748b', fontSize:13 }}>You receive</span>
                <span style={{ color:'#10b981', fontWeight:900, fontSize:16 }}>{fmtINR(sellModal.currentPrice * sellQty)}</span>
              </div>
            </div>
            <button onClick={handleSell} disabled={trading}
              style={{ width:'100%', padding:13, borderRadius:12, border:'none', background:trading?'rgba(100,116,139,0.3)':'linear-gradient(135deg,#ef4444,#dc2626)', color:'#fff', fontWeight:900, fontSize:15, cursor:trading?'not-allowed':'pointer' }}>
              {trading?'⏳ Processing...':`📉 Sell ${sellQty} × ${sellModal.symbol}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}