/** Treat legacy subscription period / receipt data as verified for display. */
export function normalizePaymentStatus(raw, sub = null) {
  const s = String(raw || '').toLowerCase();
  if (s === 'verified' || s === 'paid' || s === 'active') return 'verified';
  if (s === 'failed' || s === 'cancelled') return s;
  if (!sub || typeof sub !== 'object') return 'pending';

  const uptoMonth = Number(sub.upto_month);
  const uptoYear = Number(sub.upto_year);
  if (
    Number.isInteger(uptoMonth) &&
    uptoMonth >= 1 &&
    uptoMonth <= 12 &&
    Number.isInteger(uptoYear) &&
    uptoYear > 1900
  ) {
    return 'verified';
  }

  const whenceMonth = Number(sub.whence_issued_month);
  const whenceYear = Number(sub.whence_issued_year);
  if (
    Number.isInteger(whenceMonth) &&
    whenceMonth >= 1 &&
    whenceMonth <= 12 &&
    Number.isInteger(whenceYear) &&
    whenceYear > 1900
  ) {
    return 'verified';
  }

  const receipt = String(sub.receipt_no || '').trim();
  const amount = sub.subs_amount;
  if (receipt || (amount != null && amount !== '' && Number(amount) > 0)) {
    return 'verified';
  }

  return 'pending';
}

/** Resolve subscription validity end date from API / DB row fields. */
export function getSubscriptionEndDate(sub) {
  if (!sub || typeof sub !== 'object') return null;

  const month = Number(sub.upto_month);
  const year = Number(sub.upto_year);
  if (Number.isInteger(month) && month >= 1 && month <= 12 && Number.isInteger(year) && year > 1900) {
    return new Date(year, month, 0);
  }

  const raw =
    sub.subscription_end_at ??
    sub.subscriptionEndsAt ??
    sub.current_period_end ??
    sub.currentPeriodEnd ??
    sub.subscription_valid_until ??
    null;
  if (raw == null || raw === '') return null;

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    const ms = raw > 0 && raw < 1e12 ? raw * 1000 : raw;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatPeriodEnd(value) {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

/** Days until end date (inclusive of end day). Negative if expired. */
export function daysUntilSubscriptionEnd(endDate) {
  if (!endDate) return null;
  const end = endDate instanceof Date ? new Date(endDate) : new Date(endDate);
  if (Number.isNaN(end.getTime())) return null;
  end.setHours(23, 59, 59, 999);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((end - now) / 86400000);
}

/**
 * @param {(key: string, vars?: object) => string} t
 * @returns {string|null}
 */
export function formatPeriodRemaining(endDate, t) {
  const days = daysUntilSubscriptionEnd(endDate);
  if (days == null) return null;
  if (days < 0) return t('profile.periodExpired');
  if (days === 0) return t('profile.periodRemainingToday');
  if (days === 1) return t('profile.periodRemainingOneDay');
  if (days < 60) return t('profile.periodRemainingDays', { count: days });
  const months = Math.max(1, Math.round(days / 30.44));
  if (months === 1) return t('profile.periodRemainingOneMonth');
  return t('profile.periodRemainingMonths', { count: months });
}

export function getSubscriptionPeriodSummary(sub, t) {
  const endDate = getSubscriptionEndDate(sub);
  if (!endDate) return null;
  return {
    endDate,
    validThrough: formatPeriodEnd(endDate),
    remaining: formatPeriodRemaining(endDate, t)
  };
}
