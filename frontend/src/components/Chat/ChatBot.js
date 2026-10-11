import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, X, Loader } from 'lucide-react';

export default function ChatBot({ onClose }) {
  const [messages, setMessages] = useState([
    { role:'assistant', content:"👋 Hi! I'm **InvestIQ AI**, your smart investment companion!\n\nI can help you with:\n• Stock analysis & recommendations\n• Understanding SENSEX, NIFTY, F&O\n• Detecting your trading biases\n• Real estate investment tips\n\nWhat would you like to know?", time: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role:'user', content: input, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await axios.post('/api/ai/chat', { message: input });
      setMessages(prev => [...prev, { role:'assistant', content: res.data.response, time: new Date() }]);
    } catch (e) {
      setMessages(prev => [...prev, { role:'assistant', content:'Sorry, I encountered an error. Please try again.', time: new Date() }]);
    } finally { setLoading(false); }
  };

  const quickQuestions = ['Recommend stocks for me', 'What is SENSEX?', 'Explain F&O trading', 'How to diversify?'];

  return (
    <div style={{ position:'fixed', bottom:100, right:32, width:380, height:560, background:'var(--bg-card)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:20, display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'0 20px 60px rgba(0,0,0,0.5)', zIndex:1000 }}>
      {/* Header */}
      <div style={{ padding:'16px 20px', background:'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(168,85,247,0.15))', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Bot size={18} style={{ color:'#000' }} />
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:700 }}>InvestIQ AI</p>
            <div style={{ display:'flex', alignItems:'center', gap:4 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'var(--accent-green)', display:'inline-block' }}></span>
              <span style={{ fontSize:11, color:'var(--accent-green)' }}>Online</span>
            </div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-muted)', padding:4 }}><X size={18} /></button>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', gap:8, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:4 }}>
                <Bot size={14} style={{ color:'#000' }} />
              </div>
            )}
            <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' ? 'linear-gradient(135deg, var(--accent-cyan), #0080ff)' : 'var(--bg-secondary)',
              border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none',
              color: msg.role === 'user' ? '#000' : 'var(--text-primary)', fontSize:13, lineHeight:1.6, whiteSpace:'pre-wrap' }}>
              {msg.content}
            </div>
            {msg.role === 'user' && (
              <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--bg-secondary)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:4 }}>
                <User size={14} style={{ color:'var(--text-secondary)' }} />
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg, var(--accent-cyan), var(--accent-purple))', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Bot size={14} style={{ color:'#000' }} />
            </div>
            <div style={{ padding:'10px 14px', background:'var(--bg-secondary)', borderRadius:'16px 16px 16px 4px', border:'1px solid var(--border)' }}>
              <Loader size={14} style={{ color:'var(--accent-cyan)', animation:'spin 1s linear infinite' }} />
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 2 && (
        <div style={{ padding:'8px 16px', display:'flex', gap:8, flexWrap:'wrap', borderTop:'1px solid var(--border)' }}>
          {quickQuestions.map(q => (
            <button key={q} onClick={() => { setInput(q); }} style={{ background:'rgba(0,212,255,0.1)', border:'1px solid rgba(0,212,255,0.3)', borderRadius:20, padding:'4px 10px', fontSize:11, color:'var(--accent-cyan)', cursor:'pointer', whiteSpace:'nowrap' }}>{q}</button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding:12, borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&send()}
          placeholder="Ask about stocks, IPO, F&O..." style={{ flex:1, padding:'10px 14px', borderRadius:12, fontSize:13 }} />
        <button onClick={send} disabled={loading || !input.trim()} className="btn-primary" style={{ width:42, height:42, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
