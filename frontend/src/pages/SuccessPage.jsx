import { CheckCircle2, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function SuccessPage() {
  const { t } = useTranslation();
  const { state } = useLocation();
  const paymentVerified = Boolean(state?.paymentVerified);
  const verificationPending = Boolean(state?.verificationPending);
  const verificationMessage = String(state?.verificationMessage || '').trim();

  return (
    <main className="page-shell">
      <section className="content-wrap flex min-h-[calc(100vh-3rem)] items-center justify-center">
        <div className="card max-w-xl p-6 text-center sm:p-8 md:p-10">
          <CheckCircle2 className="mx-auto mb-5 text-primary" size={64} />
          <h1 className="text-3xl font-black text-ink sm:text-4xl">
            {paymentVerified
              ? t('success.paymentSuccessful')
              : verificationPending
                ? t('success.paymentReceived')
                : t('success.submissionReceived')}
          </h1>
          <p className="mt-4 leading-7 text-muted">
            {paymentVerified
              ? t('success.paymentSuccessfulDesc')
              : verificationPending
                ? t('success.paymentReceivedDesc')
                : t('success.submissionReceivedDesc')}
          </p>
          {verificationPending && verificationMessage ? (
            <p className="mt-3 text-sm text-muted">{verificationMessage}</p>
          ) : null}
          <Link to="/" className="btn-primary mt-7">
            <Home size={20} /> {t('success.submitAnother')}
          </Link>
        </div>
      </section>
    </main>
  );
}
