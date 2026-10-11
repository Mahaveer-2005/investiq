import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../store/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handle = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('🎉 Welcome to InvestIQ! You have ₹1,00,000 virtual coins!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.error || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', top: -200, left: -200 }} />
      <div style={{ width: '100%', maxWidth: 440, animation: 'slideUp 0.5s ease' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, var(--accent-green), var(--accent-blue))', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 24, color: '#0A0E1A', margin: '0 auto 16px' }}>IQ</div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 32, marginBottom: 8 }}>InvestIQ</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Start your investment journey today</p>
        </div>
        <div className="card" style={{ padding: 32 }}>
          <h2 style={{ fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Create Account</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 28 }}>Get ₹1,00,000 virtual coins instantly</p>
          <form onSubmit={handle}>
            {[{ key: 'name', label: 'Full Name', type: 'text', placeholder: 'Rahul Sharma' }, { key: 'email', label: 'Email', type: 'email', placeholder: 'you@email.com' }, { key: 'password', label: 'Password', type: 'password', placeholder: '••••••••' }, { key: 'confirm', label: 'Confirm Password', type: 'password', placeholder: '••••••••' }].map(field => (
              <div key={field.key} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>{field.label}</label>
                <input className="input" type={field.type} placeholder={field.placeholder} value={form[field.key]} onChange={e => setForm({ ...form, [field.key]: e.target.value })} required />
              </div>
            ))}
            <button className="btn-primary" type="submit" disabled={loading} style={{ width: '100%', padding: '12px', fontSize: 15, marginTop: 8 }}>
              {loading ? 'Creating account...' : '🚀 Start Investing for Free'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
            Already have an account? <Link to="/login" style={{ color: 'var(--accent-green)', textDecoration: 'none', fontWeight: 600 }}>Sign In</Link>
          </p>
        </div>
        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {[{ icon: '📈', label: '500+ Stocks' }, { icon: '🏠', label: 'Real Estate' }, { icon: '🤖', label: 'AI Advisor' }].map(f => (
            <div key={f.label} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, textAlign: 'center', fontSize: 12 }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{f.icon}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{f.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
