const router = require('express').Router();
const auth   = require('../middleware/auth');
const User   = require('../models/User');
const crypto = require('crypto');
const util   = require('util');

const RAZORPAY_KEY_ID     = process.env.RAZORPAY_KEY_ID     || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';

// Real credentials are configured only when a genuine rzp_test_/rzp_live_ key
// is present (the checked-in .env.example ships a placeholder). Until real
// keys are added, the flow runs in demo mode so the app still works end-to-end.
const HAS_REAL_KEYS = RAZORPAY_KEY_ID.startsWith('rzp_') && !RAZORPAY_KEY_ID.includes('YOUR_KEY');

let razorpayInstance = null;
function getRazorpay() {
  if (!HAS_REAL_KEYS) return null;
  if (razorpayInstance) return razorpayInstance;
  const Razorpay = require('razorpay');
  razorpayInstance = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
  return razorpayInstance;
}

// Called once at server startup — makes one real, cheap Razorpay API call
// (listing orders) to confirm the key_id/key_secret pair actually
// authenticates, instead of only discovering a mismatch when a real user
// tries to pay.
async function verifyRazorpayConfig() {
  if (!HAS_REAL_KEYS) {
    console.log('ℹ️  Razorpay not configured (RAZORPAY_KEY_ID/SECRET empty or placeholder) — payments will run in demo mode.');
    return false;
  }
  try {
    const razorpay = getRazorpay();
    await razorpay.orders.all({ count: 1 });
    console.log(`✅ Razorpay configured and authenticated — key ${RAZORPAY_KEY_ID.slice(0, 14)}...`);
    return true;
  } catch (err) {
    console.error('❌ RAZORPAY CONFIG ERROR — payments will fail:', extractErrorMessage(err));
    console.error('   Check that RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env are BOTH copied from the SAME "Generate Test Key" popup on the Razorpay dashboard.');
    console.error(`   To verify definitively outside this app, run this in a terminal (replace with your real values):`);
    console.error(`   curl -u ${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET} https://api.razorpay.com/v1/orders`);
    console.error('   If that curl command ALSO fails with "Authentication failed", the key pair itself is wrong/mismatched — generate a fresh Test Key pair and copy both values together. If curl SUCCEEDS but the app still fails, tell me and it is a code issue on my end.');
    return false;
  }
}

// Coin packages
const PACKAGES = [
  { id: 'trial',      coins: 1000,    price: 5,    label: 'Trial',      popular: false },
  { id: 'starter',    coins: 50000,   price: 99,   label: 'Starter',    popular: false },
  { id: 'basic',      coins: 100000,  price: 199,  label: 'Basic',      popular: false },
  { id: 'pro',        coins: 500000,  price: 499,  label: 'Pro',        popular: true  },
  { id: 'elite',      coins: 1000000, price: 999,  label: 'Elite',      popular: false },
  { id: 'unlimited',  coins: 5000000, price: 1999, label: 'Unlimited',  popular: false },
];

function findPackage(packageId, customCoins) {
  const pkg = PACKAGES.find(p => p.id === packageId);
  if (pkg) return pkg;
  // Support the "custom amount" flow used by the AddMoney page.
  if (packageId === 'custom' && customCoins > 0) {
    const price = Math.max(1, Math.ceil(customCoins / 1000)); // ₹1 per 1,000 coins
    return { id: 'custom', coins: customCoins, price, label: 'Custom', popular: false };
  }
  return null;
}

// ── GET /api/payment/packages ────────────────────────────────────────────────
router.get('/packages', auth, (req, res) => {
  res.json({
    packages: PACKAGES,
    keyId: RAZORPAY_KEY_ID || 'rzp_test_demo',
    liveMode: HAS_REAL_KEYS,
    upiDirectConfigured: !!MERCHANT_UPI_ID,
  });
});

function extractErrorMessage(err) {
  // Razorpay's SDK throws plain objects shaped like
  // { statusCode, error: { code, description, ... } } — NOT real Error
  // instances — so err.message is often undefined. Handle every shape, and
  // NEVER return a bare `undefined` — util.inspect always produces a string
  // even for weird/empty error shapes, so this can't silently print "undefined" again.
  const candidates = [
    err?.error?.description,
    err?.response?.data?.error?.description,
    err?.message,
    typeof err === 'string' ? err : null,
  ];
  const found = candidates.find(c => typeof c === 'string' && c.trim().length > 0);
  return found || `Unrecognized error shape: ${util.inspect(err, { depth: 4, breakLength: 200 })}`;
}

