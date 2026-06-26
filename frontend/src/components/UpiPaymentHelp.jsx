import { Monitor, Smartphone } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function UpiPaymentHelp() {
  const { t } = useTranslation();

  return (
    <div className="mt-4 rounded-xl border border-[#0d2d7f]/15 bg-[#f8faff] px-4 py-3 text-left text-sm text-ink">
      <p className="font-bold text-primary">{t('payment.upiHelp.title')}</p>
      <ul className="mt-2 space-y-2 text-muted">
        <li className="flex gap-2">
          <Monitor size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          <span>{t('payment.upiHelp.desktop')}</span>
        </li>
        <li className="flex gap-2">
          <Smartphone size={16} className="mt-0.5 shrink-0 text-primary" aria-hidden />
          <span>{t('payment.upiHelp.mobile')}</span>
        </li>
      </ul>
      <p className="mt-2 text-xs text-muted">{t('payment.upiHelp.note')}</p>
    </div>
  );
}
