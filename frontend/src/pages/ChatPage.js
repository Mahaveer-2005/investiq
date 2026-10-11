import React, { useState, useEffect, useRef } from 'react';
import { aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  'What stocks should I buy today?',
  'Explain NIFTY 50 to me',
  'How does F&O trading work?',
  'What is the best sector to invest in now?',
  'How do I analyze a stock?',
  'What is IPO GMP?'
];

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [histLoading, setHistLoading] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    aiAPI.getChatHistory()
      .then(d => {
        if (d.messages?.length) setMessages(d.messages);
        else setMessages([{ role: 'assistant', content: `Namaste ${user?.name?.split(' ')[0]}! 👋 I'm InvestIQ AI, your personal investment advisor. I can help you with:\n• Stock analysis & recommendations\n• IPO insights\n• F&O concepts\n• Portfolio strategy\n• Market news interpretation\n\nWhat would you like to learn today?` }]);
      })
      .catch(() => setMessages([{ role: 'assistant', content: `Hello! I'm InvestIQ AI. Ask me anything about investing! 💬` }]))
      .finally(() => setHistLoading(false));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (msg = input) => {
    if (!msg.trim() || loading) return;
    const userMsg = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await aiAPI.chat(msg);
      setMessages(res.messages?.slice(-20) || [...messages, userMsg, { role: 'assistant', content: res.response }]);
    } catch (err) {
      toast.error('Failed to get response');
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, marginBottom: 4 }}>💬 AI Investment Chat</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Powered by Google Gemini AI · Ask anything about markets</p>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 0 16px' }}>
        {histLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner" /></div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 20, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: msg.role === 'user' ? 'var(--gradient-main)' : 'linear-gradient(135deg, #7c4dff, #00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0, color: 'white', fontWeight: 700 }}>
                {msg.role === 'user' ? user?.name?.[0]?.toUpperCase() : '🤖'}
              </div>
              <div style={{ maxWidth: '75%', padding: '14px 18px', borderRadius: msg.role === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px', background: msg.role === 'user' ? 'linear-gradient(135deg, #0057ff, #7c4dff)' : 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7c4dff, #00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
            <div style={{ padding: '14px 18px', borderRadius: '4px 18px 18px 18px', background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-cyan)', animation: `pulse-glow 1.2s ${i * 0.2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, overflowX: 'auto', paddingBottom: 4 }}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => sendMessage(s)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid var(--border)', background: 'rgba(0,212,255,0.05)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all 0.2s' }}>{s}</button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 12 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about stocks, IPOs, F&O, market trends..."
          style={{ flex: 1, padding: '14px 18px', borderRadius: 14, fontSize: 15 }}
          disabled={loading}
        />
        <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="btn btn-primary" style={{ padding: '14px 24px', borderRadius: 14, flexShrink: 0 }}>
          {loading ? '⏳' : 'Send →'}
        </button>
      </div>
    </div>
  );
}