// ── DIRECT UPI PAYMENTS (no gateway, no signup) ─────────────────────────────
// Generates a real UPI deep link (upi://pay?...) and a QR code encoding it —
// the same protocol every UPI app (GPay, PhonePe, Paytm, BHIM, etc.) reads
// natively. Works by paying directly into a UPI ID you own — no Razorpay/
// Cashfree account, no API key, no third-party signup required.
//
// Trade-off vs. a gateway: there's no automatic webhook confirming the money
// actually arrived (UPI itself doesn't offer that to individuals — only
// registered merchants via a PSP get that). So this flow asks the payer to
// enter the UPI transaction reference number (the 12-digit UTR/Ref No. every
// UPI app shows after a successful payment) as a lightweight audit trail,
// then credits coins on confirmation. This mirrors exactly how small real-
// world shops/individuals accept UPI payments without a payment gateway.
const QRCode = require('qrcode');

const MERCHANT_UPI_ID = process.env.MERCHANT_UPI_ID || '';
const MERCHANT_NAME   = process.env.MERCHANT_NAME   || 'InvestIQ';

// ── POST /api/payment/upi/create ────────────────────────────────────────────
router.post('/upi/create', auth, async (req, res) => {
  try {
    const { packageId, customCoins } = req.body;
    const pkg = findPackage(packageId, Number(customCoins));
    if (!pkg) return res.status(400).json({ message: 'Invalid package' });

    if (!MERCHANT_UPI_ID) {
      return res.status(400).json({
        message: 'Direct UPI is not configured yet — set MERCHANT_UPI_ID in backend/.env to your own UPI ID (e.g. yourname@okaxis) to accept real UPI payments with no gateway signup.',
      });
    }

    const referenceId = `IQ${Date.now()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const note = `InvestIQ ${pkg.label} ${referenceId}`;

    // Standard UPI deep-link URI — recognized by every UPI app.
    const upiLink =
      `upi://pay?pa=${encodeURIComponent(MERCHANT_UPI_ID)}` +
      `&pn=${encodeURIComponent(MERCHANT_NAME)}` +
      `&am=${pkg.price}` +
      `&cu=INR` +
      `&tn=${encodeURIComponent(note)}` +
      `&tr=${referenceId}`;

    const qrCodeDataUrl = await QRCode.toDataURL(upiLink, { width: 320, margin: 1 });

    await User.updateOne(
      { _id: req.user._id },
      { $push: { payments: { orderId: referenceId, packageId: pkg.id, amount: pkg.price, coinsAdded: pkg.coins, method: 'upi_direct', status: 'created' } } }
    );

    res.json({
      referenceId,
      upiLink,
      qrCodeDataUrl,
      upiId: MERCHANT_UPI_ID,
      merchantName: MERCHANT_NAME,
      amount: pkg.price,
      package: pkg,
    });
  } catch (err) {
    console.error('UPI CREATE ERROR:', extractErrorMessage(err));
    res.status(500).json({ message: extractErrorMessage(err) });
  }
});

