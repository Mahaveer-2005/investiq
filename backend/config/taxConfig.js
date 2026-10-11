// ─────────────────────────────────────────────────────────────────────────
// Central tax/charges configuration for Indian equity delivery trades.
// Rates change periodically (budget announcements etc.) — keep this the
// ONLY place they're defined so the whole app updates from one edit.
// Sources: SEBI/exchange circulars as of early 2025. Verify against current
// official guidance before relying on this for real trading decisions.
// ─────────────────────────────────────────────────────────────────────────

const TAX_CONFIG = {
  asOf: '2025-04-01', // last verified date — update when rates change

  brokerage: {
    type: 'flat', // 'flat' | 'percentage' | 'zero'
    flatPerOrder: 0, // InvestIQ is a practice app — no real brokerage. Set a
                     // real number here (e.g. 20) to simulate a discount broker.
  },

  // Securities Transaction Tax — delivery-based equity
  stt: {
    buyRate: 0.001,  // 0.1% on buy (delivery)
    sellRate: 0.001, // 0.1% on sell (delivery)
  },

  // Exchange transaction charges (NSE, approx.)
  exchangeTxnCharge: {
    rate: 0.0000297, // ~0.00297%
  },

  // SEBI turnover fee
  sebiCharges: {
    rate: 0.0000001, // ₹10 per crore = 0.0001% = 0.000001
  },

  // GST — applies on (brokerage + exchange txn charge + SEBI charges)
  gst: {
    rate: 0.18, // 18%
  },

  // Stamp duty — buy side only, varies by state but SEBI-mandated uniform
  // rate for delivery equity since July 2020
  stampDuty: {
    buyRate: 0.00015, // 0.015% on buy value only
    sellRate: 0,
  },

  // Capital gains tax (equity, STT paid)
  capitalGains: {
    shortTermRate: 0.20,       // STCG on equity <= 12 months: 20% (post July 2024 budget)
    longTermRate: 0.125,       // LTCG on equity > 12 months: 12.5% (post July 2024 budget)
    longTermExemption: 125000, // ₹1.25L LTCG exemption per financial year
    holdingPeriodDays: 365,    // > this = long-term
  },
};

// ── Buy-side cost breakdown ─────────────────────────────────────────────
function calculateBuyCharges(investmentAmount) {
  const stockValue = +investmentAmount;
  const brokerage = TAX_CONFIG.brokerage.type === 'flat' ? TAX_CONFIG.brokerage.flatPerOrder : 0;
  const stt = +(stockValue * TAX_CONFIG.stt.buyRate).toFixed(2);
  const exchangeCharge = +(stockValue * TAX_CONFIG.exchangeTxnCharge.rate).toFixed(2);
  const sebiCharge = +(stockValue * TAX_CONFIG.sebiCharges.rate).toFixed(2);
  const gstBase = brokerage + exchangeCharge + sebiCharge;
  const gst = +(gstBase * TAX_CONFIG.gst.rate).toFixed(2);
  const stampDuty = +(stockValue * TAX_CONFIG.stampDuty.buyRate).toFixed(2);

  const totalCharges = +(brokerage + stt + exchangeCharge + sebiCharge + gst + stampDuty).toFixed(2);
  const totalPayable = +(stockValue + totalCharges).toFixed(2);

  return {
    stockValue, brokerage, stt, exchangeCharge, sebiCharge, gst, stampDuty,
    totalCharges, totalPayable,
    breakdown: [
      { label: 'Stock Value', amount: stockValue },
      { label: 'Brokerage', amount: brokerage },
      { label: 'STT (0.1%)', amount: stt },
      { label: 'Exchange Transaction Charge', amount: exchangeCharge },
      { label: 'SEBI Charges', amount: sebiCharge },
      { label: 'GST (18% on brokerage+exchange+SEBI)', amount: gst },
      { label: 'Stamp Duty (0.015%)', amount: stampDuty },
      { label: 'Total Payable', amount: totalPayable, isTotal: true },
    ],
  };
}

