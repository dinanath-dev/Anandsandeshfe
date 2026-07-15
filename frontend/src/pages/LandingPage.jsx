import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  LogIn,
  Menu,
  Newspaper,
  Package,
  Sparkles,
  Users,
  X
} from 'lucide-react';
import anandpurLogo from '../assets/Shri_AnandpurDham_Logo.png';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { isUserAuthenticated } from '../utils/auth.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';

const FAQ_KEYS = ['subscribe', 'guestBooks', 'fulfillment', 'official', 'location'];
const HERO_BENEFITS = ['benefit1', 'benefit2', 'benefit3'];
const HOW_STEPS = [
  { key: 'step1', Icon: LogIn },
  { key: 'step2', Icon: Package },
  { key: 'step3', Icon: Sparkles }
];
const AUDIENCE_CARDS = [
  { key: 'magazine', Icon: Newspaper },
  { key: 'books', Icon: BookOpen },
  { key: 'community', Icon: Users }
];

export default function LandingPage() {
  useSeo({
    title: 'Anand Sandesh Karyalay — Official Portal | Shri Anandpur Dham',
    description:
      'Official Anand Sandesh Karyalay at Shri Anandpur Dham. Subscribe to the monthly spiritual magazine or buy books online — Hindi & English.',
    canonical: 'https://anandsandeshkaryalay.online/'
  });

  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const signedIn = isUserAuthenticated();
  const subscribeHref = signedIn ? '/form' : '/login';

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="landing-page">
      <header className={`landing-topbar${menuOpen ? ' is-open' : ''}`}>
        <div className="landing-topbar__inner">
          <Link to="/" className="landing-brand" aria-label={t('landing.brandAria')} onClick={closeMenu}>
            <img src={anandpurLogo} alt="" className="landing-brand__logo" width={40} height={40} />
            <span className="landing-brand__name">
              {t('landing.brandName')} {t('landing.brandTag')}
            </span>
          </Link>

          <nav className="landing-topbar__nav" aria-label={t('landing.navAria')}>
            <a href="#how">{t('landing.navHow')}</a>
            <a href="#about">{t('landing.navAbout')}</a>
            <a href="#faq">{t('landing.navFaq')}</a>
          </nav>

          <div className="landing-topbar__actions">
            <LanguageToggle variant="inline" />
            <Link to={subscribeHref} className="landing-btn landing-btn--ghost">
              {t('landing.ctaSubscribe')}
            </Link>
            <Link to="/books" className="landing-btn landing-btn--primary">
              {t('landing.ctaBuyBooks')}
              <ChevronRight size={16} aria-hidden />
            </Link>
          </div>

          <button
            type="button"
            className="landing-topbar__menu-btn"
            aria-expanded={menuOpen}
            aria-controls="landing-mobile-menu"
            aria-label={menuOpen ? t('landing.menuClose') : t('landing.menuOpen')}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} aria-hidden /> : <Menu size={22} aria-hidden />}
          </button>
        </div>

        <div
          id="landing-mobile-menu"
          className={`landing-topbar__drawer${menuOpen ? ' is-open' : ''}`}
          hidden={!menuOpen}
        >
          <nav className="landing-topbar__drawer-nav" aria-label={t('landing.navAria')}>
            <a href="#how" onClick={closeMenu}>
              {t('landing.navHow')}
            </a>
            <a href="#about" onClick={closeMenu}>
              {t('landing.navAbout')}
            </a>
            <a href="#faq" onClick={closeMenu}>
              {t('landing.navFaq')}
            </a>
          </nav>
          <div className="landing-topbar__drawer-tools">
            <LanguageToggle variant="inline" />
          </div>
          <div className="landing-topbar__drawer-actions">
            <Link to={subscribeHref} className="landing-btn landing-btn--ghost landing-btn--lg" onClick={closeMenu}>
              {t('landing.ctaSubscribe')}
            </Link>
            <Link to="/books" className="landing-btn landing-btn--primary landing-btn--lg" onClick={closeMenu}>
              {t('landing.ctaBuyBooks')}
              <ChevronRight size={16} aria-hidden />
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="landing-hero" aria-labelledby="landing-hero-heading">
          <div className="landing-hero__grid">
            <div className="landing-hero__copy landing-reveal">
              <h1 id="landing-hero-heading" className="landing-hero__title">
                {t('landing.heroTitle')}
              </h1>
              <p className="landing-hero__lead">{t('landing.heroLead')}</p>
              <ul className="landing-benefits">
                {HERO_BENEFITS.map((key) => (
                  <li key={key}>
                    <span className="landing-benefits__icon" aria-hidden>
                      <Check size={14} strokeWidth={3} />
                    </span>
                    {t(`landing.${key}`)}
                  </li>
                ))}
              </ul>
              <div className="landing-hero__ctas">
                <Link to="/books" className="landing-btn landing-btn--primary landing-btn--lg">
                  {t('landing.ctaBuyBooks')}
                  <ChevronRight size={18} aria-hidden />
                </Link>
                <Link to={subscribeHref} className="landing-btn landing-btn--ghost landing-btn--lg">
                  {t('landing.ctaSubscribe')}
                </Link>
              </div>
            </div>

            <div className="landing-hero__visual landing-reveal">
              <div className="landing-hero__glow" aria-hidden />
              <div className="landing-hero__card landing-hero__card--main">
                <img
                  src={anandpurLogo}
                  alt={t('layout.logoAlt')}
                  className="landing-hero__seal"
                  width={220}
                  height={220}
                  decoding="async"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="landing-section landing-section--how" aria-labelledby="landing-how-heading">
          <div className="landing-section__head landing-section__head--center landing-reveal">
            <h2 id="landing-how-heading" className="landing-section__title landing-section__title--caps">
              {t('landing.howHeading')}
            </h2>
            <p className="landing-section__lead">{t('landing.howLead')}</p>
          </div>
          <div className="landing-how">
            {HOW_STEPS.map(({ key, Icon }, index) => (
              <div key={key} className="landing-how__step landing-reveal">
                <div className="landing-how__icon-row">
                  <div className="landing-how__icon-card">
                    <span className="landing-how__icon-circle">
                      <Icon size={22} strokeWidth={2.25} aria-hidden />
                    </span>
                  </div>
                  {index < HOW_STEPS.length - 1 ? (
                    <svg className="landing-how__arc" viewBox="0 0 120 40" preserveAspectRatio="none" aria-hidden>
                      <path
                        d="M4 28 C 40 4, 80 4, 116 28"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeDasharray="5 6"
                        strokeLinecap="round"
                      />
                    </svg>
                  ) : null}
                </div>
                <h3 className="landing-how__title">{t(`landing.how.${key}.title`)}</h3>
                <p className="landing-how__body">{t(`landing.how.${key}.body`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="landing-section" aria-labelledby="landing-about-heading">
          <div className="landing-split landing-reveal">
            <div className="landing-split__media">
              <img
                src={anandpurLogo}
                alt={t('layout.logoAlt')}
                className="landing-split__image"
                width={420}
                height={420}
                decoding="async"
              />
            </div>
            <div className="landing-split__content">
              <p className="landing-kicker">{t('about.eyebrow')}</p>
              <h2 id="landing-about-heading" className="landing-section__title">
                {t('landing.aboutHeading')}
              </h2>
              <p className="landing-section__body">{t('landing.aboutBody')}</p>
              <p className="landing-section__body">{t('landing.aboutBody2')}</p>
              <ul className="landing-split__points">
                <li>{t('about.magazinePoint1')}</li>
                <li>{t('about.magazinePoint2')}</li>
                <li>{t('about.magazinePoint3')}</li>
              </ul>
              <Link to="/about" className="landing-text-link">
                {t('about.footerLink')} →
              </Link>
            </div>
          </div>
        </section>

        <section className="landing-section" aria-labelledby="landing-audience-heading">
          <div className="landing-section__head landing-section__head--center landing-reveal">
            <h2 id="landing-audience-heading" className="landing-section__title">
              {t('landing.audienceHeading')}
            </h2>
            <p className="landing-section__lead">{t('landing.audienceLead')}</p>
          </div>
          <div className="landing-cards">
            {AUDIENCE_CARDS.map(({ key, Icon }) => (
              <article key={key} className="landing-card landing-reveal">
                <div className="landing-card__icon">
                  <Icon size={22} aria-hidden />
                </div>
                <h3 className="landing-card__title">{t(`landing.audience.${key}.title`)}</h3>
                <p className="landing-card__subtitle">{t(`landing.audience.${key}.subtitle`)}</p>
                <p className="landing-card__body">{t(`landing.audience.${key}.body`)}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="faq" className="landing-section" aria-labelledby="landing-faq-heading">
          <div className="landing-section__head landing-section__head--center landing-reveal">
            <h2 id="landing-faq-heading" className="landing-section__title">
              {t('landing.faqHeading')}
            </h2>
            <p className="landing-section__lead">{t('landing.faqLead')}</p>
          </div>
          <div className="landing-faq landing-reveal" role="list">
            {FAQ_KEYS.map((key, index) => {
              const isOpen = openFaq === index;
              const panelId = `landing-faq-panel-${key}`;
              const buttonId = `landing-faq-btn-${key}`;
              return (
                <div key={key} className={`landing-faq__item${isOpen ? ' is-open' : ''}`} role="listitem">
                  <button
                    type="button"
                    id={buttonId}
                    className="landing-faq__button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenFaq(isOpen ? -1 : index)}
                  >
                    <span>{t(`landing.faq.${key}.q`)}</span>
                    <ChevronDown className="landing-faq__chevron" size={18} aria-hidden />
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    className="landing-faq__panel"
                    hidden={!isOpen}
                  >
                    <p>{t(`landing.faq.${key}.a`)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="landing-cta-band" aria-labelledby="landing-cta-heading">
          <h2 id="landing-cta-heading" className="landing-cta-band__title">
            {t('landing.bandTitle')}
          </h2>
          <p className="landing-cta-band__lead">{t('landing.bandLead')}</p>
          <div className="landing-cta-band__actions">
            <Link to="/books" className="landing-btn landing-btn--on-dark landing-btn--lg">
              {t('landing.ctaBuyBooks')}
              <ChevronRight size={18} aria-hidden />
            </Link>
            <Link to={subscribeHref} className="landing-btn landing-btn--outline-light landing-btn--lg">
              {t('landing.ctaSubscribe')}
            </Link>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="landing-footer__inner">
          <div className="landing-footer__brand">
            <div className="landing-brand landing-brand--footer">
              <img src={anandpurLogo} alt="" className="landing-brand__logo" width={36} height={36} />
              <span className="landing-brand__name">{t('landing.brandName')}</span>
            </div>
            <address className="landing-footer__address">
              <strong>{t('about.addressName')}</strong>
              <span>{t('about.addressLine1')}</span>
              <span>{t('about.addressLine2')}</span>
              <span>{t('about.addressPin')}</span>
              <span>{t('about.addressRegion')}</span>
              <span className="landing-footer__domain">{t('seo.officialDomain')}</span>
            </address>
          </div>
          <div className="landing-footer__cols">
            <div>
              <h3>{t('landing.footerExplore')}</h3>
              <a href="#about">{t('landing.navAbout')}</a>
              <a href="#how">{t('landing.navHow')}</a>
              <a href="#faq">{t('landing.navFaq')}</a>
              <Link to="/about">{t('about.footerLink')}</Link>
            </div>
            <div>
              <h3>{t('landing.footerActions')}</h3>
              <Link to="/books">{t('landing.ctaBuyBooks')}</Link>
              <Link to={subscribeHref}>{t('landing.ctaSubscribe')}</Link>
            </div>
          </div>
        </div>
        <p className="landing-footer__copy">{t('landing.footerCopy')}</p>
      </footer>
    </div>
  );
}
