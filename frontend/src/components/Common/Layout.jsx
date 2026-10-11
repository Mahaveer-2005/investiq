import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ChatBot from '../chat/ChatBot';
import MarketTicker from './MarketTicker';
import {
  LayoutDashboard, TrendingUp, Building2, Briefcase,
  BarChart3, Home, BookOpen, LogOut, Menu, X, MessageCircle,
  Zap, Bell, Search, ChevronDown, Coins
} from 'lucide-react';

const navItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/stocks', icon: TrendingUp, label: 'Stocks' },
  { path: '/ipo', icon: Zap, label: 'IPO' },
  { path: '/portfolio', icon: Briefcase, label: 'Portfolio' },
  { path: '/futures', icon: BarChart3, label: 'F&O' },
  { path: '/real-estate', icon: Home, label: 'Real Estate' },
  { path: '/learn', icon: BookOpen, label: 'Learn' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { connected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  const formatCoins = (n) => {
    if (n >= 100000) return `₹${(n/100000).toFixed(2)}L`;
    if (n >= 1000) return `₹${(n/1000).toFixed(1)}K`;
    return `₹${n}`;
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0a0a0f', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? '240px' : '70px',
        background: 'rgba(17,17,24,0.95)',
        borderRight: '1px solid rgba(255,255,255,0.05)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s ease',
        zIndex: 100, overflow: 'hidden',
        backdropFilter: 'blur(20px)'
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.2rem' }}>
            ⚡
          </div>
          {sidebarOpen && <span style={{ fontWeight: 800, fontSize: '1.2rem', background: 'linear-gradient(135deg, #a855f7, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>InvestIQ</span>}
        </div>

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ margin: '8px auto', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '8px', color: '#94a3b8', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '8px' }}>
          {navItems.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link key={path} to={path} style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '11px 12px', borderRadius: '10px', textDecoration: 'none',
                marginBottom: '4px', transition: 'all 0.2s',
                background: active ? 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(14,165,233,0.1))' : 'transparent',
                color: active ? '#a855f7' : '#64748b',
                borderLeft: active ? '3px solid #7c3aed' : '3px solid transparent',
                fontWeight: active ? 600 : 400, fontSize: '0.875rem',
                whiteSpace: 'nowrap', overflow: 'hidden'
              }}>
                <Icon size={20} style={{ flexShrink: 0 }} />
                {sidebarOpen && <span>{label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <button onClick={() => { logout(); navigate('/'); }} style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          margin: '8px', padding: '11px 12px', borderRadius: '10px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
          whiteSpace: 'nowrap', overflow: 'hidden'
        }}>
          <LogOut size={20} style={{ flexShrink: 0 }} />
          {sidebarOpen && 'Logout'}
        </button>
      </aside>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Top bar */}
        <header style={{ background: 'rgba(17,17,24,0.8)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
          <MarketTicker />
          <div style={{ flex: 1 }} />
          
          {/* Market status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: connected ? '#10b981' : '#64748b' }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: connected ? '#10b981' : '#64748b' }} />
            {connected ? 'Live' : 'Offline'}
          </div>

          {/* Coins */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '10px', padding: '8px 14px' }}>
            <Coins size={16} color="#f59e0b" />
            <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.9rem' }}>{formatCoins(user?.virtualCoins || 0)}</span>
          </div>

          {/* User avatar */}
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          <Outlet />
        </main>
      </div>

      {/* Floating Chat Button */}
      <button onClick={() => setChatOpen(!chatOpen)} style={{
        position: 'fixed', bottom: '24px', right: '24px',
        width: '56px', height: '56px', borderRadius: '50%',
        background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)',
        border: 'none', cursor: 'pointer', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 30px rgba(124,58,237,0.4)',
        zIndex: 1000, transition: 'transform 0.3s',
        transform: chatOpen ? 'scale(0.9) rotate(90deg)' : 'scale(1)'
      }}>
        {chatOpen ? <X size={22} /> : <MessageCircle size={22} />}
      </button>

      {/* ChatBot */}
      {chatOpen && <ChatBot onClose={() => setChatOpen(false)} />}
    </div>
  );
}
