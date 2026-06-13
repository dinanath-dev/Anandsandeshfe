import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CheckCircle2, Info, Mail, MapPin, Phone, Search, User } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import {
  claimLegacyForm,
  getCurrentUser,
  getMyFormSubmission,
  lookupLegacyForm
} from '../services/api.js';
import { formatSubmissionAddress } from '../utils/formatSubmissionAddress.js';
import { maskEmail, maskPhone } from '../utils/maskContact.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useSeo } from '../utils/seo.js';
import { getSubscriptionPeriodSummary } from '../utils/subscriptionPeriod.js';

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

  const applyServerProfile = useCallback((_user, submission) => {
    setLinkedSubmission(submission || null);
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
        name: String(linkedSubmission.name || '').trim(),
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
                  className="btn-secondary inline-flex min-h-11 items-center justify-center gap-2 px-8 py-2.5 text-sm font-semibold"
                >
                  <BookOpen size={18} aria-hidden /> {t('profile.buyBooks')}
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
