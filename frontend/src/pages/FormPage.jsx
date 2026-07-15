import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, CreditCard } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import DonationFormRow from '../components/DonationFormRow.jsx';
import DonationFormPair from '../components/DonationFormPair.jsx';
import PersonTitleSelect from '../components/PersonTitleSelect.jsx';
import AddressFieldsBlock from '../components/AddressFieldsBlock.jsx';
import FormChoiceGroup, { FormChoiceOption } from '../components/FormChoiceGroup.jsx';
import MobileNumberField from '../components/MobileNumberField.jsx';
import { DEFAULT_COUNTRY } from '../data/countries.js';
import { splitFullName } from '../utils/personName.js';
import {
  parseMobileFromStorage,
  validateNationalMobile,
  applyCountryToForm
} from '../utils/mobileNumber.js';
import { sanitizeFormField, validateIndianFormFields, maxLengthForField } from '../utils/formFieldValidation.js';
import { getCurrentUser, getMyFormSubmission, submitUserForm } from '../services/api.js';
import { getUserAuth } from '../utils/auth.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';
import {
  calculateSubscriptionTotals,
  countPublications,
  formatInr
} from '../utils/subscriptionPricing.js';
import { normalizePaymentStatus } from '../utils/subscriptionPeriod.js';

function pickSubscriptionEnd(sub) {
  if (!sub || typeof sub !== 'object') return null;
  const v =
    sub.subscription_end_at ??
    sub.subscriptionEndsAt ??
    sub.current_period_end ??
    sub.currentPeriodEnd ??
    sub.subscription_valid_until ??
    null;
  if (v == null || v === '') return null;
  return v;
}

function formatPeriodEnd(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 0 && value < 1e12 ? value * 1000 : value;
    const d = new Date(ms);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
  const d = new Date(String(value));
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

const initialForm = {
  title: '',
  firstName: '',
  lastName: '',
  subscriberNo: '',
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
  gender: '',
  rehbar: '',
  anandSandesh: '',
  spiritualBliss: '',
  subscription: ''
};

function inputClass(field, errors) {
  return `donation-input ${errors[field] ? 'donation-input--invalid' : ''}`;
}

/** Map API/DB row to local form state (inverse of buildPayload). */
function submissionToFormState(sub) {
  if (!sub) return null;
  let firstName = String(sub.first_name || '').trim();
  let lastName = String(sub.last_name || '').trim();
  if (!firstName && !lastName) {
    const split = splitFullName(sub.name);
    firstName = split.firstName;
    lastName = split.lastName;
  }

  let houseNo = String(sub.address_1 || sub.house_no || sub.address || '').trim();
  let street = String(sub.street || '').trim();
  let area = String(sub.area || '').trim();
  let postOffice = String(sub.post_office || sub.postOffice || '').trim();
  let landmark = String(sub.mark || sub.landmark || '').trim();

  if (!street || !area || !postOffice) {
    const a2 = String(sub.address_2 || '').trim();
    if (a2) {
      const lines = a2.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!street) street = lines[0] || '';
      if (!area) area = lines[1] || '';
      if (!postOffice) postOffice = lines[2] || '';
    }
  }

  if (!street && !area && !postOffice) {
    const legacyArea = String(sub.area || '').trim();
    if (legacyArea && legacyArea !== street) area = legacyArea;
  }

  if (!houseNo && street) {
    houseNo = street;
    street = '';
  }

  const sn = sub.subscriber_no != null ? String(sub.subscriber_no) : '';
  const country = String(sub.country || DEFAULT_COUNTRY).trim() || DEFAULT_COUNTRY;
  const { national: mobileNational } = parseMobileFromStorage(sub.mobile || sub.phone, country);

  return {
    title: String(sub.prefix || sub.title || '').trim(),
    firstName,
    lastName,
    subscriberNo: sn,
    mobile: mobileNational,
    email: String(sub.email || '').trim(),
    country: String(sub.country || DEFAULT_COUNTRY).trim() || DEFAULT_COUNTRY,
    careOf: String(sub.care_of || sub.careOf || '').trim(),
    houseNo,
    street,
    landmark,
    area,
    postOffice,
    state: String(sub.state || '').trim(),
    town: String(sub.town || '').trim(),
    district: String(sub.district || '').trim(),
    pin: String(sub.pin || '').trim(),
    gender: sub.gender === 'male' || sub.gender === 'female' ? sub.gender : '',
    rehbar: String(sub.rehbar || sub.through || '').trim(),
    anandSandesh:
      sub.anand_sandesh_lang === 'hindi' || sub.anand_sandesh_lang === 'english'
        ? sub.anand_sandesh_lang
        : '',
    spiritualBliss: sub.spiritual_bliss === 'english' ? 'english' : '',
    subscription:
      sub.subscription_type === 'yearly' || sub.subscription_type === 'five_year'
        ? sub.subscription_type
        : ''
  };
}

