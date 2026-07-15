import { CheckCircle2, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton.jsx';
import { isUserAuthenticated } from '../utils/auth.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';

export default function SuccessPage() {
  useSeo({
    title: 'Payment Confirmed — Anand Sandesh Karyalay',
    description:
      'Your Anand Sandesh Karyalay payment at Shri Anandpur Dham has been received.',
    canonical: 'https://anandsandeshkaryalay.online/success'
  });

  const { t } = useTranslation();
  const { state } = useLocation();
  const paymentVerified = Boolean(state?.paymentVerified);
  const verificationPending = Boolean(state?.verificationPending);
  const verificationMessage = String(state?.verificationMessage || '').trim();
  const isBookOrder = Boolean(state?.bookOrder);
  const showLogout = isUserAuthenticated();

  const heading = paymentVerified
    ? isBookOrder
      ? t('success.bookPaymentSuccessful')
      : t('success.paymentSuccessful')
    : verificationPending
      ? isBookOrder
        ? t('success.bookPaymentReceived')
        : t('success.paymentReceived')
      : t('success.submissionReceived');

  const description = paymentVerified
    ? isBookOrder
      ? t('success.bookPaymentSuccessfulDesc')
      : t('success.paymentSuccessfulDesc')
    : verificationPending
      ? isBookOrder
        ? t('success.bookPaymentReceivedDesc')
        : t('success.paymentReceivedDesc')
      : t('success.submissionReceivedDesc');

  return (
    <main className="page-shell">
      {showLogout ? <LogoutButton /> : null}
      <section className="content-wrap flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <div className="card max-w-xl p-6 text-center sm:p-8 md:p-10">
          <CheckCircle2 className="mx-auto mb-5 text-primary" size={64} />
          <h1 className="text-3xl font-black text-ink sm:text-4xl">{heading}</h1>
          <p className="mt-4 leading-7 text-muted">{description}</p>
          {verificationPending && verificationMessage ? (
            <p className="mt-3 text-sm text-muted">{verificationMessage}</p>
          ) : null}
          <Link to="/" className="btn-primary mt-7">
            <Home size={20} /> {isBookOrder ? t('success.backHome') : t('success.submitAnother')}
          </Link>
        </div>
      </section>
    </main>
  );
}
