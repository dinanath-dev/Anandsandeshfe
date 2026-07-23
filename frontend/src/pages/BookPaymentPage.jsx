import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import BookOrderStepper from '../components/BookOrderStepper.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import Alert from '../components/Alert.jsx';
import UpiPaymentHelp from '../components/UpiPaymentHelp.jsx';
import { createOrder, getBookOrder, getCurrentUser, verifyPayment } from '../services/api.js';
import { getUserAuth } from '../utils/auth.js';
import { clearGuestBookToken, getGuestBookToken, saveGuestBookToken } from '../utils/guestBookAuth.js';
import {
  clearBookOrderDraft,
  draftFromBookOrder,
  loadBookOrderDraft,
  saveBookOrderDraft
} from '../utils/bookOrderDraft.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast, friendlyError } from '../components/ToastProvider.jsx';
import { useSeo } from '../utils/seo.js';

function formatInr(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n) || n <= 0) return '';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n / 100);
}

export default function BookPaymentPage() {
  const { state } = useLocation();
  const bookOrderId = state?.bookOrderId;
  const bookName = state?.bookName;
  const orderItems = state?.orderItems;
  const totalPaise = state?.totalPaise;
  const guestToken = state?.guestToken;

  useEffect(() => {
    if (bookOrderId && guestToken) {
      saveGuestBookToken(bookOrderId, guestToken);
    }
  }, [bookOrderId, guestToken]);

  if (!bookOrderId) {
    return <Navigate to="/books" replace />;
  }

  return (
    <BookPaymentContent
      bookOrderId={bookOrderId}
      bookName={bookName}
      orderItems={orderItems}
      totalPaise={totalPaise}
      bookDraft={state?.bookDraft}
    />
  );
}

function formatLineAmount(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n) || n <= 0) return '';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n / 100);
}

function resolvePrefill(auth, bookDraft) {
  const form = bookDraft?.form || loadBookOrderDraft()?.form || {};
  const user = auth?.user || {};
  const nameFromForm = [form.title, form.firstName, form.lastName].filter(Boolean).join(' ').trim();
  return {
    name: nameFromForm || String(user.fullName || user.name || '').trim(),
    email: String(form.email || user.email || '').trim(),
    contact: String(form.mobile || user.mobile || '').trim()
  };
}

