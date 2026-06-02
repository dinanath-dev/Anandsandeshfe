import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';

/**
 * Visible, crawlable intro on the public homepage (login screen).
 * States the official Anand Sandesh Karyalay subscription portal at
 * anandsandeshkaryalay.online for search engines and visitors.
 */
export default function PublicSeoIntro({ className = '' }) {
  const { t } = useTranslation();

  return (
    <section
      className={`seo-home-intro mx-auto mb-4 max-w-7xl rounded-xl border border-white/25 bg-white/90 px-4 py-4 text-ink shadow-soft backdrop-blur-sm sm:px-6 sm:py-5 ${className}`.trim()}
      aria-labelledby="seo-home-heading"
    >
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('seo.officialBadge')}</p>
      <h1 id="seo-home-heading" className="mt-1 font-devanagari text-xl font-black leading-snug sm:text-2xl">
        {t('seo.homeH1')}
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">{t('seo.homeLead')}</p>
      <p className="mt-2 text-sm font-semibold text-ink">{t('seo.officialDomain')}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted">{t('seo.homePublisher')}</p>
      <div className="mt-3">
        <Link to="/about" className="text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:text-brand-royal">
          {t('about.footerLink')}
        </Link>
      </div>
    </section>
  );
}
