import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, CreditCard, LogOut } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import DonationFormRow from '../components/DonationFormRow.jsx';
import DonationFormPair from '../components/DonationFormPair.jsx';
import { INDIAN_STATES } from '../data/indianStates.js';
import { getCurrentUser, getMyFormSubmission, submitUserForm } from '../services/api.js';
import { clearPendingOtp, clearUserAuth, getUserAuth } from '../utils/auth.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

/** Normalize API payment_status so verified subscriptions never show as “pending” in the UI. */
function normalizePaymentStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'verified' || s === 'paid' || s === 'active') return 'verified';
  return 'pending';
}

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
  name: '',
  subscriberNo: '',
  mobile: '',
  email: '',
  address: '',
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
  const name = String(sub.name || '').trim();

  let addressLine = String(sub.address_1 || sub.house_no || '').trim();
  if (!addressLine) {
    const parts = [];
    const a2 = String(sub.address_2 || '').trim();
    if (a2) parts.push(a2);
    else {
      const street = String(sub.street || '').trim();
      const area = String(sub.area || '').trim();
      if (street && area && street !== area) parts.push(street, area);
      else if (street || area) parts.push(street || area);
    }
    addressLine = parts.filter(Boolean).join('\n');
  }

  const sn = sub.subscriber_no != null ? String(sub.subscriber_no) : '';

  return {
    name,
    subscriberNo: sn,
    mobile: String(sub.mobile || '').trim(),
    email: String(sub.email || '').trim(),
    address: addressLine,
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

  useEffect(() => {
    const auth = getUserAuth();
    const email = auth?.user?.email || '';
    const fullName = auth?.user?.fullName?.trim() || '';
    const sub =
      auth?.user?.subscriberNo != null && auth?.user?.subscriberNo !== ''
        ? String(auth.user.subscriberNo)
        : '';

    if (!email && !fullName) return;

    setForm((current) => ({
      ...current,
      email: current.email || email,
      name: current.name || fullName,
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
            payment_status: normalizePaymentStatus(submission.payment_status),
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
            payment_status: normalizePaymentStatus(submission.payment_status),
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
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = t('form.errors.nameRequired');
    if (!form.mobile.trim()) nextErrors.mobile = t('form.errors.mobileRequired');
    else if (!/^\d{10}$/.test(form.mobile)) nextErrors.mobile = t('form.errors.mobileInvalid');
    if (!form.email.trim()) nextErrors.email = t('form.errors.emailRequired');
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) nextErrors.email = t('form.errors.emailInvalid');

    if (!form.address.trim()) nextErrors.address = t('form.errors.addressRequired');
    if (!form.state.trim()) nextErrors.state = t('form.errors.stateRequired');
    if (!form.town.trim()) nextErrors.town = t('form.errors.required');
    if (!form.district.trim()) nextErrors.district = t('form.errors.districtRequired');
    if (!form.pin.trim()) nextErrors.pin = t('form.errors.pinRequired');
    else if (!/^\d{4,10}$/.test(form.pin)) nextErrors.pin = t('form.errors.pinInvalid');
    if (!form.gender) nextErrors.gender = t('form.errors.genderRequired');
    if (!form.rehbar.trim()) nextErrors.rehbar = t('form.errors.rehbarRequired');
    if (!form.anandSandesh) nextErrors.anandSandesh = t('form.errors.anandSandeshRequired');
    if (!form.subscription) nextErrors.subscription = t('form.errors.subscriptionRequired');
    if (!form.subscriberNo.trim()) {
      nextErrors.subscriberNo = t('form.errors.subscriberMissing');
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim(),
      gender: form.gender,
      address: form.address.trim(),
      address_1: form.address.trim(),
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

  function handleLogout() {
    clearUserAuth();
    clearPendingOtp();
    navigate('/', { replace: true });
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
          payment_status: normalizePaymentStatus(data.submission.payment_status),
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
      <button
        type="button"
        className="btn-secondary fixed right-3 top-[max(6.5rem,env(safe-area-inset-top)+5.25rem)] z-[60] inline-flex min-h-10 items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-semibold shadow-md sm:right-6 sm:top-5 sm:px-4"
        onClick={handleLogout}
      >
        <LogOut size={18} aria-hidden /> {t('common.logout')}
      </button>
      <div className="donation-form-shell w-full px-1 py-2 sm:px-3 sm:py-3">
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
                className="btn-secondary inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm font-semibold"
              >
                {t('common.backToProfile')}
              </Link>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="donation-form">
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

          <DonationFormPair>
            <DonationFormRow label={t('form.labels.name')} required error={errors.name} labelFor="df-name">
              <input
                id="df-name"
                className={inputClass('name', errors)}
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                autoComplete="name"
              />
            </DonationFormRow>

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
          </DonationFormPair>

          <DonationFormPair>
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

          <DonationFormRow label={t('form.labels.mobile')} required error={errors.mobile} labelFor="df-mobile">
            <input
              id="df-mobile"
              className={inputClass('mobile', errors)}
              inputMode="numeric"
              maxLength={10}
              value={form.mobile}
              onChange={(e) => updateField('mobile', e.target.value.replace(/\D/g, ''))}
              autoComplete="tel"
            />
          </DonationFormRow>
          </DonationFormPair>

          <DonationFormPair>
          <DonationFormRow label={t('form.labels.email')} required error={errors.email} labelFor="df-email">
            <p id="df-email-hint" className="sr-only">
              {t('form.emailHint')}
            </p>
            <input
              id="df-email"
              type="email"
              className={inputClass('email', errors)}
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              autoComplete="email"
              title={t('form.emailTitle')}
              aria-describedby="df-email-hint"
              readOnly
            />
          </DonationFormRow>

          <DonationFormRow label={t('form.labels.rehbar')} required error={errors.rehbar} labelFor="df-rehbar">
            <input id="df-rehbar" className={inputClass('rehbar', errors)} value={form.rehbar} onChange={(e) => updateField('rehbar', e.target.value)} />
          </DonationFormRow>
          </DonationFormPair>

          <DonationFormPair className="donation-form-pair--single">
          <DonationFormRow label={t('form.labels.address')} required error={errors.address} labelFor="df-address">
            <textarea
              id="df-address"
              className={`${inputClass('address', errors)} donation-input--address`}
              value={form.address}
              onChange={(e) => updateField('address', e.target.value)}
              rows={2}
            />
          </DonationFormRow>
          </DonationFormPair>

          <DonationFormPair>
          <DonationFormRow label={t('form.labels.state')} required error={errors.state} labelFor="df-state">
            <select
              id="df-state"
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

          <DonationFormRow label={t('form.labels.town')} required error={errors.town} labelFor="df-town">
            <input
              id="df-town"
              className={inputClass('town', errors)}
              value={form.town}
              onChange={(e) => updateField('town', e.target.value)}
            />
          </DonationFormRow>
          </DonationFormPair>

          <DonationFormPair>
          <DonationFormRow label={t('form.labels.district')} required error={errors.district} labelFor="df-district">
            <input
              id="df-district"
              className={inputClass('district', errors)}
              value={form.district}
              onChange={(e) => updateField('district', e.target.value)}
            />
          </DonationFormRow>

          <DonationFormRow label={t('form.labels.pin')} required error={errors.pin} labelFor="df-pin">
            <input
              id="df-pin"
              className={inputClass('pin', errors)}
              inputMode="numeric"
              maxLength={10}
              value={form.pin}
              onChange={(e) => updateField('pin', e.target.value.replace(/\D/g, ''))}
            />
          </DonationFormRow>
          </DonationFormPair>

          <DonationFormPair>
          <DonationFormRow label={t('form.labels.anandSandesh')} required error={errors.anandSandesh}>
            <div className={`space-y-2 rounded border px-3 py-3 sm:px-4 ${errors.anandSandesh ? 'donation-input--invalid border-red-800/50 bg-[#fffafa]' : 'border-[#0d2d7f]/28 bg-white/80'}`}>
              <p className="text-left text-xs font-semibold text-muted">{t('form.languageOptionLabel')}</p>
              <label className="flex cursor-pointer items-start gap-3 text-left text-sm text-ink">
                <input
                  type="radio"
                  name="anandSandesh"
                  value="hindi"
                  checked={form.anandSandesh === 'hindi'}
                  onChange={() => updateField('anandSandesh', 'hindi')}
                  className="mt-1"
                />
                <span className="font-bold">{t('common.hindi')}</span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 border-t border-ink/10 pt-2 text-left text-sm text-ink">
                <input
                  type="radio"
                  name="anandSandesh"
                  value="english"
                  checked={form.anandSandesh === 'english'}
                  onChange={() => updateField('anandSandesh', 'english')}
                  className="mt-1"
                />
                <span className="font-bold">{t('common.english')}</span>
              </label>
            </div>
          </DonationFormRow>

          <DonationFormRow label={t('form.labels.spiritualBliss')} error={errors.spiritualBliss}>
            <div
              className={`space-y-2 rounded border px-3 py-3 sm:px-4 ${errors.spiritualBliss ? 'donation-input--invalid border-red-800/50 bg-[#fffafa]' : 'border-[#0d2d7f]/28 bg-white/80'}`}
            >
              <p className="text-left text-xs font-semibold text-muted">{t('form.optionalEnglishOnly')}</p>
              <label className="flex cursor-pointer items-start gap-3 text-left text-sm text-ink">
                <input
                  type="checkbox"
                  name="spiritualBliss"
                  checked={form.spiritualBliss === 'english'}
                  onChange={(e) => updateField('spiritualBliss', e.target.checked ? 'english' : '')}
                  className="mt-1"
                />
                <span className="font-bold">{t('common.english')}</span>
              </label>
            </div>
          </DonationFormRow>
          </DonationFormPair>

          <DonationFormPair className="donation-form-pair--single">
          <DonationFormRow label={t('form.labels.subscription')} required error={errors.subscription}>
            <div className={`space-y-2 rounded border px-3 py-3 sm:px-4 ${errors.subscription ? 'donation-input--invalid border-red-800/50 bg-[#fffafa]' : 'border-[#0d2d7f]/28 bg-white/80'}`}>
              <label className="flex cursor-pointer items-start gap-3 text-left text-sm text-ink">
                <input
                  type="radio"
                  name="subscription"
                  value="yearly"
                  checked={form.subscription === 'yearly'}
                  onChange={() => updateField('subscription', 'yearly')}
                  className="mt-1"
                />
                <span>
                  <span className="font-bold">{t('form.oneYear')}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted">{t('form.oneYearHint')}</span>
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-3 border-t border-ink/10 pt-2 text-left text-sm text-ink">
                <input
                  type="radio"
                  name="subscription"
                  value="five_year"
                  checked={form.subscription === 'five_year'}
                  onChange={() => updateField('subscription', 'five_year')}
                  className="mt-1"
                />
                <span>
                  <span className="font-bold">{t('form.fiveYear')}</span>
                  <span className="mt-0.5 block text-xs font-normal text-muted">{t('form.fiveYearHint')}</span>
                </span>
              </label>
            </div>
          </DonationFormRow>
          </DonationFormPair>

          <div className="donation-form-actions">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary donation-form-submit-btn !min-h-10 inline-flex items-center gap-2 !px-8 !py-2 !text-sm font-semibold sm:!text-[0.9375rem]"
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
