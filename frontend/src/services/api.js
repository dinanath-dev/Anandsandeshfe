import { getUserAuth } from '../utils/auth.js';
import { adminAuthHeaders, getAdminPortalId } from '../utils/adminAuth.js';

const PRODUCTION_API_DIRECT = 'https://api.anandsandeshkaryalay.online/api';

/** Staff portal API — not named `/admin` (many ad blockers block that path in fetch URLs). */
const STAFF = '/staff';

function isDeployedFrontendHost(hostname) {
  const host = String(hostname || '').toLowerCase();
  return (
    host.endsWith('.vercel.app') ||
    host === 'anandsandeshkaryalay.online' ||
    host === 'www.anandsandeshkaryalay.online'
  );
}

/** Ordered list of API bases — direct backend only (no /api proxy; it breaks PDF exports). */
function resolveApiBaseUrls() {
  const fromEnv = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');
  const envBase = fromEnv
    ? fromEnv.endsWith('/api')
      ? fromEnv
      : `${fromEnv}/api`
    : 'http://localhost:5000/api';

  if (typeof window !== 'undefined' && isDeployedFrontendHost(window.location.hostname)) {
    if (envBase && !/localhost|127\.0\.0\.1/i.test(envBase)) return [envBase];
    return [PRODUCTION_API_DIRECT];
  }

  return [envBase];
}

let preferredApiBase = resolveApiBaseUrls()[0];

function orderApiBases() {
  const bases = resolveApiBaseUrls();
  if (preferredApiBase && bases.includes(preferredApiBase)) {
    return [preferredApiBase, ...bases.filter((b) => b !== preferredApiBase)];
  }
  return bases;
}

function isHtmlResponse(response) {
  const type = String(response.headers.get('content-type') || '').toLowerCase();
  return type.includes('text/html');
}

function networkErrorMessage(url) {
  const isLocal = /localhost|127\.0\.0\.1/i.test(url);
  if (isLocal) {
    return `Cannot reach the API (${url}). Start the backend with "npm run dev" on port 5000.`;
  }
  return `Cannot reach the API (${url}). The server may be busy — wait a moment and try again. If this keeps happening, refresh and sign in again.`;
}

/** `/staff` avoids ad-blockers; fall back to `/admin` until backend is redeployed with both mounts. */
function staffPathVariants(path) {
  if (path.startsWith(`${STAFF}/`)) {
    return [path, path.replace(`${STAFF}/`, '/admin/')];
  }
  return [path];
}

/** Merge caller headers with Bearer token; uses Headers so casing / merging matches fetch rules. */
function withAuthHeaders(headersInit) {
  const headers = new Headers(headersInit ?? undefined);
  if (!headers.has('Authorization')) {
    try {
      const token = getUserAuth()?.token;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    } catch {
      // Ignore local auth parsing issues and continue without auth headers.
    }
  }
  return headers;
}

async function apiFetch(path, options = {}) {
  const bases = orderApiBases();
  const paths = staffPathVariants(path);
  let lastError;
  let lastUrl = bases[0] ? `${bases[0]}${path}` : path;
  let sawHtml = false;
  let lastResponse;

  for (const pathTry of paths) {
    for (const base of bases) {
      const url = `${base}${pathTry}`;
      lastUrl = url;
      try {
        const response = await fetch(url, {
          ...options,
          headers: withAuthHeaders(options.headers)
        });
        if (isHtmlResponse(response)) {
          sawHtml = true;
          continue;
        }
        if (response.status === 404 && pathTry.startsWith(`${STAFF}/`) && paths.length > 1) {
          lastResponse = response;
          continue;
        }
        preferredApiBase = base;
        return { response, url, base };
      } catch (err) {
        lastError = err;
      }
    }
  }

  if (lastResponse) {
    return { response: lastResponse, url: lastUrl, base: bases[0] };
  }

  if (sawHtml) {
    throw new Error(
      `Cannot reach the API (${lastUrl}). The server returned a web page instead of API data — check VITE_API_BASE_URL on the frontend project.`
    );
  }

  const isTypeError = lastError instanceof TypeError;
  const failedFetch = isTypeError && String(lastError?.message || '').toLowerCase().includes('fetch');
  const message = failedFetch ? networkErrorMessage(lastUrl) : lastError?.message || 'Network error.';
  const wrapped = new Error(message);
  wrapped.cause = lastError;
  throw wrapped;
}