// ── Sell-side cost breakdown + capital gains ────────────────────────────
function calculateSellCharges(buyValue, sellValue, holdingDays = 0) {
  const brokerage = TAX_CONFIG.brokerage.type === 'flat' ? TAX_CONFIG.brokerage.flatPerOrder : 0;
  const stt = +(sellValue * TAX_CONFIG.stt.sellRate).toFixed(2);
  const exchangeCharge = +(sellValue * TAX_CONFIG.exchangeTxnCharge.rate).toFixed(2);
  const sebiCharge = +(sellValue * TAX_CONFIG.sebiCharges.rate).toFixed(2);
  const gstBase = brokerage + exchangeCharge + sebiCharge;
  const gst = +(gstBase * TAX_CONFIG.gst.rate).toFixed(2);
  // Stamp duty is buy-side only per current SEBI rules

  const totalSellCharges = +(brokerage + stt + exchangeCharge + sebiCharge + gst).toFixed(2);
  const grossProfit = +(sellValue - buyValue).toFixed(2);
  const netProfitBeforeTax = +(grossProfit - totalSellCharges).toFixed(2);

  const isLongTerm = holdingDays > TAX_CONFIG.capitalGains.holdingPeriodDays;
  let capitalGainsTax = 0;
  let gainsType = 'N/A (loss, no tax)';

  if (netProfitBeforeTax > 0) {
    if (isLongTerm) {
      gainsType = 'Long-Term Capital Gains (LTCG)';
      // Note: exemption is per-FY across ALL LTCG, not per-trade — this
      // simulator shows the per-trade tax assuming exemption already used
      // elsewhere; a full exemption tracker would need portfolio-wide state.
      capitalGainsTax = +(netProfitBeforeTax * TAX_CONFIG.capitalGains.longTermRate).toFixed(2);
    } else {
      gainsType = 'Short-Term Capital Gains (STCG)';
      capitalGainsTax = +(netProfitBeforeTax * TAX_CONFIG.capitalGains.shortTermRate).toFixed(2);
    }
  }

  const netProfitAfterTax = +(netProfitBeforeTax - capitalGainsTax).toFixed(2);
  const effectiveReturnPct = buyValue > 0 ? +((netProfitAfterTax / buyValue) * 100).toFixed(2) : 0;

  return {
    buyValue, sellValue, brokerage, stt, exchangeCharge, sebiCharge, gst,
    totalSellCharges, grossProfit, netProfitBeforeTax,
    isLongTerm, gainsType, capitalGainsTax, netProfitAfterTax, effectiveReturnPct,
    breakdown: [
      { label: 'Buy Value', amount: buyValue },
      { label: 'Sell Value', amount: sellValue },
      { label: 'Gross Profit', amount: grossProfit },
      { label: 'Brokerage', amount: -brokerage },
      { label: 'STT (0.1%)', amount: -stt },
      { label: 'Exchange Transaction Charge', amount: -exchangeCharge },
      { label: 'SEBI Charges', amount: -sebiCharge },
      { label: 'GST', amount: -gst },
      { label: `Net Profit Before Tax`, amount: netProfitBeforeTax, isSubtotal: true },
      { label: `${gainsType} Tax`, amount: -capitalGainsTax },
      { label: 'Net Profit After Tax', amount: netProfitAfterTax, isTotal: true },
    ],
  };
}

// ── Intraday (speculative) tax rules — DIFFERENT from delivery ─────────────
// Intraday equity trading profit is taxed as "Speculative Business Income"
// at your income tax SLAB RATE (not STCG/LTCG capital gains), and STT for
// intraday applies only on the SELL side at a lower rate than delivery.
const INTRADAY_CONFIG = {
  stt: { sellOnlyRate: 0.00025 },        // 0.025% on sell side only (intraday)
  exchangeTxnCharge: { rate: 0.0000345 }, // slightly different from delivery on NSE
  sebiCharges: { rate: 0.0000001 },
  gst: { rate: 0.18 },
  slabNote: 'Intraday profit is treated as Speculative Business Income and taxed at your applicable income tax SLAB RATE (5%/20%/30% etc. based on total income) — NOT the 20% STCG / 12.5% LTCG rates used for delivery trades. Intraday losses can only be set off against other speculative gains, with carry-forward limited to 4 years.',
};

function calculateIntradayCharges(buyValue, sellValue, slabRatePct = 30) {
  const brokerage = TAX_CONFIG.brokerage.type === 'flat' ? TAX_CONFIG.brokerage.flatPerOrder : 0;
  const sttBuy = 0; // no STT on intraday buy side
  const sttSell = +(sellValue * INTRADAY_CONFIG.stt.sellOnlyRate).toFixed(2);
  const exchangeCharge = +((buyValue + sellValue) * INTRADAY_CONFIG.exchangeTxnCharge.rate).toFixed(2);
  const sebiCharge = +((buyValue + sellValue) * INTRADAY_CONFIG.sebiCharges.rate).toFixed(2);
  const gstBase = brokerage * 2 + exchangeCharge + sebiCharge; // brokerage typically charged both legs
  const gst = +(gstBase * INTRADAY_CONFIG.gst.rate).toFixed(2);

  const totalCharges = +(brokerage * 2 + sttBuy + sttSell + exchangeCharge + sebiCharge + gst).toFixed(2);
  const grossProfit = +(sellValue - buyValue).toFixed(2);
  const netProfitBeforeTax = +(grossProfit - totalCharges).toFixed(2);

  const slabTax = netProfitBeforeTax > 0 ? +(netProfitBeforeTax * (slabRatePct / 100)).toFixed(2) : 0;
  const netProfitAfterTax = +(netProfitBeforeTax - slabTax).toFixed(2);
  const effectiveReturnPct = buyValue > 0 ? +((netProfitAfterTax / buyValue) * 100).toFixed(2) : 0;

  return {
    buyValue, sellValue, brokerage: brokerage * 2, sttSell, exchangeCharge, sebiCharge, gst,
    totalCharges, grossProfit, netProfitBeforeTax, slabRatePct, slabTax, netProfitAfterTax, effectiveReturnPct,
    note: INTRADAY_CONFIG.slabNote,
    breakdown: [
      { label: 'Buy Value', amount: buyValue },
      { label: 'Sell Value', amount: sellValue },
      { label: 'Gross Profit', amount: grossProfit },
      { label: 'Brokerage (both legs)', amount: -(brokerage * 2) },
      { label: 'STT (0.025% on sell only)', amount: -sttSell },
      { label: 'Exchange Transaction Charge', amount: -exchangeCharge },
      { label: 'SEBI Charges', amount: -sebiCharge },
      { label: 'GST', amount: -gst },
      { label: 'Net Profit Before Tax', amount: netProfitBeforeTax, isSubtotal: true },
      { label: `Tax @ ${slabRatePct}% slab (speculative income)`, amount: -slabTax },
      { label: 'Net Profit After Tax', amount: netProfitAfterTax, isTotal: true },
    ],
  };
}

module.exports = { TAX_CONFIG, calculateBuyCharges, calculateSellCharges, INTRADAY_CONFIG, calculateIntradayCharges };