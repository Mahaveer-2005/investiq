import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, TrendingUp, Rocket, BarChart2, Activity, Building2, Briefcase, Eye, Brain, Zap } from 'lucide-react';

const navItems = [
  { to:'/', icon: Home, label:'Dashboard' },
  { to:'/stocks', icon: TrendingUp, label:'Stocks' },
  { to:'/ipo', icon: Rocket, label:'IPO' },
  { to:'/fno', icon: BarChart2, label:'F&O' },
  { to:'/indices', icon: Activity, label:'Indices' },
  { to:'/realestate', icon: Building2, label:'Real Estate' },
  { to:'/portfolio', icon: Briefcase, label:'Portfolio' },
  { to:'/watchlist', icon: Eye, label:'Watchlist' },
  { to:'/behaviour', icon: Brain, label:'AI Behaviour' },
];

export default function Sidebar() {
  return (
    <aside style={{ position:'fixed', left:0, top:0, bottom:0, width:240, background:'var(--bg-secondary)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', zIndex:200 }}>
      {/* Logo */}
      <div style={{ padding:'20px 16px', borderBottom:'1px solid var(--border)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Zap size={20} fill="currentColor" style={{ color:'#000' }} />
          </div>
          <div>
            <h1 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:800, background:'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>InvestIQ</h1>
            <p style={{ fontSize:10, color:'var(--text-muted)' }}>Investing Companion</p>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav style={{ flex:1, padding:'12px 8px', overflow:'auto' }}>
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={to==='/'} style={({ isActive }) => ({
            display:'flex', alignItems:'center', gap:12, padding:'10px 12px', borderRadius:10, marginBottom:4, textDecoration:'none', transition:'all 0.2s',
            background: isActive ? 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(168,85,247,0.1))' : 'transparent',
            border: isActive ? '1px solid rgba(0,212,255,0.3)' : '1px solid transparent',
            color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)',
          })}>
            <Icon size={18} />
            <span style={{ fontSize:14, fontWeight:500 }}>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom info */}
      <div style={{ padding:16, borderTop:'1px solid var(--border)' }}>
        <div style={{ background:'linear-gradient(135deg, rgba(0,255,136,0.1), rgba(0,212,255,0.1))', border:'1px solid rgba(0,255,136,0.2)', borderRadius:10, padding:12 }}>
          <p style={{ fontSize:11, color:'var(--accent-green)', fontWeight:600 }}>🎓 Learning Mode</p>
          <p style={{ fontSize:10, color:'var(--text-muted)', marginTop:4 }}>Trade with ₹1L virtual coins. Zero real risk!</p>
        </div>
      </div>
    </aside>
  );
}
