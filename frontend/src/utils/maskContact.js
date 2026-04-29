/** Mask phone for display (last 4 digits visible). */
export function maskPhone(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length <= 4) return '••••';
  const visible = digits.slice(-4);
  const hiddenCount = Math.min(digits.length - 4, 10);
  return `${'•'.repeat(hiddenCount)}${visible}`;
}

/** Mask email local-part; domain kept readable so provider is recognizable. */
export function maskEmail(value) {
  const email = String(value ?? '').trim();
  if (!email) return '';
  const at = email.indexOf('@');
  if (at < 1) return '•••';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  if (!domain) return '•••';
  const localMasked = local.length <= 1 ? `${local || '•'}•••` : `${local[0]}•••`;
  return `${localMasked}@${domain}`;
}
