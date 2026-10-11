import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const RAZORPAY_SCRIPT = 'https://checkout.razorpay.com/v1/checkout.js';

function loadRazorpay() {
  return new Promise(resolve => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT;
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function AddMoney() {
  const { user, setUser } = useAuth();
  const [packages,    setPackages]    = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [loading,     setLoading]     = useState(false);
  const [processing,  setProcessing]  = useState(false);
  const [customCoins, setCustomCoins] = useState('');
  const [tab,         setTab]         = useState('packages'); // packages | custom | history
  const [history,     setHistory]     = useState([]);
  const [bonusStatus, setBonusStatus] = useState(null);
  const [bonusLoading,setBonusLoading]= useState(false);
  const [liveMode,    setLiveMode]    = useState(false);
  const [payMethod,   setPayMethod]   = useState('upi'); // 'upi' (direct, free) | 'razorpay' (gateway)
  const [upiConfigured, setUpiConfigured] = useState(false);
  const [upiOrder,     setUpiOrder]     = useState(null); // { referenceId, upiLink, qrCodeDataUrl, upiId, merchantName, amount, package }
  const [upiUtr,       setUpiUtr]       = useState('');
  const [confirmingUpi,setConfirmingUpi]= useState(false);

  useEffect(() => {
    axios.get('/api/payment/packages').then(r => {
      setPackages(r.data.packages);
      setSelected(r.data.packages[2]?.id); // default Pro
      setLiveMode(!!r.data.liveMode);
      setUpiConfigured(!!r.data.upiDirectConfigured);
      if (!r.data.upiDirectConfigured) setPayMethod('razorpay'); // fall back if no merchant UPI ID set
    }).catch(console.error);

    axios.get('/api/payment/history').then(r => setHistory(r.data.deposits || [])).catch(() => {});
  }, []);

  // ── Direct UPI (real UPI protocol, no gateway) ──────────────────────────
  const startDirectUpi = async (pkg) => {
    setProcessing(true);
    try {
      const { data } = await axios.post('/api/payment/upi/create', {
        packageId: pkg.id,
        customCoins: pkg.id === 'custom' ? pkg.coins : undefined,
      });
      setUpiOrder({ ...data, package: pkg });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create UPI payment');
    }
    setProcessing(false);
  };

  const confirmDirectUpi = async () => {
    if (!upiUtr || upiUtr.trim().length < 6) {
      toast.error('Enter the UPI transaction reference (UTR) your UPI app showed after paying');
      return;
    }
    setConfirmingUpi(true);
    try {
      const { data } = await axios.post('/api/payment/upi/confirm', {
        referenceId: upiOrder.referenceId,
        utr: upiUtr.trim(),
        packageId: upiOrder.package.id,
        customCoins: upiOrder.package.id === 'custom' ? upiOrder.package.coins : undefined,
      });
      handleSuccess(data);
      setUpiOrder(null);
      setUpiUtr('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not confirm payment');
    }
    setConfirmingUpi(false);
  };

  const handlePayment = async (pkg) => {
    if (payMethod === 'upi') return startDirectUpi(pkg);
    return handleRazorpayPayment(pkg);
  };

  const handleRazorpayPayment = async (pkg) => {
    setProcessing(true);
    try {
      // Create order (custom packages must also send the coin amount so the
      // backend can compute price server-side — it never trusts a client price)
      const { data: order } = await axios.post('/api/payment/create-order', {
        packageId: pkg.id,
        customCoins: pkg.id === 'custom' ? pkg.coins : undefined,
      });

      // Backend tells us explicitly whether real Razorpay keys are configured.
      const isTestMode = !order.liveMode;

      if (isTestMode) {
        // ── DEMO MODE: Simulate payment ───────────────────────────────────
        const confirmed = window.confirm(
          `📱 DEMO UPI PAYMENT\n\n(Add real RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET to backend/.env to enable live UPI payments)\n\nPackage: ${pkg.label}\nAmount: ₹${pkg.price}\nCoins: ${pkg.coins.toLocaleString('en-IN')}\n\nClick OK to simulate a successful UPI payment!`
        );
        if (!confirmed) { setProcessing(false); return; }

        const verify = await axios.post('/api/payment/verify', {
          packageId:         pkg.id,
          customCoins:       pkg.id === 'custom' ? pkg.coins : undefined,
          simulatedSuccess:  true,
          razorpay_order_id: order.orderId,
        });

        handleSuccess(verify.data);
      } else {
        // ── REAL RAZORPAY PAYMENT ─────────────────────────────────────────
        const loaded = await loadRazorpay();
        if (!loaded) { toast.error('Payment gateway failed to load'); setProcessing(false); return; }

        const options = {
          key:         order.keyId,
          amount:      order.amount,
          currency:    order.currency,
          name:        'InvestIQ',
          description: `${pkg.label} Pack — ${pkg.coins.toLocaleString('en-IN')} Virtual Coins`,
          order_id:    order.orderId,
          prefill:     order.prefill,
          theme:       { color: '#6366f1' },
          // ── Prefer UPI, but don't hard-lock to it ─────────────────────────
          // Forcing a single payment block (config.display.blocks + "hide
          // default blocks") fails outright with "No appropriate payment
          // method found" if UPI isn't enabled as a method on this specific
          // Razorpay account/key (a per-account dashboard setting, not
          // something checkout code can force on) — so instead this just
          // hints UPI as the preferred/first method while still letting
          // Razorpay fall back to whatever the account actually has enabled.
          method: { upi: true, card: true, netbanking: true, wallet: true },
          modal: {
            ondismiss: () => { setProcessing(false); toast('Payment cancelled'); }
          },
          handler: async (response) => {
            try {
              const verify = await axios.post('/api/payment/verify', {
                packageId:            pkg.id,
                customCoins:          pkg.id === 'custom' ? pkg.coins : undefined,
                razorpay_order_id:    response.razorpay_order_id,
                razorpay_payment_id:  response.razorpay_payment_id,
                razorpay_signature:   response.razorpay_signature,
              });
              handleSuccess(verify.data);
            } catch (err) {
              toast.error('Payment verification failed');
              setProcessing(false);
            }
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Payment failed');
      setProcessing(false);
    }
  };

  const handleSuccess = (data) => {
    setProcessing(false);
    toast.success(data.message, { duration: 5000 });
    setUser(prev => ({ ...prev, virtualCoins: data.newCoins }));
    axios.get('/api/payment/history').then(r => setHistory(r.data.deposits || [])).catch(() => {});
  };

  const claimBonus = async () => {
    setBonusLoading(true);
    try {
      const res = await axios.post('/api/payment/free-bonus');
      toast.success(res.data.message, { duration: 4000 });
      setUser(prev => ({ ...prev, virtualCoins: res.data.newCoins }));
      setBonusStatus({ claimed: true });
    } catch (err) {
      const msg = err.response?.data?.message || 'Bonus unavailable';
      toast.error(msg);
      if (err.response?.data?.hoursLeft) setBonusStatus({ hoursLeft: err.response.data.hoursLeft });
    }
    setBonusLoading(false);
  };

  const s = {
    page:  { padding: 24, maxWidth: 1100, margin: '0 auto' },
    card:  { background: 'rgba(26,31,53,0.85)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 16, padding: 24 },
    tab:   (a) => ({ padding: '10px 22px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 14, background: a ? '#6366f1' : 'rgba(10,14,26,0.5)', color: a ? '#fff' : '#94a3b8', transition: 'all 0.2s' }),
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>💳 Add Virtual Coins</h1>
        <p style={{ color: '#94a3b8' }}>Top up your InvestIQ wallet to practice investing with more virtual capital</p>
      </div>

      {/* Balance Card */}
      <div style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.15))', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: 28, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 6 }}>CURRENT BALANCE</div>
          <div style={{ fontSize: 42, fontWeight: 900, background: 'linear-gradient(135deg,#f59e0b,#fbbf24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            ₹{(user?.virtualCoins || 0).toLocaleString('en-IN')}
          </div>
          <div style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Virtual Coins Available</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-end' }}>
          <button onClick={claimBonus} disabled={bonusLoading || bonusStatus?.claimed}
            style={{ background: bonusStatus?.claimed ? 'rgba(16,185,129,0.15)' : 'linear-gradient(135deg,#10b981,#059669)', border: 'none', color: '#fff', padding: '12px 24px', borderRadius: 12, cursor: bonusStatus?.claimed ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8, opacity: bonusStatus?.claimed ? 0.7 : 1 }}>
            {bonusLoading ? '⏳ Claiming...' : bonusStatus?.claimed ? '✅ Bonus Claimed' : '🎁 Daily Bonus +₹5,000'}
          </button>
          {bonusStatus?.hoursLeft && (
            <div style={{ color: '#64748b', fontSize: 12 }}>⏰ Next bonus in {bonusStatus.hoursLeft}h</div>
          )}
          <div style={{ color: '#475569', fontSize: 12 }}>Free ₹5,000 coins every 24 hours!</div>
        </div>
      </div>

      {/* Payment method toggle */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>PAY VIA:</span>
        <button onClick={() => setPayMethod('upi')}
          style={{ padding: '8px 16px', borderRadius: 10, border: `2px solid ${payMethod === 'upi' ? '#10b981' : 'rgba(99,102,241,0.2)'}`, background: payMethod === 'upi' ? 'rgba(16,185,129,0.12)' : 'rgba(10,14,26,0.5)', color: payMethod === 'upi' ? '#10b981' : '#94a3b8', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
          📱 Direct UPI / QR (Free, no gateway)
        </button>
        <button onClick={() => setPayMethod('razorpay')}
          style={{ padding: '8px 16px', borderRadius: 10, border: `2px solid ${payMethod === 'razorpay' ? '#6366f1' : 'rgba(99,102,241,0.2)'}`, background: payMethod === 'razorpay' ? 'rgba(99,102,241,0.12)' : 'rgba(10,14,26,0.5)', color: payMethod === 'razorpay' ? '#6366f1' : '#94a3b8', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
          💳 Razorpay Gateway
        </button>
      </div>
      {payMethod === 'upi' && !upiConfigured && (
        <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px dashed rgba(245,158,11,0.3)', borderRadius: 12, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#f59e0b' }}>
          ⚠️ Direct UPI isn't set up yet — add <b>MERCHANT_UPI_ID=yourname@bank</b> to <code>backend/.env</code> (your own real UPI ID) to enable QR/UPI-ID payments with zero signup.
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[['packages','📦 Packages'],['custom','⚙️ Custom'],['history','📋 History']].map(([id, label]) => (
          <button key={id} style={s.tab(tab === id)} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      {/* ── PACKAGES TAB ── */}
      {tab === 'packages' && (
        <div>
          {liveMode && payMethod === 'razorpay' && (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px dashed rgba(99,102,241,0.3)', borderRadius: 12, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#94a3b8' }}>
              💡 <b style={{ color: '#e2e8f0' }}>Testing with Razorpay Test Mode:</b> real bank apps/UPI IDs won't complete a payment here since no real money moves.
              Use the test VPA <b style={{ color: '#10b981' }}>success@razorpay</b> in the UPI collect box for a guaranteed successful test payment
              (or <b style={{ color: '#ef4444' }}>failure@razorpay</b> to test the failure path). Switch to live keys later for real users.
              <br />
              ⚠️ If checkout shows <b>"No appropriate payment method found"</b>, UPI isn't enabled on this Razorpay account yet (enable it under Razorpay Dashboard → Settings → Payment Methods) — or just switch to <b style={{ color: '#10b981' }}>"Direct UPI / QR"</b> above, which always works with zero account configuration.
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
            {packages.map(pkg => (
              <div key={pkg.id}
                onClick={() => setSelected(pkg.id)}
                style={{
                  background:   selected === pkg.id ? 'rgba(99,102,241,0.15)' : 'rgba(26,31,53,0.85)',
                  border:       `2px solid ${selected === pkg.id ? '#6366f1' : pkg.popular ? 'rgba(245,158,11,0.4)' : 'rgba(99,102,241,0.2)'}`,
                  borderRadius: 16, padding: 20, cursor: 'pointer', position: 'relative',
                  transition:   'all 0.2s', transform: selected === pkg.id ? 'scale(1.02)' : 'scale(1)',
                }}>
                {pkg.popular && (
                  <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#f59e0b,#f97316)', color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap' }}>
                    ⭐ MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: 28, marginBottom: 8 }}>
                  {pkg.id === 'starter' ? '🌱' : pkg.id === 'basic' ? '💼' : pkg.id === 'pro' ? '🚀' : pkg.id === 'elite' ? '💎' : '♾️'}
                </div>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4 }}>{pkg.label}</div>
                <div style={{ color: '#6366f1', fontSize: 22, fontWeight: 900, marginBottom: 4 }}>
                  ₹{pkg.coins.toLocaleString('en-IN')}
                </div>
                <div style={{ color: '#64748b', fontSize: 12, marginBottom: 12 }}>virtual coins</div>
                <div style={{ borderTop: '1px solid rgba(99,102,241,0.15)', paddingTop: 12 }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: selected === pkg.id ? '#fff' : '#e2e8f0' }}>₹{pkg.price}</div>
                  <div style={{ color: '#64748b', fontSize: 12 }}>one time</div>
                </div>
                <div style={{ color: '#10b981', fontSize: 12, marginTop: 8, fontWeight: 600 }}>
                  = ₹{Math.round(pkg.coins / pkg.price).toLocaleString('en-IN')} coins/rupee
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div style={{ ...s.card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              {(() => {
                const pkg = packages.find(p => p.id === selected);
                if (!pkg) return null;
                return (
                  <>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 17 }}>
                        {pkg.id === 'starter' ? '🌱' : pkg.id === 'basic' ? '💼' : pkg.id === 'pro' ? '🚀' : pkg.id === 'elite' ? '💎' : '♾️'} {pkg.label} Pack
                      </div>
                      <div style={{ color: '#94a3b8', marginTop: 4 }}>
                        +₹{pkg.coins.toLocaleString('en-IN')} coins → New balance: ₹{((user?.virtualCoins || 0) + pkg.coins).toLocaleString('en-IN')}
                      </div>
                    </div>
                    <button
                      onClick={() => handlePayment(pkg)}
                      disabled={processing}
                      style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', padding: '14px 36px', borderRadius: 14, cursor: processing ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 16, opacity: processing ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                      {processing ? '⏳ Processing...' : payMethod === 'upi' ? `📱 Pay ₹${pkg.price} via UPI` : `💳 Pay ₹${pkg.price}`}
                    </button>
                  </>
                );
              })()}
            </div>
          )}

          {/* Payment info */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginTop: 16 }}>
            {[
              { icon: '🔒', title: 'Secure Payment', desc: payMethod === 'upi' ? 'Direct UPI transfer straight to a real UPI ID — no third party in between' : 'Powered by Razorpay with 256-bit SSL encryption' },
              { icon: '⚡', title: 'Instant Credit', desc: 'Coins credited to your account immediately after payment' },
              { icon: '🎮', title: 'Virtual Only', desc: 'These are virtual coins for practice trading only' },
              { icon: '💯', title: 'No Expiry', desc: 'Your virtual coins never expire — use anytime' },
            ].map(item => (
              <div key={item.title} style={{ background: 'rgba(10,14,26,0.5)', borderRadius: 12, padding: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{item.title}</div>
                  <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CUSTOM TAB ── */}
      {tab === 'custom' && (
        <div style={{ ...s.card, maxWidth: 500 }}>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>⚙️ Custom Amount</div>
          <div style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>Enter a custom coin amount to add</div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ color: '#94a3b8', fontSize: 13, fontWeight: 600 }}>COINS TO ADD</label>
            <div style={{ position: 'relative', marginTop: 8 }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#f59e0b', fontWeight: 800, fontSize: 16 }}>₹</span>
              <input
                type="number"
                value={customCoins}
                onChange={e => setCustomCoins(e.target.value)}
                placeholder="e.g. 250000"
                min="1000"
                style={{ width: '100%', padding: '14px 14px 14px 36px', background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, color: '#fff', fontSize: 18, fontWeight: 700, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {customCoins && parseInt(customCoins) >= 1000 && (
            <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#94a3b8' }}>Coins</span>
                <span style={{ fontWeight: 700 }}>₹{parseInt(customCoins).toLocaleString('en-IN')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#94a3b8' }}>Estimated Price</span>
                <span style={{ fontWeight: 700, color: '#6366f1' }}>₹{Math.ceil(parseInt(customCoins) / 1000)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(99,102,241,0.2)', paddingTop: 8 }}>
                <span style={{ color: '#94a3b8' }}>New Balance</span>
                <span style={{ fontWeight: 800, color: '#f59e0b' }}>₹{((user?.virtualCoins || 0) + parseInt(customCoins)).toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {[10000, 25000, 50000, 100000, 500000].map(amt => (
              <button key={amt} onClick={() => setCustomCoins(String(amt))}
                style={{ background: customCoins == amt ? 'rgba(99,102,241,0.3)' : 'rgba(10,14,26,0.5)', border: '1px solid rgba(99,102,241,0.25)', color: '#e2e8f0', padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                ₹{amt.toLocaleString('en-IN')}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              const coins = parseInt(customCoins);
              if (!coins || coins < 1000) return toast.error('Minimum 1,000 coins');
              const estimatedPrice = Math.ceil(coins / 1000);
              const customPkg = { id: 'custom', coins, price: estimatedPrice, label: 'Custom' };
              handlePayment(customPkg);
            }}
            disabled={!customCoins || parseInt(customCoins) < 1000 || processing}
            style={{ width: '100%', padding: '14px', background: customCoins && parseInt(customCoins) >= 1000 ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.2)', border: 'none', color: '#fff', borderRadius: 12, cursor: 'pointer', fontWeight: 800, fontSize: 16, opacity: processing ? 0.7 : 1 }}>
            {processing ? '⏳ Processing...' : '💳 Add Custom Coins'}
          </button>
        </div>
      )}

      {/* ── HISTORY TAB ── */}
      {tab === 'history' && (
        <div style={s.card}>
          <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 16 }}>📋 Payment History</div>
          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div>No payments yet. Buy a package to get started!</div>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Date', 'Description', 'Coins Added', 'Amount'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: '#64748b', fontSize: 11, fontWeight: 700, borderBottom: '1px solid rgba(99,102,241,0.15)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {history.map((tx, i) => (
                  <tr key={i} onMouseEnter={e => e.currentTarget.style.background='rgba(99,102,241,0.05)'} onMouseLeave={e => e.currentTarget.style.background='transparent'}>
                    <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 13 }}>
                      {new Date(tx.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' })}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{tx.name}</td>
                    <td style={{ padding: '12px 14px', color: '#10b981', fontWeight: 700 }}>
                      +₹{(tx.quantity || 0).toLocaleString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px', fontWeight: 700 }}>₹{tx.totalAmount}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} style={{ padding: '14px', fontWeight: 700, borderTop: '1px solid rgba(99,102,241,0.15)' }}>Total Spent</td>
                  <td colSpan={2} style={{ padding: '14px', fontWeight: 800, color: '#6366f1', borderTop: '1px solid rgba(99,102,241,0.15)', fontSize: 16 }}>
                    ₹{history.reduce((s, d) => s + (d.totalAmount || 0), 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* ── DIRECT UPI QR MODAL ── */}
      {upiOrder && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
             onClick={() => { setUpiOrder(null); setUpiUtr(''); }}>
          <div onClick={e => e.stopPropagation()}
               style={{ background: '#161a2e', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, padding: 28, maxWidth: 380, width: '100%', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>📱 Pay via UPI</div>
            <div style={{ color: '#94a3b8', fontSize: 13, marginBottom: 16 }}>
              {upiOrder.package.label} Pack — ₹{upiOrder.amount}
            </div>

            <img src={upiOrder.qrCodeDataUrl} alt="UPI QR Code" style={{ width: 220, height: 220, borderRadius: 12, background: '#fff', padding: 8, margin: '0 auto 16px' }} />

            <div style={{ background: 'rgba(10,14,26,0.6)', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
              <div style={{ color: '#64748b', marginBottom: 2 }}>Pay to UPI ID</div>
              <div style={{ fontWeight: 700, color: '#e2e8f0' }}>{upiOrder.upiId}</div>
            </div>

            <a href={upiOrder.upiLink} style={{ display: 'block', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', textDecoration: 'none', padding: '12px', borderRadius: 10, fontWeight: 700, fontSize: 14, marginBottom: 16 }}>
              📲 Open in UPI App
            </a>
            <div style={{ color: '#64748b', fontSize: 11, marginBottom: 20 }}>
              (Scan the QR with any UPI app on another device, or tap "Open in UPI App" if you're on your phone)
            </div>

            <div style={{ textAlign: 'left', marginBottom: 8 }}>
              <label style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>UPI TRANSACTION REF. (UTR) — shown in your UPI app after paying</label>
            </div>
            <input
              type="text"
              value={upiUtr}
              onChange={e => setUpiUtr(e.target.value)}
              placeholder="e.g. 123456789012"
              style={{ width: '100%', padding: '12px 14px', background: 'rgba(10,14,26,0.8)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 10, color: '#fff', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            />

            <button onClick={confirmDirectUpi} disabled={confirmingUpi}
              style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', border: 'none', color: '#fff', borderRadius: 10, cursor: confirmingUpi ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 15, marginBottom: 10, opacity: confirmingUpi ? 0.7 : 1 }}>
              {confirmingUpi ? '⏳ Confirming...' : "✅ I've Paid — Confirm"}
            </button>
            <button onClick={() => { setUpiOrder(null); setUpiUtr(''); }}
              style={{ width: '100%', padding: '10px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13 }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}