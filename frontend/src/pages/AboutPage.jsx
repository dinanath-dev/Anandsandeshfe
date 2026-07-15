import { ArrowLeft, BookOpen, Building2, MapPin, Newspaper } from 'lucide-react';
import { Link } from 'react-router-dom';
import DonationLayout from '../components/DonationLayout.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';

const BOOK_KEYS = ['item1', 'item2', 'item3', 'item4'];

export default function AboutPage() {
  const { t } = useTranslation();

  useSeo({
    title: 'About Anand Sandesh — Monthly Magazine | anandsandesh',
    description:
      'Anand Sandesh (anandsandesh) is a monthly spiritual magazine in Hindi and English from Shri Paramhans Advait Mat Publication Society, Shri Anandpur Dham. Books on spirituality and satsang.',
    canonical: 'https://anandsandeshkaryalay.online/about'
  });

  return (
    <DonationLayout subtitle={t('about.pageSubtitle')}>
      <article className="about-public mx-auto max-w-3xl space-y-6 pb-4 text-ink">
        <nav className="flex flex-wrap items-center gap-3 text-sm">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 font-semibold text-primary transition hover:text-brand-royal"
          >
            <ArrowLeft size={16} aria-hidden />
            {t('about.backHome')}
          </Link>
        </nav>

        <header className="rounded-2xl border border-white/40 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{t('about.eyebrow')}</p>
          <h1 className="mt-2 font-devanagari text-2xl font-black leading-tight text-ink sm:text-3xl">
            {t('about.pageTitle')}
          </h1>
          <p className="mt-4 text-base leading-7 text-muted sm:text-lg">{t('about.intro')}</p>
        </header>

        <section
          className="rounded-2xl border border-white/40 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-8"
          aria-labelledby="about-publisher"
        >
          <div className="flex items-start gap-3">
            <Building2 className="mt-0.5 shrink-0 text-primary" size={22} aria-hidden />
            <div>
              <h2 id="about-publisher" className="text-lg font-bold text-ink sm:text-xl">
                {t('about.publisherHeading')}
              </h2>
              <p className="mt-2 font-semibold leading-snug text-primary sm:text-lg">{t('layout.orgTitle')}</p>
              <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{t('about.publisherBody')}</p>
            </div>
          </div>
        </section>

        <section
          className="rounded-2xl border border-white/40 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-8"
          aria-labelledby="about-magazine"
        >
          <div className="flex items-start gap-3">
            <Newspaper className="mt-0.5 shrink-0 text-primary" size={22} aria-hidden />
            <div>
              <h2 id="about-magazine" className="text-lg font-bold text-ink sm:text-xl">
                {t('about.magazineHeading')}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{t('about.magazineBody')}</p>
              <ul className="mt-4 list-disc space-y-2 ps-5 text-sm leading-7 text-muted sm:text-base">
                <li>{t('about.magazinePoint1')}</li>
                <li>{t('about.magazinePoint2')}</li>
                <li>{t('about.magazinePoint3')}</li>
              </ul>
            </div>
          </div>
        </section>

        <section
          className="rounded-2xl border border-white/40 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-8"
          aria-labelledby="about-books"
        >
          <div className="flex items-start gap-3">
            <BookOpen className="mt-0.5 shrink-0 text-primary" size={22} aria-hidden />
            <div>
              <h2 id="about-books" className="text-lg font-bold text-ink sm:text-xl">
                {t('about.booksHeading')}
              </h2>
              <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{t('about.booksBody')}</p>
              <ul className="mt-4 list-disc space-y-2 ps-5 text-sm leading-7 text-muted sm:text-base">
                {BOOK_KEYS.map((key) => (
                  <li key={key}>{t(`about.books.${key}`)}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section
          className="rounded-2xl border border-primary/15 bg-primary/5 p-6 shadow-soft sm:p-8"
          aria-labelledby="about-subscribe"
        >
          <h2 id="about-subscribe" className="text-lg font-bold text-ink sm:text-xl">
            {t('about.subscribeHeading')}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{t('about.subscribeBody')}</p>
          <Link to="/login" className="btn-primary mt-5">
            {t('about.subscribeCta')}
          </Link>
        </section>

        <section
          className="rounded-2xl border border-primary/15 bg-primary/5 p-6 shadow-soft sm:p-8"
          aria-labelledby="about-official-site"
        >
          <h2 id="about-official-site" className="text-lg font-bold text-ink sm:text-xl">
            {t('about.officialSiteHeading')}
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{t('about.officialSiteBody')}</p>
        </section>

        <section
          id="contact"
          className="rounded-2xl border border-white/40 bg-white/90 p-6 shadow-soft backdrop-blur-sm sm:p-8"
          aria-labelledby="about-contact"
        >
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 shrink-0 text-primary" size={22} aria-hidden />
            <div>
              <h2 id="about-contact" className="text-lg font-bold text-ink sm:text-xl">
                {t('about.contactHeading')}
              </h2>
              <address className="mt-3 not-italic text-sm leading-7 text-muted sm:text-base">
                <strong className="block font-semibold text-ink">{t('about.addressName')}</strong>
                <span className="mt-1 block">{t('about.addressLine1')}</span>
                <span className="block">{t('about.addressLine2')}</span>
                <span className="block font-semibold tabular-nums text-ink">{t('about.addressPin')}</span>
                <span className="mt-2 block">{t('about.addressRegion')}</span>
              </address>
              <p className="mt-4 text-sm leading-7 text-muted">{t('about.contactNote')}</p>
            </div>
          </div>
        </section>
      </article>
    </DonationLayout>
  );
}
