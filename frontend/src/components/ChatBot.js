import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';

const SUGGESTED = [
  'Should I buy Reliance?',
  'Explain P/E ratio',
  'How is NIFTY performing?',
  'Best stocks for beginners',
  'What is F&O trading?',
  'How to reduce losses?',
  'Explain SIP vs Lumpsum',
  'What is LTCG tax?',
];

function MarkdownText({ text }) {
  if (!text) return null;
  const html = text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" style="color:#818cf8;text-decoration:underline">$1</a>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>')
    .replace(/#{1,3} (.+)/g, '<strong style="font-size:15px;color:#e2e8f0">$1</strong>')
    .replace(/\|(.+)\|/g, (match) => {
      const cells = match.split('|').filter(c => c.trim() && !c.match(/^[-\s|]+$/));
      if (cells.length === 0) return '';
      return `<div style="display:flex;gap:8px;margin:4px 0">${cells.map(c => `<span style="background:rgba(99,102,241,0.15);padding:2px 8px;border-radius:4px;font-size:12px">${c.trim()}</span>`).join('')}</div>`;
    });
  return <div dangerouslySetInnerHTML={{ __html: html }} style={{ lineHeight: 1.7 }} />;
}

export default function ChatBot() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '👋 Hi! I\'m **IQ Bot**, your AI financial advisor.\n\nAsk me anything about stocks, markets, investment strategies, or your portfolio! 🚀', time: new Date() }
  ]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [typing,   setTyping]   = useState(false);
  const [source,   setSource]   = useState('');
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput('');

    const userMsg = { role: 'user', content: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setTyping(true);

    try {
      const res = await axios.post('/api/chat', { message: msg });
      setTyping(false);
      setSource(res.data.source || '');
      const botMsg = { role: 'assistant', content: res.data.reply, time: new Date(), source: res.data.source };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      setTyping(false);
      const errMsg = { role: 'assistant', content: '❌ Sorry, I encountered an error. Please try again!', time: new Date() };
      setMessages(prev => [...prev, errMsg]);
    }
    setLoading(false);
  }, [input, loading]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const clearChat = async () => {
    try { await axios.delete('/api/chat/history'); } catch {}
    setMessages([{ role: 'assistant', content: '🔄 Chat cleared! How can I help you today?', time: new Date() }]);
  };

  const s = {
    btn: {
      position: 'fixed', bottom: 24, right: 24, zIndex: 1500,
      width: 60, height: 60, borderRadius: '50%',
      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      border: 'none', cursor: 'pointer', fontSize: 26,
      boxShadow: '0 8px 32px rgba(99,102,241,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'transform 0.2s, box-shadow 0.2s',
    },
    window: {
      position: 'fixed', bottom: 96, right: 24, zIndex: 1500,
      width: 400, height: 600,
      background: 'rgba(10,14,26,0.97)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 20, display: 'flex', flexDirection: 'column',
      boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      overflow: 'hidden',
    },
    header: {
      padding: '16px 20px', background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))',
      borderBottom: '1px solid rgba(99,102,241,0.2)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    },
    messages: { flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 12 },
    userBubble: {
      alignSelf: 'flex-end', maxWidth: '80%',
      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
      color: '#fff', padding: '10px 14px', borderRadius: '16px 16px 4px 16px',
      fontSize: 14, lineHeight: 1.5,
    },
    botBubble: {
      alignSelf: 'flex-start', maxWidth: '90%',
      background: 'rgba(26,31,53,0.9)',
      border: '1px solid rgba(99,102,241,0.2)',
      color: '#e2e8f0', padding: '12px 14px', borderRadius: '16px 16px 16px 4px',
      fontSize: 14,
    },
    input: {
      flex: 1, background: 'rgba(26,31,53,0.8)', border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 12, color: '#e2e8f0', padding: '10px 14px', fontSize: 14,
      outline: 'none', resize: 'none', fontFamily: 'inherit',
    },
  };

  return (
    <>
      <style>{`
        .chat-messages::-webkit-scrollbar{width:4px}
        .chat-messages::-webkit-scrollbar-track{background:transparent}
        .chat-messages::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.3);border-radius:4px}
        .chat-btn:hover{transform:scale(1.08)!important;box-shadow:0 12px 40px rgba(99,102,241,0.7)!important}
        @keyframes bounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
        @keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        .msg-enter{animation:fadein 0.3s ease}
      `}</style>

      {/* Chat Window */}
      {open && (
        <div style={s.window}>
          {/* Header */}
          <div style={s.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🤖</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>IQ Bot</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', animation: 'bounce 2s infinite' }} />
                  <span style={{ color: '#10b981', fontSize: 11, fontWeight: 600 }}>
                    {source === 'claude' ? 'Powered by Claude AI' : 'AI Financial Advisor'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={clearChat} title="Clear chat"
                style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', color: '#94a3b8', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 13 }}>
                🗑️
              </button>
              <button onClick={() => setOpen(false)}
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 15 }}>
                ✕
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-messages" style={s.messages}>
            {messages.map((msg, i) => (
              <div key={i} className="msg-enter" style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={msg.role === 'user' ? s.userBubble : s.botBubble}>
                  {msg.role === 'user'
                    ? <span>{msg.content}</span>
                    : <MarkdownText text={msg.content} />
                  }
                </div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 3, paddingInline: 4 }}>
                  {new Date(msg.time).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  {msg.source === 'claude' && ' · Claude AI'}
                </div>
              </div>
            ))}

            {typing && (
              <div className="msg-enter" style={{ alignSelf: 'flex-start' }}>
                <div style={{ ...s.botBubble, display: 'flex', gap: 4, alignItems: 'center', padding: '12px 18px' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#6366f1', animation: `bounce 1.2s ${i*0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Suggested Questions */}
          {messages.length <= 2 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUGGESTED.slice(0, 4).map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', color: '#818cf8', borderRadius: 12, padding: '5px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(99,102,241,0.15)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              rows={1}
              style={s.input}
              placeholder="Ask anything about stocks, markets..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              onInput={e => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px'; }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              style={{ width: 42, height: 42, borderRadius: 12, background: input.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.2)', border: 'none', color: '#fff', cursor: input.trim() ? 'pointer' : 'not-allowed', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}>
              {loading ? '⏳' : '➤'}
            </button>
          </div>

          {/* Suggested chips after first message */}
          {messages.length > 2 && (
            <div style={{ padding: '4px 12px 12px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {SUGGESTED.slice(4).map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: 10, padding: '4px 10px', cursor: 'pointer', fontSize: 11, whiteSpace: 'nowrap' }}>
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Button */}
      <button className="chat-btn" onClick={() => setOpen(o => !o)} style={s.btn} title="Ask IQ Bot">
        {open ? '✕' : '🤖'}
      </button>
    </>
  );
}
