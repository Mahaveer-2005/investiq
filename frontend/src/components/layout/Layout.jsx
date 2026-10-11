import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { stocksAPI } from '../../services/api';
import ChatBot from '../chat/ChatBot';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [indices, setIndices] = useState(null);
  const [tickerStocks, setTickerStocks] = useState([]);

  useEffect(() => {
    stocksAPI.getIndices().then(setIndices).catch(() => {});
    stocksAPI.getAll({ limit: 20 }).then(res => setTickerStocks(res.stocks || [])).catch(() => {});
    const interval = setInterval(() => stocksAPI.getIndices().then(setIndices).catch(() => {}), 15000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
    { path: '/stocks', icon: '📈', label: 'Stocks' },
    { path: '/intraday', icon: '⚡', label: 'Intraday' },
    { path: '/ipo', icon: '🚀', label: 'IPO' },
    { path: '/futures', icon: '📊', label: 'F&O' },
    { path: '/realestate', icon: '🏠', label: 'Real Estate' },
    { path: '/portfolio', icon: '💼', label: 'Portfolio' },
    { path: '/watchlist', icon: '⭐', label: 'Watchlist' },
    { path: '/behavior', icon: '🧠', label: 'Behavior AI' },
  ];

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'var(--bg-primary)'}}>
      <aside style={{width:sidebarOpen?240:70,background:'var(--bg-secondary)',borderRight:'1px solid var(--border)',transition:'width 0.3s',display:'flex',flexDirection:'column',position:'fixed',height:'100vh',zIndex:100,overflowY:'auto',overflowX:'hidden'}}>
        <div style={{padding:'20px 16px',borderBottom:'1px solid var(--border)',display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:36,height:36,background:'linear-gradient(135deg,var(--accent-green),var(--accent-blue))',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:800,fontSize:16,color:'#0A0E1A',flexShrink:0}}>IQ</div>
          {sidebarOpen && <span style={{fontFamily:'Syne,sans-serif',fontWeight:700,fontSize:18,color:'var(--text-primary)',whiteSpace:'nowrap'}}>InvestIQ</span>}
        </div>
        <nav style={{flex:1,padding:'12px 8px'}}>
          {navItems.map(item => (
            <NavLink key={item.path} to={item.path} style={({isActive})=>({display:'flex',alignItems:'center',gap:12,padding:'10px 12px',borderRadius:10,marginBottom:4,textDecoration:'none',color:isActive?'var(--accent-green)':'var(--text-secondary)',background:isActive?'rgba(0,212,170,0.1)':'transparent',fontWeight:isActive?600:400,transition:'all 0.2s',whiteSpace:'nowrap',overflow:'hidden'})}>
              <span style={{fontSize:18,flexShrink:0}}>{item.icon}</span>
              {sidebarOpen && <span style={{fontSize:14}}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        {sidebarOpen && (
          <div style={{padding:16,borderTop:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
              <div style={{width:36,height:36,borderRadius:'50%',background:'linear-gradient(135deg,var(--accent-purple),var(--accent-blue))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:'#fff',flexShrink:0}}>{user?.name?.[0]?.toUpperCase()}</div>
              <div style={{overflow:'hidden'}}>
                <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{user?.name}</div>
                <div style={{fontSize:11,color:'var(--accent-green)'}}>₹{(user?.virtualCoins||100000).toLocaleString()}</div>
              </div>
            </div>
            <button onClick={()=>{logout();navigate('/login');}} style={{width:'100%',padding:'8px',background:'rgba(239,68,68,0.1)',color:'var(--accent-red)',border:'1px solid rgba(239,68,68,0.2)',borderRadius:8,cursor:'pointer',fontSize:12,fontFamily:'Space Grotesk,sans-serif'}}>Logout</button>
          </div>
        )}
      </aside>
      <div style={{flex:1,marginLeft:sidebarOpen?240:70,transition:'margin-left 0.3s',display:'flex',flexDirection:'column',minHeight:'100vh'}}>
        <header style={{position:'sticky',top:0,zIndex:99,background:'rgba(10,14,26,0.95)',backdropFilter:'blur(10px)',borderBottom:'1px solid var(--border)',padding:'10px 20px',display:'flex',alignItems:'center',gap:16}}>
          <button onClick={()=>setSidebarOpen(!sidebarOpen)} style={{background:'none',border:'none',color:'var(--text-secondary)',cursor:'pointer',fontSize:20,padding:4}}>☰</button>
          {indices && (
            <div style={{display:'flex',gap:24,flex:1,flexWrap:'wrap'}}>
              {[{label:'NIFTY 50',data:indices.nifty50},{label:'SENSEX',data:indices.sensex},{label:'BANK NIFTY',data:indices.niftyBank}].map(idx=>(
                <div key={idx.label} style={{display:'flex',alignItems:'center',gap:8}}>
                  <span style={{fontSize:11,color:'var(--text-muted)'}}>{idx.label}</span>
                  <span style={{fontSize:13,fontWeight:700}}>{idx.data?.value?.toLocaleString()}</span>
                  <span style={{fontSize:11,color:(idx.data?.changePercent||0)>=0?'var(--accent-green)':'var(--accent-red)'}}>
                    {(idx.data?.changePercent||0)>=0?'▲':'▼'} {Math.abs(idx.data?.changePercent||0).toFixed(2)}%
                  </span>
                </div>
              ))}
            </div>
          )}
          <div style={{display:'flex',alignItems:'center',gap:12,marginLeft:'auto'}}>
            <div style={{background:'rgba(0,212,170,0.1)',border:'1px solid rgba(0,212,170,0.3)',borderRadius:8,padding:'4px 12px',fontSize:13}}>💰 ₹{(user?.virtualCoins||100000).toLocaleString()}</div>
            <button onClick={()=>setChatOpen(true)} style={{background:'linear-gradient(135deg,var(--accent-blue),var(--accent-purple))',border:'none',color:'#fff',borderRadius:10,padding:'8px 16px',cursor:'pointer',fontSize:13,fontFamily:'Space Grotesk,sans-serif',fontWeight:600}}>🤖 AI Chat</button>
          </div>
        </header>
        {tickerStocks.length > 0 && (
          <div style={{background:'var(--bg-secondary)',borderBottom:'1px solid var(--border)',padding:'6px 0',overflow:'hidden'}}>
            <div style={{display:'flex',animation:'ticker 60s linear infinite',whiteSpace:'nowrap'}}>
              {[...tickerStocks,...tickerStocks].map((s,i)=>(
                <span key={i} style={{margin:'0 24px',fontSize:12,color:(s.changePercent||0)>=0?'var(--accent-green)':'var(--accent-red)'}}>
                  {s.symbol?.replace('.BSE','')} {s.price?.toFixed(2)} {(s.changePercent||0)>=0?'▲':'▼'}{Math.abs(s.changePercent||0).toFixed(2)}%
                </span>
              ))}
            </div>
          </div>
        )}
        <main style={{flex:1,padding:24,maxWidth:1400,width:'100%',margin:'0 auto'}}>
          <Outlet />
        </main>
      </div>
      {chatOpen && <ChatBot onClose={()=>setChatOpen(false)} />}
    </div>
  );
}
