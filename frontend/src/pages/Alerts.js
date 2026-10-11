import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ALERT_TYPES = [
  { value:'price_above',  label:'📈 Price Above',   unit:'₹',  placeholder:'e.g. 2500', desc:'Alert when price rises above target' },
  { value:'price_below',  label:'📉 Price Below',   unit:'₹',  placeholder:'e.g. 1800', desc:'Alert when price drops below target' },
  { value:'pct_gain',     label:'🚀 % Gain Today',  unit:'%',  placeholder:'e.g. 5',    desc:'Alert on intraday gain %' },
  { value:'pct_drop',     label:'💥 % Drop Today',  unit:'%',  placeholder:'e.g. 3',    desc:'Alert on intraday drop %' },
  { value:'volume_surge', label:'📊 Volume Surge',  unit:'x',  placeholder:'e.g. 2',    desc:'Alert when volume exceeds avg by Nx' },
];

const POPULAR = [
  { symbol:'RELIANCE', name:'Reliance Industries' },
  { symbol:'TCS',      name:'TCS' },
  { symbol:'HDFCBANK', name:'HDFC Bank' },
  { symbol:'INFY',     name:'Infosys' },
  { symbol:'ICICIBANK',name:'ICICI Bank' },
  { symbol:'SBIN',     name:'SBI' },
  { symbol:'NIFTY',    name:'NIFTY 50' },
];

