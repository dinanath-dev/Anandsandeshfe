import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, X } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import BookOrderStepper from '../components/BookOrderStepper.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import DonationFormRow from '../components/DonationFormRow.jsx';
import DonationFormPair from '../components/DonationFormPair.jsx';
import BookSearchSelect from '../components/BookSearchSelect.jsx';
import AddressFieldsBlock from '../components/AddressFieldsBlock.jsx';
import MobileNumberField from '../components/MobileNumberField.jsx';
import { DEFAULT_COUNTRY } from '../data/countries.js';
import { BOOK_PICKUP_COUNTERS } from '../constants/bookCounters.js';
import { validateNationalMobile, applyCountryToForm } from '../utils/mobileNumber.js';
import { namesFromSubmission } from '../utils/personName.js';
import { createBookOrder, getBooks, getCurrentUser, getMyFormSubmission } from '../services/api.js';
import { getUserAuth } from '../utils/auth.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';
import {
  draftFromBookOrder,
  loadBookOrderDraft,
  saveBookOrderDraft
} from '../utils/bookOrderDraft.js';

const FULFILLMENT_MODES = ['counter_sale', 'home_delivery'];

const initialForm = {
  name: '',
  counter: '',
  mobile: '',
  email: '',
  country: DEFAULT_COUNTRY,
  careOf: '',
  houseNo: '',
  street: '',
  landmark: '',
  area: '',
  postOffice: '',
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

function bookUnitPrice(book, fulfillmentMode) {
  if (fulfillmentMode === 'counter_sale') {
    return Number(book.counter_sale_rate ?? book.sales_rate) || 0;
  }
  return Number(book.home_delivery_rate) || 0;
}

function fulfillmentLabel(mode, t) {
  return mode === 'counter_sale' ? t('books.counterSale') : t('books.homeDelivery');
}

function profileContactFromSources(user, submission) {
  const fromSub = submission ? namesFromSubmission(submission) : null;
  const name =
    fromSub?.fullName ||
    String(user?.fullName || user?.name || '').trim();
  const mobile = String(submission?.mobile || submission?.phone || user?.mobile || '').trim();
  const gender =
    submission?.gender === 'male' || submission?.gender === 'female' ? submission.gender : '';
  return { name, mobile, gender };
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
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initialForm);
  const [fulfillmentMode, setFulfillmentMode] = useState('counter_sale');
  const [cart, setCart] = useState({});
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState('');
  const profileContactRef = useRef({ name: '', mobile: '', gender: '' });

  const isHomeDelivery = fulfillmentMode === 'home_delivery';
  const isCounterSale = fulfillmentMode === 'counter_sale';

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
        (sum, line) => sum + bookUnitPrice(line.book, fulfillmentMode) * line.quantity,
        0
      ),
    [selectedLines, fulfillmentMode]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [booksData, userData, submissionData] = await Promise.all([
          getBooks(),
          getCurrentUser().catch(() => null),
          getMyFormSubmission().catch(() => null)
        ]);
        if (cancelled) return;
        setBooks(booksData?.books || []);

        const routeDraft = location.state?.bookDraft;
        const storedDraft = routeDraft || loadBookOrderDraft();

        if (storedDraft?.form) {
          const draftForm = { ...initialForm, ...storedDraft.form };
          if (!draftForm.houseNo && draftForm.address) {
            draftForm.houseNo = String(draftForm.address).trim();
          }
          setForm(draftForm);
          setCart(storedDraft.cart && typeof storedDraft.cart === 'object' ? storedDraft.cart : {});
          if (FULFILLMENT_MODES.includes(storedDraft.fulfillmentMode)) {
            setFulfillmentMode(storedDraft.fulfillmentMode);
            setStep(storedDraft.step === 1 ? 1 : 2);
          }
          return;
        }

        const auth = getUserAuth();
        const user = userData?.user || auth?.user || {};
        const submission = submissionData?.submission || null;
        const profileContact = profileContactFromSources(user, submission);
        profileContactRef.current = profileContact;

        setForm((prev) => ({
          ...prev,
          name: profileContact.name || prev.name,
          mobile: profileContact.mobile || prev.mobile,
          email: String(user.email || auth?.user?.email || '').trim() || prev.email,
          gender: profileContact.gender || prev.gender
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

  useEffect(() => {
    if (!isCounterSale) return;
    const { name, mobile, gender } = profileContactRef.current;
    setForm((prev) => ({
      ...prev,
      name: name || prev.name,
      mobile: mobile || prev.mobile,
      gender: gender || prev.gender
    }));
  }, [isCounterSale]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: '' }));
  }

  function handleCountryChange(country) {
    setForm((current) => applyCountryToForm(current, country));
    setErrors((current) => ({ ...current, country: '', mobile: '', pin: '' }));
  }

  function selectFulfillmentMode(mode) {
    if (!FULFILLMENT_MODES.includes(mode)) return;
    setFulfillmentMode(mode);
    setErrors((prev) => ({ ...prev, fulfillmentMode: '' }));
  }

  function goToStep1() {
    setStep(1);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep1() {
    const next = {};
    if (!FULFILLMENT_MODES.includes(fulfillmentMode)) {
      next.fulfillmentMode = t('books.errors.fulfillmentRequired');
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleStep1Continue() {
    if (!validateStep1()) return;
    setStep(2);
    setErrors({});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function addBook(bookId) {
    setCart((prev) => ({ ...prev, [bookId]: prev[bookId] || 1 }));
    setErrors((prev) => ({ ...prev, books: '' }));
  }

  function removeBook(bookId) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[bookId];
      return next;
    });
  }

  function updateBookQuantity(bookId, rawValue) {
    const qty = Math.max(1, Math.min(10, Number(rawValue) || 1));
    setCart((prev) => ({ ...prev, [bookId]: qty }));
  }

  function validateStep2() {
    const next = {};
    if (selectedLines.length === 0) next.books = t('books.errors.bookRequired');
    if (!form.name.trim()) next.name = t('form.errors.nameRequired');
    if (!form.gender) next.gender = t('form.errors.genderRequired');
    if (!validateNationalMobile(form.mobile, form.country).valid) next.mobile = t('form.errors.mobileInvalid');
    if (!form.email.trim()) next.email = t('form.errors.emailRequired');

    if (isCounterSale) {
      if (!BOOK_PICKUP_COUNTERS.includes(form.counter)) {
        next.counter = t('books.errors.counterRequired');
      }
    }

    if (isHomeDelivery) {
      if (!form.houseNo.trim()) next.houseNo = t('form.errors.houseNoRequired');
      if (!form.street.trim()) next.street = t('form.errors.streetRequired');
      if (!form.area.trim()) next.area = t('form.errors.areaRequired');
      if (!form.postOffice.trim()) next.postOffice = t('form.errors.postOfficeRequired');
      if (!form.country.trim()) next.country = t('form.errors.countryRequired');
      if (!form.state) next.state = t('form.errors.stateRequired');
      if (!form.town.trim()) next.town = t('form.errors.required');
      if (!form.district.trim()) next.district = t('form.errors.districtRequired');
      if (!/^\d{4,10}$/.test(form.pin)) next.pin = t('form.errors.pinInvalid');
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleStep2Submit(e) {
    e.preventDefault();
    if (!validateStep2()) return;
    setIsSubmitting(true);
    try {
      const items = selectedLines.map(({ book, quantity }) => ({
        book_id: book.id,
        quantity
      }));
      const payload = {
        fulfillment_mode: fulfillmentMode,
        items,
        name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        gender: form.gender
      };

      if (isCounterSale) {
        payload.pickup_counter = form.counter;
      }

      if (isHomeDelivery) {
        Object.assign(payload, {
          house_no: form.houseNo.trim(),
          street: form.street.trim(),
          area: form.area.trim(),
          post_office: form.postOffice.trim(),
          mark: form.landmark.trim(),
          address: form.houseNo.trim(),
          address_1: form.houseNo.trim(),
          country: form.country.trim() || DEFAULT_COUNTRY,
          town: form.town.trim(),
          district: form.district.trim(),
          state: form.state,
          pin: form.pin.trim()
        });
      }

      const data = await createBookOrder(payload);
      const orderId = data?.order?.id;
      if (!orderId) throw new Error(t('books.errors.orderFailed'));

      const draft = {
        form: { ...form },
        cart: { ...cart },
        fulfillmentMode,
        step: 2,
        bookOrderId: orderId
      };
      saveBookOrderDraft(draft);

      navigate('/books/payment', {
        state: {
          bookOrderId: orderId,
          bookName: data.order.book_name,
          fulfillmentMode: data.order.fulfillment_mode || fulfillmentMode,
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

        <BookOrderStepper currentStep={step} t={t} />

        {loadError ? (
          <Alert>{loadError}</Alert>
        ) : step === 1 ? (
          <div className="book-order-card">
            <h3 className="book-order-section-title">{t('books.fulfillmentHeading')}</h3>
            <div className="book-order-fulfillment" role="radiogroup" aria-label={t('books.fulfillmentHeading')}>
              <button
                type="button"
                className={`book-order-mode-card book-order-mode-card--featured ${fulfillmentMode === 'counter_sale' ? 'is-selected' : ''}`}
                onClick={() => selectFulfillmentMode('counter_sale')}
                aria-pressed={fulfillmentMode === 'counter_sale'}
              >
                <span className="book-order-mode-card-title">{t('books.counterSale')}</span>
                <span className="book-order-mode-card-help">{t('books.counterSaleHelp')}</span>
              </button>

              {fulfillmentMode === 'home_delivery' ? (
                <div className="book-order-mode-secondary">
                  <button
                    type="button"
                    className="book-order-mode-card book-order-mode-card--compact is-selected"
                    onClick={() => selectFulfillmentMode('home_delivery')}
                    aria-pressed
                  >
                    <span className="book-order-mode-card-title">{t('books.homeDelivery')}</span>
                    <span className="book-order-mode-card-help">{t('books.homeDeliveryHelp')}</span>
                  </button>
                  <button
                    type="button"
                    className="book-order-mode-alt-link"
                    onClick={() => selectFulfillmentMode('counter_sale')}
                  >
                    {t('books.counterSaleInstead')}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="book-order-mode-alt-link"
                  onClick={() => selectFulfillmentMode('home_delivery')}
                >
                  {t('books.homeDeliveryInstead')}
                </button>
              )}
            </div>
            {errors.fulfillmentMode ? (
              <p className="donation-form-hint mt-2">{errors.fulfillmentMode}</p>
            ) : null}

            <div className="book-order-nav-actions !justify-end">
              <button
                type="button"
                className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-8 py-2.5 text-sm font-semibold"
                onClick={handleStep1Continue}
              >
                {t('books.continueBtn')} <ArrowRight size={18} aria-hidden />
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleStep2Submit} className="donation-form book-order-form" noValidate>
            <section className="book-order-card">
              <p className="book-order-selected-mode">
                {t('books.selectedModeLabel')}: {fulfillmentLabel(fulfillmentMode, t)}
              </p>
              <h3 className="book-order-section-title">{t('books.selectBooks')}</h3>
              {books.length === 0 ? (
                <p className="mt-2 text-center text-sm text-muted">{t('books.noBooks')}</p>
              ) : (
                <DonationFormRow
                  label={t('books.selectBook')}
                  required
                  error={errors.books}
                  labelFor="bf-books"
                >
                  <BookSearchSelect
                    books={books}
                    cart={cart}
                    fulfillmentMode={fulfillmentMode}
                    onSelectBook={addBook}
                    formatInr={formatInr}
                    bookUnitPrice={bookUnitPrice}
                    placeholder={t('books.searchBooksPlaceholder')}
                    noResultsText={t('books.noBooksMatch')}
                    invalid={Boolean(errors.books)}
                  />
                </DonationFormRow>
              )}
              {errors.books ? <p className="donation-form-hint mt-1">{errors.books}</p> : null}
            </section>

            {selectedLines.length > 0 ? (
              <section className="book-order-cart" aria-live="polite">
                <p className="book-order-section-title !mb-2">{t('books.cartSummary')}</p>
                <ul className="space-y-2 text-sm text-ink">
                  {selectedLines.map(({ book, quantity }) => {
                    const unitTotal = bookUnitPrice(book, fulfillmentMode);
                    return (
                      <li
                        key={book.id}
                        className="flex flex-col gap-2 rounded-lg border border-primary/10 bg-white/80 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-semibold">{book.name}</span>
                          {book.measurements ? (
                            <span className="mt-0.5 block text-xs text-muted">{book.measurements}</span>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            max={10}
                            className="donation-input !w-14 !min-w-0 !rounded-lg !py-1 !text-center !text-sm"
                            value={quantity}
                            onChange={(e) => updateBookQuantity(book.id, e.target.value)}
                            aria-label={t('books.quantity')}
                          />
                          <span className="min-w-[4.5rem] tabular-nums text-right font-bold text-primary">
                            {formatInr(unitTotal * quantity)}
                          </span>
                          <button
                            type="button"
                            className="book-order-cart-remove"
                            onClick={() => removeBook(book.id)}
                            aria-label={`${t('books.removeBook')} ${book.name}`}
                          >
                            <X size={16} aria-hidden />
                          </button>
                        </div>
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
              <h3 className="book-order-section-title">
                {isHomeDelivery ? t('books.deliveryDetails') : t('books.contactDetails')}
              </h3>

              <DonationFormPair>
                <DonationFormRow label={t('form.labels.name')} required error={errors.name} labelFor="bf-name">
                  <input
                    id="bf-name"
                    className={inputClass('name', errors)}
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    autoComplete="name"
                    readOnly={isCounterSale && Boolean(form.name.trim())}
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

              {isHomeDelivery ? (
                <DonationFormPair className="donation-form-pair--single">
                  <DonationFormRow
                    label={t('form.labels.careOf')}
                    optional={t('common.optional')}
                    error={errors.careOf}
                    labelFor="bf-careOf"
                  >
                    <input
                      id="bf-careOf"
                      className={inputClass('careOf', errors)}
                      value={form.careOf}
                      onChange={(e) => updateField('careOf', e.target.value)}
                      placeholder={t('form.placeholders.careOf')}
                      autoComplete="off"
                    />
                  </DonationFormRow>
                </DonationFormPair>
              ) : null}

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

              {isHomeDelivery ? (
                <AddressFieldsBlock
                  form={form}
                  errors={errors}
                  updateField={updateField}
                  setForm={setForm}
                  onCountryChange={handleCountryChange}
                  idPrefix="bf"
                  showSectionTitle={false}
                />
              ) : (
                <>
                  <DonationFormPair className="donation-form-pair--single">
                    <DonationFormRow
                      label={t('books.pickupCounter')}
                      required
                      error={errors.counter}
                      labelFor="bf-counter"
                    >
                      <div className="relative">
                        <select
                          id="bf-counter"
                          className={`${inputClass('counter', errors)} appearance-none pr-10`}
                          value={form.counter}
                          onChange={(e) => updateField('counter', e.target.value)}
                        >
                          <option value="">{t('books.selectCounter')}</option>
                          {BOOK_PICKUP_COUNTERS.map((code) => (
                            <option key={code} value={code}>
                              {code}
                            </option>
                          ))}
                        </select>
                        <ChevronDown
                          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                          aria-hidden
                        />
                      </div>
                    </DonationFormRow>
                  </DonationFormPair>
                  <p className="mt-2 text-sm text-muted">{t('books.counterSalePickupNote')}</p>
                </>
              )}
            </section>

            {errors.submit ? <Alert>{errors.submit}</Alert> : null}

            <div className="book-order-nav-actions">
              <button
                type="button"
                className="btn-secondary inline-flex min-h-11 items-center gap-2 px-6 py-2.5 text-sm font-semibold"
                onClick={goToStep1}
                disabled={isSubmitting}
              >
                <ArrowLeft size={18} aria-hidden /> {t('books.backBtn')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting || books.length === 0 || selectedLines.length === 0}
                className="btn-primary donation-form-submit-btn !min-h-11 inline-flex items-center justify-center gap-2 !px-8 !py-2.5 !text-sm font-semibold"
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
