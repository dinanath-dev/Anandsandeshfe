/**
 * Admin session — one session per portal slug (from subdomain or path).
 * Slug must exist in admin_portals (DB); add new portals there only — no env passwords needed.
 */
import { detectAdminSlugFromHost, normalizeAdminHostSlug } from './adminPortalHost.js';

const LEGACY_KEY = 'adminToken';

/** Default slugs for path-based routes (/admin, /books-admin). */
export const ADMIN_PORTAL_SLUG = 'admin';
export const BOOKS_PORTAL_SLUG = 'books';

/** @deprecated use ADMIN_PORTAL_SLUG */
export const ADMIN_PORTAL = ADMIN_PORTAL_SLUG;
/** @deprecated use BOOKS_PORTAL_SLUG */
export const BOOKS_ADMIN_PORTAL = BOOKS_PORTAL_SLUG;

function resolveSlug(portalSlug = ADMIN_PORTAL_SLUG) {
  const fromHost = detectAdminSlugFromHost();
  if (fromHost) return fromHost;
  return normalizeAdminHostSlug(portalSlug) || ADMIN_PORTAL_SLUG;
}

function storageKey(slug) {
  return `ss_adm_${resolveSlug(slug)}`;
}

function readRaw(portalSlug = ADMIN_PORTAL_SLUG) {
  const key = storageKey(portalSlug);
  try {
    const legacy = sessionStorage.getItem(LEGACY_KEY) || localStorage.getItem(LEGACY_KEY);
    if (legacy && resolveSlug(portalSlug) === ADMIN_PORTAL_SLUG) {
      saveAdminSession({ token: legacy, role: 'admin', portal_slug: ADMIN_PORTAL_SLUG }, ADMIN_PORTAL_SLUG);
      sessionStorage.removeItem(LEGACY_KEY);
      localStorage.removeItem(LEGACY_KEY);
    }
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function decodeSession(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(atob(raw));
    if (parsed?.v === 1 && parsed?.t) {
      return {
        token: parsed.t,
        role: parsed.r || 'admin',
        portal_slug: parsed.s || null
      };
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function getPortalSlug(portalSlug = ADMIN_PORTAL_SLUG) {
  return resolveSlug(portalSlug);
}

export function getAdminPortalId(portalSlug = ADMIN_PORTAL_SLUG) {
  return String(import.meta.env.VITE_ADMIN_PORTAL_ID || '').trim();
}

export function isAdminPortalConfigured(portalSlug = ADMIN_PORTAL_SLUG) {
  if (detectAdminSlugFromHost()) return true;
  if (resolveSlug(portalSlug)) return true;
  return Boolean(getAdminPortalId(portalSlug));
}

export function getAdminSession(portalSlug = ADMIN_PORTAL_SLUG) {
  return decodeSession(readRaw(portalSlug));
}

export function getAdminToken(portalSlug = ADMIN_PORTAL_SLUG) {
  return getAdminSession(portalSlug)?.token || '';
}

export function getAdminRole(portalSlug = ADMIN_PORTAL_SLUG) {
  return getAdminSession(portalSlug)?.role || '';
}

export function getAdminPortalSlug(portalSlug = ADMIN_PORTAL_SLUG) {
  const sessionSlug = getAdminSession(portalSlug)?.portal_slug;
  if (sessionSlug) return normalizeAdminHostSlug(sessionSlug);
  return resolveSlug(portalSlug);
}

export function isAdminAuthenticated(portalSlug = ADMIN_PORTAL_SLUG) {
  return Boolean(getAdminToken(portalSlug));
}

export function isSuperAdmin(portalSlug = ADMIN_PORTAL_SLUG) {
  return getAdminRole(portalSlug) === 'super_admin';
}

export function isBooksAdminRole(portalSlug = ADMIN_PORTAL_SLUG) {
  return getAdminRole(portalSlug) === 'books_admin';
}

export function saveAdminSession({ token, role, portal_slug }, portalSlug = ADMIN_PORTAL_SLUG) {
  const slug = normalizeAdminHostSlug(portal_slug) || resolveSlug(portalSlug);
  const payload = btoa(JSON.stringify({ v: 1, t: token, r: role || 'admin', s: slug }));
  sessionStorage.setItem(storageKey(slug), payload);
}

export function clearAdminSession(portalSlug = ADMIN_PORTAL_SLUG) {
  sessionStorage.removeItem(storageKey(portalSlug));
  if (resolveSlug(portalSlug) === ADMIN_PORTAL_SLUG) {
    sessionStorage.removeItem(LEGACY_KEY);
    localStorage.removeItem(LEGACY_KEY);
  }
}

export function adminAuthHeaders(token = getAdminToken(), portalSlug = ADMIN_PORTAL_SLUG) {
  const headers = { Authorization: `Bearer ${token}` };
  const slug = getAdminPortalSlug(portalSlug);
  if (slug) {
    headers['X-Portal-Slug'] = slug;
    return headers;
  }
  const portalId = getAdminPortalId(portalSlug);
  if (portalId) headers['X-Portal-Id'] = portalId;
  return headers;
}
