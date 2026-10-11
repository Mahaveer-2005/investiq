import React, { useState, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell,
} from 'recharts';

const fmtINR = (n) => {
  const num = Number(n);
  if (isNaN(num)) return '₹0';
  if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(2)}Cr`;
  if (Math.abs(num) >= 100000)   return `₹${(num / 100000).toFixed(2)}L`;
  return `₹${Math.abs(num).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};
const fmtPct   = (n) => `${Number(n) >= 0 ? '+' : ''}${Number(n).toFixed(2)}%`;
const pnlColor = (v) => Number(v) >= 0 ? '#10b981' : '#ef4444';

const STRATEGIES = [
  { value: 'sma_crossover',   label: 'SMA Crossover',   desc: 'Buy when fast SMA crosses above slow SMA'       },
  { value: 'ema_crossover',   label: 'EMA Crossover',   desc: 'Exponential MA crossover (faster response)'     },
  { value: 'rsi_strategy',    label: 'RSI Strategy',    desc: 'Buy oversold, sell overbought'                  },
  { value: 'macd_strategy',   label: 'MACD Crossover',  desc: 'Buy on MACD/signal crossover'                  },
  { value: 'bollinger_bands', label: 'Bollinger Bands', desc: 'Buy lower band bounce, sell upper band'         },
  { value: 'rsi_macd',        label: 'RSI + MACD',      desc: 'Combined: MACD signal confirmed by RSI'         },
  { value: 'supertrend',      label: 'Supertrend',      desc: 'ATR-based trend flip — popular for swing trades' },
  { value: 'volume_breakout', label: 'Volume Breakout', desc: 'Breaks recent high on a volume surge'           },
  { value: 'mean_reversion',  label: 'Mean Reversion',  desc: 'Buys statistically oversold dips (Z-score)'     },
  { value: 'donchian_breakout', label: 'Donchian Breakout', desc: 'Turtle-trading style N-day high/low breakout' },
  { value: 'vwap_strategy',   label: 'VWAP Strategy',   desc: 'Buy below VWAP value zone, sell above'          },
  { value: 'parabolic_sar',   label: 'Parabolic SAR',   desc: 'Stop-and-reverse trend follower'                },
];

const RANGES = [
  { value: '6mo', label: '6 Months' },
  { value: '1y',  label: '1 Year'   },
  { value: '2y',  label: '2 Years'  },
  { value: '5y',  label: '5 Years'  },
];

const DEFAULT_PARAMS = {
  sma_crossover:   { fastPeriod: 10, slowPeriod: 30 },
  ema_crossover:   { fastPeriod: 9,  slowPeriod: 21 },
  rsi_strategy:    { rsiPeriod: 14, oversold: 30, overbought: 70 },
  macd_strategy:   { fast: 12, slow: 26, signal: 9 },
  bollinger_bands: { period: 20, stdDev: 2 },
  rsi_macd:        { rsiPeriod: 14 },
  supertrend:      { atrPeriod: 10, multiplier: 3 },
  volume_breakout: { lookback: 20, volumeMultiplier: 1.5 },
  mean_reversion:  { period: 20, zEntry: -2, zExit: 0 },
  donchian_breakout: { entryPeriod: 20, exitPeriod: 10 },
  vwap_strategy:   { bandPct: 1.0 },
  parabolic_sar:   { afStep: 0.02, afMax: 0.2 },
};

const card = {
  background:   'rgba(13,17,35,0.88)',
  border:       '1px solid rgba(99,102,241,0.15)',
  borderRadius: 14,
  padding:      20,
};