export default function Alerts() {
  const [alerts,   setAlerts]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [checking, setChecking] = useState(false);
  const [form,     setForm]     = useState({ symbol:'', name:'', type:'price_above', targetValue:'', message:'' });
  const [showForm, setShowForm] = useState(false);

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/alerts');
      setAlerts(res.data || []);
    } catch { toast.error('Failed to load alerts'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(checkAlerts, 60000); // auto-check every 60s
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const checkAlerts = async () => {
    setChecking(true);
    try {
      const res = await axios.get('/api/alerts/check');
      if (res.data.count > 0) {
        res.data.triggered.forEach(a => toast.success(`🔔 ${a.triggerMsg || a.symbol + ' alert triggered!'}`, { duration:5000 }));
        fetchAlerts();
      }
    } catch {}
    setChecking(false);
  };

  const createAlert = async () => {
    if (!form.symbol || !form.type || !form.targetValue) { toast.error('Fill all required fields'); return; }
    try {
      await axios.post('/api/alerts', form);
      toast.success('✅ Alert created!');
      setForm({ symbol:'', name:'', type:'price_above', targetValue:'', message:'' });
      setShowForm(false);
      fetchAlerts();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  const deleteAlert = async (id) => {
    try {
      await axios.delete(`/api/alerts/${id}`);
      setAlerts(a => a.filter(x => x.id !== id));
      toast.success('Alert deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const toggleAlert = async (id) => {
    try {
      const res = await axios.patch(`/api/alerts/${id}/toggle`);
      setAlerts(a => a.map(x => x.id===id ? {...x, active:res.data.active, triggered:false} : x));
    } catch { toast.error('Failed to toggle'); }
  };

  const inp = { background:'rgba(10,14,26,0.7)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:8, color:'#e2e8f0', padding:'9px 12px', fontSize:13, outline:'none', width:'100%' };
  const sel = { ...inp, cursor:'pointer' };
  const s   = {
    page: { padding:24, maxWidth:1100, margin:'0 auto' },
    card: { background:'rgba(26,31,53,0.85)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:16, padding:22, marginBottom:16 },
  };

  const activeCount    = alerts.filter(a => a.active && !a.triggered).length;
  const triggeredCount = alerts.filter(a => a.triggered).length;
  const selectedType   = ALERT_TYPES.find(t => t.value === form.type);

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:800, marginBottom:4 }}>🔔 Smart Alerts</h1>
          <p style={{ color:'#94a3b8' }}>Price targets · % moves · Volume surges · Auto-check every 60 seconds</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={checkAlerts} disabled={checking}
            style={{ background:'rgba(99,102,241,0.15)', border:'1px solid rgba(99,102,241,0.3)', color:'#818cf8', borderRadius:10, padding:'8px 16px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
            {checking ? '⏳ Checking...' : '🔍 Check Now'}
          </button>
          <button onClick={() => setShowForm(f => !f)}
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', borderRadius:10, padding:'9px 18px', cursor:'pointer', fontWeight:700, fontSize:13 }}>
            {showForm ? '✕ Cancel' : '＋ New Alert'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14, marginBottom:20 }}>
        {[
          { label:'⚡ Active Alerts',    value:activeCount,    color:'#6366f1' },
          { label:'🔔 Triggered Today',  value:triggeredCount, color:'#f59e0b' },
          { label:'📋 Total Alerts',     value:alerts.length,  color:'#94a3b8' },
          { label:'⏰ Auto-check',       value:'60s',          color:'#10b981' },
        ].map(item => (
          <div key={item.label} style={{ background:`${item.color}10`, border:`1px solid ${item.color}25`, borderRadius:14, padding:'14px 18px' }}>
            <div style={{ color:'#64748b', fontSize:11, fontWeight:600 }}>{item.label}</div>
            <div style={{ fontSize:24, fontWeight:900, color:item.color, marginTop:4 }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* Create Alert Form */}
      {showForm && (
        <div style={{ ...s.card, borderColor:'rgba(99,102,241,0.4)', animation:'fadein 0.3s ease' }}>
          <style>{`@keyframes fadein{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}`}</style>
          <div style={{ fontWeight:800, fontSize:16, marginBottom:18 }}>➕ Create New Alert</div>

          {/* Quick stock chips */}
          <div style={{ marginBottom:16 }}>
            <div style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:8 }}>POPULAR STOCKS</div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {POPULAR.map(p => (
                <button key={p.symbol} onClick={() => setForm(f => ({...f, symbol:p.symbol, name:p.name}))}
                  style={{ background: form.symbol===p.symbol ? '#6366f1' : 'rgba(10,14,26,0.6)', border:'1px solid rgba(99,102,241,0.2)', color: form.symbol===p.symbol?'#fff':'#94a3b8', padding:'5px 12px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12 }}>
                  {p.symbol}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14, marginBottom:16 }}>
            <div>
              <div style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:5 }}>STOCK SYMBOL *</div>
              <input style={inp} placeholder="e.g. RELIANCE" value={form.symbol}
                onChange={e => setForm(f => ({...f, symbol:e.target.value.toUpperCase()}))} />
            </div>
            <div>
              <div style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:5 }}>STOCK NAME</div>
              <input style={inp} placeholder="e.g. Reliance Industries" value={form.name}
                onChange={e => setForm(f => ({...f, name:e.target.value}))} />
            </div>
            <div>
              <div style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:5 }}>ALERT TYPE *</div>
              <select style={sel} value={form.type} onChange={e => setForm(f => ({...f, type:e.target.value}))}>
                {ALERT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <div style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:5 }}>TARGET VALUE * ({selectedType?.unit})</div>
              <input style={inp} type="number" placeholder={selectedType?.placeholder} value={form.targetValue}
                onChange={e => setForm(f => ({...f, targetValue:e.target.value}))} />
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <div style={{ color:'#64748b', fontSize:11, fontWeight:600, marginBottom:5 }}>CUSTOM NOTE (optional)</div>
              <input style={inp} placeholder="e.g. Buy at this level" value={form.message}
                onChange={e => setForm(f => ({...f, message:e.target.value}))} />
            </div>
          </div>

          {/* Alert description */}
          {selectedType && (
            <div style={{ background:'rgba(99,102,241,0.08)', borderRadius:8, padding:'10px 14px', marginBottom:16, color:'#94a3b8', fontSize:13 }}>
              ℹ️ {selectedType.desc} — Alert when <strong style={{color:'#e2e8f0'}}>{form.symbol||'[symbol]'}</strong> {selectedType.desc.split('Alert')[1]?.toLowerCase()}
            </div>
          )}

          <button onClick={createAlert}
            style={{ background:'linear-gradient(135deg,#6366f1,#8b5cf6)', border:'none', color:'#fff', borderRadius:10, padding:'11px 28px', cursor:'pointer', fontWeight:800, fontSize:14 }}>
            🔔 Create Alert
          </button>
        </div>
      )}

      {/* Alerts List */}
      {loading ? (
        <div style={{ ...s.card, textAlign:'center', padding:40 }}>
          <div style={{ color:'#94a3b8' }}>Loading alerts...</div>
        </div>
      ) : alerts.length === 0 ? (
        <div style={{ ...s.card, textAlign:'center', padding:60 }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔔</div>
          <h2 style={{ fontSize:18, fontWeight:700, marginBottom:8 }}>No Alerts Set</h2>
          <p style={{ color:'#94a3b8', marginBottom:16 }}>Create your first alert to track price targets and market moves.</p>
          <button onClick={() => setShowForm(true)} style={{ background:'#6366f1', border:'none', color:'#fff', padding:'10px 20px', borderRadius:10, cursor:'pointer', fontWeight:700 }}>
            ＋ Create First Alert
          </button>
        </div>
      ) : (
        <div>
          {/* Triggered alerts */}
          {alerts.filter(a => a.triggered).length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ color:'#f59e0b', fontWeight:700, fontSize:14, marginBottom:10 }}>🔔 Triggered Alerts</div>
              {alerts.filter(a => a.triggered).map(alert => <AlertRow key={alert.id} alert={alert} onDelete={deleteAlert} onToggle={toggleAlert} />)}
            </div>
          )}

          {/* Active alerts */}
          {alerts.filter(a => a.active && !a.triggered).length > 0 && (
            <div style={{ marginBottom:16 }}>
              <div style={{ color:'#10b981', fontWeight:700, fontSize:14, marginBottom:10 }}>⚡ Active Alerts</div>
              {alerts.filter(a => a.active && !a.triggered).map(alert => <AlertRow key={alert.id} alert={alert} onDelete={deleteAlert} onToggle={toggleAlert} />)}
            </div>
          )}

          {/* Paused alerts */}
          {alerts.filter(a => !a.active).length > 0 && (
            <div>
              <div style={{ color:'#475569', fontWeight:700, fontSize:14, marginBottom:10 }}>⏸ Paused Alerts</div>
              {alerts.filter(a => !a.active).map(alert => <AlertRow key={alert.id} alert={alert} onDelete={deleteAlert} onToggle={toggleAlert} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function AlertRow({ alert, onDelete, onToggle }) {
  const typeInfo = {
    price_above:  { label:'Price Above',  color:'#10b981', emoji:'📈' },
    price_below:  { label:'Price Below',  color:'#ef4444', emoji:'📉' },
    pct_gain:     { label:'% Gain',       color:'#6366f1', emoji:'🚀' },
    pct_drop:     { label:'% Drop',       color:'#f59e0b', emoji:'💥' },
    volume_surge: { label:'Vol Surge',    color:'#8b5cf6', emoji:'📊' },
  };
  const info = typeInfo[alert.type] || { label:alert.type, color:'#64748b', emoji:'🔔' };
  const unitMap = { price_above:'₹', price_below:'₹', pct_gain:'%', pct_drop:'%', volume_surge:'x' };
  const unit = unitMap[alert.type] || '';

  return (
    <div style={{
      background: alert.triggered ? 'rgba(245,158,11,0.08)' : alert.active ? 'rgba(26,31,53,0.85)' : 'rgba(10,14,26,0.4)',
      border: `1px solid ${alert.triggered ? 'rgba(245,158,11,0.3)' : alert.active ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.08)'}`,
      borderRadius:12, padding:'14px 18px', marginBottom:8,
      display:'flex', alignItems:'center', gap:14, flexWrap:'wrap',
      opacity: alert.active ? 1 : 0.6,
    }}>
      <div style={{ fontSize:22 }}>{info.emoji}</div>

      <div style={{ flex:1, minWidth:200 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <span style={{ fontWeight:800, fontSize:14 }}>{alert.symbol}</span>
          <span style={{ background:`${info.color}18`, color:info.color, padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>{info.label}</span>
          {alert.triggered && <span style={{ background:'rgba(245,158,11,0.15)', color:'#f59e0b', padding:'2px 8px', borderRadius:6, fontSize:11, fontWeight:700 }}>🔔 TRIGGERED</span>}
        </div>
        <div style={{ color:'#64748b', fontSize:12 }}>
          Target: <strong style={{ color:info.color }}>{unit}{alert.targetValue}</strong>
          {alert.livePrice && <span style={{ marginLeft:10 }}>Live: <strong style={{color:'#e2e8f0'}}>₹{alert.livePrice?.toFixed(0)}</strong></span>}
          {alert.liveChange !== undefined && <span style={{ marginLeft:10, color:alert.liveChange>=0?'#10b981':'#ef4444' }}>{alert.liveChange>=0?'+':''}{alert.liveChange?.toFixed(1)}%</span>}
        </div>
        {alert.message && <div style={{ color:'#475569', fontSize:11, marginTop:3 }}>📝 {alert.message}</div>}
        {alert.triggered && alert.triggerMsg && <div style={{ color:'#f59e0b', fontSize:12, marginTop:4 }}>✅ {alert.triggerMsg}</div>}
      </div>

      {/* Progress bar (for price alerts) */}
      {(alert.type==='price_above'||alert.type==='price_below') && alert.livePrice > 0 && (
        <div style={{ width:100 }}>
          <div style={{ color:'#475569', fontSize:10, marginBottom:3, textAlign:'center' }}>
            {alert.type==='price_above'?'Progress':'Progress'}
          </div>
          <div style={{ background:'rgba(10,14,26,0.6)', borderRadius:4, height:6, overflow:'hidden' }}>
            <div style={{ background:info.color, height:'100%', borderRadius:4,
              width:`${alert.type==='price_above'
                ? Math.min(100,(alert.livePrice/alert.targetValue)*100)
                : Math.min(100,(alert.targetValue/alert.livePrice)*100)}%` }} />
          </div>
        </div>
      )}

      {/* Actions */}
      <div style={{ display:'flex', gap:6 }}>
        <button onClick={() => onToggle(alert.id)}
          style={{ background: alert.active ? 'rgba(245,158,11,0.15)' : 'rgba(16,185,129,0.15)', border:'none', color: alert.active ? '#f59e0b' : '#10b981', padding:'6px 12px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12 }}>
          {alert.active ? '⏸ Pause' : '▶ Resume'}
        </button>
        <button onClick={() => onDelete(alert.id)}
          style={{ background:'rgba(239,68,68,0.1)', border:'none', color:'#ef4444', padding:'6px 12px', borderRadius:8, cursor:'pointer', fontWeight:700, fontSize:12 }}>
          🗑
        </button>
      </div>
    </div>
  );
}