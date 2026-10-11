import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Loader } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '40px', textDecoration: 'none' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: '1.6rem', background: 'linear-gradient(135deg, #a855f7, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>InvestIQ</span>
        </Link>

        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '24px', padding: '40px' }}>
          <h1 style={{ fontWeight: 800, fontSize: '1.8rem', marginBottom: '8px', color: '#f1f5f9' }}>Welcome back</h1>
          <p style={{ color: '#64748b', marginBottom: '32px' }}>Log in to continue investing</p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 500 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required className="input-field" />
            </div>
            <div>
              <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.85rem', marginBottom: '8px', fontWeight: 500 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="input-field" style={{ paddingRight: '44px' }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary" style={{ marginTop: '8px', padding: '14px', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? <Loader size={20} style={{ animation: 'spin 1s linear infinite' }} /> : '🚀 Login'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '24px', color: '#64748b', fontSize: '0.9rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: '#a855f7', fontWeight: 600, textDecoration: 'none' }}>Create one free</Link>
          </p>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
