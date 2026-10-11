import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>💹</div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Welcome Back</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Login to your InvestIQ account</p>
        </div>
        <div className="card" style={{ padding: 32 }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Email</label>
              <input type="email" placeholder="you@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
            </div>
            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>Password</label>
              <input type="password" placeholder="••••••••" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16 }} disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In →'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
            Don't have an account? <Link to="/register" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Sign Up Free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
