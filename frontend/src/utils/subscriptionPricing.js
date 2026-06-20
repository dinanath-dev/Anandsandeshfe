import { isIndiaCountry } from '../data/countries.js';

/** Per-publication subscription rates (INR). */
export const SUBSCRIPTION_RATES = {
  india: { yearlyPerPub: 48, fiveYearTotalPerPub: 240 },
  foreign: { yearlyPerPub: 1600, fiveYearTotalPerPub: 8000 }
};

export function countPublications(form) {
  const data = form || {};
  let count = 0;
  const asLang = String(data.anandSandesh || data.anand_sandesh_lang || '').trim().toLowerCase();
  if (asLang === 'hindi' || asLang === 'english') count += 1;
  const bliss = String(data.spiritualBliss || data.spiritual_bliss || '').trim().toLowerCase();
  if (bliss === 'english') count += 1;
  return count;
}

export function getRateTier(country) {
  return isIndiaCountry(country) ? SUBSCRIPTION_RATES.india : SUBSCRIPTION_RATES.foreign;
}

export function calculateSubscriptionTotals(country, publicationCount) {
  const count = Math.max(0, Number(publicationCount) || 0);
  const tier = getRateTier(country);
  return {
    publicationCount: count,
    yearlyTotal: tier.yearlyPerPub * count,
    fiveYearTotal: tier.fiveYearTotalPerPub * count,
    yearlyPerPub: tier.yearlyPerPub,
    fiveYearTotalPerPub: tier.fiveYearTotalPerPub
  };
}

export function formatInr(amount) {
  const n = Number(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(n);
}

function trimEnv(name) {
  return String(import.meta.env[name] || '').trim();
}

function normalizeSubscriptionType(value) {
  const t = String(value || '').trim().toLowerCase();
  if (t === 'five_year' || t === '5_year' || t === '5year') return 'five_year';
  return 'yearly';
}

/** Client-side plan id (server validates the same logic). */
export function resolveRazorpayPlanId(country, publicationCount, subscriptionType) {
  const count = Number(publicationCount) || 0;
  if (count < 1) return { ok: false, reason: 'no_publications' };

  const type = normalizeSubscriptionType(subscriptionType);
  const twoPub = count >= 2;
  const legacyYearly = trimEnv('VITE_RAZORPAY_PLAN_ID_YEARLY') || trimEnv('VITE_RAZORPAY_PLAN_ID');
  const legacyFive = trimEnv('VITE_RAZORPAY_PLAN_ID_FIVE_YEAR') || legacyYearly;
  const india = isIndiaCountry(country);

  if (india) {
    const planId =
      type === 'five_year'
        ? (twoPub
            ? trimEnv('VITE_RAZORPAY_PLAN_ID_IN_2PUB_FIVE')
            : trimEnv('VITE_RAZORPAY_PLAN_ID_IN_1PUB_FIVE')) || legacyFive
        : (twoPub ? trimEnv('VITE_RAZORPAY_PLAN_ID_IN_2PUB') : trimEnv('VITE_RAZORPAY_PLAN_ID_IN_1PUB')) ||
          legacyYearly;
    return planId ? { ok: true, planId } : { ok: false, reason: 'plan_not_configured' };
  }

  const planId =
    type === 'five_year'
      ? (twoPub
          ? trimEnv('VITE_RAZORPAY_PLAN_ID_FOREIGN_2PUB_FIVE')
          : trimEnv('VITE_RAZORPAY_PLAN_ID_FOREIGN_1PUB_FIVE')) || legacyFive
      : (twoPub
          ? trimEnv('VITE_RAZORPAY_PLAN_ID_FOREIGN_2PUB')
          : trimEnv('VITE_RAZORPAY_PLAN_ID_FOREIGN_1PUB')) || legacyYearly;
  return planId ? { ok: true, planId } : { ok: false, reason: 'plan_not_configured' };
}

export function planTotalCountForType(subscriptionType) {
  const type = String(subscriptionType || '').trim().toLowerCase();
  if (type === 'five_year') {
    return Number(import.meta.env.VITE_RAZORPAY_TOTAL_COUNT_FIVE_YEAR) || 5;
  }
  return Number(import.meta.env.VITE_RAZORPAY_TOTAL_COUNT_YEARLY) || 10;
}