export default function Backtest() {
  const [symbol,     setSymbol]     = useState('RELIANCE');
  const [strategy,   setStrategy]   = useState('sma_crossover');
  const [range,      setRange]      = useState('1y');
  const [capital,    setCapital]    = useState(100000);
  const [stopLoss,   setStopLoss]   = useState(0);
  const [takeProfit, setTakeProfit] = useState(0);
  const [params,     setParams]     = useState(DEFAULT_PARAMS.sma_crossover);
  const [result,     setResult]     = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [activeTab,  setActiveTab]  = useState('overview');
  const [symbols,    setSymbols]    = useState([]);
  const [showDrop,   setShowDrop]   = useState(false);

  const searchSymbols = useCallback(async (q) => {
    try {
      const { data } = await axios.get(`/api/backtest/symbols?q=${q}`);
      setSymbols(data || []);
      setShowDrop(true);
    } catch {}
  }, []);

  const onStrategyChange = (s) => {
    setStrategy(s);
    setParams(DEFAULT_PARAMS[s] || {});
  };

  const runBacktest = async () => {
    if (!symbol.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await axios.post('/api/backtest', {
        symbol:           symbol.trim().toUpperCase(),
        strategy,
        params,
        startingCapital:  capital,
        stopLossPct:      stopLoss,
        takeProfitPct:    takeProfit,
        range,
      }, { timeout: 30000 });
      setResult(data);
      setActiveTab('overview');
    } catch (err) {
      setError(err?.response?.data?.message || 'Backtest failed. Try a different symbol or range.');
    } finally {
      setLoading(false);
    }
  };

  const strat = STRATEGIES.find(s => s.value === strategy);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      <style>{`
        @keyframes fadein { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes pulse  { 0%,100%{opacity:.4} 50%{opacity:1} }
        .param-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
        .param-row label { color:#94a3b8; font-size:12px; min-width:130px; }
        .param-row input[type=number] { background:rgba(10,14,26,0.6); border:1px solid rgba(99,102,241,0.2); color:#e2e8f0; border-radius:8px; padding:6px 10px; width:90px; font-size:13px; }
        .param-row input[type=range]  { flex:1; accent-color:#6366f1; }
        .strat-card { border:1px solid rgba(99,102,241,0.15); border-radius:10px; padding:12px 14px; cursor:pointer; transition:all 0.2s; }
        .strat-card:hover { border-color:rgba(99,102,241,0.4); background:rgba(99,102,241,0.05); }
        .strat-card.active { border-color:#6366f1; background:rgba(99,102,241,0.1); }
        .tab-btn { padding:9px 18px; border-radius:10px; font-weight:700; font-size:13px; cursor:pointer; border:none; transition:all 0.2s; }
        .tab-btn:hover { opacity:0.85; }
        .trade-row:hover { background:rgba(99,102,241,0.04) !important; }
        .sym-drop { position:absolute; top:100%; left:0; right:0; background:#0d1123; border:1px solid rgba(99,102,241,0.3); border-radius:10px; z-index:100; max-height:200px; overflow-y:auto; }
        .sym-item { padding:8px 12px; cursor:pointer; font-size:13px; color:#e2e8f0; }
        .sym-item:hover { background:rgba(99,102,241,0.1); }
        .run-btn { width:100%; padding:14px; border-radius:12px; border:none; font-weight:900; font-size:15px; display:flex; align-items:center; justify-content:center; gap:10px; transition:all 0.2s; }
        .run-btn:hover:not(:disabled) { opacity:0.9; transform:translateY(-1px); }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24, animation: 'fadein 0.4s ease' }}>
        <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 6 }}>📊 Backtesting Engine</h1>
        <p style={{ color: '#94a3b8', margin: 0 }}>Test trading strategies on real NSE historical data. Zero risk, real insights.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── Left Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Symbol Search */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: '#818cf8' }}>🔍 Stock Symbol</div>
            <div style={{ position: 'relative' }}>
              <input
                value={symbol}
                onChange={e => { setSymbol(e.target.value.toUpperCase()); searchSymbols(e.target.value); }}
                onFocus={() => searchSymbols(symbol)}
                onBlur={() => setTimeout(() => setShowDrop(false), 200)}
                placeholder="e.g. RELIANCE"
                style={{ width: '100%', background: 'rgba(10,14,26,0.6)', border: '1px solid rgba(99,102,241,0.25)', color: '#e2e8f0', borderRadius: 10, padding: '10px 14px', fontSize: 14, fontWeight: 700 }}
              />
              {showDrop && symbols.length > 0 && (
                <div className="sym-drop">
                  {symbols.map(s => (
                    <div key={s} className="sym-item"
                      onMouseDown={() => { setSymbol(s); setShowDrop(false); }}>
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Strategy */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: '#818cf8' }}>⚙️ Strategy</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STRATEGIES.map(s => (
                <div key={s.value}
                  className={`strat-card ${strategy === s.value ? 'active' : ''}`}
                  onClick={() => onStrategyChange(s.value)}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#e2e8f0', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Parameters */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: '#818cf8' }}>🎛️ Parameters</div>

            {(strategy === 'sma_crossover' || strategy === 'ema_crossover') && (<>
              <div className="param-row">
                <label>Fast period</label>
                <input type="range" min="3" max="30" value={params.fastPeriod || 10}
                  onChange={e => setParams(p => ({ ...p, fastPeriod: +e.target.value }))} />
                <input type="number" value={params.fastPeriod || 10}
                  onChange={e => setParams(p => ({ ...p, fastPeriod: +e.target.value }))} />
              </div>
              <div className="param-row">
                <label>Slow period</label>
                <input type="range" min="10" max="200" value={params.slowPeriod || 30}
                  onChange={e => setParams(p => ({ ...p, slowPeriod: +e.target.value }))} />
                <input type="number" value={params.slowPeriod || 30}
                  onChange={e => setParams(p => ({ ...p, slowPeriod: +e.target.value }))} />
              </div>
            </>)}

            {strategy === 'rsi_strategy' && (<>
              <div className="param-row">
                <label>RSI period</label>
                <input type="range" min="5" max="30" value={params.rsiPeriod || 14}
                  onChange={e => setParams(p => ({ ...p, rsiPeriod: +e.target.value }))} />
                <input type="number" value={params.rsiPeriod || 14}
                  onChange={e => setParams(p => ({ ...p, rsiPeriod: +e.target.value }))} />
              </div>
              <div className="param-row">
                <label>Oversold level</label>
                <input type="range" min="10" max="45" value={params.oversold || 30}
                  onChange={e => setParams(p => ({ ...p, oversold: +e.target.value }))} />
                <input type="number" value={params.oversold || 30}
                  onChange={e => setParams(p => ({ ...p, oversold: +e.target.value }))} />
              </div>
              <div className="param-row">
                <label>Overbought level</label>
                <input type="range" min="55" max="90" value={params.overbought || 70}
                  onChange={e => setParams(p => ({ ...p, overbought: +e.target.value }))} />
                <input type="number" value={params.overbought || 70}
                  onChange={e => setParams(p => ({ ...p, overbought: +e.target.value }))} />
              </div>
            </>)}

            {strategy === 'macd_strategy' && (<>
              <div className="param-row">
                <label>Fast EMA</label>
                <input type="range" min="5" max="20" value={params.fast || 12}
                  onChange={e => setParams(p => ({ ...p, fast: +e.target.value }))} />
                <input type="number" value={params.fast || 12}
                  onChange={e => setParams(p => ({ ...p, fast: +e.target.value }))} />
              </div>
              <div className="param-row">
                <label>Slow EMA</label>
                <input type="range" min="15" max="50" value={params.slow || 26}
                  onChange={e => setParams(p => ({ ...p, slow: +e.target.value }))} />
                <input type="number" value={params.slow || 26}
                  onChange={e => setParams(p => ({ ...p, slow: +e.target.value }))} />
              </div>
              <div className="param-row">
                <label>Signal line</label>
                <input type="range" min="3" max="20" value={params.signal || 9}
                  onChange={e => setParams(p => ({ ...p, signal: +e.target.value }))} />
                <input type="number" value={params.signal || 9}
                  onChange={e => setParams(p => ({ ...p, signal: +e.target.value }))} />
              </div>
            </>)}

            {strategy === 'bollinger_bands' && (<>
              <div className="param-row">
                <label>BB period</label>
                <input type="range" min="10" max="50" value={params.period || 20}
                  onChange={e => setParams(p => ({ ...p, period: +e.target.value }))} />
                <input type="number" value={params.period || 20}
                  onChange={e => setParams(p => ({ ...p, period: +e.target.value }))} />
              </div>
              <div className="param-row">
                <label>Std deviation</label>
                <input type="range" min="1" max="4" step="0.5" value={params.stdDev || 2}
                  onChange={e => setParams(p => ({ ...p, stdDev: +e.target.value }))} />
                <input type="number" value={params.stdDev || 2}
                  onChange={e => setParams(p => ({ ...p, stdDev: +e.target.value }))} />
              </div>
            </>)}

            {strategy === 'rsi_macd' && (
              <div className="param-row">
                <label>RSI period</label>
                <input type="range" min="5" max="30" value={params.rsiPeriod || 14}
                  onChange={e => setParams(p => ({ ...p, rsiPeriod: +e.target.value }))} />
                <input type="number" value={params.rsiPeriod || 14}
                  onChange={e => setParams(p => ({ ...p, rsiPeriod: +e.target.value }))} />
              </div>
            )}
          </div>

          {/* Capital & Risk */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: '#818cf8' }}>💰 Capital & Risk</div>
            <div className="param-row">
              <label>Starting capital</label>
              <input type="range" min="10000" max="1000000" step="10000" value={capital}
                onChange={e => setCapital(+e.target.value)} />
              <span style={{ fontSize: 12, color: '#e2e8f0', minWidth: 60 }}>
                {capital >= 100000 ? `₹${(capital / 100000).toFixed(1)}L` : `₹${capital.toLocaleString('en-IN')}`}
              </span>
            </div>
            <div className="param-row">
              <label>Stop loss %</label>
              <input type="range" min="0" max="20" step="0.5" value={stopLoss}
                onChange={e => setStopLoss(+e.target.value)} />
              <input type="number" value={stopLoss} min="0" max="20" step="0.5"
                onChange={e => setStopLoss(+e.target.value)} />
            </div>
            <div className="param-row">
              <label>Take profit %</label>
              <input type="range" min="0" max="50" step="0.5" value={takeProfit}
                onChange={e => setTakeProfit(+e.target.value)} />
              <input type="number" value={takeProfit} min="0" max="50" step="0.5"
                onChange={e => setTakeProfit(+e.target.value)} />
            </div>
          </div>

          {/* Range */}
          <div style={card}>
            <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 12, color: '#818cf8' }}>📅 Date Range</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {RANGES.map(r => (
                <div key={r.value} onClick={() => setRange(r.value)}
                  style={{ padding: 10, borderRadius: 10, textAlign: 'center', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                    background: range === r.value ? 'rgba(99,102,241,0.2)' : 'rgba(10,14,26,0.5)',
                    border: `1px solid ${range === r.value ? 'rgba(99,102,241,0.5)' : 'rgba(99,102,241,0.1)'}`,
                    color: range === r.value ? '#818cf8' : '#64748b' }}>
                  {r.label}
                </div>
              ))}
            </div>
          </div>

          {/* Run Button */}
          <button className="run-btn" onClick={runBacktest} disabled={loading}
            style={{ cursor: loading ? 'not-allowed' : 'pointer',
              background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff' }}>
            {loading ? (
              <>
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid #fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Running backtest...
              </>
            ) : '▶ Run Backtest'}
          </button>
        </div>

        {/* ── Right Panel: Results ── */}
        <div>
          {!result && !loading && !error && (
            <div style={{ ...card, textAlign: 'center', padding: '80px 20px', animation: 'fadein 0.4s ease' }}>
              <div style={{ fontSize: 56, marginBottom: 16 }}>📊</div>
              <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 8 }}>Configure & Run</div>
              <div style={{ color: '#475569', fontSize: 14 }}>Select a stock, strategy and parameters on the left, then hit Run Backtest.</div>
            </div>
          )}

          {error && (
            <div style={{ ...card, textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: 12 }}>{error}</div>
              <button onClick={runBacktest}
                style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '10px 24px', borderRadius: 10, cursor: 'pointer', fontWeight: 700 }}>
                Retry
              </button>
            </div>
          )}

          {loading && (
            <div style={{ ...card, textAlign: 'center', padding: '80px 20px' }}>
              <div style={{ width: 52, height: 52, border: '3px solid rgba(99,102,241,0.2)', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 20px' }} />
              <div style={{ color: '#6366f1', fontWeight: 700, fontSize: 16, animation: 'pulse 1.5s infinite' }}>
                Fetching {symbol} data & running strategy...
              </div>
            </div>
          )}

          {result && !loading && (() => {
            const { stats, trades, equity, candles, indicators } = result;
            const sellTrades = trades.filter(t => t.type.startsWith('SELL'));

            return (
              <div style={{ animation: 'fadein 0.4s ease' }}>

                {/* Result Header */}
                <div style={{ ...card, marginBottom: 14, borderColor: stats.totalReturn >= 0 ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 20 }}>{result.symbol} — {strat?.label}</div>
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 2 }}>
                        {result.range} · {candles.length} trading days · Starting {fmtINR(result.startingCapital)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 32, fontWeight: 900, color: pnlColor(stats.totalReturn) }}>{fmtPct(stats.totalReturn)}</div>
                      <div style={{ color: '#64748b', fontSize: 13 }}>{fmtINR(stats.finalVal)} final value</div>
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 10 }}>
                  {[
                    { label: 'Total return',   value: fmtPct(stats.totalReturn),  color: pnlColor(stats.totalReturn) },
                    { label: 'Buy & hold',     value: fmtPct(stats.bnh),          color: pnlColor(stats.bnh) },
                    { label: 'Win rate',       value: `${stats.winRate}%`,         color: stats.winRate >= 50 ? '#10b981' : '#ef4444' },
                    { label: 'Sharpe ratio',   value: stats.sharpe,               color: stats.sharpe >= 1 ? '#10b981' : stats.sharpe >= 0 ? '#f59e0b' : '#ef4444' },
                    { label: 'Total trades',   value: stats.totalTrades,          color: '#e2e8f0' },
                    { label: 'Max drawdown',   value: `-${stats.maxDD}%`,         color: '#ef4444' },
                    { label: 'Profit factor',  value: stats.profitFactor,         color: stats.profitFactor >= 1 ? '#10b981' : '#ef4444' },
                    { label: 'Avg hold days',  value: `${stats.avgHold}d`,        color: '#e2e8f0' },
                  ].map((s, i) => (
                    <div key={i} style={{ ...card, padding: 14 }}>
                      <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>
                        {s.label.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Deeper analytics — second row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
                  {[
                    { label: 'CAGR',            value: fmtPct(stats.cagr),         color: pnlColor(stats.cagr), tip: 'Annualized compound growth rate' },
                    { label: 'Sortino ratio',   value: stats.sortino,              color: stats.sortino >= 1 ? '#10b981' : stats.sortino >= 0 ? '#f59e0b' : '#ef4444', tip: 'Like Sharpe, but only penalizes downside volatility' },
                    { label: 'Volatility',      value: `${stats.volatility}%`,     color: '#e2e8f0', tip: 'Annualized standard deviation of returns' },
                    { label: 'Calmar ratio',    value: stats.calmar,               color: stats.calmar >= 1 ? '#10b981' : '#f59e0b', tip: 'CAGR ÷ max drawdown — return per unit of pain' },
                    { label: 'Alpha vs B&H',    value: fmtPct(stats.alpha),        color: pnlColor(stats.alpha), tip: 'Strategy return minus buy & hold return' },
                    { label: 'Expectancy/trade',value: `₹${stats.expectancy}`,     color: pnlColor(stats.expectancy), tip: 'Expected profit or loss per trade' },
                    { label: 'Recovery factor', value: stats.recoveryFactor,       color: stats.recoveryFactor >= 1 ? '#10b981' : '#f59e0b', tip: 'Net profit relative to the worst drawdown' },
                    { label: 'Exposure',        value: `${stats.exposurePct}%`,    color: '#e2e8f0', tip: '% of the period spent holding a position' },
                    { label: 'Best trade',      value: `₹${stats.bestTrade}`,      color: '#10b981' },
                    { label: 'Worst trade',     value: `₹${stats.worstTrade}`,     color: '#ef4444' },
                    { label: 'Max win streak',  value: stats.maxConsecWins,        color: '#10b981' },
                    { label: 'Max loss streak', value: stats.maxConsecLosses,      color: '#ef4444' },
                  ].map((s, i) => (
                    <div key={i} style={{ ...card, padding: 14 }} title={s.tip || ''}>
                      <div style={{ color: '#64748b', fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 6 }}>
                        {s.label.toUpperCase()}
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>
                {stats.maxDDDays > 0 && (
                  <div style={{ color: '#94a3b8', fontSize: 12, marginBottom: 14 }}>
                    📉 Worst drawdown lasted <b style={{ color: '#e2e8f0' }}>{stats.maxDDDays} days</b>
                    {stats.recoveryDays != null
                      ? <> and took <b style={{ color: '#10b981' }}>{stats.recoveryDays} days</b> to recover to a new high.</>
                      : <> and the strategy never recovered to a new equity high within this test period.</>}
                  </div>
                )}

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                  {['overview', 'equity', 'drawdown', 'distribution', 'tradepnl', 'trades', 'monthly'].map(t => (
                    <button key={t} className="tab-btn" onClick={() => setActiveTab(t)}
                      style={{
                        background: activeTab === t ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.1)',
                        color:      activeTab === t ? '#fff' : '#94a3b8',
                        border:     activeTab === t ? 'none' : '1px solid rgba(99,102,241,0.2)',
                      }}>
                      {{ overview: '📈 Price & Signals', equity: '💰 Equity Curve', drawdown: '📉 Drawdown', distribution: '📊 Trade Distribution', tradepnl: '🎯 P&L per Trade', trades: '📋 Trade Log', monthly: '📅 Monthly P&L' }[t]}
                    </button>
                  ))}
                </div>

                {/* ── Overview Tab ── */}
                {activeTab === 'overview' && (
                  <div style={{ ...card, animation: 'fadein 0.3s ease' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Price Chart with Buy/Sell Signals</div>
                    <ResponsiveContainer width="100%" height={320}>
                      <LineChart data={candles} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false}
                          interval={Math.max(1, Math.floor(candles.length / 8))} />
                        <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false}
                          tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} width={55} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ background: 'rgba(13,17,35,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 11 }}
                          formatter={(v, n) => [typeof v === 'number' ? `₹${v.toLocaleString('en-IN')}` : v, n]} />
                        <Line type="monotone" dataKey="close" stroke="#6366f1" strokeWidth={1.5} dot={false} name="Price" />
                        {indicators?.fast  && <Line type="monotone" data={candles.map((c,i) => ({ ...c, fast: indicators.fast[i]   }))} dataKey="fast"   stroke="#10b981" strokeWidth={1} dot={false} name="Fast"     strokeDasharray="4 2" />}
                        {indicators?.slow  && <Line type="monotone" data={candles.map((c,i) => ({ ...c, slow: indicators.slow[i]   }))} dataKey="slow"   stroke="#f59e0b" strokeWidth={1} dot={false} name="Slow"     strokeDasharray="4 2" />}
                        {indicators?.upper && <Line type="monotone" data={candles.map((c,i) => ({ ...c, upper: indicators.upper[i] }))} dataKey="upper" stroke="#ef4444" strokeWidth={1} dot={false} name="Upper BB" strokeDasharray="3 3" />}
                        {indicators?.lower && <Line type="monotone" data={candles.map((c,i) => ({ ...c, lower: indicators.lower[i] }))} dataKey="lower" stroke="#10b981" strokeWidth={1} dot={false} name="Lower BB" strokeDasharray="3 3" />}
                        <Line type="monotone" dataKey={d => d.signal === 1  ? d.close : null} stroke="#10b981" strokeWidth={0} dot={{ r: 6, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} name="BUY"  connectNulls={false} />
                        <Line type="monotone" dataKey={d => d.signal === -1 ? d.close : null} stroke="#ef4444" strokeWidth={0} dot={{ r: 6, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} name="SELL" connectNulls={false} />
                      </LineChart>
                    </ResponsiveContainer>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16 }}>
                      <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>Winning trades</div>
                        <div style={{ color: '#10b981', fontWeight: 900, fontSize: 22 }}>{stats.totalWins}</div>
                        <div style={{ color: '#10b981', fontSize: 12 }}>Avg +{fmtINR(stats.avgWin)}</div>
                      </div>
                      <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>Losing trades</div>
                        <div style={{ color: '#ef4444', fontWeight: 900, fontSize: 22 }}>{stats.totalLosses}</div>
                        <div style={{ color: '#ef4444', fontSize: 12 }}>Avg {fmtINR(stats.avgLoss)}</div>
                      </div>
                      <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10, padding: 12, textAlign: 'center' }}>
                        <div style={{ color: '#64748b', fontSize: 11, marginBottom: 4 }}>Best streak</div>
                        <div style={{ color: '#818cf8', fontWeight: 900, fontSize: 22 }}>{stats.maxConsecWins}W</div>
                        <div style={{ color: '#64748b', fontSize: 12 }}>{stats.maxConsecLosses} max losses</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Equity Tab ── */}
                {activeTab === 'equity' && (
                  <div style={{ ...card, animation: 'fadein 0.3s ease' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Portfolio Equity Curve vs Buy & Hold</div>
                    <ResponsiveContainer width="100%" height={320}>
                      <AreaChart data={equity} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="egGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}   />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false}
                          interval={Math.max(1, Math.floor(equity.length / 8))} />
                        <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false}
                          tickFormatter={v => fmtINR(v)} width={70} domain={['auto', 'auto']} />
                        <Tooltip
                          contentStyle={{ background: 'rgba(13,17,35,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 11 }}
                          formatter={v => [fmtINR(v)]} />
                        <ReferenceLine y={result.startingCapital} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 2" />
                        <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#egGrad)" name="Strategy" dot={false} />
                      </AreaChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', gap: 20, marginTop: 14, fontSize: 13, color: '#64748b', flexWrap: 'wrap' }}>
                      <span>Start: <b style={{ color: '#e2e8f0' }}>{fmtINR(result.startingCapital)}</b></span>
                      <span>Final: <b style={{ color: pnlColor(stats.totalReturn) }}>{fmtINR(stats.finalVal)}</b></span>
                      <span>Strategy: <b style={{ color: pnlColor(stats.totalReturn) }}>{fmtPct(stats.totalReturn)}</b></span>
                      <span>Buy & Hold: <b style={{ color: pnlColor(stats.bnh) }}>{fmtPct(stats.bnh)}</b></span>
                      <span>Max Drawdown: <b style={{ color: '#ef4444' }}>-{stats.maxDD}%</b></span>
                    </div>
                  </div>
                )}

                {/* ── Drawdown Tab ── */}
                {activeTab === 'drawdown' && (() => {
                  let peak = equity[0]?.value || 0;
                  const ddSeries = equity.map(e => {
                    peak = Math.max(peak, e.value);
                    return { date: e.date, drawdown: peak > 0 ? +(((e.value - peak) / peak) * 100).toFixed(2) : 0 };
                  });
                  return (
                    <div style={{ ...card, animation: 'fadein 0.3s ease' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Underwater Equity (Drawdown)</div>
                      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>How far below the running peak the strategy fell at each point — deeper/longer dips mean higher risk of holding through losses.</div>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={ddSeries} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#ef4444" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}   />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="date" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false}
                            interval={Math.max(1, Math.floor(ddSeries.length / 8))} />
                          <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false}
                            tickFormatter={v => `${v}%`} width={50} domain={['auto', 0]} />
                          <Tooltip contentStyle={{ background: 'rgba(13,17,35,0.95)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 11 }}
                            formatter={v => [`${v}%`, 'Drawdown']} />
                          <Area type="monotone" dataKey="drawdown" stroke="#ef4444" strokeWidth={2} fill="url(#ddGrad)" dot={false} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

                {/* ── Trade Distribution Tab ── */}
                {activeTab === 'distribution' && (() => {
                  const sellTrades = trades.filter(t => t.type.startsWith('SELL') && t.pnl !== null);
                  const returns = sellTrades.map(t => t.pnl);
                  if (!returns.length) {
                    return <div style={{ ...card, textAlign: 'center', color: '#64748b', padding: 60 }}>No closed trades yet to show a distribution.</div>;
                  }
                  const min = Math.min(...returns), max = Math.max(...returns);
                  const bucketCount = Math.min(12, Math.max(5, Math.round(Math.sqrt(returns.length))));
                  const bucketSize = (max - min) / bucketCount || 1;
                  const buckets = Array.from({ length: bucketCount }, (_, i) => {
                    const lo = min + i * bucketSize, hi = lo + bucketSize;
                    return { range: `${fmtINR(Math.round(lo))}`, count: 0, isProfit: (lo + hi) / 2 >= 0 };
                  });
                  returns.forEach(r => {
                    let idx = Math.floor((r - min) / bucketSize);
                    if (idx >= bucketCount) idx = bucketCount - 1;
                    if (idx < 0) idx = 0;
                    buckets[idx].count++;
                  });
                  return (
                    <div style={{ ...card, animation: 'fadein 0.3s ease' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Trade P&L Distribution</div>
                      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>How individual trade outcomes are spread — a fat left tail means occasional big losses; a tight cluster around zero means small, frequent wins/losses.</div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={buckets}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="range" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} angle={-30} textAnchor="end" height={60} />
                          <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} width={30} />
                          <Tooltip contentStyle={{ background: 'rgba(13,17,35,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 11 }}
                            formatter={v => [`${v} trade(s)`, 'Count']} />
                          <Bar dataKey="count" radius={[4,4,0,0]}>
                            {buckets.map((b, i) => <Cell key={i} fill={b.isProfit ? '#10b981' : '#ef4444'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

                {/* ── P&L per Trade Tab ── */}
                {activeTab === 'tradepnl' && (() => {
                  const sellTrades = trades.filter(t => t.type.startsWith('SELL') && t.pnl !== null);
                  const pnlData = sellTrades.map((t, i) => ({ trade: `#${i + 1}`, pnl: t.pnl, date: t.date }));
                  if (!pnlData.length) {
                    return <div style={{ ...card, textAlign: 'center', color: '#64748b', padding: 60 }}>No closed trades yet.</div>;
                  }
                  return (
                    <div style={{ ...card, animation: 'fadein 0.3s ease' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 4 }}>Profit/Loss per Trade</div>
                      <div style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>Each bar is one closed trade, in order — quickly shows consistency vs a few big wins/losses driving the whole result.</div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={pnlData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                          <XAxis dataKey="trade" tick={{ fill: '#475569', fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.max(0, Math.floor(pnlData.length / 15))} />
                          <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => fmtINR(v)} width={70} />
                          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
                          <Tooltip contentStyle={{ background: 'rgba(13,17,35,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 11 }}
                            formatter={v => [fmtINR(v), 'P&L']} labelFormatter={(l, p) => p?.[0]?.payload?.date || l} />
                          <Bar dataKey="pnl" radius={[3,3,0,0]}>
                            {pnlData.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? '#10b981' : '#ef4444'} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  );
                })()}

                {/* ── Trades Tab ── */}
                {activeTab === 'trades' && (
                  <div style={{ ...card, animation: 'fadein 0.3s ease' }}>
                    <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Trade Log ({sellTrades.length} completed trades)</div>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.15)' }}>
                            {['Date', 'Action', 'Price', 'Shares', 'Value', 'P&L', 'P&L %', 'Hold'].map(h => (
                              <th key={h} style={{ padding: '8px 10px', color: '#64748b', fontWeight: 700, textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...trades].reverse().map((t, i) => (
                            <tr key={i} className="trade-row" style={{ borderBottom: '1px solid rgba(99,102,241,0.05)' }}>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>{t.date}</td>
                              <td style={{ padding: '8px 10px' }}>
                                <span style={{
                                  background: t.type === 'BUY' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                  color:      t.type === 'BUY' ? '#10b981' : '#ef4444',
                                  border:     `1px solid ${t.type === 'BUY' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                  padding: '2px 8px', borderRadius: 20, fontWeight: 800, fontSize: 11,
                                }}>{t.type}</span>
                              </td>
                              <td style={{ padding: '8px 10px', color: '#e2e8f0' }}>₹{t.price?.toLocaleString('en-IN')}</td>
                              <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{t.shares}</td>
                              <td style={{ padding: '8px 10px', color: '#e2e8f0' }}>{fmtINR(t.value)}</td>
                              <td style={{ padding: '8px 10px', color: pnlColor(t.pnl), fontWeight: 700 }}>
                                {t.pnl != null ? (t.pnl >= 0 ? '+' : '') + fmtINR(t.pnl) : '—'}
                              </td>
                              <td style={{ padding: '8px 10px', color: pnlColor(t.pnlPct) }}>
                                {t.pnlPct != null ? fmtPct(t.pnlPct) : '—'}
                              </td>
                              <td style={{ padding: '8px 10px', color: '#64748b' }}>
                                {t.holdDays != null ? `${t.holdDays}d` : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ── Monthly Tab ── */}
                {activeTab === 'monthly' && (() => {
                  const monthMap = {};
                  trades.forEach(t => {
                    if (!t.type.startsWith('SELL') || t.pnl == null) return;
                    const m = t.date.slice(0, 7);
                    if (!monthMap[m]) monthMap[m] = 0;
                    monthMap[m] += t.pnl;
                  });
                  const monthData = Object.entries(monthMap)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([m, pnl]) => ({ month: m, pnl: +pnl.toFixed(2) }));
                  return (
                    <div style={{ ...card, animation: 'fadein 0.3s ease' }}>
                      <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>Monthly Realized P&L</div>
                      {monthData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#475569', padding: 40 }}>No completed trades in this period.</div>
                      ) : (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart data={monthData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="month" tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fill: '#475569', fontSize: 10 }} tickLine={false} axisLine={false}
                              tickFormatter={v => fmtINR(v)} width={70} />
                            <Tooltip
                              contentStyle={{ background: 'rgba(13,17,35,0.95)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 8, color: '#e2e8f0', fontSize: 11 }}
                              formatter={v => [fmtINR(v), 'P&L']} />
                            <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" />
                            <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                              {monthData.map((entry, i) => (
                                <Cell key={i} fill={entry.pnl >= 0 ? '#10b981' : '#ef4444'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                  );
                })()}

              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}