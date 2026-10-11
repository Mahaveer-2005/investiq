const axios = require('axios');
const nodemailer = require('nodemailer');

// ─────────────────────────────────────────────────────────────────────────
// WHY THIS FILE CHANGED:
// A personal Gmail account is fine for a couple of test signups, but it's
// the wrong tool once *any* real user with *their own* email address is
// registering: Gmail throttles automated sending to ~500/day, has no
// dedicated deliverability infrastructure, and Google frequently flags
// app-driven SMTP logins as suspicious and silently drops or delays mail.
//
// This file now prefers a real transactional email API — Resend — which is
// built exactly for "my app sends verification emails to arbitrary users."
// It falls back to Gmail SMTP (if configured) and finally to console
// logging (dev mode) so nothing ever hard-fails.
//
// Priority: RESEND_API_KEY > EMAIL_USER/EMAIL_PASS (SMTP) > console fallback
// ─────────────────────────────────────────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
// Resend's shared sandbox sender — works immediately with zero setup,
// before you've verified your own domain. Swap to your own verified domain
// address once you have one (see backend/.env.example for instructions).
const RESEND_FROM = process.env.EMAIL_FROM || 'InvestIQ <onboarding@resend.dev>';

let smtpTransporter = null;
function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter;
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;

  const host = (process.env.EMAIL_HOST || 'smtp.gmail.com').toLowerCase();
  smtpTransporter = host.includes('gmail')
    ? nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } })
    : nodemailer.createTransport({
        host,
        port: Number(process.env.EMAIL_PORT) || 587,
        secure: Number(process.env.EMAIL_PORT) === 465,
        auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
      });
  return smtpTransporter;
}

function activeProvider() {
  if (RESEND_API_KEY) return 'resend';
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) return 'smtp';
  return 'console';
}

// ── Low-level senders ───────────────────────────────────────────────────
async function sendViaResend(to, subject, html) {
  await axios.post(
    'https://api.resend.com/emails',
    { from: RESEND_FROM, to, subject, html },
    { headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' }, timeout: 10000 }
  );
}

async function sendViaSmtp(to, subject, html) {
  const t = getSmtpTransporter();
  await t.sendMail({ from: process.env.EMAIL_FROM || `InvestIQ <${process.env.EMAIL_USER}>`, to, subject, html });
}

// Single entry point used by every email-sending function below. Always
// returns a result object instead of throwing, so a mail-provider outage
// never blocks registration/login — it just degrades to dev-mode logging.
async function send(to, subject, html, devFallbackText) {
  const provider = activeProvider();
  try {
    if (provider === 'resend') {
      await sendViaResend(to, subject, html);
      console.log(`📧 [Resend] Email sent to ${to}`);
      return { delivered: true, devMode: false, provider };
    }
    if (provider === 'smtp') {
      await sendViaSmtp(to, subject, html);
      console.log(`📧 [SMTP] Email sent to ${to}`);
      return { delivered: true, devMode: false, provider };
    }
    console.log(`\n📧 [DEV MODE — no email provider configured] ${devFallbackText}\n`);
    return { delivered: false, devMode: true, provider: 'console' };
  } catch (err) {
    const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
    console.error(`EMAIL SEND ERROR (${provider}):`, detail);
    console.log(`\n📧 [EMAIL FAILED — fallback] ${devFallbackText}\n`);
    return { delivered: false, devMode: true, provider, error: detail };
  }
}

// ── Generate a 6-digit numeric OTP ──────────────────────────────────────
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOTPEmail(toEmail, name, otp) {
  const subject = 'Verify your InvestIQ account';
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#6366f1;">⚡ InvestIQ</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Use the code below to verify your email address. It expires in <b>10 minutes</b>.</p>
      <div style="font-size:32px;font-weight:800;letter-spacing:8px;background:#f3f4f6;padding:16px;text-align:center;border-radius:10px;margin:16px 0;">
        ${otp}
      </div>
      <p style="color:#64748b;font-size:13px;">If you didn't create an InvestIQ account, you can safely ignore this email.</p>
    </div>`;
  return send(toEmail, subject, html, `OTP for ${toEmail}: ${otp}`);
}

async function sendPasswordResetEmail(toEmail, name, resetLink) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="color:#6366f1;">⚡ InvestIQ — Password Reset</h2>
      <p>Hi ${name || 'there'},</p>
      <p>Click the link below to reset your password. It expires in 30 minutes.</p>
      <p><a href="${resetLink}" style="background:#6366f1;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;">Reset Password</a></p>
      <p style="color:#64748b;font-size:13px;">If you didn't request this, ignore this email.</p>
    </div>`;
  return send(toEmail, 'Reset your InvestIQ password', html, `Password reset link for ${toEmail}: ${resetLink}`);
}

// Called once at server startup — prints exactly which provider is active
// and whether it's actually reachable, instead of finding out on a real
// user's first registration.
async function verifyEmailConfig() {
  const provider = activeProvider();

  if (provider === 'console') {
    console.log('ℹ️  No email provider configured (RESEND_API_KEY or EMAIL_USER/EMAIL_PASS) — OTPs will be logged to this console instead of emailed.');
    console.log('   → Add RESEND_API_KEY to backend/.env for real delivery to any user\'s inbox. See REAL_MODE_SETUP.md.');
    return false;
  }

  if (provider === 'resend') {
    try {
      // Resend has no lightweight "ping" endpoint, so we validate the key by
      // listing domains (works even with zero domains verified).
      await axios.get('https://api.resend.com/domains', {
        headers: { Authorization: `Bearer ${RESEND_API_KEY}` },
        timeout: 8000,
      });
      console.log(`✅ Resend configured — real emails will be sent from ${RESEND_FROM}`);
      return true;
    } catch (err) {
      console.error('❌ RESEND CONFIG ERROR — check RESEND_API_KEY in backend/.env:', err.response?.status, err.response?.data?.message || err.message);
      return false;
    }
  }

  // SMTP (Gmail etc.)
  try {
    await getSmtpTransporter().verify();
    console.log(`✅ SMTP configured — real emails will be sent from ${process.env.EMAIL_USER}`);
    return true;
  } catch (err) {
    console.error('❌ EMAIL CONFIG ERROR — emails will NOT be delivered:', err.message);
    return false;
  }
}

module.exports = { generateOTP, sendOTPEmail, sendPasswordResetEmail, verifyEmailConfig, activeProvider };