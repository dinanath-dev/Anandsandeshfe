/**
 * User session in sessionStorage (cleared when the browser tab closes).
 * Tokens are still visible in DevTools while the tab is open — never put secrets in the client bundle.
 */
const AUTH_STORAGE_PRIMARY = 'samUserAuth';
const AUTH_STORAGE_LEGACY = 'ssdnUserAuth';
const OTP_STORAGE_KEY = 'ssdnPendingAuth';

function readFromSession(key) {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToSession(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* ignore quota / private mode */
  }
}

function removeFromSession(key) {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** One-time migration from older builds that stored auth in localStorage. */
function migrateLegacyLocalAuth() {
  try {
    for (const key of [AUTH_STORAGE_PRIMARY, AUTH_STORAGE_LEGACY]) {
      const legacy = localStorage.getItem(key);
      if (legacy && !readFromSession(key)) {
        writeToSession(key, legacy);
      }
      localStorage.removeItem(key);
    }
  } catch {
    /* ignore */
  }
}

function readAuthRaw() {
  migrateLegacyLocalAuth();
  try {
    let raw = readFromSession(AUTH_STORAGE_PRIMARY);
    if (!raw) raw = readFromSession(AUTH_STORAGE_LEGACY);
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
  writeToSession(AUTH_STORAGE_PRIMARY, serialized);
  writeToSession(AUTH_STORAGE_LEGACY, serialized);
}

export function clearUserAuth() {
  removeFromSession(AUTH_STORAGE_PRIMARY);
  removeFromSession(AUTH_STORAGE_LEGACY);
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
