import { useCallback, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CreditCard, Loader2 } from 'lucide-react';
import DonationLayout from '../components/DonationLayout.jsx';
import Alert from '../components/Alert.jsx';
import { createSubscription, getCurrentUser, verifySubscriptionPayment } from '../services/api.js';
import { getUserAuth } from '../utils/auth.js';

const SUBSCRIPTION_LABELS = {
  yearly: 'One year',
  five_year: '5 year'
};

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
      setError('You need to be signed in to pay.');
      return;
    }
    if (typeof window.Razorpay !== 'function') {
      setError('Payment checkout did not load. Refresh the page and try again.');
      return;
    }
    if (!keyId || !planId) {
      setError('Razorpay is not fully configured for this plan. Contact support.');
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
        throw new Error('Could not start subscription. Please try again.');
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
            setPaymentError(err.message || 'Payment verification failed.');
          }
        }
      });

      rzp.on('payment.failed', function onPaymentFailed(resp) {
        const e = resp?.error;
        const msg =
          (typeof e?.description === 'string' && e.description) ||
          (typeof e?.reason === 'string' && e.reason) ||
          'Payment failed.';
        setPaymentError(msg);
      });

      rzp.open();
    } catch (err) {
      let msg = err.message || 'Could not start payment.';
      if (err.status === 401 && String(err.path || '').startsWith('/payment/')) {
        msg = `${msg} The app is already sending Authorization: Bearer … (check the request in Network). A 401 here means the API is rejecting that token: on the server, protect /api/payment/* with the exact same user-JWT middleware and secret as /api/auth/me, or log why verify fails (e.g. expired token—check the exp claim).`;
      }
      setError(msg);
    } finally {
      setBusy(false);
    }
  }, [keyId, planId, totalCount, navigate]);

  return (
    <DonationLayout subtitle="Payment">
      <div className="donation-form-shell mx-auto max-w-lg px-2 py-4 text-center sm:px-4">
        <div className="rounded-lg border border-[#0d2d7f]/28 bg-white/90 px-5 py-8 shadow-md backdrop-blur-sm">
          <CreditCard className="mx-auto mb-4 text-primary" size={48} />
          <h2 className="text-xl font-black text-[#152a48] sm:text-2xl">Proceed to payment</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Pay securely with Razorpay. Your subscription is confirmed only after our server verifies the payment
            signature.
          </p>
          <p className="mt-4 text-base font-bold text-ink">
            Plan: <span className="text-primary font-black">{planLabel}</span>
          </p>
          <p className="mt-2 font-mono text-xs text-muted">Reference ID: {submissionId}</p>

          {!plansConfigured ? (
            <div className="mt-6 space-y-3 text-left text-sm text-muted">
              <p>
                Recurring payments need a <strong className="text-ink">subscription plan</strong> in Razorpay. Test mode
                has the same feature: use the dashboard in <strong className="text-ink">Test mode</strong>, then{' '}
                <span className="font-mono text-ink">Subscriptions → Plans → + Create plan</span>. Copy the plan id
                (looks like <span className="font-mono">plan_…</span>).
              </p>
              <p>
                For quick local testing, add one id to <span className="font-mono">VITE_RAZORPAY_PLAN_ID</span> in{' '}
                <span className="font-mono">.env</span> (both 1-year and 5-year will use it until you set separate{' '}
                <span className="font-mono">VITE_RAZORPAY_PLAN_ID_YEARLY</span> /{' '}
                <span className="font-mono">FIVE_YEAR</span>). Restart the dev server after editing env.
              </p>
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
              {busy ? <Loader2 className="animate-spin" size={18} aria-hidden /> : <CreditCard size={18} aria-hidden />}
              {busy ? 'Starting checkout…' : 'Pay with Razorpay'}
            </button>
            <Link to="/form" className="btn-secondary inline-flex min-h-10 items-center gap-2 px-5 py-2 text-sm">
              <ArrowLeft size={18} /> Edit details
            </Link>
          </div>
        </div>
      </div>
    </DonationLayout>
  );
}
