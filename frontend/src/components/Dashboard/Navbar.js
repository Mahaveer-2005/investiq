import React, { useState, useEffect } from 'react';
import { Bell, Search, LogOut, Wallet } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

export default function Navbar() {
  const { user, logout } = useAuth();
  const [indices, setIndices] = useState({});

  useEffect(() => {
    fetchIndices();
    const interval = setInterval(fetchIndices, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchIndices = async () => {
    try { const res = await axios.get('/api/indices'); setIndices(res.data); } catch (e) {}
  };

  return (
    <nav style={{ position:'fixed', top:0, right:0, left:240, zIndex:100, height:64, background:'rgba(10,15,30,0.97)', backdropFilter:'blur(20px)', borderBottom:'1px solid #1e293b', display:'flex', alignItems:'center', padding:'0 24px', gap:16 }}>
      <div style={{ display:'flex', gap:24, flex:1, overflow:'hidden' }}>
        {Object.entries(indices).slice(0,5).map(([key, data]) => (
          <div key={key} style={{ display:'flex', flexDirection:'column', minWidth:90 }}>
            <span style={{ fontSize:10, color:'var(--text-muted)', fontFamily:'var(--font-mono)' }}>{data?.name || key}</span>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ fontSize:12, fontWeight:600, fontFamily:'var(--font-mono)' }}>{data?.value?.toLocaleString('en-IN')}</span>
              <span style={{ fontSize:11, color: data?.changePercent >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                {data?.changePercent >= 0 ? '▲' : '▼'}{Math.abs(data?.changePercent || 0).toFixed(2)}%
              </span>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:8, padding:'6px 12px' }}>
        <Wallet size={14} style={{ color:'var(--accent-cyan)' }} />
        <span style={{ fontSize:13, fontWeight:700, color:'var(--accent-cyan)', fontFamily:'var(--font-mono)' }}>
          ₹{user?.virtualCoins?.toLocaleString('en-IN') || '1,00,000'}
        </span>
      </div>
      <button style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-secondary)', padding:8, borderRadius:8, position:'relative' }}>
        <Bell size={18} />
        <span style={{ position:'absolute', top:4, right:4, width:8, height:8, background:'var(--accent-red)', borderRadius:'50%' }}></span>
      </button>
      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
        <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, color:'#000' }}>
          {user?.name?.[0]?.toUpperCase() || 'U'}
        </div>
        <div>
          <p style={{ fontSize:13, fontWeight:600 }}>{user?.name}</p>
          <p style={{ fontSize:11, color:'var(--text-muted)', textTransform:'capitalize' }}>{user?.riskProfile}</p>
        </div>
        <button onClick={logout} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:8, borderRadius:8 }}>
          <LogOut size={16} />
        </button>
      </div>
    </nav>
  );
}
