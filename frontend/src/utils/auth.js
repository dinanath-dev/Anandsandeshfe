/**
 * User session in localStorage. We read/write both keys so older builds (`ssdnUserAuth`)
 * and setups that only have `samUserAuth` (e.g. manual env) still send the same JWT on API calls.
 */
const AUTH_STORAGE_PRIMARY = 'samUserAuth';
const AUTH_STORAGE_LEGACY = 'ssdnUserAuth';
const OTP_STORAGE_KEY = 'ssdnPendingAuth';

function readAuthRaw() {
  try {
    let raw = localStorage.getItem(AUTH_STORAGE_PRIMARY);
    if (!raw) raw = localStorage.getItem(AUTH_STORAGE_LEGACY);
    return raw;
  } catch {
    return null;
  }
}

export function isUserAuthenticated() {
  try {
    const raw = readAuthRaw();
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.token && parsed?.user?.email);
  } catch {
    return false;
  }
}

export function getUserAuth() {
  try {
    const raw = readAuthRaw();
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveUserAuth(payload) {
  const serialized = JSON.stringify(payload);
  localStorage.setItem(AUTH_STORAGE_PRIMARY, serialized);
  localStorage.setItem(AUTH_STORAGE_LEGACY, serialized);
}

export function clearUserAuth() {
  localStorage.removeItem(AUTH_STORAGE_PRIMARY);
  localStorage.removeItem(AUTH_STORAGE_LEGACY);
}

export function getUserToken() {
  return getUserAuth()?.token || '';
}

export function savePendingOtp(payload) {
  sessionStorage.setItem(OTP_STORAGE_KEY, JSON.stringify(payload));
}

export function getPendingOtp() {
  try {
    const raw = sessionStorage.getItem(OTP_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingOtp() {
  sessionStorage.removeItem(OTP_STORAGE_KEY);
}
