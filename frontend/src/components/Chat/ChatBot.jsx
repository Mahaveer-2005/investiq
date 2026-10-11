import React, { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../../services/api';

export default function ChatBot({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hi! I\'m your InvestIQ AI advisor. I can help you analyze stocks, understand your trading behavior, and make smarter investment decisions. What would you like to know?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  const suggestions = ['Analyze RELIANCE stock', 'How to avoid panic selling?', 'Best sectors to invest now?', 'Explain F&O trading'];

  useEffect(() => {
    aiAPI.getChatHistory().then(history => {
      if (history.length > 0) setMessages(history);
    }).catch(() => {});
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (msg) => {
    const text = msg || input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setLoading(true);
    try {
      const res = await aiAPI.chat(text);
      setMessages(prev => [...prev, { role: 'assistant', content: res.response }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ AI service temporarily unavailable. Please configure your Anthropic API key.' }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ position: 'fixed', bottom: 20, right: 20, width: 400, height: 580, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 20, display: 'flex', flexDirection: 'column', zIndex: 1000, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))', borderRadius: '20px 20px 0 0' }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🤖</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>InvestIQ AI</div>
          <div style={{ fontSize: 11, color: 'var(--accent-green)' }}>● Online — Your Smart Advisor</div>
        </div>
        <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 20 }}>✕</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))' : 'var(--bg-secondary)', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '10px 16px', background: 'var(--bg-secondary)', borderRadius: '16px 16px 16px 4px', fontSize: 20, letterSpacing: 4 }}>
              <span style={{ animation: 'pulse 1s infinite' }}>•</span>
              <span style={{ animation: 'pulse 1s 0.2s infinite' }}>•</span>
              <span style={{ animation: 'pulse 1s 0.4s infinite' }}>•</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length < 3 && (
        <div style={{ padding: '0 16px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {suggestions.map((s, i) => (
            <button key={i} onClick={() => send(s)} style={{ padding: '5px 10px', background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', borderRadius: 20, cursor: 'pointer', fontSize: 11, color: 'var(--accent-blue)', fontFamily: 'Space Grotesk, sans-serif' }}>{s}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about stocks, trading tips..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: 12, padding: '10px 14px', color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif', fontSize: 13, outline: 'none' }}
        />
        <button onClick={() => send()} disabled={loading || !input.trim()} style={{ width: 42, height: 42, background: 'linear-gradient(135deg, var(--accent-blue), var(--accent-purple))', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>→</button>
      </div>
    </div>
  );
}
