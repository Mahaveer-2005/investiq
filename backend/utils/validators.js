// ── Strong password rule ─────────────────────────────────────────────────
// Min 8 chars, at least 1 uppercase, 1 lowercase, 1 number, 1 special char.
const STRONG_PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

function validatePasswordStrength(password) {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Password is required' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters long' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one special character (!@#$%^&* etc.)' };
  }
  return { valid: true, message: 'Strong password' };
}

// Simple RFC-5322-ish email check — good enough for signup forms.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function validateEmail(email) {
  return typeof email === 'string' && EMAIL_RE.test(email.trim());
}

module.exports = { STRONG_PASSWORD_RE, validatePasswordStrength, validateEmail };