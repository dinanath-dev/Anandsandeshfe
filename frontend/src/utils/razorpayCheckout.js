/**
 * Shared Razorpay Standard Checkout helpers.
 * Mobile UPI (PhonePe / GPay / Paytm) switches apps; the checkout modal often
 * fires ondismiss before the payment handler. We debounce cancel and poll
 * server status when the tab becomes visible again.
 */

export function isMobileBrowser() {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent || ''
  );
}

/** Razorpay Indian contact: prefer 10 digits (Autopay / PhonePe are picky about +91). */
export function normalizeCheckoutContact(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  if (digits.length >= 10) return digits.slice(-10);
  return '';
}

export function buildCheckoutPrefill({ name = '', email = '', contact = '', preferUpi = false } = {}) {
  const prefill = {
    name: String(name || '').trim(),
    email: String(email || '').trim().toLowerCase(),
    contact: normalizeCheckoutContact(contact)
  };
  if (preferUpi && isMobileBrowser()) {
    prefill.method = 'upi';
  }
  return prefill;
}

/**
 * Open Razorpay checkout with mobile-safe lifecycle.
 *
 * @param {object} args
 * @param {object} args.options Razorpay options (without handler/modal — added here)
 * @param {(response: object) => void|Promise<void>} args.onSuccess
 * @param {(message: string) => void} [args.onFailure]
 * @param {() => void} [args.onCancel]
 * @param {() => Promise<boolean>} [args.pollPaid] resolve true when payment is verified server-side
 * @param {string} [args.cancelMessage]
 * @param {string} [args.failedMessage]
 */
export function openRazorpayCheckout({
  options,
  onSuccess,
  onFailure,
  onCancel,
  pollPaid,
  cancelMessage = 'Payment cancelled.',
  failedMessage = 'Payment failed.'
}) {
  if (typeof window === 'undefined' || typeof window.Razorpay !== 'function') {
    throw new Error('Razorpay checkout is not available.');
  }

  let settled = false;
  let pollTimer = null;
  let cancelTimer = null;
  let pollAttempts = 0;
  const maxPollAttempts = 24; // ~2 minutes at 5s
  const pollIntervalMs = 5000;
  const cancelGraceMs = isMobileBrowser() ? 12000 : 1500;

  function cleanup() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (cancelTimer) {
      clearTimeout(cancelTimer);
      cancelTimer = null;
    }
    document.removeEventListener('visibilitychange', onVisibility);
    window.removeEventListener('pageshow', onPageShow);
    window.removeEventListener('focus', onFocus);
  }

  function finishSuccess(response) {
    if (settled) return;
    settled = true;
    cleanup();
    void Promise.resolve(onSuccess(response)).catch(() => {});
  }

  function finishCancel() {
    if (settled) return;
    settled = true;
    cleanup();
    if (typeof onCancel === 'function') onCancel();
    else if (typeof onFailure === 'function') onFailure(cancelMessage);
  }

  function finishFailure(message) {
    if (settled) return;
    settled = true;
    cleanup();
    if (typeof onFailure === 'function') onFailure(message || failedMessage);
  }

  async function tryPollPaid() {
    if (settled || typeof pollPaid !== 'function') return false;
    try {
      const paid = await pollPaid();
      if (paid) {
        finishSuccess({ polled: true });
        return true;
      }
    } catch {
      /* keep polling */
    }
    return false;
  }

  function startPolling() {
    if (settled || typeof pollPaid !== 'function' || pollTimer) return;
    pollAttempts = 0;
    void tryPollPaid();
    pollTimer = setInterval(() => {
      pollAttempts += 1;
      void tryPollPaid().then((done) => {
        if (!done && pollAttempts >= maxPollAttempts) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
      });
    }, pollIntervalMs);
  }

  function scheduleCancel() {
    if (settled || cancelTimer) return;
    // On mobile, user often jumps to PhonePe — wait and poll before treating dismiss as cancel.
    cancelTimer = setTimeout(() => {
      cancelTimer = null;
      if (settled) return;
      startPolling();
      void tryPollPaid().then((paid) => {
        if (paid) return;
        // Keep polling until max attempts; only then treat as cancelled.
        const waitMs = isMobileBrowser() ? maxPollAttempts * pollIntervalMs : 0;
        setTimeout(() => {
          if (!settled) finishCancel();
        }, waitMs);
      });
    }, cancelGraceMs);
  }

  function onVisibility() {
    if (document.visibilityState !== 'visible' || settled) return;
    startPolling();
    void tryPollPaid();
  }

  function onPageShow() {
    if (settled) return;
    startPolling();
    void tryPollPaid();
  }

  function onFocus() {
    if (settled) return;
    void tryPollPaid();
  }

  document.addEventListener('visibilitychange', onVisibility);
  window.addEventListener('pageshow', onPageShow);
  window.addEventListener('focus', onFocus);

  const rzp = new window.Razorpay({
    ...options,
    retry: { enabled: true, max_count: 2 },
    remember_customer: false,
    handler(response) {
      finishSuccess(response);
    },
    modal: {
      ...(options.modal || {}),
      ondismiss() {
        scheduleCancel();
      },
      escape: false,
      confirm_close: true
    }
  });

  rzp.on('payment.failed', (resp) => {
    const e = resp?.error;
    const msg =
      (typeof e?.description === 'string' && e.description) ||
      (typeof e?.reason === 'string' && e.reason) ||
      failedMessage;
    // Still poll — sometimes UPI reports fail client-side then succeeds via webhook.
    startPolling();
    setTimeout(() => {
      void tryPollPaid().then((paid) => {
        if (!paid) finishFailure(msg);
      });
    }, isMobileBrowser() ? 8000 : 1500);
  });

  rzp.open();

  return {
    close() {
      try {
        rzp.close();
      } catch {
        /* ignore */
      }
      finishCancel();
    }
  };
}
