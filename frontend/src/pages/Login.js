import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Login() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await axios.post('/api/auth/login', { email, password });
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      const resData = err?.response?.data;
      if (resData?.requiresVerification) {
        // Account exists but email hasn't been verified yet — send them to
        // Register's OTP step (pre-filled) instead of a dead-end error.
        navigate('/register', { state: { verifyEmail: resData.email } });
        return;
      }
      setError(resData?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: 20,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .login-input { width: 100%; padding: 12px 16px; background: rgba(10,14,26,0.8);
          border: 1px solid rgba(99,102,241,0.3); border-radius: 10px;
          color: rgb(226,232,240); font-size: 15px; outline: none; margin-bottom: 16px;
          transition: border-color 0.2s; box-sizing: border-box; }
        .login-input:focus { border-color: rgba(99,102,241,0.7); }
        .login-btn { width: 100%; padding: 14px; background: linear-gradient(135deg,#6366f1,#8b5cf6);
          border: none; border-radius: 10px; color: #fff; font-size: 16px; font-weight: 700;
          cursor: pointer; transition: opacity 0.2s; }
        .login-btn:hover:not(:disabled) { opacity: 0.9; }
        .login-btn:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>

      <div style={{
        background: 'rgba(13,17,35,0.92)', border: '1px solid rgba(99,102,241,0.2)',
        borderRadius: 18, padding: '40px 36px', width: '100%', maxWidth: 420,
        backdropFilter: 'blur(20px)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>⚡</div>
          <h1 style={{ fontSize: 32, fontWeight: 900, background: 'linear-gradient(135deg,#6366f1,#a78bfa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', margin: 0 }}>
            InvestIQ
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 6, margin: '6px 0 0' }}>
            Your Smart Investment Companion
          </p>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#ef4444', fontSize: 13 }}>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} autoComplete="on">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="username"
            required
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="login-input"
          />
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }}/>
                Signing in...
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        {/* Register link */}
        <p style={{ textAlign: 'center', marginTop: 20, color: '#64748b', fontSize: 14 }}>
          New to InvestIQ?{' '}
          <Link to="/register" style={{ color: '#818cf8', fontWeight: 700, textDecoration: 'none' }}>
            Create Account &amp; Get ₹1,00,000 Free!
          </Link>
        </p>
      </div>
    </div>
  );
}