import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';

const navItems = [
  { path: '/dashboard', icon: '⚡', label: 'Dashboard' },
  { path: '/stocks', icon: '📈', label: 'Stocks' },
  { path: '/ipo', icon: '🚀', label: 'IPO' },
  { path: '/fno', icon: '📊', label: 'F&O' },
  { path: '/realestate', icon: '🏠', label: 'Real Estate' },
  { path: '/portfolio', icon: '💼', label: 'Portfolio' },
  { path: '/behaviour', icon: '🧠', label: 'AI Analysis' },
];

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 260,
      background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 100,
      transition: 'all 0.3s'
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #1e40af, #06b6d4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, boxShadow: '0 0 20px rgba(59,130,246,0.4)'
          }}>💹</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 18, color: 'var(--text-primary)' }}>InvestIQ</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Investing Companion</div>
          </div>
        </div>
      </div>

      {/* User Info */}
      {user && (
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'rgba(59,130,246,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 14, color: 'white'
            }}>{user.name?.charAt(0).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'var(--accent-green)', fontFamily: 'var(--font-mono)' }}>
                ₹{Number(user.virtualCoins || 0).toLocaleString('en-IN')}
              </div>
            </div>
            <div style={{ width: 8, height: 8, background: 'var(--accent-green)', borderRadius: '50%', animation: 'blink 1.5s infinite' }}></div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '1.5px', padding: '0 8px', marginBottom: 8 }}>MARKETS</div>
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10, padding: '11px 12px',
            borderRadius: 10, marginBottom: 4, textDecoration: 'none',
            background: isActive ? 'rgba(59,130,246,0.15)' : 'transparent',
            border: isActive ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
            color: isActive ? 'var(--accent-blue)' : 'var(--text-secondary)',
            fontWeight: isActive ? 600 : 400, fontSize: 14, transition: 'all 0.2s'
          })}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleLogout} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '11px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.2)', color: 'var(--accent-red)',
          cursor: 'pointer', fontSize: 14, fontWeight: 600, transition: 'all 0.2s'
        }}>
          <span>🚪</span> Logout
        </button>
      </div>
    </aside>
  );
}
