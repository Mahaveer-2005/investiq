import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

export default function ChatBot({ onClose }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "👋 Hi! I'm InvestIQ AI — your personal investing companion. Ask me about stocks, IPOs, real estate, portfolio advice, or market trends!" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: msg }]);
    setLoading(true);
    try {
      const res = await axios.post('/api/ai/chat', { message: msg });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch(e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, having trouble connecting. Try again!' }]);
    }
    setLoading(false);
  };

  const quickActions = ['Top stocks today', 'Best IPOs', 'Portfolio advice', 'Nifty outlook'];

  return (
    <div style={{
      position:'fixed', right:24, bottom:24, width:380, height:560, background:'#111827',
      borderRadius:20, border:'1px solid rgba(108,99,255,0.4)', display:'flex', flexDirection:'column',
      boxShadow:'0 20px 60px rgba(0,0,0,0.5)', zIndex:1000, overflow:'hidden'
    }}>
      <div style={{ padding:'16px 20px', background:'linear-gradient(135deg,#6c63ff,#00d4aa)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:36, height:36, background:'rgba(255,255,255,0.2)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🤖</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15 }}>InvestIQ AI</div>
            <div style={{ fontSize:11, opacity:0.8 }}>Powered by Claude</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.2)', border:'none', color:'#fff', width:28, height:28, borderRadius:'50%', cursor:'pointer', fontSize:16 }}>x</button>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'16px', display:'flex', flexDirection:'column', gap:12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display:'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth:'85%', padding:'10px 14px', borderRadius: msg.role === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
              background: msg.role === 'user' ? 'linear-gradient(135deg,#6c63ff,#5a52d5)' : '#1a2234',
              fontSize:13, lineHeight:1.5, color:'#e2e8f0',
              border: msg.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none'
            }}>{msg.content}</div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', gap:6, padding:'10px 14px', background:'#1a2234', borderRadius:'18px 18px 18px 4px', width:'fit-content' }}>
            {[0,1,2].map(i => <div key={i} style={{ width:8, height:8, background:'#6c63ff', borderRadius:'50%', animation:`bounce 0.9s ease ${i*0.15}s infinite` }} />)}
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div style={{ padding:'8px 16px', display:'flex', gap:6, flexWrap:'wrap' }}>
        {quickActions.map(a => (
          <button key={a} onClick={() => setInput(a)} style={{ padding:'4px 10px', borderRadius:12, background:'rgba(108,99,255,0.15)', border:'1px solid rgba(108,99,255,0.3)', color:'#94a3b8', fontSize:11, cursor:'pointer' }}>{a}</button>
        ))}
      </div>
      <form onSubmit={sendMessage} style={{ padding:'12px 16px', borderTop:'1px solid rgba(255,255,255,0.08)', display:'flex', gap:8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} placeholder="Ask about stocks, IPO, markets..."
          style={{ flex:1, padding:'10px 14px', borderRadius:20, background:'#1a2234', border:'1px solid rgba(255,255,255,0.08)', color:'#e2e8f0', fontSize:13, outline:'none' }} />
        <button type="submit" disabled={loading} style={{ width:40, height:40, borderRadius:'50%', background:'linear-gradient(135deg,#6c63ff,#00d4aa)', border:'none', color:'#fff', cursor:'pointer', fontSize:18, flexShrink:0 }}>↑</button>
      </form>
      <style>{`@keyframes bounce { 0%,80%,100% { transform:translateY(0); } 40% { transform:translateY(-8px); } }`}</style>
    </div>
  );
}
