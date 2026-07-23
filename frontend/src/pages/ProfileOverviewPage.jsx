import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  Info,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Search,
  User
} from 'lucide-react';
import OtpInboxHint from '../components/OtpInboxHint.jsx';
import Alert from '../components/Alert.jsx';
import { useToast, friendlyError } from '../components/ToastProvider.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
import PersonTitleSelect from '../components/PersonTitleSelect.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import { INDIAN_STATES } from '../data/indianStates.js';
import {
  claimLegacyForm,
  getCurrentUser,
  getMyFormSubmission,
  lookupLegacyForm,
  requestEmailChange,
  updateMyAddress,
  verifyEmailChange
} from '../services/api.js';
import { saveUserAuth } from '../utils/auth.js';
import { formatSubmissionAddress } from '../utils/formatSubmissionAddress.js';
import { maskEmail, maskPhone } from '../utils/maskContact.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';
import { namesFromSubmission } from '../utils/personName.js';
import { sanitizeFormField, validateIndianFormFields, maxLengthForField } from '../utils/formFieldValidation.js';
import { getSubscriptionPeriodSummary, normalizePaymentStatus } from '../utils/subscriptionPeriod.js';

function normalizeMobile10(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) return d.slice(1);
  return d.length === 10 ? d : '';
}

function normalizeSubscriberNo(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (!d) return '';
  const n = Number(d);
  return Number.isInteger(n) && n > 0 ? d : '';
}

function submissionLooksEmpty(sub) {
  if (!sub) return true;
  const mob = normalizeMobile10(sub.mobile);
  const addr = formatSubmissionAddress(sub);
  const name = String(sub.name || '').trim();
  return !mob && !addr && !name;
}

/** Backend may return privacy-safe hints instead of a full `submission`. */
function matchSummaryToAddressPreview(m, pinHintTemplate) {
  if (!m || typeof m !== 'object') return '';
  const town = String(m.town || '').trim();
  const district = String(m.district || '').trim();
  const loc = [town, district].filter(Boolean);
  const rawPin = m.pinLast4 != null ? String(m.pinLast4).trim() : '';
  const last4 = rawPin.replace(/\D/g, '').slice(-4);
  const pinHint =
    last4.length === 4
      ? typeof pinHintTemplate === 'string'
        ? pinHintTemplate.replace('{last4}', last4)
        : `PIN ending in ${last4}`
      : '';
  return [loc.join(', '), pinHint].filter(Boolean).join(' · ') || '—';
}

function legacyMatchHasSignal(m) {
  if (!m || typeof m !== 'object') return false;
  return Boolean(
    String(m.nameMasked || '').trim() ||
      String(m.town || '').trim() ||
      String(m.district || '').trim() ||
      (m.pinLast4 != null && String(m.pinLast4).trim() !== '') ||
      m.legacyClaimKey != null ||
      m.rowId != null ||
      m.subscriberNo != null
  );
}

/** Backend validators (e.g. Zod) often expect strings; APIs may return numbers from JSON. */
function claimFieldString(value) {
  if (value == null || value === '') return undefined;
  return String(value);
}

function ProfileDetail({ icon: Icon, label, value, wide = false }) {
  return (
    <div className={`profile-detail ${wide ? 'profile-detail--wide' : ''}`}>
      <dt className="profile-detail-label">
        <Icon size={15} aria-hidden />
        {label}
      </dt>
      <dd className="profile-detail-value">{value}</dd>
    </div>
  );
}

