import { getUserAuth } from '../utils/auth.js';

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

/**
 * Offline → online: find a legacy row by 10-digit mobile (not yet linked to this account).
 * Auth: user JWT. Backend should only return unlinked / offline-imported records.
 */
export function lookupLegacyFormByMobile({ mobile }) {
  return request('/form/lookup-legacy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mobile })
  });
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
  return request('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
}

export function getSubmissions(token, status) {
  const query = status && status !== 'all' ? `?status=${status}` : '';
  return request(`/admin/submissions${query}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function verifySubmission(token, id) {
  return request(`/admin/verify/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${token}` }
  });
}

/** Razorpay recurring: create subscription. Auth: Bearer user JWT only (not admin). */
export function createSubscription({ plan_id, total_count }) {
  return request('/payment/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan_id, total_count })
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
