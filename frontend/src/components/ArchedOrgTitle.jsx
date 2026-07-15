import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function ArchedOrgTitle({ compact = false }) {
  const { t } = useTranslation();

  return (
    <div
      className={
        compact
          ? 'mx-auto mt-1 w-full max-w-none px-2 text-center sm:px-3'
          : 'mx-auto mt-2 w-full max-w-none px-2 text-center sm:px-4 lg:px-6'
      }
    >
      <h1
        className={
          compact
            ? 'mx-auto max-w-[min(100%,64rem)] text-pretty text-sm font-black uppercase leading-tight tracking-[0.05em] text-[#1a301a] sm:text-xl sm:tracking-[0.07em] md:text-2xl'
            : 'mx-auto max-w-[min(100%,72rem)] text-pretty text-sm font-black uppercase leading-tight tracking-[0.05em] text-[#1a301a] sm:text-xl sm:tracking-[0.07em] md:text-2xl lg:text-3xl xl:text-[2.15rem] xl:tracking-[0.08em]'
        }
        style={{ textShadow: '0 1px 0 #ffffff, 0 2px 6px rgba(26, 48, 26, 0.12)' }}
      >
        {t('layout.orgTitle')}
      </h1>
      <address
        className={
          compact
            ? 'not-italic mx-auto mt-2 w-full max-w-4xl space-y-0.5 text-sm font-semibold leading-snug text-[#1a4a2e] sm:text-base'
            : 'not-italic mx-auto mt-3 w-full max-w-4xl space-y-1 text-sm font-semibold leading-snug text-[#1a4a2e] sm:text-base md:text-lg'
        }
      >
        <p className="text-pretty">
          {t('layout.addressLine1')}, {t('layout.addressLine2')}
        </p>
        <p>{t('layout.addressLine3')}</p>
      </address>
    </div>
  );
}