export default function ProfileOverviewPage() {
  useSeo({
    title: 'My Profile — Anand Sandesh Karyalay | anandsandesh',
    description:
      'View and manage your Anand Sandesh magazine subscription profile at Anand Sandesh Karyalay, Shri Anandpur Dham.',
    canonical: 'https://anandsandeshkaryalay.online/profile'
  });

  const { t } = useTranslation();
  const { showToast } = useToast();
  const LEGACY_LOOKUP_TOOLTIP = t('profile.lookupTooltip');
  const [loading, setLoading] = useState(true);
  const [linkedSubmission, setLinkedSubmission] = useState(null);

  const [searchMode, setSearchMode] = useState('subscriber');
  const [offlineSearchOpen, setOfflineSearchOpen] = useState(false);
  const [legacyQuery, setLegacyQuery] = useState('');
  const [lastSearch, setLastSearch] = useState(null);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState('');
  const [legacyPreview, setLegacyPreview] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimInfo, setClaimInfo] = useState('');

  useEffect(() => {
    if (legacyError || claimInfo || legacyPreview) {
      setOfflineSearchOpen(true);
    }
  }, [legacyError, claimInfo, legacyPreview]);

  const [editAddressOpen, setEditAddressOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    title: '',
    firstName: '',
    lastName: '',
    mobile: '',
    houseNo: '',
    street: '',
    landmark: '',
    area: '',
    postOffice: '',
    careOf: '',
    pin: '',
    town: '',
    district: '',
    state: ''
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressFieldErrors, setAddressFieldErrors] = useState({});
  const [addressMessage, setAddressMessage] = useState('');
  const [addressError, setAddressError] = useState('');

  const [emailStep, setEmailStep] = useState('idle');
  const [changeEmailOpen, setChangeEmailOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMessage, setEmailMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [accountEmail, setAccountEmail] = useState('');

  const applyServerProfile = useCallback((_user, submission) => {
    setLinkedSubmission(submission || null);
    if (_user?.email) setAccountEmail(String(_user.email));
    if (submission) {
      const { firstName, lastName, title } = namesFromSubmission(submission);
      const a2Lines = String(submission.address_2 || '')
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      setAddressForm({
        title,
        firstName,
        lastName,
        mobile: String(submission.mobile || submission.phone || '').replace(/\D/g, '').slice(-10),
        houseNo: String(submission.address_1 || submission.house_no || submission.address || '').trim(),
        careOf: String(submission.care_of || submission.careOf || '').trim(),
        street: String(submission.street || a2Lines[0] || '').trim(),
        landmark: String(submission.mark || submission.landmark || '').trim(),
        area: String(submission.area || a2Lines[1] || '').trim(),
        postOffice: String(submission.post_office || submission.postOffice || a2Lines[2] || '').trim(),
        pin: String(submission.pin || submission.pincode || '').trim(),
        town: String(submission.town || submission.city || '').trim(),
        district: String(submission.district || submission.tehsil || '').trim(),
        state: String(submission.state || '').trim()
      });
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const [meRes, subRes] = await Promise.all([getCurrentUser(), getMyFormSubmission()]);
    applyServerProfile(meRes?.user, subRes?.submission);
  }, [applyServerProfile]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [meRes, subRes] = await Promise.all([getCurrentUser(), getMyFormSubmission()]);
        if (cancelled) return;
        applyServerProfile(meRes?.user, subRes?.submission);
      } catch {
        if (cancelled) return;
        setLinkedSubmission(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [applyServerProfile]);

  useEffect(() => {
    if (emailStep !== 'idle') setChangeEmailOpen(true);
  }, [emailStep]);

  const hasSavedProfile = useMemo(
    () => !submissionLooksEmpty(linkedSubmission),
    [linkedSubmission]
  );

  const subscriptionPaid = useMemo(
    () => normalizePaymentStatus(linkedSubmission?.payment_status, linkedSubmission) === 'verified',
    [linkedSubmission]
  );

  const subscriptionPeriod = useMemo(() => {
    if (!subscriptionPaid || !linkedSubmission) return null;
    return getSubscriptionPeriodSummary(linkedSubmission, t);
  }, [subscriptionPaid, linkedSubmission, t]);

  const selectedLegacyMatch =
    legacyPreview?.type === 'matches' ? legacyPreview.matches[legacyPreview.selectedIndex] : null;

  const pinHintTemplate = t('profile.pinEnding');

  const awaitingClaim = Boolean(legacyPreview && !hasSavedProfile);

  const showContactSection = hasSavedProfile || Boolean(legacyPreview);

  const showSearchSection = !hasSavedProfile;

  const contactDisplay = useMemo(() => {
    if (hasSavedProfile && linkedSubmission) {
      const rawMobile = String(linkedSubmission.mobile || linkedSubmission.phone || '').trim();
      const rawEmail = String(linkedSubmission.email || '').trim();
      return {
        name: namesFromSubmission(linkedSubmission).fullName,
        phone: rawMobile ? maskPhone(rawMobile) : '',
        email: rawEmail ? maskEmail(rawEmail) : '',
        address: formatSubmissionAddress(linkedSubmission)
      };
    }

    if (legacyPreview?.type === 'matches' && selectedLegacyMatch) {
      return {
        name: String(selectedLegacyMatch.nameMasked || '').trim(),
        phone: (() => {
          const fromRow = selectedLegacyMatch?.phoneMasked;
          if (fromRow) return String(fromRow);
          if (lastSearch?.mode === 'mobile' && lastSearch.mobile) return maskPhone(lastSearch.mobile);
          return '';
        })(),
        email: selectedLegacyMatch.emailMasked
          ? String(selectedLegacyMatch.emailMasked)
          : '',
        address: matchSummaryToAddressPreview(selectedLegacyMatch, pinHintTemplate)
      };
    }

    return null;
  }, [
    hasSavedProfile,
    linkedSubmission,
    legacyPreview,
    selectedLegacyMatch,
    lastSearch,
    pinHintTemplate
  ]);

  async function handleLegacySearch(event) {
    event.preventDefault();
    setLegacyError('');
    setClaimInfo('');
    setLegacyPreview(null);

    const mobile = searchMode === 'mobile' ? normalizeMobile10(legacyQuery) : '';
    const subscriberNo = searchMode === 'subscriber' ? normalizeSubscriberNo(legacyQuery) : '';

    if (searchMode === 'mobile' && !mobile) {
      setLegacyError(t('profile.errors.mobileRequired'));
      return;
    }
    if (searchMode === 'subscriber' && !subscriberNo) {
      setLegacyError(t('profile.errors.subscriberRequired'));
      return;
    }

    setLegacyLoading(true);
    try {
      const data = await lookupLegacyForm(
        searchMode === 'mobile' ? { mobile } : { subscriber_no: subscriberNo }
      );
      setLastSearch(
        searchMode === 'mobile' ? { mode: 'mobile', mobile } : { mode: 'subscriber', subscriberNo }
      );
      const rawMatches = data?.matches;
      const matches = Array.isArray(rawMatches)
        ? rawMatches.filter((m) => legacyMatchHasSignal(m))
        : [];

      if (matches.length > 0) {
        setLegacyPreview({ type: 'matches', matches, selectedIndex: 0 });
        return;
      }

      setLegacyError(t('profile.errors.notFound'));
    } catch (err) {
      setLegacyError(friendlyError(err, t('profile.errors.searchFailed')));
    } finally {
      setLegacyLoading(false);
    }
  }

  async function handleClaimLegacy() {
    if (!legacyPreview || !lastSearch) return;

    setClaimInfo('');
    setLegacyError('');
    setClaimLoading(true);
    try {
      const payload =
        lastSearch.mode === 'mobile'
          ? { mobile: String(lastSearch.mobile) }
          : { subscriber_no: String(lastSearch.subscriberNo) };
      if (legacyPreview.type === 'matches') {
        const m = legacyPreview.matches[legacyPreview.selectedIndex];
        const key = claimFieldString(m?.legacyClaimKey);
        const row = claimFieldString(m?.rowId);
        const subNo = claimFieldString(m?.subscriberNo);
        if (key !== undefined) payload.legacyClaimKey = key;
        if (row !== undefined) payload.rowId = row;
        if (subNo !== undefined) payload.subscriberNo = subNo;
      }
      await claimLegacyForm(payload);
      await refreshProfile();
      setLegacyPreview(null);
      setLegacyQuery('');
      setLastSearch(null);
      setClaimInfo(t('profile.claimSuccess'));
    } catch (err) {
      setLegacyError(friendlyError(err, t('profile.errors.claimFailed')));
    } finally {
      setClaimLoading(false);
    }
  }

  function updateAddressField(field, value) {
    const nextValue = sanitizeFormField(field, value);
    setAddressForm((f) => ({ ...f, [field]: nextValue }));
    setAddressFieldErrors((errors) => ({ ...errors, [field]: '' }));
  }

  function addressInputClass(field) {
    return `donation-input !rounded-lg ${addressFieldErrors[field] ? 'donation-input--invalid' : ''}`;
  }

  async function handleAddressSave(event) {
    event.preventDefault();
    setAddressError('');
    setAddressMessage('');

    const fieldErrors = validateIndianFormFields(addressForm, t, {
      requireRehbar: false,
      requireAddress: true
    });
    if (!addressForm.mobile.trim()) fieldErrors.mobile = t('form.errors.mobileRequired');
    else if (!/^\d{10}$/.test(addressForm.mobile.trim())) fieldErrors.mobile = t('form.errors.mobileInvalid');
    if (!addressForm.pin.trim()) fieldErrors.pin = t('form.errors.pinRequired');
    else if (!/^\d{4,10}$/.test(addressForm.pin)) fieldErrors.pin = t('form.errors.pinInvalid');

    if (Object.keys(fieldErrors).length > 0) {
      setAddressFieldErrors(fieldErrors);
      setAddressError(t('form.errors.fixHighlighted'));
      return;
    }

    setAddressFieldErrors({});
    setAddressSaving(true);
    try {
      const data = await updateMyAddress({
        prefix: addressForm.title.trim(),
        first_name: addressForm.firstName.trim(),
        last_name: addressForm.lastName.trim(),
        mobile: addressForm.mobile.trim(),
        house_no: addressForm.houseNo.trim(),
        care_of: addressForm.careOf.trim(),
        street: addressForm.street.trim(),
        area: addressForm.area.trim(),
        post_office: addressForm.postOffice.trim(),
        mark: addressForm.landmark.trim(),
        address: addressForm.houseNo.trim(),
        address_1: addressForm.houseNo.trim(),
        town: addressForm.town.trim(),
        district: addressForm.district.trim(),
        state: addressForm.state.trim(),
        pin: addressForm.pin.trim()
      });
      applyServerProfile({ email: accountEmail }, data.submission);
      setEditAddressOpen(false);
      setAddressMessage(t('profile.addressUpdated'));
    } catch (err) {
      setAddressError(friendlyError(err, t('profile.errors.addressUpdateFailed')));
    } finally {
      setAddressSaving(false);
    }
  }

  async function handleRequestEmailChange(event) {
    event.preventDefault();
    setEmailError('');
    setEmailMessage('');
    setEmailLoading(true);
    try {
      const data = await requestEmailChange(newEmail.trim());
      setEmailStep('otp');
      setEmailMessage(data.message);
      showToast(t('auth.otpSentToast'), { type: 'info' });
    } catch (err) {
      setEmailError(friendlyError(err, t('profile.errors.emailChangeFailed')));
    } finally {
      setEmailLoading(false);
    }
  }

  async function handleVerifyEmailChange(event) {
    event.preventDefault();
    setEmailError('');
    setEmailMessage('');
    setEmailLoading(true);
    try {
      const data = await verifyEmailChange({ new_email: newEmail.trim(), otp: emailOtp.trim() });
      saveUserAuth({ token: data.token, user: data.user, verifiedAt: Date.now() });
      setAccountEmail(data.user.email);
      setEmailStep('idle');
      setNewEmail('');
      setEmailOtp('');
      setEmailMessage(t('profile.emailUpdated'));
      showToast(t('profile.emailUpdated'), { type: 'success' });
      await refreshProfile();
    } catch (err) {
      setEmailError(friendlyError(err, t('profile.errors.emailVerifyFailed')));
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <DonationLayout subtitle={t('profile.subtitle')}>
      {legacyLoading ? <LoadingBlock label={t('loaders.searchingRecords')} /> : null}
      {emailLoading && emailStep === 'otp' ? <LoadingBlock label={t('profile.verifyingOtp')} /> : null}

      <div className="profile-page mx-auto w-full max-w-4xl px-1 pb-4 sm:px-2">
        <div className="profile-card overflow-hidden rounded-2xl border border-[#0d2d7f]/15 bg-white/95 shadow-[0_18px_50px_-22px_rgba(13,45,127,0.4)] backdrop-blur-sm">
          <div className="profile-card-header border-b border-[#0d2d7f]/10 bg-gradient-to-r from-[#f8faff] via-white to-[#fafcff] px-4 py-3 sm:px-6 sm:py-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t('profile.cardEyebrow')}</p>
              <h2 className="mt-0.5 text-lg font-black text-ink sm:text-xl">{t('profile.cardTitle')}</h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted">
                {awaitingClaim ? t('profile.recordFound') : t('profile.bannerMaskedHelp')}
              </p>
            </div>
          </div>

          {subscriptionPaid ? (
            <div className="mx-4 mt-3 flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 sm:mx-6">
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-700" size={20} aria-hidden />
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold leading-relaxed text-emerald-900">
                  {t('profile.subscriptionActive')}
                </p>
                {subscriptionPeriod?.validThrough ? (
                  <p className="mt-1 text-sm text-emerald-800">
                    {t('profile.validThrough', { date: subscriptionPeriod.validThrough })}
                  </p>
                ) : null}
                {subscriptionPeriod?.remaining ? (
                  <p className="mt-1 text-sm font-bold text-emerald-900">{subscriptionPeriod.remaining}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {showSearchSection ? (
            <div className="border-b border-[#0d2d7f]/8 px-4 py-5 sm:px-6">
              <div className="rounded-xl border border-[#0d2d7f]/12 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(244,248,255,0.92))] p-4 sm:p-5">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => setOfflineSearchOpen((open) => !open)}
                  aria-expanded={offlineSearchOpen}
                  aria-controls="po-offline-search-panel"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#0d2d7f]">{t('profile.offlineToggle')}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted">{t('profile.offlineHelp')}</p>
                  </div>
                  <ChevronDown
                    className={`mt-0.5 h-5 w-5 shrink-0 text-[#0d2d7f] transition-transform ${
                      offlineSearchOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </button>

                {offlineSearchOpen ? (
                <div id="po-offline-search-panel">
                <form onSubmit={handleLegacySearch} className="mt-4 rounded-xl border border-[#0d2d7f]/10 bg-white p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <div className="relative inline-flex min-w-[11rem]">
                      <label htmlFor="po-search-mode" className="sr-only">
                        {t('profile.searchByMobile')} / {t('profile.searchBySubscriber')}
                      </label>
                      <select
                        id="po-search-mode"
                        value={searchMode}
                        onChange={(e) => {
                          setSearchMode(e.target.value);
                          setLegacyQuery('');
                          setLegacyPreview(null);
                          setLegacyError('');
                        }}
                        className="w-full appearance-none rounded-lg border border-[#0d2d7f]/25 bg-white py-1.5 pl-3 pr-8 text-xs font-bold text-[#0d2d7f] transition focus:border-[#0d2d7f] focus:outline-none"
                      >
                        <option value="subscriber">{t('profile.searchBySubscriber')}</option>
                        <option value="mobile">{t('profile.searchByMobile')}</option>
                      </select>
                      <ChevronDown
                        className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#0d2d7f]"
                        aria-hidden
                      />
                    </div>
                    <span
                      tabIndex={0}
                      className="group/icon relative ml-auto inline-flex h-9 w-9 cursor-help items-center justify-center rounded-lg border border-[#0d2d7f]/20 bg-white text-primary"
                      aria-label={t('profile.tooltipAria')}
                      title={LEGACY_LOOKUP_TOOLTIP}
                    >
                      <Info className="h-4 w-4" strokeWidth={2.25} aria-hidden />
                      <span
                        role="tooltip"
                        className="pointer-events-none invisible absolute bottom-full right-0 z-30 mb-2 w-[min(18rem,calc(100vw-2.5rem))] rounded-lg border border-[#0d2d7f]/20 bg-white px-3 py-2 text-left text-xs font-medium leading-relaxed text-ink shadow-lg opacity-0 transition [@media(hover:hover)]:group-hover/icon:visible [@media(hover:hover)]:group-hover/icon:opacity-100 group-focus-within/icon:visible group-focus-within/icon:opacity-100"
                      >
                        {LEGACY_LOOKUP_TOOLTIP}
                      </span>
                    </span>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="w-full sm:flex-1">
                      <label htmlFor="po-legacy-query" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-muted">
                        {searchMode === 'mobile'
                          ? t('profile.labelSearchMobile')
                          : t('profile.labelSearchSubscriber')}
                      </label>
                      <input
                        id="po-legacy-query"
                        className="donation-input !rounded-lg"
                        inputMode="numeric"
                        maxLength={searchMode === 'mobile' ? 10 : 12}
                        autoComplete="off"
                        placeholder={
                          searchMode === 'mobile'
                            ? t('profile.placeholderSearchMobile')
                            : t('profile.placeholderSearchSubscriber')
                        }
                        value={legacyQuery}
                        onChange={(e) =>
                          setLegacyQuery(
                            e.target.value.replace(/\D/g, '').slice(0, searchMode === 'mobile' ? 10 : 12)
                          )
                        }
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={legacyLoading}
                      className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2 text-sm font-semibold sm:min-w-[11rem]"
                    >
                      {legacyLoading ? <InlineLoader size={20} /> : <Search size={18} aria-hidden />}
                      {legacyLoading ? t('profile.searching') : t('profile.searchDatabase')}
                    </button>
                  </div>
                </form>

                {legacyError ? (
                  <div className="mt-3">
                    <Alert>{legacyError}</Alert>
                  </div>
                ) : null}
                {claimInfo ? (
                  <div className="mt-3">
                    <Alert type="success">{claimInfo}</Alert>
                  </div>
                ) : null}

                {legacyPreview?.type === 'matches' && legacyPreview.matches.length > 1 ? (
                  <div className="mt-4 rounded-xl border border-[#0d2d7f]/12 bg-white px-3 py-3 sm:px-4">
                    <label htmlFor="po-legacy-pick" className="text-xs font-semibold text-muted">
                      {t('profile.pickRecord')}
                    </label>
                    <select
                      id="po-legacy-pick"
                      className="donation-input mt-1 max-w-full !rounded-lg"
                      value={legacyPreview.selectedIndex}
                      onChange={(e) =>
                        setLegacyPreview((prev) =>
                          prev?.type === 'matches'
                            ? { ...prev, selectedIndex: Number(e.target.value) }
                            : prev
                        )
                      }
                    >
                      {legacyPreview.matches.map((m, i) => (
                        <option key={`${m.rowId ?? i}-${m.legacyClaimKey ?? ''}`} value={i}>
                          {String(m.nameMasked || t('profile.record')).trim()} · {t('profile.sub')}{' '}
                          {m.subscriberNo ?? '-'} · {matchSummaryToAddressPreview(m, pinHintTemplate)}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
                </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="px-4 py-10 sm:px-6">
              <LoadingBlock label={t('loaders.loadingDetails')} />
            </div>
          ) : showContactSection && contactDisplay ? (
            <div className="px-4 py-4 sm:px-6 sm:py-5">
              <dl className="profile-detail-grid">
                {contactDisplay.name ? (
                  <ProfileDetail icon={User} label={t('profile.nameLabel')} value={contactDisplay.name} />
                ) : null}
                <ProfileDetail
                  icon={Phone}
                  label={t('profile.mobileLabel')}
                  value={contactDisplay.phone || t('profile.notOnFile')}
                />
                <ProfileDetail
                  icon={Mail}
                  label={t('profile.emailLabel')}
                  value={contactDisplay.email || t('profile.notOnFile')}
                />
                <ProfileDetail
                  icon={MapPin}
                  label={t('profile.addressLabel')}
                  value={contactDisplay.address || t('profile.noSavedAddress')}
                  wide
                />
              </dl>

              {awaitingClaim ? (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    disabled={claimLoading}
                    onClick={handleClaimLegacy}
                    className="btn-primary inline-flex min-h-10 items-center justify-center gap-2 px-6 py-2 text-sm font-semibold"
                  >
                    {claimLoading ? <InlineLoader size={20} /> : null}
                    {claimLoading ? t('profile.linking') : t('profile.linkRecord')}
                  </button>
                </div>
              ) : null}

              {hasSavedProfile && !awaitingClaim ? (
                <div className="mt-6 space-y-4 border-t border-[#0d2d7f]/10 pt-5">
                  {addressMessage ? <Alert type="success">{addressMessage}</Alert> : null}

                  <div className="rounded-xl border border-[#0d2d7f]/12 bg-[#f8faff]/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-ink">{t('profile.editAddressTitle')}</p>
                        <p className="mt-1 text-xs text-muted">{t('profile.editAddressHelp')}</p>
                      </div>
                      <button
                        type="button"
                        className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                        onClick={() => {
                          setEditAddressOpen((v) => !v);
                          setAddressError('');
                        }}
                      >
                        <Pencil size={14} />
                        {editAddressOpen ? t('common.cancel') : t('profile.editAddress')}
                      </button>
                    </div>

                    {editAddressOpen ? (
                      <form onSubmit={handleAddressSave} className="mt-4 grid gap-3 sm:grid-cols-2">
                        {addressError ? (
                          <div className="sm:col-span-2">
                            <Alert>{addressError}</Alert>
                          </div>
                        ) : null}
                        <div className="sm:col-span-2 grid gap-3 sm:grid-cols-[minmax(5.5rem,7rem)_1fr_1fr]">
                          <label className="block">
                            <span className="label">{t('form.labels.title')}</span>
                            <PersonTitleSelect
                              value={addressForm.title}
                              onChange={(e) => setAddressForm((f) => ({ ...f, title: e.target.value }))}
                            />
                          </label>
                          <label className="block">
                            <span className="label">{t('form.labels.firstName')}</span>
                            <input
                              className={addressInputClass('firstName')}
                              value={addressForm.firstName}
                              onChange={(e) => updateAddressField('firstName', e.target.value)}
                              maxLength={maxLengthForField('firstName')}
                              autoComplete="given-name"
                            />
                          </label>
                          <label className="block">
                            <span className="label">{t('form.labels.lastName')}</span>
                            <input
                              className={addressInputClass('lastName')}
                              value={addressForm.lastName}
                              onChange={(e) => updateAddressField('lastName', e.target.value)}
                              maxLength={maxLengthForField('lastName')}
                              autoComplete="family-name"
                            />
                          </label>
                        </div>
                        <label className="block sm:col-span-2">
                          <span className="label">{t('form.labels.careOf')}</span>
                          <input
                            className={addressInputClass('careOf')}
                            value={addressForm.careOf}
                            onChange={(e) => updateAddressField('careOf', e.target.value)}
                            maxLength={maxLengthForField('careOf')}
                            placeholder={t('form.placeholders.careOf')}
                          />
                        </label>
                        <label className="block">
                          <span className="label">{t('profile.mobileLabel')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            inputMode="numeric"
                            maxLength={10}
                            value={addressForm.mobile}
                            onChange={(e) =>
                              setAddressForm((f) => ({
                                ...f,
                                mobile: e.target.value.replace(/\D/g, '').slice(0, 10)
                              }))
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="label">{t('form.labels.houseNo')}</span>
                          <input
                            className={addressInputClass('houseNo')}
                            value={addressForm.houseNo}
                            onChange={(e) => updateAddressField('houseNo', e.target.value)}
                            maxLength={maxLengthForField('houseNo')}
                            placeholder={t('form.placeholders.houseNo')}
                          />
                        </label>
                        <label className="block">
                          <span className="label">{t('form.labels.street')}</span>
                          <input
                            className={addressInputClass('street')}
                            value={addressForm.street}
                            onChange={(e) => updateAddressField('street', e.target.value)}
                            maxLength={maxLengthForField('street')}
                            placeholder={t('form.placeholders.street')}
                          />
                        </label>
                        <label className="block">
                          <span className="label">{t('form.labels.area')}</span>
                          <input
                            className={addressInputClass('area')}
                            value={addressForm.area}
                            onChange={(e) => updateAddressField('area', e.target.value)}
                            maxLength={maxLengthForField('area')}
                            placeholder={t('form.placeholders.area')}
                          />
                        </label>
                        <label className="block">
                          <span className="label">{t('form.labels.landmark')}</span>
                          <input
                            className={addressInputClass('landmark')}
                            value={addressForm.landmark}
                            onChange={(e) => updateAddressField('landmark', e.target.value)}
                            maxLength={maxLengthForField('landmark')}
                            placeholder={t('form.placeholders.landmark')}
                          />
                        </label>
                        <label className="block">
                          <span className="label">{t('profile.pinLabel')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            inputMode="numeric"
                            maxLength={10}
                            value={addressForm.pin}
                            onChange={(e) =>
                              setAddressForm((f) => ({
                                ...f,
                                pin: e.target.value.replace(/\D/g, '').slice(0, 10)
                              }))
                            }
                          />
                        </label>
                        <label className="block">
                          <span className="label">{t('form.labels.postOffice')}</span>
                          <input
                            className={addressInputClass('postOffice')}
                            value={addressForm.postOffice}
                            onChange={(e) => updateAddressField('postOffice', e.target.value)}
                            maxLength={maxLengthForField('postOffice')}
                            placeholder={t('form.placeholders.postOffice')}
                          />
                        </label>
                        <label className="block">
                          <span className="label">{t('profile.townLabel')}</span>
                          <input
                            className={addressInputClass('town')}
                            value={addressForm.town}
                            onChange={(e) => updateAddressField('town', e.target.value)}
                            maxLength={maxLengthForField('town')}
                          />
                        </label>
                        <label className="block">
                          <span className="label">{t('profile.districtLabel')}</span>
                          <input
                            className={addressInputClass('district')}
                            value={addressForm.district}
                            onChange={(e) => updateAddressField('district', e.target.value)}
                            maxLength={maxLengthForField('district')}
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="label">{t('profile.stateLabel')}</span>
                          <select
                            className="donation-input !rounded-lg"
                            value={addressForm.state}
                            onChange={(e) => setAddressForm((f) => ({ ...f, state: e.target.value }))}
                          >
                            <option value="">{t('form.placeholders.selectState')}</option>
                            {INDIAN_STATES.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        </label>
                        <div className="sm:col-span-2">
                          <button className="btn-primary inline-flex items-center gap-2 px-5 py-2 text-sm" type="submit" disabled={addressSaving}>
                            {addressSaving ? <InlineLoader size={18} /> : null}
                            {addressSaving ? t('profile.savingAddress') : t('profile.saveAddress')}
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          {!loading ? (
            <div className="border-t border-[#0d2d7f]/10 px-4 py-5 sm:px-6">
              <div className="rounded-xl border border-[#0d2d7f]/12 bg-white p-4">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  onClick={() => setChangeEmailOpen((open) => !open)}
                  aria-expanded={changeEmailOpen}
                  aria-controls="po-change-email-panel"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-ink">{t('profile.changeEmailTitle')}</p>
                    <p className="mt-1 text-xs text-muted">{t('profile.changeEmailHelp')}</p>
                    {!changeEmailOpen ? (
                      <p className="mt-2 text-sm text-muted">
                        {t('profile.currentEmail')}:{' '}
                        <span className="font-semibold text-ink">{accountEmail || '—'}</span>
                      </p>
                    ) : null}
                  </div>
                  <ChevronDown
                    className={`mt-0.5 h-5 w-5 shrink-0 text-[#0d2d7f] transition-transform ${
                      changeEmailOpen ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </button>

                {changeEmailOpen ? (
                  <div id="po-change-email-panel" className="mt-3 border-t border-[#0d2d7f]/8 pt-3">
                    <p className="text-sm text-muted">
                      {t('profile.currentEmail')}:{' '}
                      <span className="font-semibold text-ink">{accountEmail || '—'}</span>
                    </p>

                    {emailError ? (
                      <div className="mt-3">
                        <Alert>{emailError}</Alert>
                      </div>
                    ) : null}
                    {emailMessage ? (
                      <div className="mt-3">
                        <Alert type="success">{emailMessage}</Alert>
                      </div>
                    ) : null}

                    {emailStep === 'idle' ? (
                      <form onSubmit={handleRequestEmailChange} className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                        <label className="block flex-1">
                          <span className="label">{t('profile.newEmailLabel')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            autoComplete="email"
                          />
                        </label>
                        <button className="btn-secondary min-h-11 px-5 py-2 text-sm font-semibold" type="submit" disabled={emailLoading}>
                          {emailLoading ? <InlineLoader size={18} /> : null}
                          {emailLoading ? t('profile.sendingOtp') : t('profile.sendEmailOtp')}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyEmailChange} className="mt-3 space-y-3">
                        <OtpInboxHint emailMasked={maskEmail(newEmail.trim().toLowerCase())} />
                        <label className="block">
                          <span className="label">{t('profile.otpLabel')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            inputMode="numeric"
                            maxLength={6}
                            value={emailOtp}
                            onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button className="btn-primary px-5 py-2 text-sm" type="submit" disabled={emailLoading}>
                            {emailLoading ? t('profile.verifyingOtp') : t('profile.confirmEmailChange')}
                          </button>
                          <button
                            className="btn-secondary px-5 py-2 text-sm"
                            type="button"
                            onClick={() => {
                              setEmailStep('idle');
                              setEmailOtp('');
                              setEmailError('');
                            }}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!loading ? (
            <div className="profile-actions border-t border-[#0d2d7f]/10 bg-[#f8faff]/80 px-4 py-5 sm:px-6">
              <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.14em] text-muted">
                {t('profile.actionsHeading')}
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                {!subscriptionPaid ? (
                  <Link
                    to="/form"
                    className="btn-primary inline-flex min-h-11 items-center justify-center gap-2 px-8 py-2.5 text-sm font-semibold"
                  >
                    {t('profile.continueToForm')} <ArrowRight size={18} aria-hidden />
                  </Link>
                ) : null}
                <Link
                  to="/books"
                  className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-8 py-2.5 text-sm font-semibold sm:w-auto"
                >
                  <BookOpen size={18} aria-hidden />
                  {t('profile.buyBooks')}
                </Link>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="profile-footer mt-6 text-center">
          <Link
            to="/about"
            className="text-sm font-semibold text-primary underline decoration-primary/30 underline-offset-4 hover:text-brand-royal"
          >
            {t('about.footerLink')}
          </Link>
        </footer>
      </div>
    </DonationLayout>
  );
}
