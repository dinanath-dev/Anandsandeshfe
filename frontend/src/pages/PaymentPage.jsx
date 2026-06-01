import { useCallback, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard } from 'lucide-react';
import DonationLayout from '../components/DonationLayout.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import Alert from '../components/Alert.jsx';
import { createSubscription, getCurrentUser, verifySubscriptionPayment } from '../services/api.js';
import { getUserAuth } from '../utils/auth.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

function planConfigForType(subscriptionType) {
  const keyId = String(import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim();
  /** One test plan is enough for local dev; specific IDs override when set. */
  const planDevFallback = String(import.meta.env.VITE_RAZORPAY_PLAN_ID || '').trim();
  const planYearly = String(import.meta.env.VITE_RAZORPAY_PLAN_ID_YEARLY || '').trim() || planDevFallback;
  const planFive =
    String(import.meta.env.VITE_RAZORPAY_PLAN_ID_FIVE_YEAR || '').trim() || planDevFallback;
  const countYearly = Number(import.meta.env.VITE_RAZORPAY_TOTAL_COUNT_YEARLY) || 12;
  const countFive = Number(import.meta.env.VITE_RAZORPAY_TOTAL_COUNT_FIVE_YEAR) || 60;

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

export default function PaymentPage() {
  const { t } = useTranslation();
  const SUBSCRIPTION_LABELS = {
    yearly: t('payment.oneYear'),
    five_year: t('payment.fiveYear')
  };
  const { state } = useLocation();
  const navigate = useNavigate();
  const submissionId = state?.submissionId;
  const subscriptionType = state?.subscriptionType;

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paymentError, setPaymentError] = useState('');

  if (!submissionId || !subscriptionType) {
    return <Navigate to="/" replace />;
  }

  const planLabel = SUBSCRIPTION_LABELS[subscriptionType] || subscriptionType;
  const { keyId, planId, totalCount } = planConfigForType(subscriptionType);
  const plansConfigured = Boolean(keyId && planId);

  const startCheckout = useCallback(async () => {
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
    if (!keyId || !planId) {
      setError(t('payment.errors.notConfigured'));
      return;
    }

    setBusy(true);
    try {
      await getCurrentUser();
      const createData = await createSubscription({
        plan_id: planId,
        total_count: totalCount
      });
      const subscriptionRzId = createData?.subscription?.id;
      if (!subscriptionRzId) {
        throw new Error(t('payment.errors.couldNotStart'));
      }

      const user = auth.user || {};
      const rzp = new window.Razorpay({
        key: keyId,
        subscription_id: subscriptionRzId,
        name: 'Anand Sandesh',
        description: 'Recurring subscription',
        prefill: {
          name: userDisplayName(user),
          email: String(user.email || '').trim(),
          contact: String(user.mobile || '').trim()
        },
        theme: { color: '#2563eb' },
        handler: async function handler(response) {
          try {
            await verifySubscriptionPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature
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
        }
      });

      rzp.on('payment.failed', function onPaymentFailed(resp) {
        const e = resp?.error;
        const msg =
          (typeof e?.description === 'string' && e.description) ||
          (typeof e?.reason === 'string' && e.reason) ||
          t('payment.errors.paymentFailed');
        setPaymentError(msg);
      });

      rzp.open();
    } catch (err) {
      let msg = err.message || t('payment.errors.couldNotStartShort');
      if (err.status === 401 && String(err.path || '').startsWith('/payment/')) {
        msg = `${msg} The app is already sending Authorization: Bearer … (check the request in Network). A 401 here means the API is rejecting that token: on the server, protect /api/payment/* with the exact same user-JWT middleware and secret as /api/auth/me, or log why verify fails (e.g. expired token—check the exp claim).`;
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [keyId, planId, totalCount, navigate]);

  return (
    <DonationLayout subtitle={t('payment.subtitle')}>
      {busy ? <LoadingBlock label={t('loaders.startingCheckout')} /> : null}
      <div className="donation-form-shell mx-auto max-w-lg px-2 py-4 text-center sm:px-4">
        <div className="rounded-lg border border-[#0d2d7f]/28 bg-white/90 px-5 py-8 shadow-md backdrop-blur-sm">
          <CreditCard className="mx-auto mb-4 text-primary" size={48} />
          <h2 className="text-xl font-black text-[#152a48] sm:text-2xl">{t('payment.heading')}</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {t('payment.summary')}
          </p>
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
              title={
                !plansConfigured
                  ? 'Set VITE_RAZORPAY_KEY_ID and VITE_RAZORPAY_PLAN_ID in .env, then restart npm run dev'
                  : undefined
              }
            >
              {busy ? <InlineLoader size={22} /> : <CreditCard size={18} aria-hidden />}
              {busy ? t('payment.startingCheckout') : t('payment.payWithRazorpay')}
            </button>
            <Link to="/form" className="btn-secondary inline-flex min-h-10 items-center gap-2 px-5 py-2 text-sm">
              <ArrowLeft size={18} /> {t('payment.editDetails')}
            </Link>
          </div>
        </div>
      </div>
    </DonationLayout>
  );
}
