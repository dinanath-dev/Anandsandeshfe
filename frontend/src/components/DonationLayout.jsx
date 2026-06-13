import ArchedOrgTitle from './ArchedOrgTitle.jsx';
import LogoutButton from './LogoutButton.jsx';
import anandpurLogo from '../assets/Shri_AnandpurDham_Logo.png';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { isUserAuthenticated } from '../utils/auth.js';

export default function DonationLayout({ subtitle, children, showLogout }) {
  const { t } = useTranslation();
  const shouldShowLogout = showLogout ?? isUserAuthenticated();

  return (
    <div className="donation-page min-h-screen text-ink ps-[max(0px,env(safe-area-inset-left))] pe-[max(0px,env(safe-area-inset-right))]">
      {shouldShowLogout ? <LogoutButton /> : null}
      <header className="donation-header relative z-[1] overflow-hidden px-3 pb-3 pt-4 text-center sm:px-4 sm:pb-4 sm:pt-6">
        <p className="donation-mantra relative z-[2] mx-auto flex max-w-4xl items-center justify-center gap-3 font-devanagari text-xl font-bold sm:gap-4 sm:text-2xl md:text-3xl">
          <span className="donation-mantra-flor select-none text-lg sm:text-xl md:text-2xl" aria-hidden>
            ✿
          </span>
          <span>{t('layout.mantra')}</span>
          <span className="donation-mantra-flor select-none text-lg sm:text-xl md:text-2xl" aria-hidden>
            ✿
          </span>
        </p>

        <div className="relative z-[2] mx-auto w-full max-w-[min(100%,54rem)] px-0 leading-none sm:max-w-[min(100%,68rem)] lg:max-w-[min(100%,76rem)]">
          <h1 className="sr-only">Shri Paramhans Advait Mat</h1>
          <ArchedOrgTitle />
        </div>

        <figure className="donation-seal relative z-[2] mx-auto -mt-1 flex justify-center sm:-mt-0.5">
          <img
            src={anandpurLogo}
            alt={t('layout.logoAlt')}
            className="h-auto w-[min(88vw,10.5rem)] object-contain drop-shadow-[0_6px_20px_rgba(15,80,40,0.2)] sm:w-[min(88vw,12.5rem)]"
            width={400}
            height={400}
            decoding="async"
          />
        </figure>

        {subtitle ? (
          <h2 className="donation-subtitle relative z-[2] mx-auto mt-2 max-w-xl px-2 text-base font-bold text-ink/95 sm:mt-3 sm:text-xl">
            {subtitle}
          </h2>
        ) : null}
      </header>

      <div className="relative z-[1] mx-auto w-full max-w-[min(100%,52rem)] px-2 pb-[max(4rem,env(safe-area-inset-bottom)+3rem)] pt-1 sm:max-w-[min(100%,64rem)] sm:px-6 sm:pb-16 sm:pt-2 md:px-8 lg:max-w-[min(100%,72rem)]">
        {children}
      </div>
    </div>
  );
}
