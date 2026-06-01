import { Languages } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';

const OPTIONS = [
  { code: 'en', short: 'EN', long: 'English' },
  { code: 'hi', short: 'हिं', long: 'हिन्दी' }
];

/**
 * Floating top-left segmented control to switch between English and Hindi.
 * Persists choice via the LanguageProvider (localStorage).
 */
export default function LanguageToggle() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <div
      className="fixed left-3 top-[max(0.75rem,env(safe-area-inset-top)+0.5rem)] z-[70] flex items-center gap-1.5 rounded-full border border-white/40 bg-white/80 p-1 shadow-md ring-1 ring-black/5 backdrop-blur-md sm:left-6 sm:top-5"
      role="group"
      aria-label={t('common.languageLabel')}
    >
      <Languages
        size={16}
        className="ml-1.5 hidden text-[#0d2d7f] sm:inline"
        aria-hidden
      />
      {OPTIONS.map((opt) => {
        const active = language === opt.code;
        return (
          <button
            key={opt.code}
            type="button"
            onClick={() => setLanguage(opt.code)}
            aria-pressed={active}
            aria-label={opt.long}
            title={opt.long}
            className={`min-h-8 rounded-full px-3 py-1 text-xs font-bold transition sm:text-sm ${
              active
                ? 'bg-[#0d2d7f] text-white shadow-sm'
                : 'text-[#0d2d7f] hover:bg-[#0d2d7f]/10'
            }`}
          >
            {opt.short}
          </button>
        );
      })}
    </div>
  );
}
