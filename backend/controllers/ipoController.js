const IPO = require('../models/IPO');
const { ipoCache } = require('../config/cache');
const axios = require('axios');

// Seed realistic IPO data
const SAMPLE_IPOS = [
  {
    company: 'Hyundai Motor India', symbol: 'HYUNDAI', exchange: 'NSE',
    priceRange: { low: 1865, high: 1960 }, issueSize: 27870, lotSize: 7,
    openDate: new Date('2024-10-15'), closeDate: new Date('2024-10-17'), listingDate: new Date('2024-10-22'),
    gmp: 85, subscriptionStatus: { retail: 0.5, qib: 6.97, nii: 0.6, total: 2.37 },
    status: 'listed', sector: 'Auto', listingPrice: 1934, listingGain: -1.3,
    registrar: 'KFin Technologies', leadManager: 'Kotak, Citi, HSBC',
    description: 'Hyundai Motor India is the subsidiary of Korean automotive giant Hyundai. India\'s second largest car maker.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Hyundai_Motor_Company_logo.svg/2560px-Hyundai_Motor_Company_logo.svg.png'
  },
  {
    company: 'Swiggy', symbol: 'SWIGGY', exchange: 'NSE',
    priceRange: { low: 371, high: 390 }, issueSize: 11327, lotSize: 38,
    openDate: new Date('2024-11-06'), closeDate: new Date('2024-11-08'), listingDate: new Date('2024-11-13'),
    gmp: 15, subscriptionStatus: { retail: 1.14, qib: 6.02, nii: 0.41, total: 3.59 },
    status: 'listed', sector: 'Internet', listingPrice: 412, listingGain: 5.6,
    registrar: 'Link Intime', leadManager: 'Kotak, Jefferies, BofA',
    description: 'Swiggy is India\'s leading food delivery and quick commerce platform operating in 500+ cities.',
    imageUrl: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Swiggy_logo.svg/2560px-Swiggy_logo.svg.png'
  },
  {
    company: 'Sagility India', symbol: 'SAGILITY', exchange: 'NSE',
    priceRange: { low: 28, high: 30 }, issueSize: 2106, lotSize: 500,
    openDate: new Date('2024-11-05'), closeDate: new Date('2024-11-07'), listingDate: new Date('2024-11-12'),
    gmp: 5, subscriptionStatus: { retail: 3.21, qib: 10.45, nii: 2.76, total: 3.2 },
    status: 'listed', sector: 'IT', listingPrice: 31.06, listingGain: 3.5,
    registrar: 'KFin Technologies', leadManager: 'ICICI Securities',
    description: 'Sagility India provides technology and operations solutions to US healthcare payers and providers.',
    imageUrl: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=400'
  },
  {
    company: 'NTPC Green Energy', symbol: 'NTPCGREEN', exchange: 'NSE',
    priceRange: { low: 102, high: 108 }, issueSize: 10000, lotSize: 138,
    openDate: new Date('2024-11-19'), closeDate: new Date('2024-11-22'), listingDate: new Date('2024-11-27'),
    gmp: 4, subscriptionStatus: { retail: 1.49, qib: 2.83, nii: 0.79, total: 2.55 },
    status: 'listed', sector: 'Power', listingPrice: 111, listingGain: 2.8,
    registrar: 'KFin Technologies', leadManager: 'IDBI Capital, HDFC Securities',
    description: 'NTPC Green Energy is a wholly-owned subsidiary of NTPC focused on renewable energy.',
    imageUrl: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?w=400'
  },
  {
    company: 'Vishal Mega Mart', symbol: 'VISHALMEGA', exchange: 'NSE',
    priceRange: { low: 74, high: 78 }, issueSize: 8000, lotSize: 190,
    openDate: new Date('2024-12-11'), closeDate: new Date('2024-12-13'), listingDate: new Date('2024-12-18'),
    gmp: 12, subscriptionStatus: { retail: 5.57, qib: 19.02, nii: 5.91, total: 27.26 },
    status: 'listed', sector: 'Retail', listingPrice: 98, listingGain: 25.6,
    registrar: 'Link Intime', leadManager: 'Kotak, Axis, JM Financial',
    description: 'Vishal Mega Mart is a leading value fashion and grocery retailer with 600+ stores across India.',
    imageUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400'
  },
  {
    company: 'Hexaware Technologies', symbol: 'HEXAWARE', exchange: 'NSE',
    priceRange: { low: 674, high: 708 }, issueSize: 8750, lotSize: 21,
    openDate: new Date('2025-02-12'), closeDate: new Date('2025-02-14'), listingDate: new Date('2025-02-19'),
    gmp: 45, subscriptionStatus: { retail: 2.11, qib: 8.54, nii: 1.89, total: 2.66 },
    status: 'listed', sector: 'IT', listingPrice: 745, listingGain: 5.2,
    registrar: 'KFin Technologies', leadManager: 'Kotak, Citi, JPMorgan',
    description: 'Hexaware Technologies is a global IT and BPO company providing AI-powered solutions.',
    imageUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=400'
  },
  {
    company: 'Ather Energy', symbol: 'ATHER', exchange: 'NSE',
    priceRange: { low: 304, high: 321 }, issueSize: 2981, lotSize: 46,
    openDate: new Date('2025-04-28'), closeDate: new Date('2025-04-30'), listingDate: new Date('2025-05-06'),
    gmp: 25, subscriptionStatus: { retail: 1.78, qib: 4.32, nii: 0.98, total: 1.8 },
    status: 'upcoming', sector: 'EV', registrar: 'KFin Technologies', leadManager: 'Axis, Goldman Sachs',
    description: 'Ather Energy is India\'s leading premium electric scooter manufacturer with proprietary tech.',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'
  },
  {
    company: 'Zepto', symbol: 'ZEPTO', exchange: 'NSE',
    priceRange: { low: 550, high: 580 }, issueSize: 6500, lotSize: 26,
    openDate: new Date('2025-06-10'), closeDate: new Date('2025-06-12'), listingDate: new Date('2025-06-18'),
    gmp: 80, subscriptionStatus: { retail: 0, qib: 0, nii: 0, total: 0 },
    status: 'upcoming', sector: 'Quick Commerce', registrar: 'Link Intime', leadManager: 'Goldman, Morgan Stanley',
    description: 'Zepto is India\'s fastest growing quick commerce startup delivering groceries in 10 minutes.',
    imageUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400'
  }
];

