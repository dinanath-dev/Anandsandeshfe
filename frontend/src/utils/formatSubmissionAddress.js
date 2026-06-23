/**
 * Build a multi-line postal address from a form submission row (same fields as POST /form).
 */
export function formatSubmissionAddress(sub) {
  if (!sub) return '';

  const line1 = String(sub.address_1 || sub.address || sub.house_no || '').trim();
  const careOf = String(sub.care_of || sub.careOf || '').trim();
  const street = String(sub.street || '').trim();
  const address2 = String(sub.address_2 || '').trim();
  const line2 = street || (address2 ? address2.split('\n')[0].trim() : '');
  const area =
    String(sub.area || '').trim() ||
    (address2 ? address2.split('\n').map((l) => l.trim()).filter(Boolean)[1] || '' : '');
  const postOffice =
    String(sub.post_office || sub.postOffice || '').trim() ||
    (address2 ? address2.split('\n').map((l) => l.trim()).filter(Boolean)[2] || '' : '');
  const landmark = String(sub.mark || sub.landmark || '').trim();

  const town = String(sub.town || sub.city || '').trim();
  const district = String(sub.district || sub.tehsil || '').trim();
  const state = String(sub.state || '').trim();
  const pin = String(sub.pin || sub.pincode || '').trim();

  const statePin = state && pin ? `${state} - ${pin}` : state || pin;

  const lines = [careOf, line1, line2, area, landmark, postOffice, town, district, statePin]
    .map((l) => String(l).trim())
    .filter(Boolean);
  return lines.join('\n');
}
