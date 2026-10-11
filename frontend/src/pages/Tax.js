import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

const fmtINR = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '₹0';
  const abs = Math.abs(num);
  if (abs >= 10000000) return `${num<0?'-':''}₹${(abs/10000000).toFixed(2)}Cr`;
  if (abs >= 100000)   return `${num<0?'-':''}₹${(abs/100000).toFixed(2)}L`;
  return `${num<0?'-':''}₹${abs.toLocaleString('en-IN',{maximumFractionDigits:0})}`;
};
const fmtPct  = (n) => `${Number(n)>=0?'+':''}${Number(n).toFixed(2)}%`;
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}); } catch { return d; } };
const pColor  = (v) => Number(v) >= 0 ? '#10b981' : '#ef4444';

const card = {
  background:   'rgba(13,17,35,0.88)',
  border:       '1px solid rgba(99,102,241,0.15)',
  borderRadius: 14,
  padding:      20,
};

function exportCSV(trades, fname) {
  const hdr = ['Symbol','Name','Buy Date','Sell Date','Qty','Buy ₹','Sell ₹','Gain/Loss','Gain%','Days','Type','Tax%'];
  const rows = trades.map(t=>[t.symbol,t.name,fmtDate(t.buyDate),fmtDate(t.sellDate),t.qty,t.buyPrice,t.sellPrice,t.gain,t.gainPct,t.holdingDays,t.type,t.taxRate]);
  const csv  = [hdr,...rows].map(r=>r.join(',')).join('\n');
  const a    = document.createElement('a');
  a.href     = 'data:text/csv;charset=utf-8,'+encodeURIComponent(csv);
  a.download = fname; a.click();
}

