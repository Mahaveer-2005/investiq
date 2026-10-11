import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back to InvestIQ!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.error || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      {/* Background decoration */}
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,212,170,0.08) 0%, transparent 70%)', top: -200, right: -200 }} />
      <div style={{ position: 'absolute', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', bottom: -100, left: -100 }} />

      <div style={{ width: '100%', maxWidth: 440, animation: 'slideUp 0.5s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 24, color: '#0A0E1A', margin: '0 auto 16px' }}>IQ</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, marginBottom: 8 }}>InvestIQ</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Your Smart Investing Companion</p>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Welcome Back</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 28 }}>Sign in to continue your investment journey</p>

          <form onSubmit={handle}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Email</label>
              <input className="input" type="email" placeholder="you@email.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Password</label>
              <input className="input" type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
            </div>
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: 15 }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            New to InvestIQ? <Link to="/register" style={{ color: 'var(--accent-green)', textDecoration: 'none', fontWeight: 600 }}>Create Account</Link>
          </p>
        </div>

        <div style={{ marginTop: 20, background: 'rgba(0,212,170,0.05)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 12, padding: 16, fontSize: 12, color: 'var(--text-secondary)' }}>
          🎁 <strong style={{ color: 'var(--accent-green)' }}>New users get ₹1,00,000 virtual coins</strong> to practice trading risk-free!
        </div>
      </div>
    </div>
  );
}
