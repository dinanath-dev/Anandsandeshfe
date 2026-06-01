import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Info, LogOut, Search } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import DonationFormRow from '../components/DonationFormRow.jsx';
import {
  claimLegacyForm,
  getCurrentUser,
  getMyFormSubmission,
  lookupLegacyForm
} from '../services/api.js';
import { clearPendingOtp, clearUserAuth, getUserAuth } from '../utils/auth.js';
import { formatSubmissionAddress } from '../utils/formatSubmissionAddress.js';
import { maskEmail, maskPhone } from '../utils/maskContact.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

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

export default function ProfileOverviewPage() {
  const { t } = useTranslation();
  const LEGACY_LOOKUP_TOOLTIP = t('profile.lookupTooltip');
  const navigate = useNavigate();
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
        subscriberNo:
          linkedSubmission.subscriber_no != null
            ? String(linkedSubmission.subscriber_no)
            : '',
        phone: rawMobile ? maskPhone(rawMobile) : '',
        email: rawEmail ? maskEmail(rawEmail) : '',
        address: formatSubmissionAddress(linkedSubmission)
      };
    }

    if (legacyPreview?.type === 'submission' && legacyPreview.submission) {
      const s = legacyPreview.submission;
      const rawMobile = String(s.mobile || s.phone || '').trim();
      const rawEmail = String(s.email || '').trim();
      return {
        name: String(s.name || '').trim(),
        subscriberNo: s.subscriber_no != null ? String(s.subscriber_no) : '',
        phone: rawMobile ? maskPhone(rawMobile) : '',
        email: rawEmail ? maskEmail(rawEmail) : '',
        address: formatSubmissionAddress(s)
      };
    }

    if (legacyPreview?.type === 'matches' && selectedLegacyMatch) {
      return {
        name: String(selectedLegacyMatch.nameMasked || '').trim(),
        subscriberNo:
          selectedLegacyMatch.subscriberNo != null
            ? String(selectedLegacyMatch.subscriberNo)
            : lastSearch?.mode === 'subscriber' && lastSearch.subscriberNo
              ? String(lastSearch.subscriberNo)
              : '',
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

  function handleLogout() {
    clearUserAuth();
    clearPendingOtp();
    navigate('/', { replace: true });
  }

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
      const sub = data?.submission;
      const rawMatches = data?.matches;
      const matches = Array.isArray(rawMatches)
        ? rawMatches.filter((m) => legacyMatchHasSignal(m))
        : [];

      if (sub && !submissionLooksEmpty(sub)) {
        setLegacyPreview({ type: 'submission', submission: sub });
        return;
      }

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
      <button
        type="button"
        className="btn-secondary fixed right-3 top-[max(6.5rem,env(safe-area-inset-top)+5.25rem)] z-[60] inline-flex min-h-10 items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-semibold shadow-md sm:right-6 sm:top-5 sm:px-4"
        onClick={handleLogout}
      >
        <LogOut size={18} aria-hidden /> {t('common.logout')}
      </button>

      <div className="donation-form-shell w-full px-1 py-2 sm:px-3 sm:py-3">
        {loading ? (
          <LoadingBlock label={t('loaders.loadingDetails')} />
        ) : (
          <div className="donation-form">
            {showSearchSection ? (
            <div className="donation-form-banner w-full text-center sm:text-left">
              <div className="rounded-2xl border border-[#0d2d7f]/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(244,248,255,0.92))] p-3 shadow-[0_10px_30px_-18px_rgba(13,45,127,0.45)] sm:p-4">
                <div className="flex w-full flex-row items-start justify-center gap-2 sm:justify-start sm:gap-3">
                  <div className="min-w-0 w-full max-w-xl sm:max-w-none sm:flex-1">
                    <p className="inline-flex w-full min-h-12 items-center justify-center rounded-xl border border-[#0d2d7f]/25 bg-white px-4 py-2.5 text-center text-sm font-bold text-[#0d2d7f] shadow-sm sm:justify-start sm:text-left">
                      {t('profile.offlineToggle')}
                    </p>
                    <p className="mt-3 rounded-xl border border-[#0d2d7f]/10 bg-white/75 px-3 py-2.5 text-left text-sm leading-relaxed text-muted">
                      {t('profile.offlineHelp')}
                    </p>

                    <form onSubmit={handleLegacySearch} className="mt-3 rounded-xl border border-[#0d2d7f]/12 bg-white/80 p-3 sm:p-4">
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
                      <div className="mt-4 rounded-xl border border-[#0d2d7f]/12 bg-white/90 px-3 py-3 sm:px-4">
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
                  <div className="group/icon relative shrink-0 pt-0.5">
                  <span
                    tabIndex={0}
                    className="inline-flex h-11 w-11 cursor-help items-center justify-center rounded-lg border border-[#0d2d7f]/25 bg-white text-primary shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
                    aria-label={t('profile.tooltipAria')}
                    aria-describedby="po-legacy-tooltip"
                    title={LEGACY_LOOKUP_TOOLTIP}
                  >
                    <Info className="h-5 w-5" strokeWidth={2.25} aria-hidden />
                  </span>
                  <span
                    id="po-legacy-tooltip"
                    role="tooltip"
                    className="pointer-events-none invisible absolute bottom-full right-0 z-30 mb-2 w-[min(20rem,calc(100vw-2.5rem))] rounded-lg border border-[#0d2d7f]/20 bg-white px-3 py-2.5 text-left text-xs font-medium leading-relaxed text-ink shadow-lg opacity-0 transition-[opacity,visibility] duration-150 max-sm:right-1/2 max-sm:translate-x-1/2 [@media(hover:hover)]:group-hover/icon:visible [@media(hover:hover)]:group-hover/icon:opacity-100 group-focus-within/icon:visible group-focus-within/icon:opacity-100"
                  >
                    {LEGACY_LOOKUP_TOOLTIP}
                  </span>
                  </div>
                </div>
              </div>
            </div>
            ) : null}

            {showContactSection && contactDisplay ? (
              <>
                <p className="donation-form-banner mb-1 mt-4 text-center text-sm text-muted sm:text-left">
                  {awaitingClaim ? t('profile.recordFound') : t('profile.bannerMaskedHelp')}
                </p>

                {contactDisplay.name ? (
                  <DonationFormRow label={t('profile.nameLabel')} labelFor="po-name">
                    <input
                      id="po-name"
                      className="donation-input donation-input--readonly-subscriber"
                      value={contactDisplay.name}
                      readOnly
                      autoComplete="off"
                    />
                  </DonationFormRow>
                ) : null}

                {contactDisplay.subscriberNo ? (
                  <DonationFormRow label={t('profile.subscriberNoLabel')} labelFor="po-subscriber">
                    <input
                      id="po-subscriber"
                      className="donation-input donation-input--readonly-subscriber"
                      value={contactDisplay.subscriberNo}
                      readOnly
                      autoComplete="off"
                    />
                  </DonationFormRow>
                ) : null}

                <DonationFormRow label={t('profile.mobileLabel')} labelFor="po-mobile">
                  <input
                    id="po-mobile"
                    className="donation-input donation-input--readonly-subscriber"
                    value={contactDisplay.phone || t('profile.notOnFile')}
                    readOnly
                    autoComplete="off"
                    aria-label={t('profile.mobileAria')}
                  />
                </DonationFormRow>

                <DonationFormRow label={t('profile.emailLabel')} labelFor="po-email">
                  <input
                    id="po-email"
                    type="text"
                    className="donation-input donation-input--readonly-subscriber"
                    value={contactDisplay.email || t('profile.notOnFile')}
                    readOnly
                    autoComplete="off"
                    aria-label={t('profile.emailAria')}
                  />
                </DonationFormRow>

                <DonationFormRow label={t('profile.addressLabel')} labelFor="po-address">
                  <textarea
                    id="po-address"
                    className="donation-input donation-input--readonly-subscriber min-h-[7rem]"
                    value={contactDisplay.address || t('profile.noSavedAddress')}
                    readOnly
                    rows={6}
                    aria-label={t('profile.addressAria')}
                  />
                </DonationFormRow>

                {awaitingClaim ? (
                  <div className="donation-form-actions !pt-0">
                    <button
                      type="button"
                      disabled={claimLoading}
                      onClick={handleClaimLegacy}
                      className="btn-primary donation-form-submit-btn !min-h-10 inline-flex !items-center !justify-center !gap-2 !px-6 !py-2 !text-sm font-semibold"
                    >
                      {claimLoading ? <InlineLoader size={20} /> : null}
                      {claimLoading ? t('profile.linking') : t('profile.linkRecord')}
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="donation-form-actions">
              <Link
                to="/form"
                className="btn-primary donation-form-submit-btn !min-h-10 inline-flex items-center justify-center gap-2 !px-8 !py-2 !text-sm font-semibold sm:!text-[0.9375rem]"
              >
                {t('profile.continueToForm')} <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
          </div>
        )}
      </div>
    </DonationLayout>
  );
}
