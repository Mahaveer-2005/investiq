const router    = require('express').Router();
const auth      = require('../middleware/auth');
const User      = require('../models/User');
const axios     = require('axios');
const NodeCache = require('node-cache');

const cache     = new NodeCache({ stdTTL: 300 });

// ── Alert schema embedded in User model ──────────────────────────────────
// alerts: [{ id, symbol, name, type, condition, targetValue, message, active, triggered, createdAt, triggeredAt }]

async function getLivePrice(symbol) {
  const key = `alp_${symbol}`;
  const c   = cache.get(key);
  if (c) return c;
  try {
    const sym = symbol.includes('.') ? symbol : `${symbol}.NS`;
    const res = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${sym}?interval=1d&range=1d`,
      { headers:{'User-Agent':'Mozilla/5.0'}, timeout:5000 }
    );
    const meta  = res.data.chart.result[0].meta;
    const price = meta.regularMarketPrice;
    const data  = {
      price,
      change:    price - (meta.chartPreviousClose || price),
      changePct: ((price-(meta.chartPreviousClose||price))/(meta.chartPreviousClose||price))*100,
      high:      meta.regularMarketDayHigh  || price,
      low:       meta.regularMarketDayLow   || price,
      volume:    meta.regularMarketVolume   || 0,
      avgVolume: meta.averageDailyVolume10Day || 0,
    };
    cache.set(key, data, 300);
    return data;
  } catch { return null; }
}

// ── GET /api/alerts ───────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const user   = await User.findById(req.user._id);
    const alerts = user.alerts || [];

    // Check each active alert against live price
    const enriched = await Promise.all(alerts.map(async alert => {
      if (!alert.active) return alert;
      const live = await getLivePrice(alert.symbol);
      if (!live) return alert;

      let triggered = false;
      let triggerMsg = '';
      const price = live.price;

      switch (alert.type) {
        case 'price_above':
          if (price >= alert.targetValue) { triggered = true; triggerMsg = `${alert.symbol} hit ₹${price.toFixed(0)} (target ₹${alert.targetValue})`; }
          break;
        case 'price_below':
          if (price <= alert.targetValue) { triggered = true; triggerMsg = `${alert.symbol} dropped to ₹${price.toFixed(0)} (target ₹${alert.targetValue})`; }
          break;
        case 'pct_gain':
          if (live.changePct >= alert.targetValue) { triggered = true; triggerMsg = `${alert.symbol} up ${live.changePct.toFixed(1)}% today`; }
          break;
        case 'pct_drop':
          if (live.changePct <= -alert.targetValue) { triggered = true; triggerMsg = `${alert.symbol} down ${Math.abs(live.changePct).toFixed(1)}% today`; }
          break;
        case 'volume_surge':
          if (live.avgVolume > 0 && live.volume/live.avgVolume >= alert.targetValue) {
            triggered = true; triggerMsg = `${alert.symbol} volume ${(live.volume/live.avgVolume).toFixed(1)}x avg`;
          }
          break;
      }

      return {
        ...alert.toObject?.() || alert,
        livePrice:  price,
        liveChange: live.changePct,
        triggered:  triggered || alert.triggered,
        triggerMsg: triggered ? triggerMsg : alert.triggerMsg,
        triggeredAt:triggered && !alert.triggered ? new Date() : alert.triggeredAt,
      };
    }));

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/alerts ──────────────────────────────────────────────────────
const VALID_ALERT_TYPES = ['price_above', 'price_below', 'pct_gain', 'pct_drop', 'volume_surge'];

router.post('/', auth, async (req, res) => {
  try {
    const { symbol, name, type, targetValue, message } = req.body;

    if (!symbol || !String(symbol).trim())
      return res.status(400).json({ message: 'Stock symbol is required' });
    if (!type || !VALID_ALERT_TYPES.includes(type))
      return res.status(400).json({ message: `Alert type must be one of: ${VALID_ALERT_TYPES.join(', ')}` });

    const numericTarget = parseFloat(targetValue);
    if (targetValue === undefined || targetValue === null || targetValue === '' || Number.isNaN(numericTarget) || numericTarget <= 0)
      return res.status(400).json({ message: 'targetValue must be a positive number' });

    // Use findById first only to enforce the 20-alert cap and current count —
    // the actual write uses an atomic $push so concurrent requests (e.g. a
    // double-click) never race on a stale in-memory document / VersionError.
    const existing = await User.findById(req.user._id).select('alerts');
    if (!existing) return res.status(404).json({ message: 'User not found' });
    if ((existing.alerts || []).length >= 20)
      return res.status(400).json({ message: 'Max 20 alerts allowed. Delete an existing alert first.' });

    const alert = {
      id:          `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      symbol:      String(symbol).toUpperCase().trim(),
      name:        name || symbol,
      type,
      targetValue: numericTarget,
      message:     message || '',
      active:      true,
      triggered:   false,
      createdAt:   new Date(),
      triggeredAt: null,
      triggerMsg:  '',
    };

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $push: { alerts: alert } },
      { new: true, runValidators: true }
    ).select('alerts');

    if (!updated) return res.status(404).json({ message: 'User not found' });

    res.json({ success: true, alert, totalAlerts: updated.alerts.length });
  } catch (err) {
    console.error('CREATE ALERT ERROR:', err.message);
    res.status(500).json({ message: err.message || 'Failed to create alert' });
  }
});

// ── DELETE /api/alerts/:id ────────────────────────────────────────────────
router.delete('/:id', auth, async (req, res) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $pull: { alerts: { id: req.params.id } } },
      { new: true }
    ).select('alerts');
    if (!updated) return res.status(404).json({ message: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── PATCH /api/alerts/:id/toggle ──────────────────────────────────────────
router.patch('/:id/toggle', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('alerts');
    if (!user) return res.status(404).json({ message: 'User not found' });
    const alert = (user.alerts || []).find(a => a.id === req.params.id);
    if (!alert) return res.status(404).json({ message: 'Alert not found' });

    const newActive = !alert.active;
    await User.updateOne(
      { _id: req.user._id, 'alerts.id': req.params.id },
      { $set: { 'alerts.$.active': newActive, 'alerts.$.triggered': false } }
    );
    res.json({ success: true, active: newActive });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/alerts/check ─────────────────────────────────────────────────
router.get('/check', auth, async (req, res) => {
  try {
    const user     = await User.findById(req.user._id);
    const active   = (user.alerts||[]).filter(a => a.active && !a.triggered);
    const triggered = [];
    for (const alert of active) {
      const live = await getLivePrice(alert.symbol);
      if (!live) continue;
      const price = live.price;
      let hit = false;
      if (alert.type==='price_above'  && price >= alert.targetValue) hit = true;
      if (alert.type==='price_below'  && price <= alert.targetValue) hit = true;
      if (alert.type==='pct_gain'     && live.changePct >= alert.targetValue) hit = true;
      if (alert.type==='pct_drop'     && live.changePct <= -alert.targetValue) hit = true;
      if (alert.type==='volume_surge' && live.volume/live.avgVolume >= alert.targetValue) hit = true;
      if (hit) {
        alert.triggered   = true;
        alert.triggeredAt = new Date();
        triggered.push({ ...alert.toObject?.()|| alert, livePrice: price });
      }
    }
    if (triggered.length) await user.save();
    res.json({ triggered, count: triggered.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;