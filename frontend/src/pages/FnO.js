import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function FnO() {
  const [stocks, setStocks] = useState([]);
  const [options, setOptions] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    axios.get('/api/fno/stocks').then(r => setStocks(r.data)).catch(()=>{});
  }, []);

  const loadOptions = async (symbol) => {
    setSelected(symbol);
    const res = await axios.get(`/api/fno/options/${symbol}`);
    setOptions(res.data);
  };

  return (
    <div className="page-enter">
      <h1 style={{ fontFamily:'var(--font-display)', fontSize:28, fontWeight:800, marginBottom:8, display:'flex', alignItems:'center', gap:10 }}>
        <BarChart2 size={28} style={{ color:'var(--accent-cyan)' }} /> Futures & Options
      </h1>
      <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom:28 }}>Practice F&O trading with virtual coins. Options chain for top stocks.</p>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:24 }}>
        {/* F&O Stock List */}
        <div className="glass" style={{ borderRadius:16, overflow:'hidden', maxHeight:600, overflowY:'auto' }}>
          <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-secondary)' }}>
            <h3 style={{ fontSize:14, fontWeight:700 }}>F&O Eligible Stocks</h3>
          </div>
          {stocks.map((s, i) => (
            <div key={i} onClick={() => loadOptions(s.symbol)} style={{ padding:'12px 20px', borderBottom:'1px solid #1e293b', cursor:'pointer', background: selected===s.symbol ? 'rgba(0,212,255,0.08)' : 'transparent', transition:'background 0.15s' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div>
                  <p style={{ fontSize:13, fontWeight:700 }}>{s.symbol?.replace('.BSE','')}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>Lot: {s.lotSize}</p>
                </div>
                <div style={{ textAlign:'right' }}>
                  <p style={{ fontSize:14, fontFamily:'var(--font-mono)', fontWeight:700 }}>₹{s.price?.toFixed(2)}</p>
                  <span className={s.changePercent >= 0 ? 'tag-up' : 'tag-down'}>{s.changePercent?.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Options Chain */}
        <div className="glass" style={{ borderRadius:16, overflow:'hidden' }}>
          {options ? (
            <>
              <div style={{ padding:'16px 20px', borderBottom:'1px solid var(--border)', background:'var(--bg-secondary)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3 style={{ fontSize:14, fontWeight:700 }}>{options.symbol?.replace('.BSE','')} Options Chain</h3>
                <div style={{ display:'flex', gap:12 }}>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>Spot: <b style={{ color:'var(--accent-cyan)' }}>₹{options.spotPrice?.toFixed(2)}</b></span>
                  <span style={{ fontSize:12, color:'var(--text-muted)' }}>Expiry: <b>{options.expiryDate}</b></span>
                </div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <table style={{ width:'100%', borderCollapse:'collapse' }}>
                  <thead>
                    <tr style={{ background:'var(--bg-secondary)' }}>
                      <th colSpan={4} style={{ padding:'10px', fontSize:12, color:'var(--accent-green)', borderRight:'2px solid var(--border)' }}>CALL</th>
                      <th style={{ padding:'10px', fontSize:12, color:'var(--accent-gold)', textAlign:'center' }}>Strike</th>
                      <th colSpan={4} style={{ padding:'10px', fontSize:12, color:'var(--accent-red)', borderLeft:'2px solid var(--border)' }}>PUT</th>
                    </tr>
                    <tr style={{ background:'var(--bg-secondary)', borderBottom:'1px solid var(--border)' }}>
                      {['LTP','OI','Vol','IV','Strike','IV','Vol','OI','LTP'].map((h,i) => (
                        <th key={i} style={{ padding:'8px 10px', fontSize:11, color:'var(--text-muted)', textAlign: i === 4 ? 'center' : i < 4 ? 'right' : 'left', borderRight: i===3 || i===4 ? '1px solid var(--border)' : 'none' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {options.strikes?.map((strike, i) => {
                      const isATM = Math.abs(strike.strikePrice - options.spotPrice) < 100;
                      return (
                        <tr key={i} style={{ borderBottom:'1px solid #1e293b', background: isATM ? 'rgba(255,215,0,0.05)' : 'transparent' }}>
                          <td style={{ padding:'8px 10px', fontSize:12, fontFamily:'var(--font-mono)', textAlign:'right', color:'var(--accent-green)' }}>₹{strike.CE.ltp}</td>
                          <td style={{ padding:'8px 10px', fontSize:11, fontFamily:'var(--font-mono)', textAlign:'right', color:'var(--text-muted)' }}>{(strike.CE.oi/1000).toFixed(1)}K</td>
                          <td style={{ padding:'8px 10px', fontSize:11, fontFamily:'var(--font-mono)', textAlign:'right', color:'var(--text-muted)' }}>{(strike.CE.volume/1000).toFixed(1)}K</td>
                          <td style={{ padding:'8px 10px', fontSize:11, textAlign:'right', borderRight:'1px solid var(--border)', color:'var(--text-secondary)' }}>{strike.CE.iv}%</td>
                          <td style={{ padding:'8px 10px', fontSize:13, fontWeight:700, textAlign:'center', borderRight:'1px solid var(--border)', color: isATM ? 'var(--accent-gold)' : 'var(--text-primary)', background: isATM ? 'rgba(255,215,0,0.1)' : 'transparent' }}>
                            {strike.strikePrice}
                          </td>
                          <td style={{ padding:'8px 10px', fontSize:11, color:'var(--text-secondary)' }}>{strike.PE.iv}%</td>
                          <td style={{ padding:'8px 10px', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{(strike.PE.volume/1000).toFixed(1)}K</td>
                          <td style={{ padding:'8px 10px', fontSize:11, fontFamily:'var(--font-mono)', color:'var(--text-muted)' }}>{(strike.PE.oi/1000).toFixed(1)}K</td>
                          <td style={{ padding:'8px 10px', fontSize:12, fontFamily:'var(--font-mono)', color:'var(--accent-red)' }}>₹{strike.PE.ltp}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:300, color:'var(--text-muted)' }}>
              <div style={{ textAlign:'center' }}>
                <BarChart2 size={48} style={{ marginBottom:16, color:'var(--border)' }} />
                <p>Select a stock to view options chain</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
