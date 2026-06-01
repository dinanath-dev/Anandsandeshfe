/**
 * Build a multi-line postal address from a form submission row (same fields as POST /form).
 */
export function formatSubmissionAddress(sub) {
  if (!sub) return '';

  const line1 = String(sub.address_1 || sub.address || sub.house_no || '').trim();
  const address2 = String(sub.address_2 || '').trim();

  const town = String(sub.town || sub.city || '').trim();
  const district = String(sub.district || sub.tehsil || '').trim();
  const state = String(sub.state || '').trim();
  const pin = String(sub.pin || sub.pincode || '').trim();

  const statePin = state && pin ? `${state} - ${pin}` : state || pin;

  const lines = [line1, address2, town, district, statePin].map((l) => String(l).trim()).filter(Boolean);
  return lines.join('\n');
}
