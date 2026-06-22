/** Split a legacy full name into first + last (first token / remainder). */
export function splitFullName(full) {
  const s = String(full || '').trim();
  if (!s) return { firstName: '', lastName: '' };
  const i = s.indexOf(' ');
  if (i === -1) return { firstName: s, lastName: '' };
  return { firstName: s.slice(0, i).trim(), lastName: s.slice(i + 1).trim() };
}

/** Join first + last for display and legacy API fields. */
export function joinFullName(first, last) {
  return [first, last]
    .map((v) => String(v || '').trim())
    .filter(Boolean)
    .join(' ');
}

export function namesFromSubmission(sub) {
  const row = sub || {};
  let firstName = String(row.first_name || '').trim();
  let lastName = String(row.last_name || '').trim();
  if (!firstName && !lastName) {
    const split = splitFullName(row.name);
    firstName = split.firstName;
    lastName = split.lastName;
  }
  return {
    firstName,
    lastName,
    fullName: joinFullName(firstName, lastName) || String(row.name || '').trim()
  };
}
