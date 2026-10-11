import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Loader, Gift } from 'lucide-react';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) return toast.error('Passwords do not match');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await register(form.name, form.email, form.password);
      toast.success(res.message || '🎉 Account created! You received ₹1,00,000 virtual coins!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '32px', textDecoration: 'none' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: '1.6rem', background: 'linear-gradient(135deg, #a855f7, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>InvestIQ</span>
        </Link>

        {/* Welcome bonus banner */}
        <div style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '16px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Gift size={24} color="#f59e0b" />
          <div>
            <div style={{ fontWeight: 700, color: '#f59e0b' }}>Welcome Bonus!</div>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Get ₹1,00,000 virtual coins instantly on signup</div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '40px' }}>
          <h1 style={{ fontWeight: 800, fontSize: '1.8rem', marginBottom: '8px' }}>Create Account</h1>
          <p style={{ color: '#64748b', marginBottom: '32px' }}>Start your investment journey for free</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Full Name', key: 'name', type: 'text', placeholder: 'Rajesh Kumar' },
              { label: 'Email', key: 'email', type: 'email', placeholder: 'rajesh@example.com' },
              { label: 'Password', key: 'password', type: 'password', placeholder: '••••••••' },
              { label: 'Confirm Password', key: 'confirm', type: 'password', placeholder: '••••••••' }
            ].map(field => (
              <div key={field.key}>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 500 }}>{field.label}</label>
                <input type={field.type} value={form[field.key]} onChange={e => setForm(p => ({ ...p, [field.key]: e.target.value }))} placeholder={field.placeholder} required className="input-field" />
              </div>
            ))}

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '8px', padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : '🎉 Create Account & Get ₹1 Lakh'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '0.9rem' }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'none' }}>Log in</Link>
          </p>
        </div>
        <p style={{ textAlign: 'center', marginTop: '16px', color: '#334155', fontSize: '0.75rem' }}>
          By signing up, you agree to our Terms. This is for educational purposes only.
        </p>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
