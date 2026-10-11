import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function passwordChecks(pw) {
  return {
    length:  pw.length >= 8,
    lower:   /[a-z]/.test(pw),
    upper:   /[A-Z]/.test(pw),
    number:  /\d/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
  };
}

function strengthLabel(score) {
  if (score <= 1) return { label: 'Very weak', color: '#ef4444' };
  if (score === 2) return { label: 'Weak',      color: '#f97316' };
  if (score === 3) return { label: 'Fair',      color: '#f59e0b' };
  if (score === 4) return { label: 'Good',      color: '#84cc16' };
  return               { label: 'Strong',    color: '#10b981' };
}

export default function Register() {
  const [step, setStep] = useState('details'); // 'details' | 'otp'
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '' });
  const [verifyVia, setVerifyVia] = useState('email'); // 'email' | 'phone'
  const [otp, setOtp] = useState('');
  const [devOtpHint, setDevOtpHint] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const { register, verifyEmail, verifyPhone, resendOTP, resendPhoneOTP } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Arrived here from Login because the account exists but isn't verified yet
  // — jump straight to the OTP step instead of making them re-enter details.
  useEffect(() => {
    const prefillEmail = location.state?.verifyEmail;
    if (prefillEmail) {
      setForm(f => ({ ...f, email: prefillEmail }));
      setStep('otp');
      toast('Please verify your email to continue — sending a fresh code...', { icon: '📧' });
      resendOTP(prefillEmail).catch(() => {});
    }
  }, [location.state]);

  const checks = passwordChecks(form.password);
  const score = Object.values(checks).filter(Boolean).length;
  const strength = strengthLabel(score);
  const passwordsMatch = form.password && form.password === form.confirmPassword;

  const handleDetailsSubmit = async (e) => {
    e.preventDefault();

    if (score < 5) {
      toast.error('Please choose a stronger password (see checklist below)');
      return;
    }
    if (!passwordsMatch) {
      toast.error('Passwords do not match');
      return;
    }
    if (verifyVia === 'phone' && form.phone.replace(/\D/g, '').length < 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const data = await register(form.name, form.email, form.password, form.phone, verifyVia);
      toast.success(data.message || `Verification code sent via ${verifyVia === 'phone' ? 'SMS' : 'email'}!`);
      if (data.devOtp) setDevOtpHint(data.devOtp); // only present when delivery isn't configured
      setStep('otp');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    }
    setLoading(false);
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error('Enter the 6-digit code');
      return;
    }
    setLoading(true);
    try {
      if (verifyVia === 'phone') await verifyPhone(form.email, otp);
      else await verifyEmail(form.email, otp);
      toast.success('🎉 Welcome! You got 1,00,000 virtual coins!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setResending(true);
    try {
      const data = verifyVia === 'phone' ? await resendPhoneOTP(form.email) : await resendOTP(form.email);
      toast.success(data.message || 'New code sent!');
      if (data.devOtp) setDevOtpHint(data.devOtp);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not resend code');
    }
    setResending(false);
  };

  const s = {
    page: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #0a0e1a 0%, #1a1040 50%, #0a0e1a 100%)', padding: 24 },
    card: { background: 'rgba(26,31,53,0.9)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: 40, width: '100%', maxWidth: 420, backdropFilter: 'blur(20px)' },
    title: { fontSize: 32, fontWeight: 800, textAlign: 'center', marginBottom: 8, background: 'linear-gradient(135deg,#6366f1,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
    input: { width: '100%', padding: '12px 16px', background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#e2e8f0', fontSize: 15, outline: 'none', marginBottom: 12, boxSizing: 'border-box' },
    btn: { width: '100%', padding: '14px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', borderRadius: 10, color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8 },
    bonus: { background: 'linear-gradient(135deg,rgba(245,158,11,0.1),rgba(239,68,68,0.1))', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, padding: '12px 16px', marginBottom: 24, textAlign: 'center' },
    checkRow: (ok) => ({ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: ok ? '#10b981' : '#64748b', marginBottom: 4 }),
  };

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}><div style={{ fontSize: 48 }}>⚡</div></div>
        <h1 style={s.title}>{step === 'details' ? 'Join InvestIQ' : `Verify your ${verifyVia === 'phone' ? 'phone' : 'email'}`}</h1>

        {step === 'details' && (
          <>
            <div style={s.bonus}>
              <div style={{ fontSize: 20 }}>🎁</div>
              <div style={{ color: '#f59e0b', fontWeight: 700, fontSize: 16 }}>Get ₹1,00,000 Virtual Coins FREE!</div>
              <div style={{ color: '#94a3b8', fontSize: 13 }}>Practice investing with zero real risk</div>
            </div>

            <form onSubmit={handleDetailsSubmit}>
              <input style={s.input} type="text" placeholder="Full Name" value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} required />
              <input style={s.input} type="email" placeholder="Email Address" value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })} required />
              <input style={s.input} type="password" placeholder="Password" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} required />

              {form.password && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{ height: '100%', width: `${(score / 5) * 100}%`, background: strength.color, transition: 'all 0.2s' }} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: strength.color, marginBottom: 6 }}>{strength.label}</div>
                  <div style={s.checkRow(checks.length)}>{checks.length ? '✅' : '⬜'} At least 8 characters</div>
                  <div style={s.checkRow(checks.upper)}>{checks.upper ? '✅' : '⬜'} One uppercase letter</div>
                  <div style={s.checkRow(checks.lower)}>{checks.lower ? '✅' : '⬜'} One lowercase letter</div>
                  <div style={s.checkRow(checks.number)}>{checks.number ? '✅' : '⬜'} One number</div>
                  <div style={s.checkRow(checks.special)}>{checks.special ? '✅' : '⬜'} One special character</div>
                </div>
              )}

              <input style={s.input} type="password" placeholder="Confirm Password" value={form.confirmPassword}
                onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required />
              {form.confirmPassword && !passwordsMatch && (
                <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>Passwords do not match</div>
              )}

              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Free Account'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 20, color: '#94a3b8', fontSize: 14 }}>
              Already have an account? <Link to="/login" style={{ color: '#6366f1', textDecoration: 'none' }}>Sign In</Link>
            </p>
          </>
        )}

        {step === 'otp' && (
          <>
            <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: 14, marginBottom: 20 }}>
              We sent a 6-digit code to <b style={{ color: '#e2e8f0' }}>{verifyVia === 'phone' ? form.phone : form.email}</b> via {verifyVia === 'phone' ? 'SMS' : 'email'}. Enter it below to activate your account.
            </p>
            {devOtpHint && (
              <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#f59e0b', fontSize: 12, textAlign: 'center' }}>
                ⚠️ Email sending isn't configured on this server (dev mode) — your code is <b>{devOtpHint}</b>
              </div>
            )}
            <form onSubmit={handleOtpSubmit}>
              <input
                style={{ ...s.input, textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 800 }}
                type="text" inputMode="numeric" maxLength={6} placeholder="------"
                value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} required
              />
              <button style={s.btn} type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: 20, color: '#94a3b8', fontSize: 14 }}>
              Didn't get the code?{' '}
              <button onClick={handleResend} disabled={resending} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: 14, padding: 0 }}>
                {resending ? 'Sending...' : 'Resend Code'}
              </button>
            </p>
            <p style={{ textAlign: 'center', marginTop: 8 }}>
              <button onClick={() => setStep('details')} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: 13, cursor: 'pointer' }}>
                ← Back to edit details
              </button>
            </p>
          </>
        )}
      </div>
    </div>
  );
}