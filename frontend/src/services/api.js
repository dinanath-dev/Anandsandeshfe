import { getUserAuth } from '../utils/auth.js';
import { adminAuthHeaders, getAdminPortalId } from '../utils/adminAuth.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

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

async function request(path, options = {}) {
  const url = `${API_BASE_URL}${path}`;
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: withAuthHeaders(options.headers)
    });
  } catch (err) {
    const isTypeError = err instanceof TypeError;
    const failedFetch = isTypeError && String(err.message || '').toLowerCase().includes('fetch');
    const message = failedFetch
      ? 'Cannot reach the API. If this is the live site, the backend must allow your frontend origin in CORS (e.g. https://anandsandesh-fe.vercel.app) and VITE_API_BASE_URL must match the deployed API URL.'
      : err?.message || 'Network error.';
    const wrapped = new Error(message);
    wrapped.cause = err;
    throw wrapped;
  }
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
  return request('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export function getAdminMe(token) {
  return request('/admin/me', {
    headers: adminAuthHeaders(token)
  });
}

export function getSubmissions(token, status) {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  return request(`/admin/submissions${query}`, {
    headers: adminAuthHeaders(token)
  });
}

export function verifySubmission(token, id) {
  return request(`/admin/verify/${id}`, {
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
  return request(`/admin/subscriptions/magazine${buildFilterQuery(filters)}`, {
    headers: adminAuthHeaders(token)
  });
}

export function getBookSubscriptions(token, filters) {
  return request(`/admin/subscriptions/books${buildFilterQuery(filters)}`, {
    headers: adminAuthHeaders(token)
  });
}

export function getSubscriptionFilterMeta(token) {
  return request('/admin/subscriptions/meta', {
    headers: adminAuthHeaders(token)
  });
}

export async function downloadSubscriptionsPdf(token, filters = {}) {
  const url = `${API_BASE_URL}/admin/subscriptions/export/pdf${buildFilterQuery(filters)}`;
  const response = await fetch(url, { headers: adminAuthHeaders(token) });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'PDF download failed.');
  }
  const blob = await response.blob();
  const stamp = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `subscriptions-${stamp}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(link.href);
}

export function listAdminUsers(token, search) {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return request(`/admin/users${query}`, {
    headers: adminAuthHeaders(token)
  });
}

export function getAdminUser(token, userId) {
  return request(`/admin/users/${userId}`, {
    headers: adminAuthHeaders(token)
  });
}

export function updateAdminUser(token, userId, body) {
  return request(`/admin/users/${userId}`, {
    method: 'PUT',
    headers: { ...adminAuthHeaders(token), 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

export function updateAdminSubmission(token, submissionId, body) {
  return request(`/admin/submissions/${submissionId}`, {
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
