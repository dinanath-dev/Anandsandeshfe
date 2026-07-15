/**
 * Short-lived guest_book JWT from POST /books/orders (no user session).
 * Kept in sessionStorage keyed by book order id.
 */
const STORAGE_PREFIX = 'asGuestBookToken:';

function storageKey(orderId) {
  return `${STORAGE_PREFIX}${String(orderId || '').trim()}`;
}

export function saveGuestBookToken(orderId, token) {
  const id = String(orderId || '').trim();
  const value = String(token || '').trim();
  if (!id || !value) return;
  try {
    sessionStorage.setItem(storageKey(id), value);
  } catch {
    /* ignore quota / private mode */
  }
}

export function getGuestBookToken(orderId) {
  const id = String(orderId || '').trim();
  if (!id) return '';
  try {
    return sessionStorage.getItem(storageKey(id)) || '';
  } catch {
    return '';
  }
}

export function clearGuestBookToken(orderId) {
  const id = String(orderId || '').trim();
  if (!id) return;
  try {
    sessionStorage.removeItem(storageKey(id));
  } catch {
    /* ignore */
  }
}
