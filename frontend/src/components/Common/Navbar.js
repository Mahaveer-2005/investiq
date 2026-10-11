import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: '📊' },
    { label: 'Stocks', path: '/stocks', icon: '📈' },
    { label: 'IPO', path: '/ipo', icon: '🚀' },
    { label: 'F&O', path: '/futures', icon: '⚡' },
    { label: 'Real Estate', path: '/realestate', icon: '🏠' },
    { label: 'Portfolio', path: '/portfolio', icon: '💼' },
  ];

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000,
      background: 'rgba(7,11,20,0.95)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px', height: '64px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between'
    }}>
      {/* Logo */}
      <div onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '36px', height: '36px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #00d4aa, #6366f1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', fontWeight: 800
        }}>I</div>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: '20px', fontWeight: 700 }}>
          Invest<span style={{ color: 'var(--accent)' }}>IQ</span>
        </span>
      </div>

      {/* Nav Items */}
      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              background: location.pathname === item.path ? 'var(--accent-dim)' : 'transparent',
              border: 'none',
              color: location.pathname === item.path ? 'var(--accent)' : 'var(--text-secondary)',
              padding: '8px 14px', borderRadius: '8px',
              cursor: 'pointer', fontSize: '13px', fontWeight: 500,
              fontFamily: 'var(--font-body)',
              transition: 'all 0.2s', whiteSpace: 'nowrap'
            }}
          >
            <span style={{ marginRight: '6px' }}>{item.icon}</span>{item.label}
          </button>
        ))}
      </div>

      {/* User + Coins */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          background: 'var(--accent-dim)', border: '1px solid var(--accent)',
          borderRadius: '8px', padding: '6px 14px',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}>
          <span style={{ fontSize: '14px' }}>💰</span>
          <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 600 }}>
            ₹{(user?.virtualCoins || 0).toLocaleString('en-IN')}
          </span>
        </div>

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '10px', padding: '8px 14px',
              color: 'var(--text-primary)', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: '13px',
              display: 'flex', alignItems: 'center', gap: '8px'
            }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), var(--accent2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '12px', fontWeight: 700, color: '#000'
            }}>
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            {user?.name?.split(' ')[0]}
          </button>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '110%',
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '8px', minWidth: '180px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
            }}>
              <button onClick={() => { navigate('/portfolio'); setMenuOpen(false); }}
                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
                💼 My Portfolio
              </button>
              <button onClick={() => { navigate('/behaviour'); setMenuOpen(false); }}
                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--text-primary)', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
                🧠 Behaviour Analysis
              </button>
              <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              <button onClick={() => { logout(); navigate('/'); setMenuOpen(false); }}
                style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--red)', padding: '10px 14px', textAlign: 'left', cursor: 'pointer', borderRadius: '8px', fontSize: '13px', fontFamily: 'var(--font-body)' }}>
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
