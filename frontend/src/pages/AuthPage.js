import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AuthPage = ({ mode = 'login' }) => {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
      } else {
        await register(form.name, form.email, form.password);
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-primary)', padding: '20px',
      position: 'relative', overflow: 'hidden'
    }}>
      {/* Background glow */}
      <div style={{
        position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0,212,170,0.06) 0%, transparent 70%)',
        top: '-100px', right: '-100px', pointerEvents: 'none'
      }} />

      <div style={{ width: '100%', maxWidth: '440px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px',
            background: 'linear-gradient(135deg, #00d4aa, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', fontWeight: 900, color: '#000',
            margin: '0 auto 16px'
          }}>I</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', fontWeight: 800 }}>
            Invest<span style={{ color: 'var(--accent)' }}>IQ</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px', fontSize: '14px' }}>
            {mode === 'login' ? 'Welcome back! Login to continue trading.' : 'Create account & get ₹1,00,000 free virtual coins!'}
          </p>
        </div>

        <div className="card" style={{ padding: '32px' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '22px', fontWeight: 700, marginBottom: '24px' }}>
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: '8px', padding: '12px', marginBottom: '20px',
              color: 'var(--red)', fontSize: '13px'
            }}>{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {mode === 'register' && (
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Full Name</label>
                <input
                  className="input-field"
                  type="text" placeholder="Mahaveer Singh" required
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Email Address</label>
              <input
                className="input-field"
                type="email" placeholder="you@example.com" required
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '6px', display: 'block' }}>Password</label>
              <input
                className="input-field"
                type="password" placeholder="Min 6 characters" required
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>

            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '14px', fontSize: '15px', opacity: loading ? 0.7 : 1 }}>
              {loading ? '⏳ Please wait...' : mode === 'login' ? '🔐 Sign In' : '🚀 Start Investing Free'}
            </button>
          </form>

          {mode === 'register' && (
            <div style={{
              marginTop: '16px', padding: '12px', borderRadius: '8px',
              background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)',
              fontSize: '13px', color: 'var(--accent)', textAlign: 'center'
            }}>
              🎁 You'll receive ₹1,00,000 virtual coins on signup!
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <Link to={mode === 'login' ? '/register' : '/login'} style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
              {mode === 'login' ? 'Register Now' : 'Sign In'}
            </Link>
          </p>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: 'var(--text-muted)' }}>
          For educational purposes only. Not financial advice.
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
