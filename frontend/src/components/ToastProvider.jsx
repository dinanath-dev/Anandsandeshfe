import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const TOAST_ICONS = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
};

const DEFAULT_DURATION = {
  success: 4000,
  info: 4500,
  warning: 6000,
  error: 7000
};

const MAX_VISIBLE = 4;

/**
 * Convert any thrown error / raw string into a clean, user-friendly message.
 * Strips technical noise (URLs, env vars, HTTP status, fetch/CORS internals)
 * so raw API/network details are never shown to end users.
 */
export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  const raw = (typeof error === 'string' ? error : error?.message || '').trim();
  if (!raw) return fallback;

  // Connectivity problems — always show a calm, actionable message.
  if (/cannot reach the api|failed to fetch|networkerror|network error|load failed|timeout|timed out/i.test(raw)) {
    return 'Unable to connect right now. Please check your internet and try again.';
  }

  // Session problems.
  if (/session expired|not signed in|sign in again|unauthori[sz]ed/i.test(raw)) {
    return 'Your session has expired. Please sign in again.';
  }

  // Messages that leak technical details — replace with the friendly fallback.
  if (/(https?:\/\/|vite_|localhost|127\.0\.0\.1|\/api\/|content-type|<html|status\s?\d{3}|json\.parse|undefined|\bnull\b|\[object)/i.test(raw)) {
    return fallback;
  }

  // Otherwise it's already a human-readable backend/validation message.
  return raw;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, options = {}) => {
    const text = typeof message === 'string' ? message.trim() : '';
    if (!text) return null;

    const type = options.type || 'info';
    idRef.current += 1;
    const id = `${Date.now()}-${idRef.current}`;
    const duration = options.duration ?? DEFAULT_DURATION[type] ?? 5000;

    setToasts((current) => {
      const next = [...current, { id, message: text, title: options.title || '', type }];
      return next.slice(-MAX_VISIBLE);
    });

    if (duration > 0) {
      window.setTimeout(() => dismissToast(id), duration);
    }
    return id;
  }, [dismissToast]);

  const api = useMemo(() => {
    const withType = (type) => (message, options = {}) => showToast(message, { ...options, type });
    return {
      showToast,
      dismissToast,
      success: withType('success'),
      error: withType('error'),
      warning: withType('warning'),
      info: withType('info'),
      /** Show a sanitized error toast from a thrown error or string. */
      showError: (error, options = {}) =>
        showToast(friendlyError(error, options.fallback), { ...options, type: 'error' })
    };
  }, [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toasts.length ? (
        <div className="toast-host" role="region" aria-label="Notifications">
          {toasts.map((toast) => {
            const Icon = TOAST_ICONS[toast.type] || Info;
            return (
              <div
                key={toast.id}
                className={`toast toast--${toast.type}`}
                role={toast.type === 'error' ? 'alert' : 'status'}
                aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
              >
                <span className="toast__icon" aria-hidden>
                  <Icon size={20} strokeWidth={2.25} />
                </span>
                <div className="toast__body">
                  {toast.title ? <p className="toast__title">{toast.title}</p> : null}
                  <p className="toast__message">{toast.message}</p>
                </div>
                <button
                  type="button"
                  className="toast__close"
                  onClick={() => dismissToast(toast.id)}
                  aria-label="Dismiss notification"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
