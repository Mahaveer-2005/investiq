const router = require('express').Router();
const jwt    = require('jsonwebtoken');
const User   = require('../models/User');
const auth   = require('../middleware/auth');
const { generateOTP, sendOTPEmail, sendPasswordResetEmail } = require('../utils/sendEmail');
const { validatePasswordStrength, validateEmail } = require('../utils/validators');
const crypto = require('crypto');

const JWT_SECRET  = process.env.JWT_SECRET  || 'investiq_secret_key_2024';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '30d';
const OTP_TTL_MIN = 10;

function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    username: user.username,
    virtualCoins: user.virtualCoins,
    isVerified: user.isVerified,
  };
}

// ── POST /api/auth/register ─────────────────────────────────────────────────
// Creates an unverified account and emails a 6-digit OTP. Account cannot log
// in until the OTP is confirmed via /verify-email.
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, username } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'Name, email and password are required' });

    if (!validateEmail(email))
      return res.status(400).json({ message: 'Please enter a valid email address' });

    const strength = validatePasswordStrength(password);
    if (!strength.valid)
      return res.status(400).json({ message: strength.message });

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });

    if (existing && existing.isVerified) {
      return res.status(400).json({ message: 'Email already registered. Please log in.' });
    }

    const otp = generateOTP();
    const otpExpires = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);

    let user;
    if (existing && !existing.isVerified) {
      // Re-registration attempt on an unverified account — refresh details & OTP.
      existing.name = name.trim();
      existing.password = password; // pre-save hook will hash
      existing.username = username || name.trim();
      existing.emailOTP = otp;
      existing.emailOTPExpires = otpExpires;
      existing.otpAttempts = 0;
      existing.otpLastSentAt = new Date();
      user = existing;
    } else {
      user = new User({
        name: name.trim(),
        email: normalizedEmail,
        password,
        username: username || name.trim(),
        virtualCoins: parseInt(process.env.INITIAL_COINS) || 100000,
        isVerified: false,
        emailOTP: otp,
        emailOTPExpires: otpExpires,
        otpLastSentAt: new Date(),
      });
    }

    await user.save();

    const emailResult = await sendOTPEmail(normalizedEmail, user.name, otp);

    if (!emailResult.delivered && process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        requiresVerification: true,
        email: normalizedEmail,
        message: 'Your account was created, but we could not send the verification email. Please try again shortly or contact support.',
      });
    }

    res.status(201).json({
      success: true,
      requiresVerification: true,
      email: normalizedEmail,
      message: emailResult.delivered
        ? `We sent a 6-digit verification code to ${normalizedEmail}.`
        : `Email delivery is not configured. Development OTP: ${otp}`,
      devOtp: process.env.NODE_ENV !== 'production' && emailResult.devMode ? otp : undefined,
    });
  } catch (err) {
    console.error('REGISTER ERROR:', err.message);
    if (err.code === 11000) return res.status(400).json({ message: 'Email already registered' });
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/verify-email ─────────────────────────────────────────────
router.post('/verify-email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'Email and OTP are required' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+emailOTP +emailOTPExpires +otpAttempts');

    if (!user) return res.status(404).json({ message: 'No account found for this email' });
    if (user.isVerified) return res.status(400).json({ message: 'Email is already verified. Please log in.' });

    if (!user.emailOTP || !user.emailOTPExpires || user.emailOTPExpires < new Date()) {
      return res.status(400).json({ message: 'OTP expired. Please request a new one.', expired: true });
    }

    if (user.otpAttempts >= 5) {
      return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new OTP.' });
    }

    if (String(otp).trim() !== String(user.emailOTP)) {
      user.otpAttempts = (user.otpAttempts || 0) + 1;
      await user.save();
      return res.status(400).json({ message: 'Incorrect OTP. Please try again.' });
    }

    user.isVerified = true;
    user.emailOTP = null;
    user.emailOTPExpires = null;
    user.otpAttempts = 0;
    await user.save();

    const token = signToken(user);
    res.json({
      success: true,
      message: `🎉 Email verified! Welcome to InvestIQ — you've received ₹${user.virtualCoins.toLocaleString('en-IN')} virtual coins.`,
      token,
      user: publicUser(user),
    });
  } catch (err) {
    console.error('VERIFY EMAIL ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/resend-otp ───────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail }).select('+otpLastSentAt');
    if (!user) return res.status(404).json({ message: 'No account found for this email' });
    if (user.isVerified) return res.status(400).json({ message: 'Email is already verified. Please log in.' });

    // Basic cooldown to prevent spamming the mail server.
    if (user.otpLastSentAt && (Date.now() - new Date(user.otpLastSentAt).getTime()) < 30 * 1000) {
      return res.status(429).json({ message: 'Please wait 30 seconds before requesting another code.' });
    }

    const otp = generateOTP();
    user.emailOTP = otp;
    user.emailOTPExpires = new Date(Date.now() + OTP_TTL_MIN * 60 * 1000);
    user.otpAttempts = 0;
    user.otpLastSentAt = new Date();
    await user.save();

    const emailResult = await sendOTPEmail(normalizedEmail, user.name, otp);

    if (!emailResult.delivered && process.env.NODE_ENV === 'production') {
      return res.status(503).json({
        success: false,
        message: 'We could not send a new verification email. Please try again shortly.',
      });
    }

    res.json({
      success: true,
      message: emailResult.delivered ? 'A new OTP has been sent to your email.' : `Email delivery is not configured. Development OTP: ${otp}`,
      devOtp: process.env.NODE_ENV !== 'production' && emailResult.devMode ? otp : undefined,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password are required' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user)
      return res.status(401).json({ message: 'Invalid email or password' });

    const match = await user.comparePassword(password);
    if (!match)
      return res.status(401).json({ message: 'Invalid email or password' });

    if (!user.isVerified) {
      return res.status(403).json({
        message: 'Please verify your email before logging in.',
        requiresVerification: true,
        email: user.email,
      });
    }

    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('LOGIN ERROR:', err.message);
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/forgot-password ──────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    // Always respond success (don't leak which emails exist).
    if (!user) return res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });

    const rawToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.passwordResetExpires = new Date(Date.now() + 30 * 60 * 1000);
    await user.save();

    const resetLink = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password/${rawToken}`;
    await sendPasswordResetEmail(normalizedEmail, user.name, resetLink);

    res.json({ success: true, message: 'If that email exists, a reset link has been sent.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/reset-password/:token ────────────────────────────────────
router.post('/reset-password/:token', async (req, res) => {
  try {
    const { password } = req.body;
    const strength = validatePasswordStrength(password);
    if (!strength.valid) return res.status(400).json({ message: strength.message });

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
    }).select('+passwordResetToken +passwordResetExpires');

    if (!user) return res.status(400).json({ message: 'Reset link is invalid or has expired' });

    user.password = password; // pre-save hook hashes it
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password reset successfully. Please log in.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({
      id:           user._id,
      name:         user.name,
      email:        user.email,
      username:     user.username,
      virtualCoins: user.virtualCoins,
      portfolio:    user.portfolio,
      transactions: user.transactions,
      alerts:       user.alerts,
      isVerified:   user.isVerified,
      createdAt:    user.createdAt,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /api/auth/add-funds ────────────────────────────────────────────────
router.post('/add-funds', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    const amt = Number(amount);
    if (!amt || amt <= 0 || amt > 10000000)
      return res.status(400).json({ message: 'Invalid amount' });

    const user = await User.findById(req.user._id);
    user.virtualCoins = +(Number(user.virtualCoins || 0) + amt).toFixed(2);
    await user.save();
    res.json({ success: true, virtualCoins: user.virtualCoins, message: `Added ₹${amt.toLocaleString('en-IN')} to your account` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;