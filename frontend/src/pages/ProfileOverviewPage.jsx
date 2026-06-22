import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, CircleHelp, Info, Mail, MapPin, Pencil, Phone, Search, User } from 'lucide-react';
import OtpInboxHint from '../components/OtpInboxHint.jsx';
import Alert from '../components/Alert.jsx';
import { useToast } from '../components/ToastProvider.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
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

/** Normalize API payment_status so verified subscriptions are treated as paid. */
function normalizePaymentStatus(raw) {
  const s = String(raw || '').toLowerCase();
  if (s === 'verified' || s === 'paid' || s === 'active') return 'verified';
  return 'pending';
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

  const [searchMode, setSearchMode] = useState('mobile');
  const [legacyQuery, setLegacyQuery] = useState('');
  /** Confirms claim with the same mobile or subscriber no used in search. */
  const [lastSearch, setLastSearch] = useState(null);
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState('');
  const [legacyPreview, setLegacyPreview] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimInfo, setClaimInfo] = useState('');

  const [editAddressOpen, setEditAddressOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    firstName: '',
    lastName: '',
    mobile: '',
    houseNo: '',
    street: '',
    landmark: '',
    state: '',
    town: '',
    district: '',
    pin: ''
  });
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressMessage, setAddressMessage] = useState('');
  const [addressError, setAddressError] = useState('');

  const [emailStep, setEmailStep] = useState('idle');
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
      const { firstName, lastName } = namesFromSubmission(submission);
      setAddressForm({
        firstName,
        lastName,
        mobile: String(submission.mobile || submission.phone || '').replace(/\D/g, '').slice(-10),
        houseNo: String(submission.address_1 || submission.house_no || submission.address || '').trim(),
        street: String(submission.street || submission.address_2 || '').trim().split('\n')[0] || '',
        landmark: String(submission.mark || submission.landmark || '').trim(),
        state: String(submission.state || '').trim(),
        town: String(submission.town || submission.city || '').trim(),
        district: String(submission.district || submission.tehsil || '').trim(),
        pin: String(submission.pin || submission.pincode || '').trim()
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

  const hasSavedProfile = useMemo(
    () => !submissionLooksEmpty(linkedSubmission),
    [linkedSubmission]
  );

  const subscriptionPaid = useMemo(
    () => normalizePaymentStatus(linkedSubmission?.payment_status) === 'verified',
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
      setLegacyError(err.message || t('profile.errors.searchFailed'));
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
      setLegacyError(err.message || t('profile.errors.claimFailed'));
    } finally {
      setClaimLoading(false);
    }
  }

  async function handleAddressSave(event) {
    event.preventDefault();
    setAddressError('');
    setAddressMessage('');
    setAddressSaving(true);
    try {
      const data = await updateMyAddress({
        first_name: addressForm.firstName.trim(),
        last_name: addressForm.lastName.trim(),
        mobile: addressForm.mobile.trim(),
        house_no: addressForm.houseNo.trim(),
        street: addressForm.street.trim(),
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
      setAddressError(err.message || t('profile.errors.addressUpdateFailed'));
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
      setEmailError(err.message || t('profile.errors.emailChangeFailed'));
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
      setEmailError(err.message || t('profile.errors.emailVerifyFailed'));
    } finally {
      setEmailLoading(false);
    }
  }

  return (
    <DonationLayout subtitle={t('profile.subtitle')}>
      {legacyLoading ? <LoadingBlock label={t('loaders.searchingRecords')} /> : null}

      <div className="profile-page mx-auto w-full max-w-3xl px-2 pb-10 sm:px-4">
        <div className="profile-card overflow-hidden rounded-2xl border border-[#0d2d7f]/15 bg-white/95 shadow-[0_18px_50px_-22px_rgba(13,45,127,0.4)] backdrop-blur-sm">
          <div className="profile-card-header border-b border-[#0d2d7f]/10 bg-gradient-to-r from-[#f8faff] via-white to-[#fafcff] px-4 py-4 sm:px-6 sm:py-5">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t('profile.cardEyebrow')}</p>
              <h2 className="mt-1 text-lg font-black text-ink sm:text-xl">{t('profile.cardTitle')}</h2>
              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                {awaitingClaim ? t('profile.recordFound') : t('profile.bannerMaskedHelp')}
              </p>
            </div>
          </div>

          {subscriptionPaid ? (
            <div className="mx-4 mt-4 flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 sm:mx-6">
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
                <p className="text-sm font-bold text-[#0d2d7f]">{t('profile.offlineToggle')}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{t('profile.offlineHelp')}</p>

                <form onSubmit={handleLegacySearch} className="mt-4 rounded-xl border border-[#0d2d7f]/10 bg-white p-3 sm:p-4">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        searchMode === 'mobile'
                          ? 'border-[#0d2d7f] bg-[#0d2d7f] text-white'
                          : 'border-[#0d2d7f]/25 bg-white text-[#0d2d7f]'
                      }`}
                      onClick={() => {
                        setSearchMode('mobile');
                        setLegacyQuery('');
                        setLegacyPreview(null);
                        setLegacyError('');
                      }}
                    >
                      {t('profile.searchByMobile')}
                    </button>
                    <button
                      type="button"
                      className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition ${
                        searchMode === 'subscriber'
                          ? 'border-[#0d2d7f] bg-[#0d2d7f] text-white'
                          : 'border-[#0d2d7f]/25 bg-white text-[#0d2d7f]'
                      }`}
                      onClick={() => {
                        setSearchMode('subscriber');
                        setLegacyQuery('');
                        setLegacyPreview(null);
                        setLegacyError('');
                      }}
                    >
                      {t('profile.searchBySubscriber')}
                    </button>
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
            </div>
          ) : null}

          {loading ? (
            <div className="px-4 py-10 sm:px-6">
              <LoadingBlock label={t('loaders.loadingDetails')} />
            </div>
          ) : showContactSection && contactDisplay ? (
            <div className="px-4 py-5 sm:px-6">
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
                        <label className="block">
                          <span className="label">{t('form.labels.firstName')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            value={addressForm.firstName}
                            onChange={(e) => setAddressForm((f) => ({ ...f, firstName: e.target.value }))}
                            autoComplete="given-name"
                          />
                        </label>
                        <label className="block">
                          <span className="label">{t('form.labels.lastName')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            value={addressForm.lastName}
                            onChange={(e) => setAddressForm((f) => ({ ...f, lastName: e.target.value }))}
                            autoComplete="family-name"
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
                        <label className="block sm:col-span-2">
                          <span className="label">{t('form.labels.houseNo')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            value={addressForm.houseNo}
                            onChange={(e) => setAddressForm((f) => ({ ...f, houseNo: e.target.value }))}
                            placeholder={t('form.placeholders.houseNo')}
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="label">{t('form.labels.street')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            value={addressForm.street}
                            onChange={(e) => setAddressForm((f) => ({ ...f, street: e.target.value }))}
                            placeholder={t('form.placeholders.street')}
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="label">{t('form.labels.landmark')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            value={addressForm.landmark}
                            onChange={(e) => setAddressForm((f) => ({ ...f, landmark: e.target.value }))}
                            placeholder={t('form.placeholders.landmark')}
                          />
                        </label>
                        <label className="block">
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
                        <label className="block">
                          <span className="label">{t('profile.townLabel')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            value={addressForm.town}
                            onChange={(e) => setAddressForm((f) => ({ ...f, town: e.target.value }))}
                          />
                        </label>
                        <label className="block sm:col-span-2">
                          <span className="label">{t('profile.districtLabel')}</span>
                          <input
                            className="donation-input !rounded-lg"
                            value={addressForm.district}
                            onChange={(e) => setAddressForm((f) => ({ ...f, district: e.target.value }))}
                          />
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
                <p className="text-sm font-bold text-ink">{t('profile.changeEmailTitle')}</p>
                <p className="mt-1 text-xs text-muted">{t('profile.changeEmailHelp')}</p>
                <p className="mt-2 text-sm text-muted">
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
                <span
                  className="group/buybooks relative inline-flex max-w-full cursor-not-allowed"
                  tabIndex={0}
                  aria-label={`${t('profile.buyBooks')}. ${t('profile.buyBooksComingSoon')}`}
                >
                  <button
                    type="button"
                    disabled
                    aria-hidden="true"
                    tabIndex={-1}
                    className="btn-secondary inline-flex min-h-11 w-full items-center justify-center gap-2 border-ink/10 bg-slate-100 px-8 py-2.5 text-sm font-semibold text-slate-500 opacity-60 grayscale sm:w-auto"
                  >
                    <BookOpen size={18} aria-hidden />
                    {t('profile.buyBooks')}
                    <CircleHelp
                      size={16}
                      className="shrink-0 text-slate-500 opacity-0 transition-opacity duration-200 group-hover/buybooks:opacity-100 group-focus-within/buybooks:opacity-100"
                      aria-hidden
                    />
                  </button>
                  <span
                    role="tooltip"
                    className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 mb-2 w-[min(16rem,calc(100vw-2.5rem))] -translate-x-1/2 rounded-lg border border-[#0d2d7f]/20 bg-white px-3 py-2 text-center text-xs font-medium leading-relaxed text-ink shadow-lg opacity-0 transition [@media(hover:hover)]:group-hover/buybooks:visible [@media(hover:hover)]:group-hover/buybooks:opacity-100 group-focus-within/buybooks:visible group-focus-within/buybooks:opacity-100"
                  >
                    {t('profile.buyBooksComingSoon')}
                  </span>
                </span>
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