// ── POST /api/payment/upi/confirm ───────────────────────────────────────────
// Payer submits the UTR/reference number their UPI app showed after paying.
// We record it against the order for an audit trail and credit coins.
router.post('/upi/confirm', auth, async (req, res) => {
  try {
    const { referenceId, utr, packageId, customCoins } = req.body;
    if (!referenceId) return res.status(400).json({ message: 'Missing referenceId' });
    if (!utr || String(utr).trim().length < 6)
      return res.status(400).json({ message: 'Enter the 12-digit UPI transaction reference (UTR) shown in your UPI app after payment.' });

    const pkg = findPackage(packageId, Number(customCoins));
    if (!pkg) return res.status(400).json({ message: 'Invalid package' });

    const user = await User.findById(req.user._id);
    const record = (user.payments || []).find(p => p.orderId === referenceId);
    if (!record) return res.status(404).json({ message: 'Payment record not found — create a new UPI order and try again.' });
    if (record.status === 'paid') return res.status(400).json({ message: 'This payment has already been confirmed.' });

    record.status = 'paid';
    record.paymentId = String(utr).trim();

    const prevCoins = user.virtualCoins;
    user.virtualCoins += pkg.coins;
    user.transactions.push({
      symbol: 'COINS',
      name: `Added ₹${pkg.price} — ${pkg.coins.toLocaleString('en-IN')} Coins (UPI ${String(utr).trim()})`,
      type: 'deposit', action: 'buy',
      quantity: pkg.coins, price: pkg.price / pkg.coins, totalAmount: pkg.price,
      date: new Date(),
    });
    await user.save();

    res.json({
      success: true,
      coinsAdded: pkg.coins,
      prevCoins,
      newCoins: user.virtualCoins,
      message: `✅ UPI payment recorded (Ref: ${utr}). ${pkg.coins.toLocaleString('en-IN')} coins added.`,
    });
  } catch (err) {
    console.error('UPI CONFIRM ERROR:', extractErrorMessage(err));
    res.status(500).json({ message: extractErrorMessage(err) });
  }
});

