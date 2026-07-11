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

function slugFromSubdomainHost(host) {
  const parts = host.split('.');
  if (parts.length < 2) return null;
  return normalizeAdminHostSlug(parts[0]);
}

/**
 * Any staff slug from subdomain — production (*.anandsandeshkaryalay.online) or local (*.localhost).
 * Must match a row in admin_portals (validated via GET /api/staff/portals/:slug).
 */
export function detectAdminSlugFromHost(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  const host = String(hostname || '').trim().toLowerCase();
  if (!host || host === 'localhost') return null;

  if (host.endsWith('.localhost')) {
    return slugFromSubdomainHost(host);
  }

  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return null;

  return slugFromSubdomainHost(host);
}

export function booksOnlyForRole(role) {
  return role === 'books_admin';
}
