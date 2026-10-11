import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [coins,       setCoins]       = useState(0);
  const [alertCount,  setAlertCount]  = useState(0);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const profileRef = useRef(null);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Scroll shadow
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch coins + alert count
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/api/auth/me');
        setCoins(data.virtualCoins || 0);
      } catch {}
      try {
        const { data } = await axios.get('/api/alerts');
        const triggered = (data || []).filter(a => a.triggered && a.active).length;
        setAlertCount(triggered);
      } catch {}
    };
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [location.pathname]);

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate('/login');
  };

  const fmtCoins = (n) => {
    if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
    if (n >= 100000)   return `₹${(n / 100000).toFixed(1)}L`;
    return `₹${Number(n).toLocaleString('en-IN')}`;
  };

  const NAV_LINKS = [
    { path: '/dashboard',  label: 'Dashboard',  icon: '📊' },
    { path: '/stocks',     label: 'Stocks',      icon: '📈' },
    { path: '/ipo',        label: 'IPO',         icon: '🚀' },
    { path: '/realestate', label: 'Real Estate', icon: '🏠' },
    { path: '/portfolio',  label: 'Portfolio',   icon: '💼' },
    { path: '/behavior',   label: 'Behavior',    icon: '🧠' },
    { path: '/addmoney',   label: 'Add Money',   icon: '💰' },
    { path: '/screener',   label: 'Screener',    icon: '🔍' },
    { path: '/news',       label: 'News',        icon: '📰' },
    { path: '/analytics',  label: 'Analytics',   icon: '📉' },
    { path: '/alerts',     label: 'Alerts',      icon: '🔔' },
    { path: '/backtest',   label: 'Backtest',    icon: '⚙️' },
    { path: '/tax', label: 'Tax', icon: '🧾' },
    { path: '/sip', label: 'SIP', icon: '💰' },
    { path: '/advisor', label: 'Advisor', icon: '🎯' },
    { path: '/intraday', label: 'Intraday', icon: '📊' },
    { path: '/fundamental', label: 'Fundamentals', icon: '📊' },
  ];

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : 'IQ';

  return (
    <>
      <style>{`
        @keyframes fadeDown { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .nav-link { display:flex; align-items:center; gap:6px; padding:7px 12px; border-radius:10px; font-size:13px; font-weight:600; cursor:pointer; transition:all 0.18s; white-space:nowrap; border:none; background:transparent; text-decoration:none; }
        .nav-link:hover { background:rgba(99,102,241,0.12); color:#a5b4fc !important; }
        .nav-link.active { background:rgba(99,102,241,0.2); color:#818cf8 !important; }
        .profile-item { display:flex; align-items:center; gap:10px; padding:10px 14px; cursor:pointer; transition:background 0.15s; border-radius:8px; font-size:13px; color:#e2e8f0; }
        .profile-item:hover { background:rgba(99,102,241,0.1); }
        .profile-item.danger:hover { background:rgba(239,68,68,0.1); color:#ef4444; }
        .mob-link { display:flex; align-items:center; gap:10px; padding:12px 16px; cursor:pointer; transition:background 0.15s; font-size:14px; font-weight:600; color:#94a3b8; border-radius:10px; }
        .mob-link:hover  { background:rgba(99,102,241,0.1); color:#e2e8f0; }
        .mob-link.active { background:rgba(99,102,241,0.2); color:#818cf8; }
      `}</style>

      {/* ── Main Navbar ── */}
      <nav style={{
        position:        'sticky',
        top:             0,
        zIndex:          999,
        background:      scrolled ? 'rgba(5,11,24,0.97)' : 'rgba(5,11,24,0.85)',
        backdropFilter:  'blur(20px)',
        borderBottom:    '1px solid rgba(99,102,241,0.12)',
        padding:         '0 20px',
        display:         'flex',
        alignItems:      'center',
        height:          58,
        gap:             12,
        transition:      'background 0.3s',
      }}>

        {/* Logo */}
        <div onClick={() => navigate('/dashboard')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginRight: 8, flexShrink: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 16 }}>
            ⚡
          </div>
          <span style={{ fontWeight: 900, fontSize: 18, background: 'linear-gradient(135deg,#818cf8,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            InvestIQ
          </span>
        </div>

        {/* Nav Links — scrollable */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', flex: 1, scrollbarWidth: 'none' }}
          className="nav-scroll">
          <style>{`.nav-scroll::-webkit-scrollbar{display:none}`}</style>
          {NAV_LINKS.map(link => (
            <button key={link.path}
              className={`nav-link ${isActive(link.path) ? 'active' : ''}`}
              onClick={() => navigate(link.path)}
              style={{ color: isActive(link.path) ? '#818cf8' : '#94a3b8' }}>
              <span style={{ fontSize: 14 }}>{link.icon}</span>
              {link.label}
              {link.path === '/alerts' && alertCount > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 800, animation: 'pulse 2s infinite' }}>
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Right: Coins + Profile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

          {/* Coins */}
          <div onClick={() => navigate('/addmoney')}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 20, padding: '5px 12px', cursor: 'pointer', transition: 'all 0.2s' }}>
            <span style={{ fontSize: 14 }}>🪙</span>
            <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 13 }}>{fmtCoins(coins)}</span>
          </div>

          {/* Profile dropdown */}
          <div ref={profileRef} style={{ position: 'relative' }}>
            <div onClick={() => setProfileOpen(o => !o)}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontWeight: 800, fontSize: 13, color: '#fff', border: profileOpen ? '2px solid #818cf8' : '2px solid transparent', transition: 'border 0.2s', userSelect: 'none' }}>
              {initials}
            </div>

            {profileOpen && (
              <div style={{ position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 240, background: 'rgba(10,14,26,0.98)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: 14, padding: 8, animation: 'fadeDown 0.2s ease', backdropFilter: 'blur(20px)', zIndex: 1000 }}>

                {/* User info */}
                <div style={{ padding: '10px 14px 14px', borderBottom: '1px solid rgba(99,102,241,0.1)', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff', flexShrink: 0 }}>
                      {initials}
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>{user?.name || 'Investor'}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{user?.email || ''}</div>
                    </div>
                  </div>
                  <div style={{ marginTop: 10, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 8, padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: 12 }}>Virtual coins</span>
                    <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 13 }}>🪙 {fmtCoins(coins)}</span>
                  </div>
                </div>

                {/* Menu items */}
                {[
                  { icon: '📊', label: 'Dashboard',   path: '/dashboard'  },
                  { icon: '💼', label: 'Portfolio',    path: '/portfolio'  },
                  { icon: '📉', label: 'Analytics',    path: '/analytics'  },
                  { icon: '⚙️', label: 'Backtesting',  path: '/backtest'   },
                  { icon: '🔔', label: 'Smart Alerts', path: '/alerts'     },
                ].map(item => (
                  <div key={item.path} className="profile-item"
                    onClick={() => { navigate(item.path); setProfileOpen(false); }}>
                    <span style={{ fontSize: 16 }}>{item.icon}</span>
                    <span>{item.label}</span>
                  </div>
                ))}

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(99,102,241,0.1)', margin: '6px 0' }} />

                {/* Logout */}
                <div className="profile-item danger" onClick={handleLogout}>
                  <span style={{ fontSize: 16 }}>🚪</span>
                  <span style={{ fontWeight: 700 }}>Log out</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b' }}>{user?.name?.split(' ')[0]}</span>
                </div>
              </div>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button onClick={() => setMobileOpen(o => !o)}
            style={{ display: 'none', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#818cf8', fontSize: 18 }}
            className="mob-toggle">
            {mobileOpen ? '✕' : '☰'}
          </button>
        </div>
      </nav>

      {/* ── Mobile Drawer ── */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 998, background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}>
          <div style={{ position: 'absolute', top: 58, left: 0, right: 0, background: 'rgba(5,11,24,0.98)', borderBottom: '1px solid rgba(99,102,241,0.15)', padding: 12, display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 'calc(100vh - 58px)', overflowY: 'auto', animation: 'fadeDown 0.2s ease' }}
            onClick={e => e.stopPropagation()}>

            {/* User info mobile */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px 14px', borderBottom: '1px solid rgba(99,102,241,0.1)', marginBottom: 4 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 14, color: '#fff' }}>
                {initials}
              </div>
              <div>
                <div style={{ fontWeight: 800, color: '#e2e8f0', fontSize: 14 }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>🪙 {fmtCoins(coins)}</div>
              </div>
            </div>

            {NAV_LINKS.map(link => (
              <div key={link.path}
                className={`mob-link ${isActive(link.path) ? 'active' : ''}`}
                onClick={() => { navigate(link.path); setMobileOpen(false); }}>
                <span style={{ fontSize: 18 }}>{link.icon}</span>
                <span>{link.label}</span>
                {link.path === '/alerts' && alertCount > 0 && (
                  <span style={{ marginLeft: 'auto', background: '#ef4444', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 800 }}>
                    {alertCount}
                  </span>
                )}
              </div>
            ))}

            <div style={{ height: 1, background: 'rgba(99,102,241,0.1)', margin: '6px 0' }} />

            {/* Mobile logout */}
            <div className="mob-link" onClick={handleLogout}
              style={{ color: '#ef4444' }}>
              <span style={{ fontSize: 18 }}>🚪</span>
              <span style={{ fontWeight: 700 }}>Log out</span>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-scroll { display: none !important; }
          .mob-toggle { display: flex !important; }
        }
      `}</style>
    </>
  );
}