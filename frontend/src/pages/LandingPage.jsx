import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Shield, Brain, Coins, ArrowRight, ChevronDown, BarChart3, Star, Zap } from 'lucide-react';

const STATS = [
  { label: 'Virtual Coins to Start', value: '₹1,00,000', icon: '💰' },
  { label: 'Real Stocks Listed', value: '500+', icon: '📈' },
  { label: 'AI-Powered Analysis', value: '24/7', icon: '🤖' },
  { label: 'Learning Modules', value: '50+', icon: '📚' },
];

const FEATURES = [
  { icon: '📊', title: 'Real Market Data', desc: 'Live prices from NSE/BSE with 4 API fallbacks and 2-hour smart caching', color: '#0ea5e9' },
  { icon: '🤖', title: 'AI Investment Advisor', desc: 'Claude AI analyzes stocks and gives personalized recommendations with return estimates', color: '#7c3aed' },
  { icon: '🧠', title: 'Cognitive Bias Detection', desc: 'ML models detect panic selling, overconfidence, and herd behaviour patterns', color: '#10b981' },
  { icon: '🎮', title: 'Risk-Free Learning', desc: 'Trade with ₹1 Lakh virtual coins. Learn without losing real money', color: '#f59e0b' },
  { icon: '🏠', title: 'Real Estate Investing', desc: 'Explore property listings with broker contacts, yields & appreciation estimates', color: '#ef4444' },
  { icon: '⚡', title: 'F&O Trading', desc: 'Options chain, futures data, Sensex/Nifty derivatives with live Greeks', color: '#a855f7' },
];

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handle = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handle);
    return () => window.removeEventListener('scroll', handle);
  }, []);

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>
      {/* Animated background particles */}
      <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
        {[...Array(20)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: `${Math.random() * 300 + 100}px`, height: `${Math.random() * 300 + 100}px`,
            borderRadius: '50%',
            background: i % 3 === 0 ? 'rgba(124,58,237,0.04)' : i % 3 === 1 ? 'rgba(14,165,233,0.04)' : 'rgba(16,185,129,0.04)',
            left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
            filter: 'blur(40px)',
            animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 3}s`
          }} />
        ))}
      </div>

      {/* Navbar */}
      <nav style={{ position: 'fixed', top: 0, width: '100%', zIndex: 100, padding: '16px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrollY > 50 ? 'rgba(10,10,15,0.9)' : 'transparent', backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none', borderBottom: scrollY > 50 ? '1px solid rgba(255,255,255,0.05)' : 'none', transition: 'all 0.3s' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: '1.4rem', background: 'linear-gradient(135deg, #a855f7, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>InvestIQ</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/login" style={{ padding: '10px 24px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(124,58,237,0.5)', color: '#a855f7', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>Login</Link>
          <Link to="/register" style={{ padding: '10px 24px', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '120px 40px 60px', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: '30px', padding: '8px 20px', marginBottom: '32px', fontSize: '0.85rem', color: '#a855f7' }}>
          <Zap size={14} /> AI-Powered Investment Learning Platform
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 5rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '24px', maxWidth: '900px' }}>
          Learn to Invest Like a{' '}
          <span style={{ background: 'linear-gradient(135deg, #a855f7, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Pro</span>
          {' '}with AI Guidance
        </h1>

        <p style={{ fontSize: '1.2rem', color: '#94a3b8', maxWidth: '600px', lineHeight: 1.7, marginBottom: '40px' }}>
          Get <strong style={{ color: '#f59e0b' }}>₹1,00,000 virtual coins</strong> to practice trading on real NSE/BSE stocks, IPOs, F&O & Real Estate — with AI that detects your biases and improves your decisions.
        </p>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '60px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link to="/register" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 36px', borderRadius: '14px', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', boxShadow: '0 12px 40px rgba(124,58,237,0.3)', transition: 'transform 0.3s' }}>
            Start Free <ArrowRight size={20} />
          </Link>
          <Link to="/login" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 36px', borderRadius: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', textDecoration: 'none', fontWeight: 600, fontSize: '1.1rem' }}>
            Watch Demo
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', maxWidth: '800px', width: '100%' }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{s.icon}</div>
              <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#a855f7', marginBottom: '4px' }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '80px 40px', maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, textAlign: 'center', marginBottom: '12px' }}>
          Everything you need to <span style={{ background: 'linear-gradient(135deg, #a855f7, #0ea5e9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>master investing</span>
        </h2>
        <p style={{ textAlign: 'center', color: '#64748b', marginBottom: '60px' }}>Built for Indian retail investors who want to learn without risk</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '20px', padding: '28px', transition: 'all 0.3s', cursor: 'default', borderTop: `2px solid ${f.color}30` }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '16px' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, marginBottom: '10px', fontSize: '1.1rem' }}>{f.title}</h3>
              <p style={{ color: '#64748b', fontSize: '0.9rem', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '80px 40px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(14,165,233,0.1))', border: '1px solid rgba(124,58,237,0.2)', borderRadius: '24px', padding: '60px', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '16px' }}>Start Your Investment Journey Today</h2>
          <p style={{ color: '#94a3b8', fontSize: '1.1rem', marginBottom: '32px' }}>Join thousands of investors learning to make smarter decisions with AI guidance</p>
          <Link to="/register" style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', padding: '16px 40px', borderRadius: '14px', background: 'linear-gradient(135deg, #7c3aed, #0ea5e9)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: '1.1rem', boxShadow: '0 12px 40px rgba(124,58,237,0.3)' }}>
            Get ₹1 Lakh Virtual Coins Free <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      <footer style={{ textAlign: 'center', padding: '30px', color: '#334155', fontSize: '0.85rem', borderTop: '1px solid rgba(255,255,255,0.03)' }}>
        © 2024 InvestIQ. Built for learning purposes. Not SEBI registered.
      </footer>

      <style>{`@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-20px)} }`}</style>
    </div>
  );
}
