import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Info, LogOut, Search } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import DonationLayout from '../components/DonationLayout.jsx';
import DonationFormRow from '../components/DonationFormRow.jsx';
import {
  claimLegacyForm,
  getCurrentUser,
  getMyFormSubmission,
  lookupLegacyFormByMobile
} from '../services/api.js';
import { clearPendingOtp, clearUserAuth, getUserAuth } from '../utils/auth.js';
import { formatSubmissionAddress } from '../utils/formatSubmissionAddress.js';
import { maskEmail, maskPhone } from '../utils/maskContact.js';

const LEGACY_LOOKUP_TOOLTIP =
  'If you subscribed offline, enter the same 10-digit mobile number from your paper form. We show your saved address so you can confirm it and link it to this login.';

function normalizeMobile10(value) {
  const d = String(value ?? '').replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('0')) return d.slice(1);
  return d.length === 10 ? d : '';
}

function submissionLooksEmpty(sub) {
  if (!sub) return true;
  const mob = normalizeMobile10(sub.mobile);
  const addr = formatSubmissionAddress(sub);
  const name = String(sub.name || '').trim();
  return !mob && !addr && !name;
}

/** Backend may return privacy-safe hints instead of a full `submission`. */
function matchSummaryToAddressPreview(m) {
  if (!m || typeof m !== 'object') return '';
  const town = String(m.town || '').trim();
  const district = String(m.district || '').trim();
  const loc = [town, district].filter(Boolean);
  const rawPin = m.pinLast4 != null ? String(m.pinLast4).trim() : '';
  const last4 = rawPin.replace(/\D/g, '').slice(-4);
  const pinHint = last4.length === 4 ? `PIN ending in ${last4}` : '';
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [linkedSubmission, setLinkedSubmission] = useState(null);
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [emailDisplay, setEmailDisplay] = useState('');
  const [addressText, setAddressText] = useState('');

  const [legacyMobile, setLegacyMobile] = useState('');
  const [legacyLoading, setLegacyLoading] = useState(false);
  const [legacyError, setLegacyError] = useState('');
  const [legacyPreview, setLegacyPreview] = useState(null);
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimInfo, setClaimInfo] = useState('');

  const applyServerProfile = useCallback((user, submission, fallbackEmail) => {
    setLinkedSubmission(submission || null);
    const rawMobile = String(submission?.mobile || user?.mobile || '').trim();
    const rawEmail = String(submission?.email || user?.email || fallbackEmail).trim();
    setPhoneDisplay(rawMobile ? maskPhone(rawMobile) : '');
    setEmailDisplay(rawEmail ? maskEmail(rawEmail) : '');
    setAddressText(formatSubmissionAddress(submission));
  }, []);

  const refreshProfile = useCallback(async () => {
    const auth = getUserAuth();
    const fallbackEmail = auth?.user?.email?.trim() || '';
    const [meRes, subRes] = await Promise.all([getCurrentUser(), getMyFormSubmission()]);
    const user = meRes?.user;
    const submission = subRes?.submission;
    applyServerProfile(user, submission, fallbackEmail);
  }, [applyServerProfile]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const auth = getUserAuth();
      const fallbackEmail = auth?.user?.email?.trim() || '';

      try {
        const [meRes, subRes] = await Promise.all([getCurrentUser(), getMyFormSubmission()]);
        if (cancelled) return;
        applyServerProfile(meRes?.user, subRes?.submission, fallbackEmail);
      } catch {
        if (cancelled) return;
        setLinkedSubmission(null);
        setPhoneDisplay('');
        setEmailDisplay(fallbackEmail ? maskEmail(fallbackEmail) : '');
        setAddressText('');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [applyServerProfile]);

  const legacyOpenDefault = useMemo(
    () => submissionLooksEmpty(linkedSubmission),
    [linkedSubmission]
  );

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

    const mobile = normalizeMobile10(legacyMobile);
    if (!mobile) {
      setLegacyError('Enter the same 10-digit mobile number you used for your offline subscription.');
      return;
    }

    setLegacyLoading(true);
    try {
      const data = await lookupLegacyFormByMobile({ mobile });
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

      setLegacyError('No offline record found for this mobile. Check the number or contact support.');
    } catch (err) {
      setLegacyError(err.message || 'Could not search. Please try again.');
    } finally {
      setLegacyLoading(false);
    }
  }

  async function handleClaimLegacy() {
    const mobile = normalizeMobile10(legacyMobile);
    if (!mobile || !legacyPreview) return;

    setClaimInfo('');
    setLegacyError('');
    setClaimLoading(true);
    try {
      const payload = { mobile: String(mobile) };
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
      setLegacyMobile('');
      setClaimInfo('Your offline record is now linked to this account. You can continue to the form to pay or update details.');
    } catch (err) {
      setLegacyError(err.message || 'Could not link this record. Please try again.');
    } finally {
      setClaimLoading(false);
    }
  }

  const selectedLegacyMatch =
    legacyPreview?.type === 'matches' ? legacyPreview.matches[legacyPreview.selectedIndex] : null;

  const legacyAddressPreview =
    legacyPreview?.type === 'submission'
      ? formatSubmissionAddress(legacyPreview.submission)
      : selectedLegacyMatch
        ? matchSummaryToAddressPreview(selectedLegacyMatch)
        : '';

  const legacyNamePreview =
    legacyPreview?.type === 'submission'
      ? String(legacyPreview.submission.name || '').trim()
      : selectedLegacyMatch
        ? String(selectedLegacyMatch.nameMasked || '').trim()
        : '';

  const legacyEmailPreview =
    legacyPreview?.type === 'submission'
      ? maskEmail(String(legacyPreview.submission.email || '').trim())
      : selectedLegacyMatch?.emailMasked
        ? String(selectedLegacyMatch.emailMasked)
        : '—';

  const legacySubscriberHint =
    selectedLegacyMatch?.subscriberNo != null
      ? String(selectedLegacyMatch.subscriberNo)
      : legacyPreview?.type === 'submission' && legacyPreview.submission?.subscriber_no != null
        ? String(legacyPreview.submission.subscriber_no)
        : '';

  return (
    <DonationLayout subtitle="Your contact details on file">
      <button
        type="button"
        className="btn-secondary fixed right-3 top-[max(6.5rem,env(safe-area-inset-top)+5.25rem)] z-[60] inline-flex min-h-10 items-center gap-2 whitespace-nowrap px-3 py-2 text-sm font-semibold shadow-md sm:right-6 sm:top-5 sm:px-4"
        onClick={handleLogout}
      >
        <LogOut size={18} aria-hidden /> Log out
      </button>

      <div className="donation-form-shell w-full px-1 py-2 sm:px-3 sm:py-3">
        {loading ? (
          <p className="text-center text-sm text-muted">Loading your details…</p>
        ) : (
          <div className="donation-form">
            <p className="donation-form-banner mb-1 text-center text-sm text-muted sm:text-left">
              Phone and email are partially hidden. You can review or update the full values on the next screen.
            </p>

            <div className="donation-form-banner mt-3 w-full text-center sm:text-left">
              <div className="flex w-full flex-row items-start justify-center gap-2 sm:justify-start sm:gap-3">
                <details className="min-w-0 w-full max-w-xl sm:max-w-none sm:flex-1" defaultOpen={legacyOpenDefault}>
                  <summary className="cursor-pointer list-none outline-none [&::-webkit-details-marker]:hidden focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[rgba(255,255,255,0.85)]">
                    <span className="btn-secondary inline-flex w-full min-h-11 items-center justify-center px-4 py-2.5 text-center text-sm font-semibold shadow-sm sm:justify-start sm:text-left">
                      Subscribed offline before? Find your record by mobile
                    </span>
                  </summary>
                  <p className="mt-2 text-left text-sm text-muted">
                    If you used a different email before or are new to this website, your details may still be in our
                    database from the offline process. Enter the <strong>mobile number</strong> from your old form—we
                    will show the saved <strong>address</strong> so you can confirm it is yours, then link it to this
                    login.
                  </p>

                  <form onSubmit={handleLegacySearch} className="mt-3 space-y-3">
                    <DonationFormRow label="Search mobile" labelFor="po-legacy-mobile">
                      <input
                        id="po-legacy-mobile"
                        className="donation-input"
                        inputMode="numeric"
                        maxLength={10}
                        autoComplete="tel"
                        placeholder="10-digit number"
                        value={legacyMobile}
                        onChange={(e) => setLegacyMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      />
                    </DonationFormRow>
                    <div className="donation-form-actions !justify-start !pt-0">
                      <button
                        type="submit"
                        disabled={legacyLoading}
                        className="btn-secondary inline-flex min-h-10 items-center gap-2 px-5 py-2 text-sm font-semibold"
                      >
                        <Search size={18} aria-hidden />
                        {legacyLoading ? 'Searching…' : 'Search database'}
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

                  {legacyPreview ? (
                    <div className="mt-4 rounded-lg border border-[#0d2d7f]/20 bg-white/90 px-3 py-3 sm:px-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-muted">Record found — confirm by address</p>
                      {legacyPreview.type === 'matches' && legacyPreview.matches.length > 1 ? (
                        <div className="mt-2">
                          <label htmlFor="po-legacy-pick" className="text-xs font-semibold text-muted">
                            Several records share this number — pick the one that matches you
                          </label>
                          <select
                            id="po-legacy-pick"
                            className="donation-input mt-1 max-w-full"
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
                                {String(m.nameMasked || 'Record').trim()} · Sub. {m.subscriberNo ?? '—'} ·{' '}
                                {matchSummaryToAddressPreview(m)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                      {legacyNamePreview ? (
                        <p className="mt-2 text-sm">
                          <span className="font-semibold text-ink">Name on file:</span> {legacyNamePreview}
                        </p>
                      ) : null}
                      {legacySubscriberHint ? (
                        <p className="mt-2 text-sm">
                          <span className="font-semibold text-ink">Subscriber no. (hint):</span> {legacySubscriberHint}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm">
                        <span className="font-semibold text-ink">Email on file (masked):</span>{' '}
                        {legacyEmailPreview || '—'}
                      </p>
                      <p className="mt-2 text-sm font-semibold text-ink">Address on file</p>
                      <pre className="mt-1 whitespace-pre-wrap font-sans text-sm leading-relaxed text-ink/90">
                        {legacyAddressPreview || '—'}
                      </pre>
                      <div className="donation-form-actions !pb-0 !pt-3">
                        <button
                          type="button"
                          disabled={claimLoading}
                          onClick={handleClaimLegacy}
                          className="btn-primary donation-form-submit-btn !min-h-10 !px-6 !py-2 !text-sm font-semibold"
                        >
                          {claimLoading ? 'Linking…' : 'This is my record — link to my account'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </details>
                <div className="group/icon relative shrink-0 pt-0.5">
                  <span
                    tabIndex={0}
                    className="inline-flex h-11 w-11 cursor-help items-center justify-center rounded-lg border border-[#0d2d7f]/25 bg-white text-primary shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2"
                    aria-label="About offline subscription lookup"
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

            <DonationFormRow label="Mobile number" labelFor="po-mobile">
              <input
                id="po-mobile"
                className="donation-input donation-input--readonly-subscriber"
                value={phoneDisplay || '— Not on file yet —'}
                readOnly
                autoComplete="off"
                aria-label="Mobile number (masked)"
              />
            </DonationFormRow>

            <DonationFormRow label="Email" labelFor="po-email">
              <input
                id="po-email"
                type="text"
                className="donation-input donation-input--readonly-subscriber"
                value={emailDisplay || '— Not on file yet —'}
                readOnly
                autoComplete="off"
                aria-label="Email (masked)"
              />
            </DonationFormRow>

            <DonationFormRow label="Address" labelFor="po-address">
              <textarea
                id="po-address"
                className="donation-input donation-input--readonly-subscriber min-h-[7rem]"
                value={addressText || '— No saved address yet —'}
                readOnly
                rows={6}
                aria-label="Postal address"
              />
            </DonationFormRow>

            <div className="donation-form-actions">
              <Link
                to="/form"
                className="btn-primary donation-form-submit-btn !min-h-10 inline-flex items-center justify-center gap-2 !px-8 !py-2 !text-sm font-semibold sm:!text-[0.9375rem]"
              >
                Continue to subscription form <ArrowRight size={18} aria-hidden />
              </Link>
            </div>
          </div>
        )}
      </div>
    </DonationLayout>
  );
}
