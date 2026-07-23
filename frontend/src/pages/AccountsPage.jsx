import { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import AdminBrandedLayout from '../components/AdminBrandedLayout.jsx';
import AdminSettlementsPanel from '../components/AdminSettlementsPanel.jsx';
import { adminLogin } from '../services/api.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast, friendlyError } from '../components/ToastProvider.jsx';
import {
  ACCOUNTS_PORTAL_SLUG,
  clearAdminSession,
  getAdminToken,
  isAdminPortalConfigured,
  saveAdminSession
} from '../utils/adminAuth.js';

export default function AccountsPage({ portalSlug = ACCOUNTS_PORTAL_SLUG, portalLabel }) {
  const { t } = useTranslation();
  const toast = useToast();

  const [token, setToken] = useState(() => getAdminToken(portalSlug));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  function handleAuthError(err) {
    toast.showError(err, { fallback: t('admin.toasts.genericError') });
    if (err.status === 401) {
      clearAdminSession(portalSlug);
      setToken('');
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    if (!isAdminPortalConfigured(portalSlug)) {
      setError(t('accountsAdmin.portalNotConfigured'));
      return;
    }
    try {
      const data = await adminLogin({ username, password }, portalSlug);
      saveAdminSession({ token: data.token, role: data.role, portal_slug: data.portal_slug }, portalSlug);
      setToken(data.token);
      setUsername('');
      setPassword('');
      toast.success(t('admin.toasts.loginSuccess'));
    } catch (err) {
      setError(friendlyError(err, t('admin.toasts.genericError')));
    }
  }

  function handleLogout() {
    clearAdminSession(portalSlug);
    setToken('');
    toast.info(t('admin.toasts.loggedOut'));
  }

  if (!token) {
    return (
      <AdminBrandedLayout subtitle={t('accountsAdmin.pageTitle')} narrow>
        <form onSubmit={handleLogin} className="admin-login-card admin-rise w-full sm:p-8">
          <div className="text-center">
            <Lock className="mx-auto mb-4 text-emerald-700" size={48} />
            <p className="text-sm text-muted">{t('accountsAdmin.loginSubtitle')}</p>
          </div>
          {error ? (
            <div className="mt-4">
              <Alert>{error}</Alert>
            </div>
          ) : null}
          {!isAdminPortalConfigured(portalSlug) ? (
            <div className="mt-4">
              <Alert>{t('accountsAdmin.portalNotConfigured')}</Alert>
            </div>
          ) : null}
          <label className="mt-6 block">
            <span className="label">{t('admin.usernameLabel')}</span>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
          </label>
          <label className="mt-4 block">
            <span className="label">{t('admin.passwordLabel')}</span>
            <div className="relative">
              <input
                className="input pr-10"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          <button className="admin-report-btn-primary mt-6 w-full" type="submit" disabled={!isAdminPortalConfigured(portalSlug)}>
            {t('admin.loginButton')}
          </button>
        </form>
      </AdminBrandedLayout>
    );
  }

  return (
    <AdminBrandedLayout
      subtitle={portalLabel || t('accountsAdmin.pageTitle')}
      onLogout={handleLogout}
      logoutLabel={t('common.logout')}
    >
      <AdminSettlementsPanel token={token} portalSlug={portalSlug} onAuthError={handleAuthError} />
    </AdminBrandedLayout>
  );
}