function BookPaymentContent({ bookOrderId, bookName, orderItems, totalPaise, bookDraft }) {
  useSeo({
    title: 'Book Payment — Anand Sandesh Karyalay',
    canonical: 'https://anandsandeshkaryalay.online/books/payment'
  });

  const { t } = useTranslation();
  const toast = useToast();
  const navigate = useNavigate();
  const keyId = String(import.meta.env.VITE_RAZORPAY_KEY_ID || '').trim();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const checkoutOpenRef = useRef(false);

  const releaseCheckout = useCallback(() => {
    checkoutOpenRef.current = false;
    setBusy(false);
  }, []);

  const goEditOrder = useCallback(async () => {
    let draft = bookDraft || loadBookOrderDraft();
    if (!draft?.form) {
      try {
        const data = await getBookOrder(bookOrderId);
        draft = draftFromBookOrder(data?.order);
        if (draft) saveBookOrderDraft(draft);
      } catch {
        /* fall through — still navigate; form may partially restore from storage */
      }
    }
    navigate('/books', { state: { bookDraft: draft } });
  }, [bookDraft, bookOrderId, navigate]);

  const startCheckout = useCallback(async () => {
    if (checkoutOpenRef.current || busy) return;
    setError('');
    setPaymentError('');

    const auth = getUserAuth();
    const guestToken = getGuestBookToken(bookOrderId);
    if (!auth?.token && !guestToken) {
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
      if (auth?.token) {
        await getCurrentUser();
      }
      const orderData = await createOrder({ book_order_id: bookOrderId });
      const orderId = orderData?.order_id;
      if (!orderId) throw new Error(t('payment.errors.couldNotStart'));

      const prefill = resolvePrefill(auth, bookDraft);
      checkoutOpenRef.current = true;

      const rzp = new window.Razorpay({
        key: keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        order_id: orderId,
        name: 'Anand Sandesh',
        description: bookName || t('books.oneTimePayment'),
        prefill,
        theme: { color: '#2563eb' },
        handler: async function handler(response) {
          releaseCheckout();
          try {
            await verifyPayment({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              book_order_id: bookOrderId
            });
            clearBookOrderDraft();
            clearGuestBookToken(bookOrderId);
            toast.success(t('success.paymentSuccessful'));
            navigate('/success', { state: { paymentVerified: true, bookOrder: true } });
          } catch (err) {
            navigate('/success', {
              state: {
                paymentVerified: false,
                verificationPending: true,
                bookOrder: true,
                verificationMessage: friendlyError(err, t('payment.errors.verificationPending'))
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
        toast.error(msg);
      });

      rzp.open();
    } catch (err) {
      releaseCheckout();
      const msg = friendlyError(err, t('payment.errors.couldNotStartShort'));
      setError(msg);
      toast.error(msg);
    }
  }, [bookDraft, bookOrderId, bookName, busy, keyId, navigate, releaseCheckout, t, toast]);

  const items = Array.isArray(orderItems) ? orderItems : [];
  const amountDisplay = formatInr(totalPaise);

  return (
    <DonationLayout subtitle={t('books.paymentSubtitle')}>
      {busy ? <LoadingBlock label={t('loaders.startingCheckout')} /> : null}
      <div className="book-order-shell">
        <BookOrderStepper currentStep={3} t={t} />
        <div className="book-order-card text-center">
          <BookOpen className="mx-auto mb-3 text-primary" size={40} />
          <h2 className="text-xl font-black text-ink sm:text-2xl">{t('books.paymentHeading')}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{t('books.paymentSummary')}</p>
          <UpiPaymentHelp />
          {items.length > 0 ? (
            <div className="mt-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-4 py-3 text-left">
              <p className="text-xs font-bold uppercase tracking-wide text-primary">{t('books.orderItems')}</p>
              <ul className="mt-2 space-y-2 text-sm text-ink">
                {items.map((item) => (
                  <li
                    key={item.book_id || `${item.book_name}-${item.quantity}`}
                    className="rounded-lg border border-[var(--surface-border)] bg-white/50 px-3 py-2"
                  >
                    <div className="flex justify-between gap-3 font-semibold">
                      <span className="min-w-0">
                        {item.book_name} × {item.quantity}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {formatLineAmount(item.line_total_paise) ||
                          formatInr(Number(item.unit_price_paise || 0) * Number(item.quantity || 1))}
                      </span>
                    </div>
                    {item.unit_total_rupees != null ? (
                      <p className="mt-1 text-xs text-muted">
                        {t('books.priceLabel')}:{' '}
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(
                          Number(item.unit_total_rupees)
                        )}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : bookName ? (
            <p className="mt-4 text-base font-bold text-ink">
              {t('books.bookLabel')}{' '}
              <span className="text-primary font-black">{bookName}</span>
            </p>
          ) : null}
          {amountDisplay ? <p className="mt-2 text-lg font-black text-primary">{amountDisplay}</p> : null}
          <p className="mt-2 font-mono text-xs text-muted">{t('books.orderRef')} {bookOrderId}</p>

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
              disabled={busy || !keyId}
            >
              {busy ? <InlineLoader size={22} /> : <BookOpen size={18} aria-hidden />}
              {busy ? t('payment.startingCheckout') : t('books.payNow')}
            </button>
            <button
              type="button"
              className="btn-secondary inline-flex min-h-10 items-center gap-2 px-5 py-2 text-sm"
              onClick={goEditOrder}
            >
              <ArrowLeft size={18} /> {t('books.editOrder')}
            </button>
          </div>
        </div>
      </div>
    </DonationLayout>
  );
}
