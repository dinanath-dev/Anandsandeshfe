import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';

/**
 * Magazine intro for the public homepage. Use `variant="hero"` inside the auth
 * left panel; `banner` is a standalone block (legacy / optional).
 */
export default function PublicSeoIntro({ variant = 'banner', className = '' }) {
  const { t } = useTranslation();

  if (variant === 'hero' || variant === 'heroCompact') {
    const compact = variant === 'heroCompact';
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-white/25 bg-white/12 shadow-[0_24px_56px_-12px_rgba(6,13,26,0.35),inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-white/10 backdrop-blur-xl ${
          compact ? 'p-5' : 'px-7 py-8 xl:px-8 xl:py-9'
        } ${className}`.trim()}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-gradient-to-br from-sky-400/20 to-[#1e4a9e]/10 blur-3xl"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-gradient-to-tr from-[#0d2d7f]/15 to-slate-200/10 blur-3xl"
          aria-hidden
        />
        <div
          className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-[#c9a43a] via-[#0d2d7f] to-sky-400"
          aria-hidden
        />

        <div className="relative z-[1]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0d2d7f]/90">
            {t('seo.officialBadge')}
          </p>
          <h1
            id="seo-home-heading"
            className={`mt-3 font-black tracking-[-0.04em] ${
              compact
                ? 'text-xl leading-tight sm:text-2xl'
                : 'text-2xl leading-[1.12] sm:text-3xl xl:text-[2.15rem] xl:leading-[1.1]'
            }`}
          >
            <span className="bg-gradient-to-r from-[#041a33] via-[#0d2d7f] to-[#1e4a9e] bg-clip-text text-transparent">
              {t('seo.homeH1')}
            </span>
          </h1>
          <p
            className={`mt-4 font-medium leading-relaxed text-slate-800 ${
              compact ? 'text-sm sm:text-[0.95rem]' : 'text-sm sm:text-base sm:leading-7'
            }`}
          >
            {t('seo.homeLead')}
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900">{t('seo.officialDomain')}</p>

          <div className="mt-4 flex gap-3 rounded-xl border border-white/25 bg-white/10 p-3.5 shadow-inner backdrop-blur-md sm:p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/25 text-primary shadow-sm ring-1 ring-white/35">
              <MapPin className="h-4 w-4 sm:h-[18px] sm:w-[18px]" strokeWidth={2.25} aria-hidden />
            </div>
            <p className="min-w-0 text-sm font-medium leading-relaxed text-slate-800 sm:text-[0.95rem] sm:leading-7">
              {t('seo.homePublisher')}
            </p>
          </div>

          <p className="mt-5">
            <Link
              to="/about"
              className="text-sm font-semibold text-[#0d2d7f] underline decoration-[#0d2d7f]/30 underline-offset-4 transition hover:text-[#041a33] hover:decoration-[#0d2d7f]"
            >
              {t('about.footerLink')} →
            </Link>
          </p>
        </div>
      </div>
    );
  }

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
