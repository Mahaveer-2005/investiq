import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navLinks = [
  { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
  { path: '/stocks', icon: '📈', label: 'Stocks' },
  { path: '/ipo', icon: '🚀', label: 'IPO' },
  { path: '/futures', icon: '⚡', label: 'F&O' },
  { path: '/real-estate', icon: '🏠', label: 'Real Estate' },
  { path: '/portfolio', icon: '💼', label: 'Portfolio' },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarOpen ? 240 : 70,
        background: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh',
        zIndex: 100, transition: 'width 0.3s ease', overflow: 'hidden'
      }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>💹</div>
          {sidebarOpen && <span style={{ fontSize: 20, fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>InvestIQ</span>}
        </div>

        {/* Nav Links */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navLinks.map(link => {
            const active = location.pathname === link.path;
            return (
              <Link key={link.path} to={link.path} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '11px 12px', borderRadius: 10, marginBottom: 4,
                background: active ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                border: active ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
                color: active ? '#3b82f6' : 'var(--text-secondary)',
                textDecoration: 'none', transition: 'all 0.2s', fontWeight: active ? 600 : 400,
                whiteSpace: 'nowrap'
              }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>{link.icon}</span>
                {sidebarOpen && <span style={{ fontSize: 14 }}>{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          {sidebarOpen && (
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(59, 130, 246, 0.08)', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: 'var(--accent-gold)', fontFamily: 'JetBrains Mono' }}>₹{(user?.virtualCoins || 100000).toLocaleString('en-IN')}</div>
            </div>
          )}
          <button onClick={logout} style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
            color: '#ef4444', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 14
          }}>
            <span>🚪</span>{sidebarOpen && 'Logout'}
          </button>
        </div>

        {/* Toggle */}
        <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
          position: 'absolute', bottom: 150, right: -12,
          width: 24, height: 24, borderRadius: '50%',
          background: 'var(--accent-blue)', border: 'none',
          color: 'white', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>{sidebarOpen ? '◀' : '▶'}</button>
      </aside>

      {/* Main Content */}
      <main style={{ marginLeft: sidebarOpen ? 240 : 70, flex: 1, transition: 'margin-left 0.3s ease', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  );
}
