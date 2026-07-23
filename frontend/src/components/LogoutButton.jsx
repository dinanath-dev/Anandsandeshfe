import { LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { clearPendingOtp, clearUserAuth } from '../utils/auth.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from './ToastProvider.jsx';

/** Fixed top-right logout control on authenticated member pages. */
export default function LogoutButton({ className = '' }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { info: toastInfo } = useToast();

  function handleLogout() {
    clearUserAuth();
    clearPendingOtp();
    toastInfo(t('common.loggedOut'));
    navigate('/', { replace: true });
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className={`btn-secondary fixed right-3 top-[max(0.75rem,env(safe-area-inset-top)+0.5rem)] z-[60] inline-flex min-h-10 items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-semibold shadow-md sm:right-6 sm:top-5 sm:px-4 ${className}`.trim()}
    >
      <LogOut size={18} aria-hidden /> {t('common.logout')}
    </button>
  );
}
