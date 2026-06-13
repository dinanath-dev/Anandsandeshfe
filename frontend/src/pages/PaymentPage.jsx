import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard } from 'lucide-react';
import DonationLayout from '../components/DonationLayout.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import Alert from '../components/Alert.jsx';
import {
  createSubscription,
  getCurrentUser,
  getMyFormSubmission,
  verifySubscriptionPayment
} from '../services/api.js';
import { getUserAuth } from '../utils/auth.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';

function planConfigForType(subscriptionType) {
  const keyId = String(import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim();
  const planDevFallback = String(import.meta.env.VITE_RAZORPAY_PLAN_ID || '').trim();
  const planYearly = String(import.meta.env.VITE_RAZORPAY_PLAN_ID_YEARLY || '').trim() || planDevFallback;
  const planFive =
    String(import.meta.env.VITE_RAZORPAY_PLAN_ID_FIVE_YEAR || '').trim() || planDevFallback;
  const countYearly = Number(import.meta.env.VITE_RAZORPAY_TOTAL_COUNT_YEARLY) || 100;
  const countFive = Number(import.meta.env.VITE_RAZORPAY_TOTAL_COUNT_FIVE_YEAR) || 5;

  if (subscriptionType === 'yearly') {
    return { keyId, planId: planYearly, totalCount: countYearly };
  }
  if (subscriptionType === 'five_year') {
    return { keyId, planId: planFive, totalCount: countFive };
  }
  return { keyId, planId: '', totalCount: countYearly };
}

function userDisplayName(user) {
  if (!user) return '';
  const n = String(user.name || '').trim();
  if (n) return n;
  const first = String(user.firstName || '').trim();
  const last = String(user.lastName || '').trim();
  return [first, last].filter(Boolean).join(' ');
}

function normalizePaymentStatus(status) {
  return String(status || '').trim().toLowerCase();
}

export default function PaymentPage() {
  const { state } = useLocation();
  const submissionId = state?.submissionId;
  const subscriptionType = state?.subscriptionType;

  if (!submissionId || !subscriptionType) {
    return <Navigate to="/" replace />;
  }

  return (
    <PaymentPageContent submissionId={submissionId} subscriptionType={subscriptionType} />
  );
}

function normalizeSubscriptionType(value) {
  const t = String(value || '').trim().toLowerCase();
  if (t === 'five_year' || t === '5_year' || t === '5year') return 'five_year';
  if (t === 'yearly' || t === 'year' || t === '1_year') return 'yearly';
  return t || 'yearly';
}

function PaymentPageContent({ submissionId, subscriptionType: subscriptionTypeFromRoute }) {
  useSeo({
    title: 'Payment — Anand Sandesh Karyalay | anandsandesh',
    description:
      'Secure online payment for your Anand Sandesh (anandsandesh) magazine subscription at Shri Anandpur Dham.',
    canonical: 'https://anandsandeshkaryalay.online/payment'
  });

  const { t } = useTranslation();
  const SUBSCRIPTION_LABELS = {
    yearly: t('payment.oneYear'),
    five_year: t('payment.fiveYear')
  };
  const navigate = useNavigate();

  const [busy, setBusy] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);
  const [alreadyPaid, setAlreadyPaid] = useState(false);
  const [error, setError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [resolvedSubscriptionType, setResolvedSubscriptionType] = useState(
    normalizeSubscriptionType(subscriptionTypeFromRoute)
  );
  const checkoutOpenRef = useRef(false);

  const planLabel = SUBSCRIPTION_LABELS[resolvedSubscriptionType] || resolvedSubscriptionType;
  const { keyId } = planConfigForType(resolvedSubscriptionType);
  const plansConfigured = Boolean(keyId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getMyFormSubmission();
        const sub = data?.submission;
        if (cancelled || !sub) return;

        if (normalizePaymentStatus(sub.payment_status) === 'verified') {
          setAlreadyPaid(true);
        }

        const dbType = normalizeSubscriptionType(sub.subscription_type);
        if (dbType) {
          setResolvedSubscriptionType(dbType);
        }

        if (String(sub.id) !== String(submissionId)) {
          setError(t('payment.errors.couldNotStartShort'));
        }
      } catch {
        /* optional pre-check */
      } finally {
        if (!cancelled) setCheckingStatus(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [submissionId, t]);

  const releaseCheckout = useCallback(() => {
    checkoutOpenRef.current = false;
    setBusy(false);
  }, []);

  const startCheckout = useCallback(async () => {
    if (checkoutOpenRef.current || busy || alreadyPaid) return;

    setError('');
    setPaymentError('');
    const auth = getUserAuth();
    if (!auth?.token) {
      setError(t('payment.errors.notSignedIn'));
      return;
    }
    if (typeof window.Razorpay !== 'function') {
      setError(t('payment.errors.checkoutFailed'));
      return;
    }
    if (!keyId) {
      setError(t('payment.errors.notConfigured'));
      return;
    }

    setBusy(true);
    try {
      await getCurrentUser();
      const createData = await createSubscription({
        submission_id: String(submissionId)
      });
      const subscriptionRzId = createData?.subscription?.id;
      if (!subscriptionRzId) {
        throw new Error(t('payment.errors.couldNotStart'));
      }

      const user = auth.user || {};
      checkoutOpenRef.current = true;

      const rzp = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionRzId,
        name: 'Anand Sandesh',
        description: t('payment.recurringDescription', { plan: planLabel }),
        prefill: {
          name: userDisplayName(user),
          email: String(user.email || '').trim(),
          contact: String(user.mobile || '').trim()
        },
        theme: { color: '#2563eb' },
        handler: async function handler(response) {
          releaseCheckout();
          try {
            await verifySubscriptionPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              submission_id: String(submissionId)
            });
            navigate('/success', { state: { paymentVerified: true } });
          } catch (err) {
            navigate('/success', {
              state: {
                paymentVerified: false,
                verificationPending: true,
                verificationMessage: err?.message || t('payment.errors.verificationPending')
              }
            });
          }
        },
        modal: {
          ondismiss: function onDismiss() {
            releaseCheckout();
            setPaymentError(t('payment.errors.paymentCancelled'));
          }
        }
      });

      rzp.on('payment.failed', function onPaymentFailed(resp) {
        releaseCheckout();
        const e = resp?.error;
        const msg =
          (typeof e?.description === 'string' && e.description) ||
          (typeof e?.reason === 'string' && e.reason) ||
          t('payment.errors.paymentFailed');
        setPaymentError(msg);
      });

      rzp.open();
    } catch (err) {
      releaseCheckout();
      let msg = err.message || t('payment.errors.couldNotStartShort');
      if (err.status === 409) {
        msg = t('payment.errors.alreadyPaid');
        setAlreadyPaid(true);
      } else if (err.status === 401 && String(err.path || '').startsWith('/payment/')) {
        msg = `${msg} Sign in again if your session expired, then retry payment.`;
      }
      setError(msg);
    }
  }, [
    alreadyPaid,
    busy,
    keyId,
    navigate,
    planLabel,
    releaseCheckout,
    submissionId,
    t
  ]);

  if (checkingStatus) {
    return (
      <DonationLayout subtitle={t('payment.subtitle')}>
        <LoadingBlock label={t('loaders.loadingSubmission')} />
      </DonationLayout>
    );
  }

  return (
    <DonationLayout subtitle={t('payment.subtitle')}>
      {busy ? <LoadingBlock label={t('loaders.startingCheckout')} /> : null}
      <div className="donation-form-shell mx-auto max-w-lg px-2 py-4 text-center sm:px-4">
        <div className="rounded-lg border border-[#0d2d7f]/28 bg-white/90 px-5 py-8 shadow-md backdrop-blur-sm">
          {alreadyPaid ? (
            <>
              <CheckCircle2 className="mx-auto mb-4 text-primary" size={48} />
              <h2 className="text-xl font-black text-[#152a48] sm:text-2xl">{t('payment.alreadyPaidHeading')}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t('payment.alreadyPaidSummary')}</p>
              <Link to="/success" state={{ paymentVerified: true }} className="btn-primary mt-8 inline-flex min-h-10 items-center gap-2 px-5 py-2 text-sm">
                {t('payment.viewConfirmation')}
              </Link>
            </>
          ) : (
            <>
              <CreditCard className="mx-auto mb-4 text-primary" size={48} />
              <h2 className="text-xl font-black text-[#152a48] sm:text-2xl">{t('payment.heading')}</h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">{t('payment.summaryRecurring')}</p>
              <p className="mt-4 text-base font-bold text-ink">
                {t('payment.planLabel')} <span className="text-primary font-black">{planLabel}</span>
              </p>
              <p className="mt-2 font-mono text-xs text-muted">{t('payment.referenceLabel')} {submissionId}</p>

              {!plansConfigured ? (
                <div className="mt-6 space-y-3 text-left text-sm text-muted">
                  <p>{t('payment.configHelpA')}</p>
                  <p>{t('payment.configHelpB')}</p>
                </div>
              ) : null}

              {error ? (
                <div className="mt-4 text-left">
                  <Alert>{error}</Alert>
                </div>
              ) : null}
              {paymentError ? (
                <div className="mt-4 text-left">
                  <Alert>{paymentError}</Alert>
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <button
                  type="button"
                  className="btn-primary inline-flex min-h-10 items-center gap-2 px-5 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-80"
                  onClick={startCheckout}
                  disabled={busy || !plansConfigured}
                >
                  {busy ? <InlineLoader size={22} /> : <CreditCard size={18} aria-hidden />}
                  {busy ? t('payment.startingCheckout') : t('payment.payWithRazorpay')}
                </button>
                <Link to="/form" className="btn-secondary inline-flex min-h-10 items-center gap-2 px-5 py-2 text-sm">
                  <ArrowLeft size={18} /> {t('payment.editDetails')}
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </DonationLayout>
  );
}
