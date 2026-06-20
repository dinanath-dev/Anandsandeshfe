import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import DonationFormRow from '../components/DonationFormRow.jsx';
import DonationFormPair from '../components/DonationFormPair.jsx';
import AddressFieldsBlock from '../components/AddressFieldsBlock.jsx';
import MobileNumberField from '../components/MobileNumberField.jsx';
import { DEFAULT_COUNTRY } from '../data/countries.js';
import { validateNationalMobile, applyCountryToForm } from '../utils/mobileNumber.js';
import { createBookOrder, getBooks, getCurrentUser } from '../services/api.js';
import { getUserAuth } from '../utils/auth.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';
import {
  draftFromBookOrder,
  loadBookOrderDraft,
  saveBookOrderDraft
} from '../utils/bookOrderDraft.js';

const initialForm = {
  name: '',
  mobile: '',
  email: '',
  country: DEFAULT_COUNTRY,
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
    <div className="book-order-breakdown">
      <dl>
        {weight ? (
          <>
            <dt>{t('books.weight')}</dt>
            <dd>{weight}</dd>
          </>
        ) : null}
        <dt>{t('books.bookRate')}</dt>
        <dd>{formatInr(rate)}</dd>
        <dt>{t('books.postage')}</dt>
        <dd>{formatInr(postage)}</dd>
        <dt>{t('books.gstOnPostage')}</dt>
        <dd>{formatInr(gst)}</dd>
        <dt>{t('books.totalPostage')}</dt>
        <dd>{formatInr(totalPostage)}</dd>
        <dt className="is-total">{t('books.payableTotal')}</dt>
        <dd className="is-total">
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
  const location = useLocation();
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

        const routeDraft = location.state?.bookDraft;
        const storedDraft = routeDraft || loadBookOrderDraft();

        if (storedDraft?.form) {
          setForm({ ...initialForm, ...storedDraft.form });
          setCart(storedDraft.cart && typeof storedDraft.cart === 'object' ? storedDraft.cart : {});
          return;
        }

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
  }, [t, location.state]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function handleCountryChange(country) {
    setForm((current) => applyCountryToForm(current, country));
    setErrors((current) => ({ ...current, country: '', mobile: '', pin: '' }));
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
    if (!validateNationalMobile(form.mobile, form.country).valid) next.mobile = t('form.errors.mobileInvalid');
    if (!form.email.trim()) next.email = t('form.errors.emailRequired');
    if (!form.address.trim()) next.address = t('form.errors.addressRequired');
    if (!form.country.trim()) next.country = t('form.errors.countryRequired');
    if (!form.state) next.state = t('form.errors.stateRequired');
    if (!form.town.trim()) next.town = t('form.errors.required');
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
        country: form.country.trim() || DEFAULT_COUNTRY,
        town: form.town.trim(),
        district: form.district.trim(),
        state: form.state,
        pin: form.pin.trim()
      });
      const orderId = data?.order?.id;
      if (!orderId) throw new Error(t('books.errors.orderFailed'));

      const draft = { form: { ...form }, cart: { ...cart }, bookOrderId: orderId };
      saveBookOrderDraft(draft);

      navigate('/books/payment', {
        state: {
          bookOrderId: orderId,
          bookName: data.order.book_name,
          orderItems: data.order.order_items || items,
          totalPaise: data.order.total_amount_paise,
          bookDraft: draft
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
      <div className="book-order-shell mx-auto max-w-3xl px-2 py-4 sm:px-4">
        <div>
          <Link to="/profile" className="text-sm font-semibold text-primary hover:underline">
            ← {t('books.backToProfile')}
          </Link>
        </div>

        {loadError ? (
          <Alert>{loadError}</Alert>
        ) : (
          <form onSubmit={handleSubmit} className="donation-form book-order-form" noValidate>
            <section className="book-order-card">
              <h3 className="book-order-section-title">{t('books.selectBooks')}</h3>
              <div
                id="bf-books"
                className={`book-order-catalog ${errors.books ? '!border-red-400' : ''}`}
                aria-invalid={Boolean(errors.books)}
              >
                {books.map((b) => {
                  const selected = cart[b.id] > 0;
                  return (
                    <div
                      key={b.id}
                      className={`book-order-book-row ${selected ? 'book-order-book-row--selected' : ''}`}
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
                        <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
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
              {errors.books ? <p className="donation-form-hint mt-1">{errors.books}</p> : null}

              {books.length === 0 ? (
                <p className="mt-2 text-center text-sm text-muted">{t('books.noBooks')}</p>
              ) : null}
            </section>

            {selectedLines.length > 0 ? (
              <section className="book-order-cart" aria-live="polite">
                <p className="book-order-section-title !mb-2">{t('books.cartSummary')}</p>
                <ul className="space-y-2 text-sm text-ink">
                  {selectedLines.map(({ book, quantity }) => {
                    const unitTotal = Number(book.total_price ?? book.sales_rate);
                    return (
                      <li
                        key={book.id}
                        className="flex flex-col gap-0.5 rounded-lg border border-primary/10 bg-white/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <span className="min-w-0 font-semibold">
                          {book.name} × {quantity}
                        </span>
                        <span className="shrink-0 text-sm">
                          <span className="tabular-nums font-bold text-primary">{formatInr(unitTotal * quantity)}</span>
                          <span className="ml-2 text-xs font-normal text-muted">
                            ({formatInr(book.sales_rate)} + {formatInr(book.total_postage ?? 0)} {t('books.totalPostage').toLowerCase()})
                          </span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="book-order-cart-total">
                  <span>{t('books.totalLabel')}</span>
                  <span className="tabular-nums text-lg">{formatInr(cartTotal)}</span>
                </div>
              </section>
            ) : null}

            <section className="book-order-card">
              <h3 className="book-order-section-title">{t('books.deliveryDetails')}</h3>

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
              </DonationFormPair>

              <DonationFormPair>
                <DonationFormRow label={t('form.labels.mobile')} required error={errors.mobile} labelFor="bf-mobile">
                  <MobileNumberField
                    id="bf-mobile"
                    country={form.country}
                    onCountryChange={handleCountryChange}
                    value={form.mobile}
                    onChange={(value) => updateField('mobile', value)}
                    errors={errors}
                  />
                </DonationFormRow>
                <DonationFormRow label={t('form.labels.email')} required error={errors.email} labelFor="bf-email">
                  <input id="bf-email" type="email" className={inputClass('email', errors)} value={form.email} readOnly />
                </DonationFormRow>
              </DonationFormPair>

              <AddressFieldsBlock
                form={form}
                errors={errors}
                updateField={updateField}
                setForm={setForm}
                onCountryChange={handleCountryChange}
                idPrefix="bf"
                showSectionTitle={false}
              />
            </section>

            {errors.submit ? (
              <Alert>{errors.submit}</Alert>
            ) : null}

            <div className="donation-form-actions">
              <button
                type="submit"
                disabled={isSubmitting || books.length === 0 || selectedLines.length === 0}
                className="btn-primary donation-form-submit-btn !min-h-11 inline-flex w-full max-w-md items-center justify-center gap-2 !px-8 !py-2.5 !text-sm font-semibold sm:w-auto"
              >
                {isSubmitting ? <InlineLoader size={22} /> : <BookOpen size={18} aria-hidden />}
                {isSubmitting ? t('books.saving') : t('books.proceedToPayment')}
              </button>
            </div>
          </form>
        )}
      </div>
    </DonationLayout>
  );
}
