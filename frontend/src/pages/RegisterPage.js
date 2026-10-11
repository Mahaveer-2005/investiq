import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    setLoading(true);
    try {
      await register(form.name, form.email, form.password);
      toast.success('Account created! You received ₹1,00,000 virtual coins! 🎉');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 16px' }}>💹</div>
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>Create Account</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Get ₹1,00,000 virtual coins to start trading!</p>
        </div>
        <div className="card" style={{ padding: 32 }}>
          {/* Bonus banner */}
          <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>🎁</span>
            <div>
              <div style={{ fontWeight: 700, color: '#10b981', fontSize: 14 }}>Sign-up Bonus!</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>₹1,00,000 virtual coins on registration</div>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            {[['Full Name', 'name', 'text', 'Mahaveer Singh'],['Email', 'email', 'email', 'you@example.com'],['Password', 'password', 'password', '••••••••'],['Confirm Password', 'confirm', 'password', '••••••••']].map(([label, key, type, ph]) => (
              <div key={key} style={{ marginBottom: 18 }}>
                <label style={{ display: 'block', marginBottom: 8, fontSize: 14, fontWeight: 500 }}>{label}</label>
                <input type={type} placeholder={ph} value={form[key]} onChange={e => setForm({...form, [key]: e.target.value})} required />
              </div>
            ))}
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16, marginTop: 8 }} disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account & Get ₹1L →'}
            </button>
          </form>
          <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
            Already have an account? <Link to="/login" style={{ color: '#3b82f6', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
