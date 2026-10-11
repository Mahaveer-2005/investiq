const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const transactionSchema = new mongoose.Schema({
  symbol:      { type: String, required: true },
  name:        { type: String, default: '' },
  action:      { type: String, enum: ['buy','sell'], required: true },
  type:        { type: String, default: '' },
  quantity:    { type: Number, required: true },
  price:       { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  total:       { type: Number, default: 0 },
  date:        { type: Date,   default: Date.now },
  createdAt:   { type: Date,   default: Date.now },
}, { _id: true });

const holdingSchema = new mongoose.Schema({
  symbol:    { type: String, required: true },
  name:      { type: String, default: '' },
  quantity:  { type: Number, default: 0 },
  avgPrice:  { type: Number, default: 0 },
  sector:    { type: String, default: '' },
  addedAt:   { type: Date,   default: Date.now },
  updatedAt: { type: Date,   default: Date.now },
}, { _id: false });

const alertSchema = new mongoose.Schema({
  id:          { type: String },
  symbol:      { type: String },
  name:        { type: String },
  type:        { type: String },
  targetValue: { type: Number },
  message:     { type: String, default: '' },
  active:      { type: Boolean, default: true },
  triggered:   { type: Boolean, default: false },
  triggerMsg:  { type: String,  default: '' },
  createdAt:   { type: Date,    default: Date.now },
  triggeredAt: { type: Date,    default: null },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:         { type: String, required: true, trim: true },
  email:        { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:     { type: String, required: true, minlength: 6 },
  username:     { type: String, default: '' },
  virtualCoins: { type: Number, default: 100000 },
  portfolio:    { type: [holdingSchema],     default: [] },
  transactions: { type: [transactionSchema], default: [] },
  alerts:       { type: [alertSchema],       default: [] },

  // ── Email verification ───────────────────────────────────────────────
  isVerified:        { type: Boolean, default: false },
  emailOTP:          { type: String,  default: null, select: false },
  emailOTPExpires:   { type: Date,    default: null, select: false },
  otpAttempts:       { type: Number,  default: 0,    select: false },
  otpLastSentAt:     { type: Date,    default: null, select: false },

  // ── Password reset ───────────────────────────────────────────────────
  passwordResetToken:   { type: String, default: null, select: false },
  passwordResetExpires: { type: Date,   default: null, select: false },

  // ── Active SIPs (virtual) ────────────────────────────────────────────
  sips: [{
    id: String,
    label: String,          // e.g. "Nifty 50 Index Fund"
    monthlyAmount: Number,
    expectedReturnPct: Number,
    startDate: { type: Date, default: Date.now },
    lastInstallmentDate: Date,
    installmentsPaid: { type: Number, default: 0 },
    totalInvested: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'paused', 'stopped'], default: 'active' },
  }],
  lastBonusClaim: { type: Date, default: null },
  payments: [{
    orderId:     String,
    paymentId:   String,
    packageId:   String,
    amount:      Number,       // INR paid
    coinsAdded:  Number,
    method:      { type: String, default: 'upi' },
    status:      { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    createdAt:   { type: Date, default: Date.now },
  }],

  createdAt:    { type: Date, default: Date.now },
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt    = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) { next(err); }
});

userSchema.methods.comparePassword = async function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);