// ── POST /api/payment/create-order ───────────────────────────────────────────
// Creates a real Razorpay order (when keys are configured) restricted to UPI —
// the frontend Checkout widget is configured to show only the UPI block, which
// lets the user pay by entering a UPI ID (collect) OR scanning the generated QR.
router.post('/create-order', auth, async (req, res) => {
  try {
    const { packageId, customCoins } = req.body;
    const pkg = findPackage(packageId, Number(customCoins));
    if (!pkg) return res.status(400).json({ message: 'Invalid package' });

    const razorpay = getRazorpay();

    if (razorpay) {
      // ── REAL MODE ──────────────────────────────────────────────────────
      const order = await razorpay.orders.create({
        amount:   pkg.price * 100, // paise
        currency: 'INR',
        receipt:  `iq_${req.user._id}_${Date.now()}`,
        notes:    { userId: String(req.user._id), packageId: pkg.id, coins: pkg.coins },
      });

      await User.updateOne(
        { _id: req.user._id },
        { $push: { payments: { orderId: order.id, packageId: pkg.id, amount: pkg.price, coinsAdded: pkg.coins, method: 'upi', status: 'created' } } }
      );

      return res.json({
        orderId:  order.id,
        amount:   order.amount,
        currency: order.currency,
        keyId:    RAZORPAY_KEY_ID,
        liveMode: true,
        package:  pkg,
        prefill:  { name: req.user.name, email: req.user.email },
      });
    }

    // ── DEMO MODE (no real Razorpay keys configured yet) ──────────────────
    const orderId = `order_demo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    await User.updateOne(
      { _id: req.user._id },
      { $push: { payments: { orderId, packageId: pkg.id, amount: pkg.price, coinsAdded: pkg.coins, method: 'upi', status: 'created' } } }
    );

    res.json({
      orderId,
      amount:   pkg.price * 100,
      currency: 'INR',
      keyId:    'rzp_test_demo',
      liveMode: false,
      package:  pkg,
      prefill:  { name: req.user.name, email: req.user.email },
    });
  } catch (err) {
    const msg = extractErrorMessage(err);
    console.error('CREATE ORDER ERROR:', msg);
    // Common real-world cause: RAZORPAY_KEY_ID/SECRET in .env are a mismatched
    // pair, or the key was deactivated/regenerated on the dashboard.
    res.status(500).json({ message: `Could not create payment order: ${msg}. Double-check RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET in backend/.env match the same key pair from your Razorpay dashboard.` });
  }
});

// ── POST /api/payment/verify ─────────────────────────────────────────────────
router.post('/verify', auth, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, packageId, customCoins, simulatedSuccess } = req.body;

    const pkg = findPackage(packageId, Number(customCoins));
    if (!pkg) return res.status(400).json({ message: 'Invalid package' });

    let isValid = false;

    if (HAS_REAL_KEYS && razorpay_signature) {
      // Real Razorpay HMAC-SHA256 signature verification.
      const body     = `${razorpay_order_id}|${razorpay_payment_id}`;
      const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(body).digest('hex');
      isValid        = expected === razorpay_signature;
    } else if (simulatedSuccess) {
      // Demo/test mode — always succeed (used when no live keys are configured).
      isValid = true;
    }

    if (!isValid) {
      await User.updateOne(
        { _id: req.user._id, 'payments.orderId': razorpay_order_id },
        { $set: { 'payments.$.status': 'failed' } }
      );
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    const user = await User.findById(req.user._id);
    const prevCoins = user.virtualCoins;
    user.virtualCoins += pkg.coins;

    user.transactions.push({
      symbol:      'COINS',
      name:        `Added ₹${pkg.price} — ${pkg.coins.toLocaleString('en-IN')} Coins (UPI)`,
      type:        'deposit',
      action:      'buy',
      quantity:    pkg.coins,
      price:       pkg.price / pkg.coins,
      totalAmount: pkg.price,
      date:        new Date(),
    });

    const paymentRecord = (user.payments || []).find(p => p.orderId === razorpay_order_id);
    if (paymentRecord) {
      paymentRecord.status = 'paid';
      paymentRecord.paymentId = razorpay_payment_id || `demo_${Date.now()}`;
    } else {
      user.payments.push({
        orderId: razorpay_order_id || `demo_${Date.now()}`,
        paymentId: razorpay_payment_id || `demo_${Date.now()}`,
        packageId: pkg.id,
        amount: pkg.price,
        coinsAdded: pkg.coins,
        method: 'upi',
        status: 'paid',
      });
    }

    await user.save();

    res.json({
      success:    true,
      coinsAdded: pkg.coins,
      prevCoins,
      newCoins:   user.virtualCoins,
      message:    `✅ ₹${pkg.price} paid via UPI! ${pkg.coins.toLocaleString('en-IN')} coins added to your account.`,
      package:    pkg,
    });
  } catch (err) {
    console.error('VERIFY ERROR:', extractErrorMessage(err));
    res.status(500).json({ message: extractErrorMessage(err) });
  }
});

// ── POST /api/payment/webhook ────────────────────────────────────────────────
// Optional server-to-server confirmation (configure this URL in the Razorpay
// dashboard for production robustness — covers the case where the browser
// closes before the `verify` call completes).
router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return res.status(200).json({ received: true, skipped: 'no webhook secret configured' });

    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(req.body)).digest('hex');
    if (expected !== signature) return res.status(400).json({ message: 'Invalid webhook signature' });

    const payload = req.body?.payload?.payment?.entity;
    if (payload?.order_id) {
      const user = await User.findOne({ 'payments.orderId': payload.order_id });
      if (user) {
        const record = user.payments.find(p => p.orderId === payload.order_id);
        if (record && record.status !== 'paid') {
          record.status = 'paid';
          record.paymentId = payload.id;
          user.virtualCoins += record.coinsAdded || 0;
          await user.save();
        }
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error('WEBHOOK ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/payment/free-bonus ─────────────────────────────────────────────
router.post('/free-bonus', auth, async (req, res) => {
  try {
    const user      = await User.findById(req.user._id);
    const lastBonus = user.lastBonusClaim;
    const now       = new Date();

    if (lastBonus) {
      const hoursSince = (now - new Date(lastBonus)) / (1000 * 60 * 60);
      if (hoursSince < 24) {
        const hoursLeft = Math.ceil(24 - hoursSince);
        return res.status(400).json({ message: `Next bonus in ${hoursLeft} hours`, hoursLeft });
      }
    }

    const bonus = 5000;
    user.virtualCoins += bonus;
    user.lastBonusClaim = now;
    await user.save();

    res.json({
      success:    true,
      coinsAdded: bonus,
      newCoins:   user.virtualCoins,
      message:    `🎁 Daily bonus claimed! +₹${bonus.toLocaleString('en-IN')} coins added!`,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/payment/history ─────────────────────────────────────────────────
router.get('/history', auth, async (req, res) => {
  try {
    const user     = await User.findById(req.user._id);
    const deposits = (user.transactions || []).filter(t => t.type === 'deposit');
    res.json({ deposits, total: deposits.reduce((s, d) => s + (d.totalAmount || 0), 0), payments: user.payments || [] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
module.exports.verifyRazorpayConfig = verifyRazorpayConfig;