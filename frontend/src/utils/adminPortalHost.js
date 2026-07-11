/** Subdomains that must never be treated as staff portal slugs. */
const RESERVED_HOST_SLUGS = new Set([
  'www',
  'api',
  'mail',
  'ftp',
  'cdn',
  'static',
  'app',
  'dev',
  'staging'
]);

/** Production apex hosts — never staff portal subdomains. */
const PRODUCTION_APEX_HOSTS = new Set(['anandsandeshkaryalay.online', 'www.anandsandeshkaryalay.online']);

const PRODUCTION_STAFF_ROOT = 'anandsandeshkaryalay.online';

const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]{0,62}[a-z0-9])?$/;

export function normalizeAdminHostSlug(value) {
  const raw = String(value || '')
    .trim()
    .toLowerCase();
  if (raw === 'book') return 'books';
  if (!raw || RESERVED_HOST_SLUGS.has(raw)) return null;
  if (!SLUG_PATTERN.test(raw)) return null;
  return raw;
}

function slugFromLocalhostHost(host) {
  if (!host.endsWith('.localhost')) return null;
  const parts = host.split('.');
  if (parts.length < 2) return null;
  return normalizeAdminHostSlug(parts[0]);
}

function slugFromProductionHost(host) {
  if (PRODUCTION_APEX_HOSTS.has(host)) return null;
  if (!host.endsWith(`.${PRODUCTION_STAFF_ROOT}`)) return null;

  const prefix = host.slice(0, -(PRODUCTION_STAFF_ROOT.length + 1));
  if (!prefix || prefix.includes('.')) return null;

  return normalizeAdminHostSlug(prefix);
}

/**
 * Any staff slug from subdomain — production (*.anandsandeshkaryalay.online) or local (*.localhost).
 * Must match a row in admin_portals (validated via GET /api/staff/portals/:slug).
 */
export function detectAdminSlugFromHost(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host || host === 'localhost') return null;

  if (host.endsWith('.localhost')) {
    return slugFromLocalhostHost(host);
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  // Vercel preview URLs are not staff portals.
  if (host.endsWith('.vercel.app')) return null;

  return slugFromProductionHost(host);
}

export function booksOnlyForRole(role) {
  return role === 'books_admin';
}