async function request(path, options = {}) {
  const { response, url } = await apiFetch(path, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    let message = typeof payload.message === 'string' ? payload.message.trim() : '';
    if (response.status === 401) {
      if (path.startsWith('/payment/')) {
        message =
          message ||
          'Payment routes need a user JWT (same as /auth/me): sign in with email OTP or password on this site. Admin tokens and Razorpay keys are not valid here.';
      } else {
        message = message || 'Session expired or not signed in. Please sign in again.';
      }
    }
    if (!message) message = 'Request failed. Please try again.';
    const err = new Error(message);
    err.status = response.status;
    err.path = path;
    throw err;
  }

  return payload;
}

export function getMyFormSubmission() {
  return request('/form/me');
}

export function updateMyAddress(body) {
  return request('/form/address', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export function requestEmailChange(newEmail) {
  return request('/auth/change-email/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_email: newEmail })
  });
}

export function verifyEmailChange({ new_email, otp }) {
  return request('/auth/change-email/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_email, otp })
  });
}

/**
 * Offline → online: find a legacy row by 10-digit mobile or subscriber number.
 * Auth: user JWT. Backend returns unlinked / offline-imported records.
 */
export function lookupLegacyForm({ mobile, subscriber_no }) {
  const body = {};
  if (mobile) body.mobile = mobile;
  if (subscriber_no) body.subscriber_no = subscriber_no;
  return request('/form/lookup-legacy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/** @deprecated Use lookupLegacyForm */
export function lookupLegacyFormByMobile({ mobile }) {
  return lookupLegacyForm({ mobile });
}

/**
 * Attach a legacy submission to the current user. Auth: user JWT.
 * Body always includes `mobile`; include `legacyClaimKey` / `rowId` / `subscriberNo` when the lookup returned `matches[]`.
 */
export function claimLegacyForm(payload) {
  return request('/form/claim-legacy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function submitUserForm(formData) {
  return request('/form', {
    method: 'POST',
    body: formData
  });
}

export function requestEmailOtp(payload) {
  return request('/auth/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function verifyEmailOtp(payload) {
  return request('/auth/verify-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function loginWithPassword(payload) {
  return request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function resetPasswordWithOtp(payload) {
  return request('/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

export function getCurrentUser() {
  return request('/auth/me');
}

export function adminLogin({ email, password }) {
  const body = { email, password };
  const portalId = getAdminPortalId();
  if (portalId) body.portal_id = portalId;
  return request(`${STAFF}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export function getAdminMe(token) {
  return request(`${STAFF}/me`, {
    headers: adminAuthHeaders(token)
  });
}

export function getSubmissions(token, { status, audience, page, limit } = {}) {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (audience) params.set('audience', audience);
  if (page != null) params.set('page', String(page));
  if (limit != null) params.set('limit', String(limit));
  const query = params.toString();
  return request(`${STAFF}/submissions${query ? `?${query}` : ''}`, {
    headers: adminAuthHeaders(token)
  });
}

export function verifySubmission(token, id) {
  return request(`${STAFF}/verify/${id}`, {
    method: 'PUT',
    headers: adminAuthHeaders(token)
  });
}

function buildFilterQuery(filters = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value != null && String(value).trim() !== '') params.set(key, String(value).trim());
  }
  const qs = params.toString();
  return qs ? `?${qs}` : '';
}

export function getMagazineSubscriptions(token, filters) {
  return request(`${STAFF}/subscriptions/magazine${buildFilterQuery(filters)}`, {
    headers: adminAuthHeaders(token)
  });
}

export function getBookSubscriptions(token, filters) {
  return request(`${STAFF}/subscriptions/books${buildFilterQuery(filters)}`, {
    headers: adminAuthHeaders(token)
  });
}

export function getSubscriptionFilterMeta(token) {
  return request(`${STAFF}/subscriptions/meta`, {
    headers: adminAuthHeaders(token)
  });
}

export async function downloadSubscriptionsPdf(token, filters = {}) {
  const stamp = new Date().toISOString().slice(0, 10);
  await downloadAdminFile(token, `${STAFF}/subscriptions/export/pdf`, filters, `subscriptions-${stamp}.pdf`);
}

async function downloadAdminFile(token, path, filters, filename) {
  const pathWithQuery = `${path}${buildFilterQuery(filters)}`;
  const { response } = await apiFetch(pathWithQuery, { headers: adminAuthHeaders(token) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    if (response.status === 401) {
      throw Object.assign(new Error(payload.message || 'Session expired. Please sign in again.'), {
        status: 401
      });
    }
    throw new Error(payload.message || `Download failed (${response.status}).`);
  }
  const blob = await response.blob();
  if (!blob.size) {
    throw new Error('Download failed — the file was empty.');
  }
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export async function downloadSubmissionsPdf(token, filters = {}) {
  const stamp = new Date().toISOString().slice(0, 10);
  await downloadAdminFile(token, `${STAFF}/submissions/export/pdf`, filters, `subscribers-${stamp}.pdf`);
}

export async function downloadSubmissionsExcel(token, filters = {}) {
  const stamp = new Date().toISOString().slice(0, 10);
  await downloadAdminFile(token, `${STAFF}/submissions/export/excel`, filters, `subscribers-${stamp}.csv`);
}

export function listAdminUsers(token, filters = {}) {
  const params = new URLSearchParams();
  const search = typeof filters === 'string' ? filters : filters.search;
  if (search) params.set('search', search);
  if (filters && typeof filters === 'object') {
    if (filters.is_verified) params.set('is_verified', filters.is_verified);
    if (filters.audience) params.set('audience', filters.audience);
    if (filters.min_subscriber) params.set('min_subscriber', String(filters.min_subscriber));
    if (filters.max_subscriber) params.set('max_subscriber', String(filters.max_subscriber));
  }
  const query = params.toString();
  return request(`${STAFF}/users${query ? `?${query}` : ''}`, {
    headers: adminAuthHeaders(token)
  });
}

export function getAdminUser(token, userId) {
  return request(`${STAFF}/users/${userId}`, {
    headers: adminAuthHeaders(token)
  });
}

export function updateAdminUser(token, userId, body) {
  return request(`${STAFF}/users/${userId}`, {
    method: 'PUT',
    headers: { ...adminAuthHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export function updateAdminSubmission(token, submissionId, body) {
  return request(`${STAFF}/submissions/${submissionId}`, {
    method: 'PUT',
    headers: { ...adminAuthHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export function getBooks() {
  return request('/books');
}

export function createBookOrder(body) {
  return request('/books/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export function getBookOrder(orderId) {
  return request(`/books/orders/${orderId}`);
}

/** Razorpay one-time order (books or legacy). Auth: Bearer user JWT. */
export function createOrder(body) {
  return request('/payment/create-order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/** Verify one-time payment after Razorpay modal. Auth: Bearer user JWT. */
export function verifyPayment(body) {
  return request('/payment/verify-payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/** Razorpay recurring: create subscription. Auth: Bearer user JWT only (not admin). */
export function createSubscription({ plan_id, total_count, submission_id }) {
  const body = { submission_id };
  if (plan_id) body.plan_id = plan_id;
  if (total_count != null) body.total_count = total_count;
  return request('/payment/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

/** Verify subscription payment after Checkout. Auth: Bearer user JWT only (not admin). */
export function verifySubscriptionPayment(body) {
  return request('/payment/verify-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}
