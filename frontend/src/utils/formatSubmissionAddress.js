/**
 * Build a multi-line postal address from a form submission row (same fields as POST /form).
 */
export function formatSubmissionAddress(sub) {
  if (!sub) return '';

  const house = String(sub.house_no || '').trim();
  const street = String(sub.street || '').trim();
  const area = String(sub.area || '').trim();
  let line2 = '';
  if (street && area && street === area) line2 = street;
  else if (street && area) line2 = `${street}\n${area}`;
  else line2 = street || area;

  const town = String(sub.town || '').trim();
  const district = String(sub.district || '').trim();
  const state = String(sub.state || '').trim();
  const pin = String(sub.pin || '').trim();

  let extra = String(sub.address || '').trim();
  const dobMatch = extra.match(/^Date of birth:\s*(\d{1,2})\/(\d{1,2})\/(\d{4})\s*(?:\n([\s\S]*))?$/i);
  if (dobMatch) extra = (dobMatch[4] || '').trim();

  const statePin =
    state && pin ? `${state} - ${pin}` : state || pin;

  const lines = [house, line2, town, district, statePin, extra].map((l) => String(l).trim()).filter(Boolean);
  return lines.join('\n');
}
