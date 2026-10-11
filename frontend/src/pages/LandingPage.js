import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  const features = [
    { icon: '📈', title: '500+ Real Stocks', desc: 'Live NSE/BSE prices with real-time updates every 2 hours' },
    { icon: '🤖', title: 'AI Advisor', desc: 'Claude AI analyzes stocks and recommends personalized investments' },
    { icon: '💰', title: '₹1 Lakh Virtual Fund', desc: 'Practice risk-free trading with ₹1,00,000 virtual coins' },
    { icon: '🚀', title: 'IPO Tracker', desc: 'Track upcoming, open and listed IPOs with real details' },
    { icon: '⚡', title: 'Futures & Options', desc: 'Learn F&O trading with real options chain data' },
    { icon: '🏠', title: 'Real Estate', desc: 'Explore properties across India with broker contacts' },
    { icon: '🧠', title: 'Behavior Analysis', desc: 'ML-powered detection of trading biases and patterns' },
    { icon: '💬', title: 'AI Chat', desc: 'Ask any financial question to your AI investing companion' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', overflow: 'hidden' }}>
      {/* Animated background */}
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', animation: 'float 6s ease-in-out infinite' }} />
        <div style={{ position: 'absolute', top: '50%', right: '5%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)', animation: 'float 8s ease-in-out infinite reverse' }} />
        <div style={{ position: 'absolute', bottom: '20%', left: '20%', width: 250, height: 250, borderRadius: '50%', background: 'radial-gradient(circle, rgba(6,182,212,0.06) 0%, transparent 70%)' }} />
      </div>

      <style>{`
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-20px); } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        .hero-btn:hover { transform: translateY(-3px) !important; box-shadow: 0 15px 40px rgba(59,130,246,0.5) !important; }
        .feature-card:hover { transform: translateY(-5px); border-color: rgba(59,130,246,0.4) !important; }
      `}</style>

      {/* Navbar */}
      <nav style={{ position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 48px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>💹</div>
          <span style={{ fontSize: 24, fontWeight: 800, background: 'linear-gradient(135deg, #3b82f6, #06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>InvestIQ</span>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <Link to="/login" style={{ padding: '10px 24px', borderRadius: 10, border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 500, transition: 'all 0.3s' }}>Login</Link>
          <Link to="/register" style={{ padding: '10px 24px', borderRadius: 10, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', textDecoration: 'none', fontWeight: 600 }}>Get Started Free</Link>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: '100px 48px 80px', animation: 'slideIn 0.8s ease forwards' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 20, padding: '6px 16px', marginBottom: 32, fontSize: 13, color: '#3b82f6' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} className="pulse" />
          Live market data · AI-powered · Risk-free learning
        </div>
        <h1 style={{ fontSize: 'clamp(40px, 6vw, 80px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 24, letterSpacing: -1 }}>
          Your Intelligent<br/>
          <span style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Investing Companion</span>
        </h1>
        <p style={{ fontSize: 20, color: 'var(--text-secondary)', maxWidth: 600, margin: '0 auto 48px', lineHeight: 1.7 }}>
          Master the stock market with ₹1,00,000 virtual coins, AI-powered recommendations, and real-time market data — all without any risk.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/register" className="hero-btn" style={{ padding: '16px 40px', borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 18, transition: 'all 0.3s', display: 'inline-block' }}>
            Start Trading Free →
          </Link>
          <Link to="/login" style={{ padding: '16px 40px', borderRadius: 12, border: '1px solid var(--border)', color: 'var(--text-primary)', textDecoration: 'none', fontWeight: 600, fontSize: 16 }}>
            Sign In
          </Link>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 48, marginTop: 72, flexWrap: 'wrap' }}>
          {[['500+', 'Live Stocks'], ['₹1L', 'Virtual Fund'], ['AI', 'Powered'], ['10+', 'IPOs Tracked']].map(([n, l]) => (
            <div key={n} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#3b82f6', fontFamily: 'JetBrains Mono' }}>{n}</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ position: 'relative', zIndex: 5, padding: '60px 48px', maxWidth: 1200, margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: 40, fontWeight: 700, marginBottom: 16 }}>Everything You Need</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 48, fontSize: 16 }}>Professional investing tools made simple for everyone</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {features.map((f, i) => (
            <div key={i} className="feature-card" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, transition: 'all 0.3s', animationDelay: `${i * 0.1}s` }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 5, textAlign: 'center', padding: '80px 48px', background: 'linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))', margin: '40px 48px', borderRadius: 24, border: '1px solid var(--border)' }}>
        <h2 style={{ fontSize: 40, fontWeight: 800, marginBottom: 16 }}>Ready to Start Investing Smart?</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 18, marginBottom: 32 }}>Join thousands of learners mastering the stock market with InvestIQ</p>
        <Link to="/register" style={{ padding: '18px 48px', borderRadius: 12, background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: 'white', textDecoration: 'none', fontWeight: 700, fontSize: 18, display: 'inline-block' }}>
          Create Free Account — Get ₹1,00,000 Virtual Fund
        </Link>
      </section>

      <footer style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: 13, borderTop: '1px solid var(--border)', marginTop: 40 }}>
        © 2024 InvestIQ · Made with 💙 by Dr. AIT Students · For Educational Purposes Only
      </footer>
    </div>
  );
}
