import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, options = {}) => {
    if (!message) return;
    const id = Date.now();
    setToast({ id, message, type: options.type || 'info' });
    window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, options.duration ?? 6500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <div className="toast-host" role="status" aria-live="polite" aria-atomic="true">
          <div className={`toast toast--${toast.type}`}>{toast.message}</div>
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
