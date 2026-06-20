/**
 * Admin session — stored in sessionStorage under a non-obvious key.
 * Token is base64-wrapped; still visible in DevTools while the tab is open.
 * Never put admin passwords or portal ids in the client bundle beyond VITE_ADMIN_PORTAL_ID.
 */
const STORAGE_KEY = 'ss_mk_ctx';
const LEGACY_KEY = 'adminToken';

const PORTAL_ID = String(import.meta.env.VITE_ADMIN_PORTAL_ID || '').trim();

function readRaw() {
  try {
    const legacy = sessionStorage.getItem(LEGACY_KEY) || localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      saveAdminSession({ token: legacy, role: 'admin' });
      sessionStorage.removeItem(LEGACY_KEY);
      localStorage.removeItem(LEGACY_KEY);
    }
    return sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function decodeSession(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(atob(raw));
    if (parsed?.v === 1 && parsed?.t) {
      return { token: parsed.t, role: parsed.r || 'admin' };
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function getAdminPortalId() {
  return PORTAL_ID;
}

export function isAdminPortalConfigured() {
  return Boolean(PORTAL_ID);
}

export function getAdminSession() {
  return decodeSession(readRaw());
}

export function getAdminToken() {
  return getAdminSession()?.token || '';
}

export function getAdminRole() {
  return getAdminSession()?.role || '';
}

export function isAdminAuthenticated() {
  return Boolean(getAdminToken());
}

export function isSuperAdmin() {
  return getAdminRole() === 'super_admin';
}

export function saveAdminSession({ token, role }) {
  const payload = btoa(JSON.stringify({ v: 1, t: token, r: role || 'admin' }));
  sessionStorage.setItem(STORAGE_KEY, payload);
}

export function clearAdminSession() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem(LEGACY_KEY);
}

export function adminAuthHeaders(token = getAdminToken()) {
  const headers = { Authorization: `Bearer ${token}` };
  if (PORTAL_ID) headers['X-Portal-Id'] = PORTAL_ID;
  return headers;
}