exports.seedIPOs = async () => {
  try {
    const count = await IPO.countDocuments();
    if (count === 0) {
      await IPO.insertMany(SAMPLE_IPOS);
      console.log('✅ IPO data seeded');
    }
  } catch (e) {
    console.error('IPO seed error:', e.message);
  }
};

exports.getAllIPOs = async (req, res) => {
  try {
    const { status } = req.query;
    const query = status ? { status } : {};
    const ipos = await IPO.find(query).sort({ openDate: -1 });
    
    // Add dynamic subscription numbers and GMP fluctuation
    const enriched = ipos.map(ipo => ({
      ...ipo.toObject(),
      gmp: ipo.gmp + Math.floor((Math.random() - 0.5) * 10),
      imageUrl: ipo.imageUrl || `https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400`
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getIPODetail = async (req, res) => {
  try {
    const ipo = await IPO.findById(req.params.id);
    if (!ipo) return res.status(404).json({ success: false, message: 'IPO not found' });
    res.json({ success: true, data: ipo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.applyIPO = async (req, res) => {
  try {
    const { ipoId, lots } = req.body;
    const User = require('../models/User');
    const ipo = await IPO.findById(ipoId);
    if (!ipo) return res.status(404).json({ success: false, message: 'IPO not found' });

    const user = await User.findById(req.user._id);
    const totalAmount = ipo.priceRange.high * ipo.lotSize * lots;

    if (user.virtualCoins < totalAmount)
      return res.status(400).json({ success: false, message: 'Insufficient virtual coins' });

    user.virtualCoins -= totalAmount;
    user.tradeHistory.push({
      symbol: ipo.symbol || ipo.company.slice(0, 6).toUpperCase(),
      name: ipo.company, type: 'BUY', quantity: ipo.lotSize * lots,
      price: ipo.priceRange.high, totalAmount, category: 'ipo',
      biasDetected: [], profitLoss: 0
    });
    await user.save();

    res.json({
      success: true,
      message: `Applied for ${lots} lot(s) of ${ipo.company} IPO! ₹${totalAmount.toLocaleString('en-IN')} blocked.`,
      data: { ipo: ipo.company, lots, totalAmount, remainingCoins: user.virtualCoins }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
