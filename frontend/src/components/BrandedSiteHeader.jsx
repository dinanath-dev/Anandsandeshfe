import ArchedOrgTitle from './ArchedOrgTitle.jsx';
import anandpurLogo from '../assets/Shri_AnandpurDham_Logo.png';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function BrandedSiteHeader({ subtitle, compact = false }) {
  const { t } = useTranslation();

  return (
    <header
      className={
        compact
          ? 'donation-header relative z-[1] w-full overflow-hidden px-3 pb-1 pt-3 text-center sm:px-5 sm:pt-4'
          : 'donation-header relative z-[1] w-full overflow-hidden px-3 pb-3 pt-4 text-center sm:px-6 sm:pb-4 sm:pt-6 lg:px-10'
      }
    >
      <p
        className={
          compact
            ? 'donation-mantra relative z-[2] mx-auto flex w-full items-center justify-center gap-3 font-devanagari text-xl font-bold sm:gap-4 sm:text-2xl md:text-3xl'
            : 'donation-mantra relative z-[2] mx-auto flex w-full max-w-none items-center justify-center gap-3 font-devanagari text-xl font-bold sm:gap-4 sm:text-2xl md:text-3xl lg:text-[2rem]'
        }
      >
        <span className="donation-mantra-flor select-none text-lg sm:text-xl md:text-2xl" aria-hidden>
          ✿
        </span>
        <span>{t('layout.mantra')}</span>
        <span className="donation-mantra-flor select-none text-lg sm:text-xl md:text-2xl" aria-hidden>
          ✿
        </span>
      </p>

      <div
        className={
          compact
            ? 'relative z-[2] mx-auto mt-1 w-full px-2 leading-none sm:px-3'
            : 'relative z-[2] mx-auto mt-1 w-full max-w-none px-2 leading-none sm:px-4 lg:px-8'
        }
      >
        <ArchedOrgTitle compact={compact} />
      </div>

      <figure
        className={
          compact
            ? 'donation-seal relative z-[2] mx-auto -mt-1 flex justify-center sm:-mt-0.5'
            : 'donation-seal relative z-[2] mx-auto -mt-1 flex justify-center sm:-mt-0.5'
        }
      >
        <img
          src={anandpurLogo}
          alt={t('layout.logoAlt')}
          className={
            compact
              ? 'h-auto w-[min(72vw,9.5rem)] object-contain drop-shadow-[0_6px_20px_rgba(15,80,40,0.2)] sm:w-[min(55vw,11rem)]'
              : 'h-auto w-[min(92vw,11rem)] object-contain drop-shadow-[0_6px_20px_rgba(15,80,40,0.2)] sm:w-[min(88vw,13.5rem)] lg:w-[min(88vw,15rem)]'
          }
          width={400}
          height={400}
          decoding="async"
        />
      </figure>

      {subtitle ? (
        <h2
          className={
            compact
              ? 'donation-subtitle relative z-[2] mx-auto mt-1.5 max-w-4xl px-2 text-base font-bold text-ink/95 sm:mt-2 sm:text-xl'
              : 'donation-subtitle relative z-[2] mx-auto mt-2 w-full max-w-3xl px-2 text-base font-bold text-ink/95 sm:mt-3 sm:text-xl lg:text-2xl'
          }
        >
          {subtitle}
        </h2>
      ) : null}
    </header>
  );
}