export default function FormPage() {
  useSeo({
    title: 'Subscribe — Anand Sandesh Karyalay | anandsandesh',
    description:
      'Complete your Anand Sandesh (anand sandesh) magazine subscription form at Shri Anandpur Dham — yearly or five-year plans.',
    canonical: 'https://anandsandeshkaryalay.online/form'
  });

  const { t } = useTranslation();
  const SUBSCRIPTION_LABELS = useMemo(
    () => ({ yearly: t('form.oneYear'), five_year: t('form.fiveYear') }),
    [t]
  );
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSubmissionId, setSavedSubmissionId] = useState(null);
  /** Latest row from GET /form/me — drives subscription / payment messaging. */
  const [submissionSnapshot, setSubmissionSnapshot] = useState(null);
  /** After first GET /form/me resolves — avoids flashing the full form before we know status. */
  const [submissionLoaded, setSubmissionLoaded] = useState(false);
  const [saveInfo, setSaveInfo] = useState('');

  const publicationCount = useMemo(
    () => countPublications(form),
    [form.anandSandesh, form.spiritualBliss]
  );
  const pricing = useMemo(
    () => calculateSubscriptionTotals(form.country, publicationCount),
    [form.country, publicationCount]
  );
  const oneYearPriceHint =
    publicationCount > 0
      ? t('form.oneYearPrice', { amount: formatInr(pricing.yearlyTotal) })
      : t('form.priceNeedsPublication');
  const fiveYearPriceHint =
    publicationCount > 0
      ? t('form.fiveYearPrice', { amount: formatInr(pricing.fiveYearTotal) })
      : t('form.priceNeedsPublication');

  useEffect(() => {
    const auth = getUserAuth();
    const email = auth?.user?.email || '';
    const fullName = auth?.user?.fullName?.trim() || '';
    const sub =
      auth?.user?.subscriberNo != null && auth?.user?.subscriberNo !== ''
        ? String(auth.user.subscriberNo)
        : '';

    const { firstName, lastName } = splitFullName(fullName);

    if (!email && !fullName) return;

    setForm((current) => ({
      ...current,
      email: current.email || email,
      firstName: current.firstName || firstName,
      lastName: current.lastName || lastName,
      subscriberNo: current.subscriberNo || sub
    }));
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Apply profile/subscriber as soon as this returns — do not wait for saved form fetch.
    getCurrentUser()
      .then((meRes) => {
        if (cancelled) return;
        const user = meRes?.user;
        if (user?.subscriberNo == null) return;
        setForm((c) => ({
          ...c,
          subscriberNo: c.subscriberNo || String(user.subscriberNo)
        }));
      })
      .catch(() => {
        // not signed in or network
      });

    getMyFormSubmission()
      .then((subRes) => {
        if (cancelled) return;
        const submission = subRes?.submission;
        const mapped = submission ? submissionToFormState(submission) : null;
        if (mapped && submission) {
          if (submission.id != null) setSavedSubmissionId(submission.id);
          setSubmissionSnapshot({
            id: submission.id,
            payment_status: normalizePaymentStatus(submission.payment_status, submission),
            subscription_type: submission.subscription_type,
            period_end: formatPeriodEnd(pickSubscriptionEnd(submission))
          });
        } else {
          setSubmissionSnapshot(null);
        }
        if (mapped) {
          setForm((c) => ({ ...c, ...mapped }));
        }
      })
      .catch(() => {
        // no saved row or network
      })
      .finally(() => {
        if (!cancelled) setSubmissionLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // After Razorpay, user may return to this tab — refresh payment_status only (do not overwrite the form).
  useEffect(() => {
    function onVisible() {
      if (document.visibilityState !== 'visible') return;
      getMyFormSubmission()
        .then((subRes) => {
          const submission = subRes?.submission;
          if (!submission) return;
          if (submission.id != null) setSavedSubmissionId(submission.id);
          setSubmissionSnapshot({
            id: submission.id,
            payment_status: normalizePaymentStatus(submission.payment_status, submission),
            subscription_type: submission.subscription_type,
            period_end: formatPeriodEnd(pickSubscriptionEnd(submission))
          });
        })
        .catch(() => {});
    }
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  function updateField(field, value) {
    const nextValue = sanitizeFormField(field, value);
    setForm((current) => ({ ...current, [field]: nextValue }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  function handleCountryChange(country) {
    setForm((current) => applyCountryToForm(current, country));
    setErrors((current) => ({ ...current, country: '', mobile: '', pin: '' }));
  }

  function validate() {
    const nextErrors = validateIndianFormFields(form, t, { requireRehbar: true, requireAddress: true });

    if (!form.mobile.trim()) nextErrors.mobile = t('form.errors.mobileRequired');
    else if (!validateNationalMobile(form.mobile, form.country).valid) {
      nextErrors.mobile = t('form.errors.mobileInvalid');
    }
    if (!form.email.trim()) nextErrors.email = t('form.errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = t('form.errors.emailInvalid');

    if (!form.country.trim()) nextErrors.country = t('form.errors.countryRequired');
    if (!form.pin.trim()) nextErrors.pin = t('form.errors.pinRequired');
    else if (!/^\d{4,10}$/.test(form.pin)) nextErrors.pin = t('form.errors.pinInvalid');
    if (!form.gender) nextErrors.gender = t('form.errors.genderRequired');
    if (!form.subscription) nextErrors.subscription = t('form.errors.subscriptionRequired');
    if (!form.subscriberNo.trim()) {
      nextErrors.subscriberNo = t('form.errors.subscriberMissing');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildPayload() {
    return {
      first_name: form.firstName.trim(),
      last_name: form.lastName.trim(),
      prefix: form.title.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      gender: form.gender,
      country: form.country.trim() || DEFAULT_COUNTRY,
      care_of: form.careOf.trim(),
      house_no: form.houseNo.trim(),
      street: form.street.trim(),
      area: form.area.trim(),
      post_office: form.postOffice.trim(),
      mark: form.landmark.trim(),
      address: form.houseNo.trim(),
      address_1: form.houseNo.trim(),
      town: form.town.trim(),
      district: form.district.trim(),
      state: form.state.trim(),
      pin: form.pin.trim(),
      rehbar: form.rehbar.trim(),
      anand_sandesh_lang: form.anandSandesh,
      spiritual_bliss: form.spiritualBliss === 'english' ? 'english' : '',
      subscription_type: form.subscription
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setApiError('');
    setSaveInfo('');
    if (!validate()) {
      // Validation errors are shown inline per-field; this message + scroll helps the user notice.
      setApiError(t('form.errors.fixHighlighted'));
      window.setTimeout(() => {
        const firstInvalid = document.querySelector('.donation-input--invalid');
        firstInvalid?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
        if (typeof firstInvalid?.focus === 'function') firstInvalid.focus();
      }, 0);
      return;
    }

    const payload = buildPayload();
    const formData = new FormData();
    Object.entries(payload).forEach(([key, value]) => formData.append(key, value));
    if (savedSubmissionId != null) {
      formData.append('submissionId', String(savedSubmissionId));
    }

    const alreadyVerified = submissionSnapshot?.payment_status === 'verified';

    setIsSubmitting(true);
    try {
      const data = await submitUserForm(formData);
      const submissionId = data.submission?.id;
      if (!submissionId) throw new Error(t('form.errors.couldNotSave'));
      if (data.submission?.payment_status != null) {
        setSubmissionSnapshot((prev) => ({
          ...(prev || {}),
          id: submissionId,
          payment_status: normalizePaymentStatus(data.submission.payment_status, data.submission),
          subscription_type: data.submission.subscription_type ?? prev?.subscription_type,
          period_end: formatPeriodEnd(pickSubscriptionEnd(data.submission)) ?? prev?.period_end
        }));
      }
      if (alreadyVerified) {
        setSaveInfo(t('form.saveSuccess'));
        return;
      }
      navigate('/payment', { state: { submissionId, subscriptionType: form.subscription } });
    } catch (err) {
      setApiError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <DonationLayout subtitle={t('form.subtitle')}>
      {isSubmitting ? <LoadingBlock label={t('loaders.savingForm')} /> : null}
      <div className="donation-form-shell mx-auto w-full">
        {!submissionLoaded ? (
          <LoadingBlock label={t('loaders.loadingSubmission')} />
        ) : submissionSnapshot?.payment_status === 'verified' ? (
          <div className="donation-form-banner mx-auto max-w-xl space-y-4 text-center sm:text-left">
            <div className="flex justify-center sm:justify-start">
              <CheckCircle2 className="h-14 w-14 text-primary" aria-hidden />
            </div>
            <Alert type="success">
              <span className="font-black">{t('form.verifiedTitle')}</span>{' '}
              {t('form.verifiedPaidPrefix')} {SUBSCRIPTION_LABELS[submissionSnapshot.subscription_type] || 'Anand Sandesh'} {t('form.verifiedPaidSuffix')}
              {submissionSnapshot.period_end ? (
                <>
                  {' '}
                  {t('form.verifiedPeriodPrefix')} <span className="whitespace-nowrap font-semibold">{submissionSnapshot.period_end}</span>{t('form.verifiedPeriodSuffix')}
                </>
              ) : (
                t('form.verifiedRenews')
              )}
            </Alert>
            <p className="text-sm leading-relaxed text-muted">
              {t('form.verifiedSecondary')}
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                to="/profile"
                className="btn-primary inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold"
              >
                {t('profile.editAddress')}
              </Link>
              <Link
                to="/profile"
                className="btn-secondary inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold"
              >
                {t('common.backToProfile')}
              </Link>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="donation-form form-color-theme">
          {submissionSnapshot ? (
            <div className="donation-form-banner mb-2">
              <Alert type="warning">
                <span className="font-black">{t('form.pendingPaymentPrefix')}</span> {t('form.pendingPaymentBody')}
              </Alert>
            </div>
          ) : null}
          {saveInfo ? (
            <div className="donation-form-banner mb-2">
              <Alert type="success">{saveInfo}</Alert>
            </div>
          ) : null}
          {apiError ? (
            <div className="donation-form-banner mb-2">
              <Alert>{apiError}</Alert>
            </div>
          ) : null}

          <section
            className="donation-form-section donation-form-section--teal donation-form-section--personal"
            aria-labelledby="df-personal-heading"
          >
            <h2 id="df-personal-heading" className="donation-form-section-title">
              {t('form.personalSectionTitle')}
            </h2>

            <DonationFormPair className="donation-form-pair--name">
              <DonationFormRow
                label={t('form.labels.title')}
                optional={t('common.optional')}
                error={errors.title}
                labelFor="df-title"
              >
                <PersonTitleSelect
                  id="df-title"
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                  invalid={Boolean(errors.title)}
                />
              </DonationFormRow>

              <DonationFormRow
                label={t('form.labels.firstName')}
                required
                error={errors.firstName}
                labelFor="df-firstName"
              >
                <input
                  id="df-firstName"
                  className={inputClass('firstName', errors)}
                  value={form.firstName}
                  onChange={(e) => updateField('firstName', e.target.value)}
                  maxLength={maxLengthForField('firstName')}
                  autoComplete="given-name"
                />
              </DonationFormRow>

              <DonationFormRow
                label={t('form.labels.lastName')}
                required
                error={errors.lastName}
                labelFor="df-lastName"
              >
                <input
                  id="df-lastName"
                  className={inputClass('lastName', errors)}
                  value={form.lastName}
                  onChange={(e) => updateField('lastName', e.target.value)}
                  maxLength={maxLengthForField('lastName')}
                  autoComplete="family-name"
                />
              </DonationFormRow>
            </DonationFormPair>

            <DonationFormPair>
              <DonationFormRow
                label={t('form.labels.careOf')}
                optional={t('common.optional')}
                error={errors.careOf}
                labelFor="df-careOf"
              >
                <input
                  id="df-careOf"
                  className={inputClass('careOf', errors)}
                  value={form.careOf}
                  onChange={(e) => updateField('careOf', e.target.value)}
                  maxLength={maxLengthForField('careOf')}
                  placeholder={t('form.placeholders.careOf')}
                  autoComplete="off"
                />
              </DonationFormRow>

              <DonationFormRow label={t('form.labels.gender')} required error={errors.gender} labelFor="df-gender">
                <select
                  id="df-gender"
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
              <DonationFormRow
                label={t('form.labels.subscriberNo')}
                error={errors.subscriberNo}
                labelFor="df-subscriberNo"
              >
                <input
                  id="df-subscriberNo"
                  className={`donation-input donation-input--readonly-subscriber ${errors.subscriberNo ? 'donation-input--invalid' : ''}`}
                  value={form.subscriberNo}
                  readOnly
                  aria-readonly="true"
                  autoComplete="off"
                  title={t('form.subscriberNoTitle')}
                />
              </DonationFormRow>

              <DonationFormRow label={t('form.labels.email')} required error={errors.email} labelFor="df-email">
                <p id="df-email-hint" className="sr-only">
                  {t('form.emailHint')}
                </p>
                <input
                  id="df-email"
                  type="email"
                  className={`${inputClass('email', errors)} donation-input--readonly`}
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  autoComplete="email"
                  title={t('form.emailTitle')}
                  aria-describedby="df-email-hint"
                  readOnly
                />
              </DonationFormRow>
            </DonationFormPair>

            <DonationFormPair>
              <DonationFormRow label={t('form.labels.mobile')} required error={errors.mobile} labelFor="df-mobile">
                <MobileNumberField
                  id="df-mobile"
                  country={form.country}
                  onCountryChange={handleCountryChange}
                  value={form.mobile}
                  onChange={(value) => updateField('mobile', value)}
                  errors={errors}
                  hint={false}
                />
              </DonationFormRow>

              <DonationFormRow label={t('form.labels.rehbar')} required error={errors.rehbar} labelFor="df-rehbar">
                <input
                  id="df-rehbar"
                  className={inputClass('rehbar', errors)}
                  value={form.rehbar}
                  onChange={(e) => updateField('rehbar', e.target.value)}
                  maxLength={maxLengthForField('rehbar')}
                />
              </DonationFormRow>
            </DonationFormPair>
          </section>

          <AddressFieldsBlock
            form={form}
            errors={errors}
            updateField={updateField}
            setForm={setForm}
            onCountryChange={handleCountryChange}
            idPrefix="df"
          />

          <section className="donation-form-section donation-form-section--purple" aria-labelledby="df-preferences-heading">
            <h2 id="df-preferences-heading" className="donation-form-section-title">
              {t('form.preferencesSectionTitle')}
            </h2>

            <DonationFormPair className="donation-form-pair--choices">
              <FormChoiceGroup legend={t('form.labels.anandSandesh')}>
                <FormChoiceOption
                  name="anandSandesh"
                  value="hindi"
                  checked={form.anandSandesh === 'hindi'}
                  allowDeselect
                  onChange={(e) => updateField('anandSandesh', e.target.value || '')}
                  title={t('common.hindi')}
                />
                <FormChoiceOption
                  name="anandSandesh"
                  value="english"
                  checked={form.anandSandesh === 'english'}
                  allowDeselect
                  onChange={(e) => updateField('anandSandesh', e.target.value || '')}
                  title={t('common.english')}
                />
              </FormChoiceGroup>

              <FormChoiceGroup legend={t('form.labels.spiritualBliss')}>
                <FormChoiceOption
                  type="checkbox"
                  name="spiritualBliss"
                  value="english"
                  checked={form.spiritualBliss === 'english'}
                  onChange={(e) => updateField('spiritualBliss', e.target.checked ? 'english' : '')}
                  title={t('common.english')}
                  hint={t('form.optionalEnglishOnly')}
                />
              </FormChoiceGroup>
            </DonationFormPair>
          </section>

          <section className="donation-form-section donation-form-section--amber" aria-labelledby="df-subscription-heading">
            <h2 id="df-subscription-heading" className="donation-form-section-title">
              {t('form.labels.subscription')}
            </h2>

            <FormChoiceGroup
              legend={t('form.subscriptionLegend')}
              required
              error={errors.subscription}
              invalid={Boolean(errors.subscription)}
            >
              <FormChoiceOption
                name="subscription"
                value="yearly"
                checked={form.subscription === 'yearly'}
                onChange={() => updateField('subscription', 'yearly')}
                title={t('form.oneYear')}
                hint={oneYearPriceHint}
              />
              <FormChoiceOption
                name="subscription"
                value="five_year"
                checked={form.subscription === 'five_year'}
                onChange={() => updateField('subscription', 'five_year')}
                title={t('form.fiveYear')}
                hint={fiveYearPriceHint}
              />
            </FormChoiceGroup>
          </section>

          <div className="donation-form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className="form-submit-teal donation-form-submit-btn inline-flex items-center justify-center gap-2"
            >
              {isSubmitting ? <InlineLoader size={22} /> : <CreditCard size={18} aria-hidden />}
              {isSubmitting ? t('form.saving') : t('form.proceedToPayment')}
            </button>
          </div>
        </form>
        )}
      </div>
    </DonationLayout>
  );
}
