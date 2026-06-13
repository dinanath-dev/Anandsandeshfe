import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import DonationFormRow from '../components/DonationFormRow.jsx';
import DonationFormPair from '../components/DonationFormPair.jsx';
import { INDIAN_STATES } from '../data/indianStates.js';
import { createBookOrder, getBooks, getCurrentUser } from '../services/api.js';
import { getUserAuth } from '../utils/auth.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';

const initialForm = {
  name: '',
  mobile: '',
  email: '',
  address: '',
  state: '',
  town: '',
  district: '',
  pin: '',
  gender: ''
};

function inputClass(field, errors) {
  return `donation-input ${errors[field] ? 'donation-input--invalid' : ''}`;
}

function formatInr(rupees) {
  const n = Number(rupees);
  if (!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(n);
}

function formatWeightGrams(grams) {
  const n = Number(grams);
  if (!Number.isFinite(n) || n <= 0) return '';
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 3)} kg`;
  return `${n} g`;
}

function BookLineBreakdown({ book, quantity, t }) {
  const qty = Number(quantity) || 1;
  const rate = Number(book.sales_rate) || 0;
  const postage = Number(book.postage) || 0;
  const gst = Number(book.gst_on_postage) || 0;
  const totalPostage = Number(book.total_postage) || 0;
  const unitTotal = Number(book.total_price) || rate + totalPostage;
  const weight = formatWeightGrams(book.weight_grams);

  return (
    <div className="mt-1.5 w-full rounded-md border border-primary/10 bg-white/80 px-2.5 py-2 text-xs text-muted">
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
        {weight ? (
          <>
            <dt>{t('books.weight')}</dt>
            <dd className="text-right tabular-nums text-ink">{weight}</dd>
          </>
        ) : null}
        <dt>{t('books.bookRate')}</dt>
        <dd className="text-right tabular-nums text-ink">{formatInr(rate)}</dd>
        <dt>{t('books.postage')}</dt>
        <dd className="text-right tabular-nums text-ink">{formatInr(postage)}</dd>
        <dt>{t('books.gstOnPostage')}</dt>
        <dd className="text-right tabular-nums text-ink">{formatInr(gst)}</dd>
        <dt className="font-semibold text-primary">{t('books.totalPostage')}</dt>
        <dd className="text-right font-semibold tabular-nums text-ink">{formatInr(totalPostage)}</dd>
        <dt className="font-bold text-primary">{t('books.payableTotal')}</dt>
        <dd className="text-right font-bold tabular-nums text-primary">
          {formatInr(unitTotal)}
          {qty > 1 ? ` × ${qty} = ${formatInr(unitTotal * qty)}` : ''}
        </dd>
      </dl>
    </div>
  );
}

export default function BookFormPage() {
  useSeo({
    title: 'Buy Books — Anand Sandesh Karyalay',
    description: 'Order spiritual books from Anand Sandesh Karyalay, Shri Anandpur Dham.',
    canonical: 'https://anandsandeshkaryalay.online/books'
  });

  const { t } = useTranslation();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [form, setForm] = useState(initialForm);
  /** @type {[Record<string, number>, Function]} bookId -> quantity */
  const [cart, setCart] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');

  const selectedLines = useMemo(() => {
    return books
      .filter((b) => cart[b.id] > 0)
      .map((b) => ({
        book: b,
        quantity: cart[b.id]
      }));
  }, [books, cart]);

  const cartTotal = useMemo(
    () =>
      selectedLines.reduce(
        (sum, line) => sum + Number(line.book.total_price ?? line.book.sales_rate) * line.quantity,
        0
      ),
    [selectedLines]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [booksData, userData] = await Promise.all([
          getBooks(),
          getCurrentUser().catch(() => null)
        ]);
        if (cancelled) return;
        setBooks(booksData?.books || []);
        const auth = getUserAuth();
        const user = userData?.user || auth?.user || {};
        setForm((prev) => ({
          ...prev,
          name: String(user.name || '').trim() || prev.name,
          mobile: String(user.mobile || '').trim() || prev.mobile,
          email: String(user.email || auth?.user?.email || '').trim() || prev.email
        }));
      } catch (err) {
        if (!cancelled) setLoadError(err.message || t('books.errors.loadFailed'));
      } finally {
        if (!cancelled) setLoadingBooks(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function toggleBook(bookId) {
    setCart((prev) => {
      const next = { ...prev };
      if (next[bookId]) delete next[bookId];
      else next[bookId] = 1;
      return next;
    });
    setErrors((prev) => ({ ...prev, books: '' }));
  }

  function updateBookQuantity(bookId, rawValue) {
    const qty = Math.max(1, Math.min(10, Number(rawValue) || 1));
    setCart((prev) => ({ ...prev, [bookId]: qty }));
  }

  function validate() {
    const next = {};
    if (selectedLines.length === 0) next.books = t('books.errors.bookRequired');
    if (!form.name.trim()) next.name = t('form.errors.nameRequired');
    if (!form.gender) next.gender = t('form.errors.genderRequired');
    if (!/^\d{10}$/.test(form.mobile)) next.mobile = t('form.errors.mobileInvalid');
    if (!form.email.trim()) next.email = t('form.errors.emailRequired');
    if (!form.address.trim()) next.address = t('form.errors.addressRequired');
    if (!form.state) next.state = t('form.errors.stateRequired');
    if (!form.town.trim()) next.town = t('form.errors.townRequired');
    if (!form.district.trim()) next.district = t('form.errors.districtRequired');
    if (!/^\d{4,10}$/.test(form.pin)) next.pin = t('form.errors.pinInvalid');
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const items = selectedLines.map(({ book, quantity }) => ({
        book_id: book.id,
        quantity
      }));
      const data = await createBookOrder({
        items,
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        gender: form.gender,
        address: form.address.trim(),
        town: form.town.trim(),
        district: form.district.trim(),
        state: form.state,
        pin: form.pin.trim()
      });
      const orderId = data?.order?.id;
      if (!orderId) throw new Error(t('books.errors.orderFailed'));
      navigate('/books/payment', {
        state: {
          bookOrderId: orderId,
          bookName: data.order.book_name,
          orderItems: data.order.order_items || items,
          totalPaise: data.order.total_amount_paise
        }
      });
    } catch (err) {
      setErrors({ submit: err.message || t('books.errors.orderFailed') });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (loadingBooks) {
    return (
      <DonationLayout subtitle={t('books.subtitle')}>
        <LoadingBlock label={t('books.loadingCatalog')} />
      </DonationLayout>
    );
  }

  return (
    <DonationLayout subtitle={t('books.subtitle')}>
      <div className="donation-form-shell mx-auto max-w-3xl px-2 py-4 sm:px-4">
        <div className="mb-4">
          <Link to="/profile" className="text-sm font-semibold text-primary hover:underline">
            ← {t('books.backToProfile')}
          </Link>
        </div>

        {loadError ? (
          <Alert>{loadError}</Alert>
        ) : (
          <form onSubmit={handleSubmit} className="donation-form" noValidate>
            <DonationFormPair className="donation-form-pair--single">
              <DonationFormRow label={t('books.selectBooks')} required error={errors.books} labelFor="bf-books">
                <div
                  id="bf-books"
                  className={`max-h-[min(22rem,50vh)] overflow-y-auto rounded-xl border bg-white/90 p-2 shadow-inner ${
                    errors.books ? 'border-red-400' : 'border-[#0d2d7f]/15'
                  }`}
                >
                  {books.map((b) => {
                    const selected = cart[b.id] > 0;
                    return (
                      <div
                        key={b.id}
                        className={`mb-2 flex flex-wrap items-center gap-3 rounded-lg border px-3 py-2.5 last:mb-0 sm:flex-nowrap ${
                          selected ? 'border-primary/30 bg-primary/5' : 'border-transparent bg-white'
                        }`}
                      >
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            className="mt-1 h-4 w-4 shrink-0 accent-primary"
                            checked={selected}
                            onChange={() => toggleBook(b.id)}
                          />
                          <span className="min-w-0 flex-1 text-sm leading-snug">
                            <span className="font-semibold text-ink">
                              {b.s_no}. {b.name}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted">
                              {t('books.payableTotal')}: {formatInr(b.total_price ?? b.sales_rate)}
                              {b.measurements ? ` · ${b.measurements}` : ''}
                            </span>
                            {selected ? <BookLineBreakdown book={b} quantity={cart[b.id]} t={t} /> : null}
                          </span>
                        </label>
                        {selected ? (
                          <div className="flex w-full items-center gap-2 sm:w-auto sm:shrink-0">
                            <label htmlFor={`bf-qty-${b.id}`} className="text-xs font-semibold text-muted">
                              {t('books.quantity')}
                            </label>
                            <input
                              id={`bf-qty-${b.id}`}
                              type="number"
                              min={1}
                              max={10}
                              className="donation-input !w-16 !min-w-0 !rounded-lg !py-1.5 !text-center !text-sm"
                              value={cart[b.id]}
                              onChange={(e) => updateBookQuantity(b.id, e.target.value)}
                            />
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </DonationFormRow>
            </DonationFormPair>

            {selectedLines.length > 0 ? (
              <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3">
                <p className="text-xs font-bold uppercase tracking-wide text-primary">{t('books.cartSummary')}</p>
                <ul className="mt-2 space-y-2 text-sm text-ink">
                  {selectedLines.map(({ book, quantity }) => {
                    const unitTotal = Number(book.total_price ?? book.sales_rate);
                    return (
                      <li key={book.id} className="rounded-lg border border-primary/10 bg-white/70 px-3 py-2">
                        <div className="flex justify-between gap-3 font-semibold">
                          <span className="min-w-0 truncate">
                            {book.name} × {quantity}
                          </span>
                          <span className="shrink-0 tabular-nums">{formatInr(unitTotal * quantity)}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted">
                          {t('books.bookRate')} {formatInr(book.sales_rate)} + {t('books.totalPostage')}{' '}
                          {formatInr(book.total_postage ?? 0)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-3 border-t border-primary/15 pt-2 text-right text-base font-black text-primary">
                  {t('books.totalLabel')}: {formatInr(cartTotal)}
                </p>
              </div>
            ) : null}

            <DonationFormPair>
              <DonationFormRow label={t('form.labels.name')} required error={errors.name} labelFor="bf-name">
                <input
                  id="bf-name"
                  className={inputClass('name', errors)}
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  autoComplete="name"
                />
              </DonationFormRow>
              <DonationFormRow label={t('form.labels.gender')} required error={errors.gender} labelFor="bf-gender">
                <select
                  id="bf-gender"
                  className={inputClass('gender', errors)}
                  value={form.gender}
                  onChange={(e) => updateField('gender', e.target.value)}
                >
                  <option value="">{t('form.placeholders.selectGender')}</option>
                  <option value="male">{t('form.placeholders.male')}</option>
                  <option value="female">{t('form.placeholders.female')}</option>
                </select>
              </DonationFormRow>
              <DonationFormRow label={t('form.labels.mobile')} required error={errors.mobile} labelFor="bf-mobile">
                <input
                  id="bf-mobile"
                  className={inputClass('mobile', errors)}
                  inputMode="numeric"
                  maxLength={10}
                  value={form.mobile}
                  onChange={(e) => updateField('mobile', e.target.value.replace(/\D/g, ''))}
                />
              </DonationFormRow>
            </DonationFormPair>

            <DonationFormPair>
              <DonationFormRow label={t('form.labels.email')} required error={errors.email} labelFor="bf-email">
                <input id="bf-email" type="email" className={inputClass('email', errors)} value={form.email} readOnly />
              </DonationFormRow>
            </DonationFormPair>

            <DonationFormPair className="donation-form-pair--single">
              <DonationFormRow label={t('form.labels.address')} required error={errors.address} labelFor="bf-address">
                <textarea
                  id="bf-address"
                  className={`${inputClass('address', errors)} donation-input--address`}
                  value={form.address}
                  onChange={(e) => updateField('address', e.target.value)}
                  rows={2}
                />
              </DonationFormRow>
            </DonationFormPair>

            <DonationFormPair>
              <DonationFormRow label={t('form.labels.state')} required error={errors.state} labelFor="bf-state">
                <select
                  id="bf-state"
                  className={inputClass('state', errors)}
                  value={form.state}
                  onChange={(e) => updateField('state', e.target.value)}
                >
                  <option value="">{t('form.placeholders.selectState')}</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </DonationFormRow>
              <DonationFormRow label={t('form.labels.town')} required error={errors.town} labelFor="bf-town">
                <input id="bf-town" className={inputClass('town', errors)} value={form.town} onChange={(e) => updateField('town', e.target.value)} />
              </DonationFormRow>
            </DonationFormPair>

            <DonationFormPair>
              <DonationFormRow label={t('form.labels.district')} required error={errors.district} labelFor="bf-district">
                <input id="bf-district" className={inputClass('district', errors)} value={form.district} onChange={(e) => updateField('district', e.target.value)} />
              </DonationFormRow>
              <DonationFormRow label={t('form.labels.pin')} required error={errors.pin} labelFor="bf-pin">
                <input
                  id="bf-pin"
                  className={inputClass('pin', errors)}
                  inputMode="numeric"
                  maxLength={10}
                  value={form.pin}
                  onChange={(e) => updateField('pin', e.target.value.replace(/\D/g, ''))}
                />
              </DonationFormRow>
            </DonationFormPair>

            {errors.submit ? (
              <div className="mt-4">
                <Alert>{errors.submit}</Alert>
              </div>
            ) : null}

            <div className="donation-form-actions">
              <button
                type="submit"
                disabled={isSubmitting || books.length === 0 || selectedLines.length === 0}
                className="btn-primary donation-form-submit-btn !min-h-10 inline-flex items-center gap-2 !px-8 !py-2 !text-sm font-semibold"
              >
                {isSubmitting ? <InlineLoader size={22} /> : <BookOpen size={18} aria-hidden />}
                {isSubmitting ? t('books.saving') : t('books.proceedToPayment')}
              </button>
            </div>

            {books.length === 0 ? (
              <p className="mt-4 text-center text-sm text-muted">{t('books.noBooks')}</p>
            ) : null}
          </form>
        )}
      </div>
    </DonationLayout>
  );
}