export default function Tax() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('summary');
  const [fy,      setFY]      = useState('');
  const [search,  setSearch]  = useState('');

  // ── Buy/Sell simulator state ──────────────────────────────────────────
  const [buyAmount,     setBuyAmount]     = useState('10000');
  const [buyResult,     setBuyResult]     = useState(null);
  const [sellBuyValue,  setSellBuyValue]  = useState('10000');
  const [sellSellValue, setSellSellValue] = useState('12000');
  const [sellHoldDays,  setSellHoldDays]  = useState('30');
  const [sellResult,    setSellResult]    = useState(null);
  const [simLoading,    setSimLoading]    = useState(false);

  const runBuySimulation = async () => {
    setSimLoading(true);
    try {
      const { data } = await axios.post('/api/tax/simulate-buy', { amount: Number(buyAmount) });
      setBuyResult(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not calculate');
    }
    setSimLoading(false);
  };

  const runSellSimulation = async () => {
    setSimLoading(true);
    try {
      const { data } = await axios.post('/api/tax/simulate-sell', {
        buyValue: Number(sellBuyValue), sellValue: Number(sellSellValue), holdingDays: Number(sellHoldDays),
      });
      setSellResult(data);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not calculate');
    }
    setSimLoading(false);
  };

  const load = useCallback(async (fyVal) => {
    setLoading(true);
    try {
      const url = fyVal ? `/api/tax?fy=${fyVal}` : '/api/tax';
      const { data: d } = await axios.get(url, { timeout: 15000 });
      setData(d);
      if (!fyVal && d.availableFYs?.length > 0)
        setFY(d.availableFYs[d.availableFYs.length - 1]);
      else if (d.fy) setFY(d.fy);
    } catch {
      // Fallback: call demo endpoint directly
      try {
        const { data: demo } = await axios.get('/api/tax/demo', { timeout: 8000 });
        setData(demo); setFY(demo.fy);
      } catch {}
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filter = (arr) => {
    if (!search || !arr) return arr || [];
    const q = search.toUpperCase();
    return arr.filter(t => t.symbol.includes(q) || t.name.toLowerCase().includes(search.toLowerCase()));
  };

  if (loading) return (
    <div style={{ display:'flex',justifyContent:'center',alignItems:'center',height:'80vh',flexDirection:'column',gap:16 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:.4}50%{opacity:1}}`}</style>
      <div style={{ width:48,height:48,border:'3px solid rgba(99,102,241,0.2)',borderTop:'3px solid #6366f1',borderRadius:'50%',animation:'spin 0.8s linear infinite' }}/>
      <div style={{ color:'#6366f1',fontWeight:700,fontSize:16,animation:'pulse 1.5s infinite' }}>Loading Tax Statement...</div>
    </div>
  );

  if (!data) return (
    <div style={{ display:'flex',justifyContent:'center',alignItems:'center',height:'60vh',flexDirection:'column',gap:12 }}>
      <div style={{ fontSize:40 }}>⚠️</div>
      <div style={{ color:'#ef4444',fontWeight:700 }}>Failed to load tax data</div>
      <button onClick={()=>load()} style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)',border:'none',color:'#fff',padding:'10px 24px',borderRadius:10,cursor:'pointer',fontWeight:700 }}>Retry</button>
    </div>
  );

  const { summary, stcgTrades, ltcgTrades, unrealized, monthly, availableFYs, isDemo } = data;
  const allTrades = [...(stcgTrades||[]),...(ltcgTrades||[])].sort((a,b)=>new Date(b.sellDate)-new Date(a.sellDate));

  const DemoBadge = () => isDemo ? (
    <span style={{ marginLeft:8,background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.3)',color:'#818cf8',padding:'2px 9px',borderRadius:8,fontSize:11,fontWeight:700 }}>
      📺 Demo
    </span>
  ) : null;

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>
      <style>{`
        @keyframes fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .tb { padding:9px 18px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;border:none;transition:all 0.2s; }
        .tb:hover { opacity:.85; }
        .tr:hover { background:rgba(99,102,241,0.05) !important; }
        .si { background:rgba(10,14,26,0.7);border:1px solid rgba(99,102,241,0.2);color:#e2e8f0;border-radius:10px;padding:8px 14px;font-size:13px;outline:none; }
        .si:focus { border-color:rgba(99,102,241,0.5); }
        .step { background:rgba(99,102,241,0.07);border:1px solid rgba(99,102,241,0.15);border-radius:12px;padding:14px;display:flex;gap:12px;align-items:flex-start; }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom:20,animation:'fadein 0.4s ease' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12 }}>
          <div>
            <h1 style={{ fontSize:28,fontWeight:900,marginBottom:6 }}>🧾 Tax & P&L Statement</h1>
            <p style={{ color:'#94a3b8',margin:0 }}>STCG / LTCG breakdown · Tax estimation · Loss harvesting · ITR-ready CSV</p>
          </div>
          <div style={{ display:'flex',gap:8,flexWrap:'wrap',alignItems:'center' }}>
            {isDemo && <span style={{ background:'rgba(99,102,241,0.1)',border:'1px solid rgba(99,102,241,0.3)',color:'#818cf8',padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:700 }}>📺 Demo Mode — No trades yet</span>}
            {(availableFYs||[]).map(f=>(
              <button key={f} onClick={()=>{setFY(f);if(!isDemo)load(f);}}
                style={{ padding:'6px 14px',borderRadius:20,fontSize:12,fontWeight:700,cursor:'pointer',border:'none',
                  background:fy===f?'linear-gradient(135deg,#6366f1,#8b5cf6)':'rgba(99,102,241,0.1)',
                  color:fy===f?'#fff':'#94a3b8' }}>
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Demo guide */}
      {isDemo && (
        <div style={{ background:'rgba(99,102,241,0.06)',border:'1px solid rgba(99,102,241,0.25)',borderRadius:14,padding:20,marginBottom:20,animation:'fadein 0.4s ease' }}>
          <div style={{ fontWeight:900,fontSize:16,color:'#818cf8',marginBottom:8 }}>👋 No trades yet — showing sample data</div>
          <p style={{ color:'#94a3b8',fontSize:13,lineHeight:1.7,margin:'0 0 16px' }}>
            Your real tax statement appears automatically once you complete buy → sell trades.
          </p>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(190px,1fr))',gap:10,marginBottom:16 }}>
            {[
              {n:'1',icon:'📈',t:'Go to Stocks',    d:'Search 500+ NSE stocks'},
              {n:'2',icon:'💸',t:'Buy a stock',     d:'Use your ₹1,00,000 virtual coins'},
              {n:'3',icon:'💰',t:'Sell the stock',  d:'Sell anytime to book a gain/loss'},
              {n:'4',icon:'🧾',t:'See real tax data',d:'Return here for your actual STCG/LTCG'},
            ].map(s=>(
              <div key={s.n} className="step">
                <div style={{ width:28,height:28,borderRadius:'50%',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:13,color:'#fff',flexShrink:0 }}>{s.n}</div>
                <div>
                  <div style={{ fontWeight:700,fontSize:13,color:'#e2e8f0',marginBottom:3 }}>{s.icon} {s.t}</div>
                  <div style={{ fontSize:12,color:'#64748b',lineHeight:1.5 }}>{s.d}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display:'flex',gap:10,flexWrap:'wrap' }}>
            <a href="/stocks" style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',padding:'10px 22px',borderRadius:10,fontWeight:700,fontSize:14,textDecoration:'none' }}>📈 Start Trading →</a>
            <a href="/portfolio" style={{ background:'rgba(16,185,129,0.12)',border:'1px solid rgba(16,185,129,0.25)',color:'#10b981',padding:'10px 22px',borderRadius:10,fontWeight:700,fontSize:14,textDecoration:'none' }}>💼 View Portfolio</a>
          </div>
        </div>
      )}

      {/* Budget notice */}
      <div style={{ background:'rgba(245,158,11,0.07)',border:'1px solid rgba(245,158,11,0.2)',borderRadius:10,padding:'10px 16px',marginBottom:20,display:'flex',gap:10 }}>
        <span>💡</span>
        <div style={{ fontSize:12,color:'#94a3b8',lineHeight:1.6 }}>
          <b style={{ color:'#f59e0b' }}>Budget 2024 (post Jul 23, 2024):</b> STCG @ <b style={{ color:'#f59e0b' }}>20%</b> · LTCG @ <b style={{ color:'#f59e0b' }}>12.5%</b> · ₹1,25,000 LTCG exemption · STT on all equity trades.
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(175px,1fr))',gap:12,marginBottom:20 }}>
        {[
          {l:'Total Realised Gain', v:fmtINR(summary.totalGain),          c:pColor(summary.totalGain),  s:`${summary.totalTrades} closed trades`      },
          {l:'STCG (< 1 year)',     v:fmtINR(summary.stcgGain),           c:pColor(summary.stcgGain),   s:`Tax: ${fmtINR(summary.stcgTax)} @ 20%`     },
          {l:'LTCG (> 1 year)',     v:fmtINR(summary.ltcgGain),           c:pColor(summary.ltcgGain),   s:`Tax: ${fmtINR(summary.ltcgTax)} @ 12.5%`   },
          {l:'Estimated Tax',       v:fmtINR(summary.totalTax),           c:'#ef4444',                  s:`Net: ${fmtINR(summary.netGainAfterTax)}`   },
          {l:'LTCG Exemption',      v:'₹1,25,000',                        c:'#10b981',                  s:'Annual limit (Budget 2024)'                 },
          {l:'Harvest Opportunity', v:fmtINR(summary.harvestOpportunity), c:'#f59e0b',                  s:'Unrealised losses to offset'               },
        ].map((s,i)=>(
          <div key={i} style={card}>
            <div style={{ color:'#64748b',fontSize:10,fontWeight:700,letterSpacing:0.8,marginBottom:8 }}>{s.l.toUpperCase()}</div>
            <div style={{ fontSize:22,fontWeight:900,color:s.c }}>{s.v}</div>
            <div style={{ color:'#475569',fontSize:11,marginTop:4 }}>{s.s}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20 }}>
        <div style={card}>
          <div style={{ fontWeight:800,fontSize:14,marginBottom:4 }}>📊 Tax Liability Breakdown <DemoBadge/></div>
          <div style={{ color:'#64748b',fontSize:12,marginBottom:16 }}>{fy}</div>
          {[
            {l:'STCG Gain',        v:summary.stcgGain||0,    c:'#f59e0b'},
            {l:'LTCG Gain',        v:summary.ltcgGain||0,    c:'#6366f1'},
            {l:'LTCG Taxable',     v:summary.ltcgTaxable||0, c:'#8b5cf6'},
            {l:'STCG Tax (20%)',   v:summary.stcgTax||0,     c:'#ef4444'},
            {l:'LTCG Tax (12.5%)', v:summary.ltcgTax||0,     c:'#dc2626'},
          ].map((row,i)=>{
            const max = Math.max(Math.abs(summary.stcgGain||0),Math.abs(summary.ltcgGain||0),1);
            return (
              <div key={i} style={{ marginBottom:12 }}>
                <div style={{ display:'flex',justifyContent:'space-between',marginBottom:4 }}>
                  <span style={{ fontSize:12,color:'#94a3b8' }}>{row.l}</span>
                  <span style={{ fontSize:12,fontWeight:700,color:pColor(row.v) }}>{fmtINR(row.v)}</span>
                </div>
                <div style={{ background:'rgba(10,14,26,0.5)',borderRadius:4,height:7 }}>
                  <div style={{ width:`${Math.min(100,(Math.abs(row.v)/max)*100)}%`,height:'100%',borderRadius:4,background:row.c,minWidth:row.v>0?'4px':'0',transition:'width 1s ease' }}/>
                </div>
              </div>
            );
          })}
        </div>
        <div style={card}>
          <div style={{ fontWeight:800,fontSize:14,marginBottom:4 }}>📅 Monthly Realised P&L <DemoBadge/></div>
          <div style={{ color:'#64748b',fontSize:12,marginBottom:12 }}>{isDemo?'Sample data — make trades to see real chart':'Closed gains/losses by month'}</div>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={monthly||[]} margin={{ top:5,right:5,left:0,bottom:0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="month" tick={{ fill:'#475569',fontSize:10 }} tickLine={false} axisLine={false} tickFormatter={m=>m.slice(5)}/>
              <YAxis tick={{ fill:'#475569',fontSize:10 }} tickLine={false} axisLine={false}
                tickFormatter={v=>v>=100000?`${(v/100000).toFixed(0)}L`:v>=1000?`${(v/1000).toFixed(0)}k`:v} width={44}/>
              <Tooltip contentStyle={{ background:'rgba(13,17,35,0.95)',border:'1px solid rgba(99,102,241,0.3)',borderRadius:8,color:'#e2e8f0',fontSize:11 }}
                formatter={v=>[fmtINR(v),'P&L']}/>
              <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)"/>
              <Bar dataKey="total" radius={[4,4,0,0]}>
                {(monthly||[]).map((m,i)=><Cell key={i} fill={m.total>=0?'#10b981':'#ef4444'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex',gap:8,marginBottom:16,flexWrap:'wrap',alignItems:'center' }}>
        {[
          {k:'summary',    lb:'📋 All Trades'    },
          {k:'stcg',       lb:'⚡ STCG Trades'   },
          {k:'ltcg',       lb:'📆 LTCG Trades'   },
          {k:'unrealized', lb:'📊 Unrealised'    },
          {k:'harvest',    lb:'🌾 Tax Harvesting'},
          {k:'simulator',  lb:'🧮 Buy/Sell Simulator'},
        ].map(t=>(
          <button key={t.k} className="tb" onClick={()=>setTab(t.k)}
            style={{ background:tab===t.k?'linear-gradient(135deg,#6366f1,#8b5cf6)':'rgba(99,102,241,0.1)',
              color:tab===t.k?'#fff':'#94a3b8',border:tab===t.k?'none':'1px solid rgba(99,102,241,0.2)' }}>
            {t.lb}
          </button>
        ))}
        <div style={{ marginLeft:'auto',display:'flex',gap:8 }}>
          <input className="si" placeholder="🔍 Search symbol..." value={search} onChange={e=>setSearch(e.target.value)} style={{ width:180 }}/>
          <button onClick={()=>exportCSV(allTrades,`InvestIQ_Tax_${isDemo?'Demo':fy}.csv`)}
            style={{ background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.25)',color:'#10b981',padding:'8px 16px',borderRadius:10,cursor:'pointer',fontWeight:700,fontSize:12 }}>
            ⬇ Export CSV
          </button>
        </div>
      </div>

      {/* Trade table */}
      {(tab==='summary'||tab==='stcg'||tab==='ltcg') && (() => {
        const trades = filter(tab==='stcg'?stcgTrades:tab==='ltcg'?ltcgTrades:allTrades);
        const totalG = trades.reduce((s,t)=>s+t.gain,0);
        const totalT = trades.filter(t=>t.gain>0).reduce((s,t)=>s+t.gain*t.taxRate/100,0);
        return (
          <div style={{ ...card,animation:'fadein 0.3s ease' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8 }}>
              <div style={{ fontWeight:800,fontSize:15 }}>
                {tab==='stcg'?'Short-Term Gains — Tax @ 20%':tab==='ltcg'?'Long-Term Gains — Tax @ 12.5%':'All Closed Trades'}
                <DemoBadge/>
              </div>
              <div style={{ display:'flex',gap:14,fontSize:12 }}>
                <span style={{ color:'#10b981' }}>✅ {trades.filter(t=>t.gain>=0).length} profit</span>
                <span style={{ color:'#ef4444' }}>❌ {trades.filter(t=>t.gain<0).length} loss</span>
              </div>
            </div>
            <div style={{ overflowX:'auto' }}>
              <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                <thead>
                  <tr style={{ borderBottom:'1px solid rgba(99,102,241,0.15)' }}>
                    {['Stock','Buy Date','Sell Date','Qty','Buy ₹','Sell ₹','Gain/Loss','Return','Days','Type','Est. Tax'].map(h=>(
                      <th key={h} style={{ padding:'8px 10px',color:'#64748b',fontWeight:700,textAlign:'left',whiteSpace:'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trades.map((t,i)=>(
                    <tr key={i} className="tr" style={{ borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
                      <td style={{ padding:'10px',fontWeight:800,color:'#e2e8f0' }}>
                        <div>{t.symbol}</div>
                        <div style={{ color:'#64748b',fontSize:10,fontWeight:400 }}>{t.name}</div>
                      </td>
                      <td style={{ padding:'10px',color:'#64748b',whiteSpace:'nowrap' }}>{fmtDate(t.buyDate)}</td>
                      <td style={{ padding:'10px',color:'#64748b',whiteSpace:'nowrap' }}>{fmtDate(t.sellDate)}</td>
                      <td style={{ padding:'10px',color:'#94a3b8' }}>{t.qty}</td>
                      <td style={{ padding:'10px',color:'#94a3b8' }}>₹{t.buyPrice?.toLocaleString('en-IN')}</td>
                      <td style={{ padding:'10px',color:'#94a3b8' }}>₹{t.sellPrice?.toLocaleString('en-IN')}</td>
                      <td style={{ padding:'10px',fontWeight:700,color:pColor(t.gain) }}>{t.gain>=0?'+':''}{fmtINR(t.gain)}</td>
                      <td style={{ padding:'10px' }}>
                        <span style={{ background:t.gain>=0?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)',color:t.gain>=0?'#10b981':'#ef4444',border:`1px solid ${t.gain>=0?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,padding:'2px 8px',borderRadius:20,fontWeight:800,fontSize:11 }}>
                          {fmtPct(t.gainPct)}
                        </span>
                      </td>
                      <td style={{ padding:'10px',color:'#64748b' }}>{t.holdingDays}d</td>
                      <td style={{ padding:'10px' }}>
                        <span style={{ background:t.type==='LTCG'?'rgba(99,102,241,0.15)':'rgba(245,158,11,0.15)',color:t.type==='LTCG'?'#818cf8':'#f59e0b',border:`1px solid ${t.type==='LTCG'?'rgba(99,102,241,0.3)':'rgba(245,158,11,0.3)'}`,padding:'2px 8px',borderRadius:20,fontWeight:800,fontSize:11 }}>
                          {t.type}
                        </span>
                      </td>
                      <td style={{ padding:'10px',fontWeight:700,color:'#ef4444' }}>
                        {t.gain>0 ? fmtINR(t.gain*t.taxRate/100) : <span style={{ color:'#10b981' }}>₹0</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop:'2px solid rgba(99,102,241,0.2)',background:'rgba(99,102,241,0.04)' }}>
                    <td colSpan={6} style={{ padding:'10px',fontWeight:800,color:'#818cf8' }}>TOTAL ({trades.length})</td>
                    <td style={{ padding:'10px',fontWeight:900,fontSize:14,color:pColor(totalG) }}>{totalG>=0?'+':''}{fmtINR(totalG)}</td>
                    <td colSpan={3}/>
                    <td style={{ padding:'10px',fontWeight:800,color:'#ef4444' }}>{fmtINR(totalT)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        );
      })()}

      {/* Unrealised */}
      {tab==='unrealized' && (
        <div style={{ ...card,animation:'fadein 0.3s ease' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16,flexWrap:'wrap',gap:8 }}>
            <div>
              <div style={{ fontWeight:800,fontSize:15 }}>📊 Unrealised Holdings <DemoBadge/></div>
              <div style={{ color:'#64748b',fontSize:12,marginTop:2 }}>Open positions — projected tax if sold today</div>
            </div>
            <div style={{ display:'flex',gap:14,fontSize:12 }}>
              <span style={{ color:'#10b981' }}>▲ {(unrealized||[]).filter(u=>u.unrealized>=0).length} gainers</span>
              <span style={{ color:'#ef4444' }}>▼ {(unrealized||[]).filter(u=>u.unrealized<0).length} losers</span>
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid rgba(99,102,241,0.15)' }}>
                  {['Stock','Qty','Avg ₹','Live ₹','Invested','Current','Unrealised','Return','Days','Tax Type','Rate'].map(h=>(
                    <th key={h} style={{ padding:'8px 10px',color:'#64748b',fontWeight:700,textAlign:'left',whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filter(unrealized).map((u,i)=>(
                  <tr key={i} className="tr" style={{ borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
                    <td style={{ padding:'10px',fontWeight:800,color:'#e2e8f0' }}>
                      <div>{u.symbol}</div>
                      <div style={{ color:'#64748b',fontSize:10,fontWeight:400 }}>{u.name}</div>
                    </td>
                    <td style={{ padding:'10px',color:'#94a3b8' }}>{u.qty}</td>
                    <td style={{ padding:'10px',color:'#94a3b8' }}>₹{u.avgPrice?.toLocaleString('en-IN')}</td>
                    <td style={{ padding:'10px',color:'#e2e8f0',fontWeight:600 }}>₹{u.livePrice?.toLocaleString('en-IN')}</td>
                    <td style={{ padding:'10px',color:'#94a3b8' }}>{fmtINR(u.invested)}</td>
                    <td style={{ padding:'10px',color:'#e2e8f0',fontWeight:700 }}>{fmtINR(u.current)}</td>
                    <td style={{ padding:'10px',fontWeight:700,color:pColor(u.unrealized) }}>{u.unrealized>=0?'+':''}{fmtINR(u.unrealized)}</td>
                    <td style={{ padding:'10px' }}>
                      <span style={{ background:u.unrealized>=0?'rgba(16,185,129,0.15)':'rgba(239,68,68,0.15)',color:u.unrealized>=0?'#10b981':'#ef4444',border:`1px solid ${u.unrealized>=0?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,padding:'2px 8px',borderRadius:20,fontWeight:800,fontSize:11 }}>
                        {fmtPct(u.unrealizedPct)}
                      </span>
                    </td>
                    <td style={{ padding:'10px',color:'#64748b' }}>{u.holdingDays}d</td>
                    <td style={{ padding:'10px' }}>
                      <span style={{ background:u.projectedType==='LTCG'?'rgba(99,102,241,0.15)':'rgba(245,158,11,0.15)',color:u.projectedType==='LTCG'?'#818cf8':'#f59e0b',border:`1px solid ${u.projectedType==='LTCG'?'rgba(99,102,241,0.3)':'rgba(245,158,11,0.3)'}`,padding:'2px 8px',borderRadius:20,fontWeight:800,fontSize:11 }}>
                        {u.projectedType}
                      </span>
                    </td>
                    <td style={{ padding:'10px',fontWeight:800,color:u.projectedType==='LTCG'?'#818cf8':'#f59e0b' }}>{u.projectedTax}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Harvest */}
      {tab==='harvest' && (() => {
        const losers = (unrealized||[]).filter(u=>u.unrealized<0).sort((a,b)=>a.unrealized-b.unrealized);
        const totalL = losers.reduce((s,u)=>s+Math.abs(u.unrealized),0);
        const save   = Math.min(totalL*0.20,(summary.stcgTax||0)+(summary.ltcgTax||0));
        return (
          <div style={{ animation:'fadein 0.3s ease' }}>
            <div style={{ ...card,marginBottom:14 }}>
              <div style={{ fontWeight:800,fontSize:15,marginBottom:8 }}>🌾 Tax Loss Harvesting <DemoBadge/></div>
              <p style={{ color:'#94a3b8',fontSize:13,lineHeight:1.7,margin:'0 0 16px' }}>
                Selling losing positions books losses that offset gains — reducing taxable income.
                You have <b style={{ color:'#f59e0b' }}>{losers.length} losing positions</b> ({fmtINR(totalL)} total loss).
                Selling could save <b style={{ color:'#10b981' }}>~{fmtINR(save)}</b> in tax.
              </p>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:10 }}>
                {[
                  {l:'Unrealised Losses',   v:fmtINR(totalL),                 c:'#ef4444'},
                  {l:'STCG Tax Owed',        v:fmtINR(summary.stcgTax||0),    c:'#f59e0b'},
                  {l:'LTCG Tax Owed',        v:fmtINR(summary.ltcgTax||0),    c:'#f59e0b'},
                  {l:'Potential Tax Saving', v:fmtINR(save),                   c:'#10b981'},
                ].map((s,i)=>(
                  <div key={i} style={{ background:'rgba(10,14,26,0.6)',border:'1px solid rgba(99,102,241,0.12)',borderRadius:10,padding:'12px 14px' }}>
                    <div style={{ color:'#64748b',fontSize:10,fontWeight:700,marginBottom:6 }}>{s.l.toUpperCase()}</div>
                    <div style={{ fontSize:20,fontWeight:900,color:s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={card}>
              <div style={{ fontWeight:800,fontSize:14,color:'#f59e0b',marginBottom:14 }}>⚠️ Positions to Consider Selling</div>
              {losers.length===0 ? (
                <div style={{ textAlign:'center',color:'#475569',padding:'40px 0' }}>
                  <div style={{ fontSize:32,marginBottom:10 }}>🎉</div>No losing positions!
                </div>
              ) : (
                <table style={{ width:'100%',borderCollapse:'collapse',fontSize:12 }}>
                  <thead>
                    <tr style={{ borderBottom:'1px solid rgba(99,102,241,0.15)' }}>
                      {['Stock','Qty','Avg ₹','Live ₹','Loss','Loss %','Days','Tax Saved if Sold'].map(h=>(
                        <th key={h} style={{ padding:'8px 10px',color:'#64748b',fontWeight:700,textAlign:'left',whiteSpace:'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {losers.map((u,i)=>(
                      <tr key={i} className="tr" style={{ borderBottom:'1px solid rgba(99,102,241,0.06)' }}>
                        <td style={{ padding:'10px',fontWeight:800,color:'#e2e8f0' }}>
                          <div>{u.symbol}</div>
                          <div style={{ color:'#64748b',fontSize:10 }}>{u.name}</div>
                        </td>
                        <td style={{ padding:'10px',color:'#94a3b8' }}>{u.qty}</td>
                        <td style={{ padding:'10px',color:'#94a3b8' }}>₹{u.avgPrice?.toLocaleString('en-IN')}</td>
                        <td style={{ padding:'10px',color:'#e2e8f0' }}>₹{u.livePrice?.toLocaleString('en-IN')}</td>
                        <td style={{ padding:'10px',fontWeight:700,color:'#ef4444' }}>{fmtINR(u.unrealized)}</td>
                        <td style={{ padding:'10px',color:'#ef4444',fontWeight:700 }}>{fmtPct(u.unrealizedPct)}</td>
                        <td style={{ padding:'10px',color:'#64748b' }}>{u.holdingDays}d</td>
                        <td style={{ padding:'10px',color:'#10b981',fontWeight:700 }}>~{fmtINR(Math.abs(u.unrealized)*u.projectedTax/100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <div style={{ marginTop:16,background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:10,padding:14 }}>
                <b style={{ color:'#10b981',fontSize:13 }}>📌 Disclaimer</b>
                <p style={{ color:'#64748b',fontSize:12,lineHeight:1.7,margin:'6px 0 0' }}>Virtual simulation only. Consult a CA for actual ITR filing.</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── BUY/SELL SIMULATOR ── */}
      {tab === 'simulator' && (
        <div style={{ animation:'fadein 0.3s ease', display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
          {/* Buy side */}
          <div style={card}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>🛒 Buy Cost Simulator</div>
            <label style={{ color:'#94a3b8', fontSize:12, fontWeight:600 }}>Investment Amount (₹)</label>
            <input type="number" value={buyAmount} onChange={e=>setBuyAmount(e.target.value)}
              style={{ width:'100%', padding:'12px 14px', background:'rgba(10,14,26,0.8)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:10, color:'#fff', fontSize:14, margin:'8px 0 14px', boxSizing:'border-box' }} />
            <button onClick={runBuySimulation} disabled={simLoading}
              style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', borderRadius:10, cursor:'pointer', fontWeight:700, marginBottom:16 }}>
              {simLoading ? 'Calculating...' : 'Calculate Buy Charges'}
            </button>
            {buyResult && (
              <div>
                {buyResult.breakdown.map((row,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom: row.isTotal ? 'none' : '1px solid rgba(99,102,241,0.08)',
                    fontWeight: row.isTotal ? 800 : 500, color: row.isTotal ? '#10b981' : '#94a3b8', fontSize: row.isTotal ? 14 : 12 }}>
                    <span>{row.label}</span><span>{fmtINR(row.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sell side */}
          <div style={card}>
            <div style={{ fontWeight:800, fontSize:15, marginBottom:14 }}>💰 Sell P&L Simulator</div>
            <label style={{ color:'#94a3b8', fontSize:12, fontWeight:600 }}>Buy Value (₹)</label>
            <input type="number" value={sellBuyValue} onChange={e=>setSellBuyValue(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', background:'rgba(10,14,26,0.8)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:10, color:'#fff', fontSize:14, margin:'8px 0 10px', boxSizing:'border-box' }} />
            <label style={{ color:'#94a3b8', fontSize:12, fontWeight:600 }}>Sell Value (₹)</label>
            <input type="number" value={sellSellValue} onChange={e=>setSellSellValue(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', background:'rgba(10,14,26,0.8)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:10, color:'#fff', fontSize:14, margin:'8px 0 10px', boxSizing:'border-box' }} />
            <label style={{ color:'#94a3b8', fontSize:12, fontWeight:600 }}>Holding Period (days)</label>
            <input type="number" value={sellHoldDays} onChange={e=>setSellHoldDays(e.target.value)}
              style={{ width:'100%', padding:'10px 14px', background:'rgba(10,14,26,0.8)', border:'1px solid rgba(99,102,241,0.3)', borderRadius:10, color:'#fff', fontSize:14, margin:'8px 0 14px', boxSizing:'border-box' }} />
            <button onClick={runSellSimulation} disabled={simLoading}
              style={{ width:'100%', padding:'12px', background:'linear-gradient(135deg,#10b981,#059669)', border:'none', color:'#fff', borderRadius:10, cursor:'pointer', fontWeight:700, marginBottom:16 }}>
              {simLoading ? 'Calculating...' : 'Calculate Sell Tax & P&L'}
            </button>
            {sellResult && (
              <div>
                <div style={{ background: sellResult.isLongTerm ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', border: `1px solid ${sellResult.isLongTerm ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`, borderRadius: 8, padding: '6px 10px', marginBottom: 10, fontSize: 12, fontWeight: 700, color: sellResult.isLongTerm ? '#10b981' : '#f59e0b' }}>
                  {sellResult.gainsType}
                </div>
                {sellResult.breakdown.map((row,i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom: row.isTotal ? 'none' : '1px solid rgba(99,102,241,0.08)',
                    fontWeight: (row.isTotal||row.isSubtotal) ? 800 : 500, color: row.isTotal ? (sellResult.netProfitAfterTax>=0?'#10b981':'#ef4444') : '#94a3b8', fontSize: row.isTotal ? 14 : 12 }}>
                    <span>{row.label}</span><span>{fmtINR(row.amount)}</span>
                  </div>
                ))}
                <div style={{ marginTop: 10, textAlign:'center', color:'#64748b', fontSize: 12 }}>Effective return: <b style={{ color: sellResult.effectiveReturnPct >= 0 ? '#10b981' : '#ef4444' }}>{sellResult.effectiveReturnPct}%</b></div>
              </div>
            )}
          </div>

          <div style={{ ...card, gridColumn: '1 / -1', background:'rgba(99,102,241,0.05)', border:'1px solid rgba(99,102,241,0.15)' }}>
            <p style={{ color:'#94a3b8', fontSize:12, lineHeight:1.7, margin:0 }}>
              ℹ️ Rates: STT 0.1% (buy+sell), Exchange charge ~0.003%, GST 18% on brokerage+exchange+SEBI charges, Stamp duty 0.015% (buy only), STCG 20%, LTCG 12.5% above ₹1.25L exemption/year (post July 2024 rules). Rates can change — verify current official guidance before real trading. Not tax or legal advice.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}