import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, Eye, EyeOff, Lock, RefreshCcw } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import AdminBrandedLayout from '../components/AdminBrandedLayout.jsx';
import { LoadingBlock } from '../components/Loader.jsx';
import { adminLogin, downloadSettlementDayExcel, getSettlementRecon } from '../services/api.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import {
  ACCOUNTS_PORTAL_SLUG,
  clearAdminSession,
  getAdminToken,
  isAdminPortalConfigured,
  saveAdminSession
} from '../utils/adminAuth.js';

const ACCOUNTING_YEAR_START = 2020;
const DAYS_PAGE_SIZE = 10;

function currentAccountingDefaults() {
  const now = new Date();
  return { year: String(now.getFullYear()), month: String(now.getMonth() + 1), day: '' };
}

function accountingYearOptions() {
  const current = new Date().getFullYear();
  const years = [];
  for (let y = current + 1; y >= ACCOUNTING_YEAR_START; y -= 1) years.push(y);
  return years;
}

function accountingMonthOptions(locale = 'en-IN') {
  return Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: new Date(2000, index, 1).toLocaleString(locale, { month: 'long' })
  }));
}

function daysInMonth(year, month) {
  const y = Number(year);
  const m = Number(month);
  if (!Number.isFinite(y) || !Number.isFinite(m) || m < 1 || m > 12) return 31;
  return new Date(y, m, 0).getDate();
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dateKeyFromParts(year, month, day) {
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

function formatRupees(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return '—';
  return `₹${(n / 100).toFixed(2)}`;
}

function dayFromDateKey(dateKey) {
  const parts = String(dateKey || '').split('-');
  return parts.length === 3 ? Number(parts[2]) : null;
}

export default function AccountsPage({ portalSlug = ACCOUNTS_PORTAL_SLUG, portalLabel }) {
  const { t, language } = useTranslation();
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

  const [token, setToken] = useState(() => getAdminToken(portalSlug));
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState(currentAccountingDefaults);
  const [summary, setSummary] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [daysPage, setDaysPage] = useState(1);
  const [exportingDay, setExportingDay] = useState(null);

  function handleAuthError(err) {
    setError(err.message);
    if (err.status === 401) {
      clearAdminSession(portalSlug);
      setToken('');
      setSummary(null);
      setExpandedDay(null);
      setDayDetail(null);
      setDaysPage(1);
    }
  }

  const loadSummary = useCallback(
    async (activeToken = token, activeFilters = filters) => {
      if (!activeToken) return;
      setIsLoading(true);
      setError('');
      setExpandedDay(null);
      setDayDetail(null);
      setDaysPage(1);
      try {
        const data = await getSettlementRecon(activeToken, activeFilters, portalSlug);
        setSummary(data);
      } catch (err) {
        handleAuthError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [token, filters, portalSlug]
  );

  useEffect(() => {
    if (token) loadSummary();
  }, [token, loadSummary]);

  async function loadDayDetail(dateKey) {
    if (!token || !dateKey) return;
    const day = dayFromDateKey(dateKey);
    if (!day) return;

    if (expandedDay === dateKey) {
      setExpandedDay(null);
      setDayDetail(null);
      return;
    }

    setExpandedDay(dateKey);
    setDayLoading(true);
    setError('');
    try {
      const data = await getSettlementRecon(
        token,
        { year: filters.year, month: filters.month, day: String(day) },
        portalSlug
      );
      setDayDetail(data);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setDayLoading(false);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    if (!isAdminPortalConfigured(portalSlug)) {
      setError(t('accountsAdmin.portalNotConfigured'));
      return;
    }
    try {
      const data = await adminLogin({ username, password }, portalSlug);
      saveAdminSession({ token: data.token, role: data.role, portal_slug: data.portal_slug }, portalSlug);
      setToken(data.token);
      setUsername('');
      setPassword('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDownloadDay(dateKey, event) {
    event.stopPropagation();
    if (!token || !dateKey) return;
    const day = dayFromDateKey(dateKey);
    if (!day) return;

    setExportingDay(dateKey);
    setError('');
    try {
      await downloadSettlementDayExcel(
        token,
        { year: filters.year, month: filters.month, day: String(day), dateKey },
        portalSlug
      );
    } catch (err) {
      handleAuthError(err);
    } finally {
      setExportingDay(null);
    }
  }

  function handleLogout() {
    clearAdminSession(portalSlug);
    setToken('');
    setSummary(null);
    setExpandedDay(null);
    setDayDetail(null);
    setDaysPage(1);
  }

  async function handleDownloadDay(dateKey, event) {
    event.stopPropagation();
    if (!token || !dateKey) return;
    const day = dayFromDateKey(dateKey);
    if (!day) return;

    setExportingDay(dateKey);
    setError('');
    try {
      await downloadSettlementDayExcel(
        token,
        { year: filters.year, month: filters.month, day: String(day), dateKey },
        portalSlug
      );
    } catch (err) {
      handleAuthError(err);
    } finally {
      setExportingDay(null);
    }
  }

  const days = useMemo(() => {
    const all = summary?.days || [];
    if (!filters.day) return all;
    const key = dateKeyFromParts(filters.year, filters.month, filters.day);
    return all.filter((day) => day.date === key);
  }, [summary?.days, filters.year, filters.month, filters.day]);

  const displayTotals = useMemo(() => {
    if (!filters.day) {
      return summary?.totals || null;
    }
    if (!days.length) {
      return {
        payment_count: 0,
        credit_paise: 0,
        debit_paise: 0,
        fee_paise: 0,
        tax_paise: 0,
        net_paise: 0
      };
    }
    return days.reduce(
      (acc, day) => ({
        payment_count: acc.payment_count + day.payment_count,
        credit_paise: acc.credit_paise + day.credit_paise,
        debit_paise: acc.debit_paise + (day.debit_paise || 0),
        fee_paise: acc.fee_paise + day.fee_paise,
        tax_paise: acc.tax_paise + day.tax_paise,
        net_paise: acc.net_paise + day.net_paise
      }),
      {
        payment_count: 0,
        credit_paise: 0,
        debit_paise: 0,
        fee_paise: 0,
        tax_paise: 0,
        net_paise: 0
      }
    );
  }, [filters.day, days, summary?.totals]);

  const daysTotalPages = Math.max(1, Math.ceil(days.length / DAYS_PAGE_SIZE));
  const paginatedDays = useMemo(() => {
    const start = (daysPage - 1) * DAYS_PAGE_SIZE;
    return days.slice(start, start + DAYS_PAGE_SIZE);
  }, [days, daysPage]);

  useEffect(() => {
    if (daysPage > daysTotalPages) setDaysPage(daysTotalPages);
  }, [daysPage, daysTotalPages]);

  const dayOptions = useMemo(() => {
    const count = daysInMonth(filters.year, filters.month);
    return Array.from({ length: count }, (_, i) => String(i + 1));
  }, [filters.year, filters.month]);

  if (!token) {
    return (
      <AdminBrandedLayout subtitle={t('accountsAdmin.pageTitle')} narrow>
        <form onSubmit={handleLogin} className="admin-login-card admin-rise w-full sm:p-8">
          <div className="text-center">
            <Lock className="mx-auto mb-4 text-emerald-700" size={48} />
            <p className="text-sm text-muted">{t('accountsAdmin.loginSubtitle')}</p>
          </div>
            {error ? (
              <div className="mt-4">
                <Alert>{error}</Alert>
              </div>
            ) : null}
            {!isAdminPortalConfigured(portalSlug) ? (
              <div className="mt-4">
                <Alert>{t('accountsAdmin.portalNotConfigured')}</Alert>
              </div>
            ) : null}
            <label className="mt-6 block">
              <span className="label">{t('admin.usernameLabel')}</span>
              <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </label>
            <label className="mt-4 block">
              <span className="label">{t('admin.passwordLabel')}</span>
              <div className="relative">
                <input
                  className="input pr-10"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button className="admin-report-btn-primary mt-6 w-full" type="submit" disabled={!isAdminPortalConfigured(portalSlug)}>
              {t('admin.loginButton')}
            </button>
          </form>
      </AdminBrandedLayout>
    );
  }

  const monthOptions = accountingMonthOptions(locale);
  const yearOptions = accountingYearOptions();

  return (
    <>
      {(isLoading || dayLoading) ? (
        <LoadingBlock label={dayLoading ? t('accountsAdmin.loadingDay') : t('accountsAdmin.loading')} />
      ) : null}
      <AdminBrandedLayout
        subtitle={t('accountsAdmin.pageTitle')}
        onLogout={handleLogout}
        logoutLabel={t('common.logout')}
      >
        {error ? (
          <div className="mb-4">
            <Alert>{error}</Alert>
          </div>
        ) : null}

        <div className="admin-report-filters mb-6">
          <div className="admin-filter-row">
            <label className="admin-filter-field">
              <span className="admin-report-label">{t('admin.filters.accountingYear')}</span>
              <select
                className="input text-base"
                value={filters.year}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    year: e.target.value,
                    day: ''
                  }))
                }
              >
                {yearOptions.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-filter-field">
              <span className="admin-report-label">{t('admin.filters.accountingMonth')}</span>
              <select
                className="input text-base"
                value={filters.month}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    month: e.target.value,
                    day: ''
                  }))
                }
              >
                {monthOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="admin-filter-field">
              <span className="admin-report-label">{t('admin.filters.accountingDay')}</span>
              <select
                className="input text-base"
                value={filters.day}
                onChange={(e) => {
                  setFilters((prev) => ({ ...prev, day: e.target.value }));
                  setDaysPage(1);
                  setExpandedDay(null);
                  setDayDetail(null);
                }}
              >
                <option value="">{t('admin.filters.allDays')}</option>
                {dayOptions.map((day) => (
                  <option key={day} value={day}>
                    {day}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {displayTotals ? (
          <div className="admin-stat-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-card__label">{t('accountsAdmin.payments')}</div>
              <div className="admin-stat-card__value">{displayTotals.payment_count}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-card__label">{t('accountsAdmin.gross')}</div>
              <div className="admin-stat-card__value">{formatRupees(displayTotals.credit_paise)}</div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-card__label">{t('accountsAdmin.feesTax')}</div>
              <div className="admin-stat-card__value">
                {formatRupees(displayTotals.fee_paise + displayTotals.tax_paise)}
              </div>
            </div>
            <div className="admin-stat-card">
              <div className="admin-stat-card__label">{t('accountsAdmin.net')}</div>
              <div className="admin-stat-card__value">{formatRupees(displayTotals.net_paise)}</div>
            </div>
          </div>
        ) : null}

        <div className="admin-report-card">
          <div className="admin-report-section-title">{t('accountsAdmin.dayWiseTitle')}</div>
          <div className="admin-report-table-wrap">
            <table className="admin-report-table admin-settlements-table w-full text-base">
              <thead>
                <tr>
                  <th className="col-expand" aria-label="Expand" />
                  <th className="col-date">{t('accountsAdmin.date')}</th>
                  <th className="col-num">{t('accountsAdmin.payments')}</th>
                  <th className="col-num">{t('accountsAdmin.gross')}</th>
                  <th className="col-num">{t('accountsAdmin.fees')}</th>
                  <th className="col-num">{t('accountsAdmin.tax')}</th>
                  <th className="col-num">{t('accountsAdmin.net')}</th>
                  <th className="col-utr">{t('accountsAdmin.utr')}</th>
                  <th className="col-download" aria-label={t('accountsAdmin.downloadExcel')} />
                </tr>
              </thead>
              <tbody>
                {paginatedDays.map((day) => {
                  const isOpen = expandedDay === day.date;
                  return (
                    <Fragment key={day.date}>
                      <tr className="cursor-pointer hover:bg-emerald-50/60" onClick={() => loadDayDetail(day.date)}>
                        <td className="col-expand text-emerald-800">
                          {isOpen ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </td>
                        <td className="col-date font-semibold text-ink">{day.date}</td>
                        <td className="col-num">{day.payment_count}</td>
                        <td className="col-num">{formatRupees(day.credit_paise)}</td>
                        <td className="col-num">{formatRupees(day.fee_paise)}</td>
                        <td className="col-num">{formatRupees(day.tax_paise)}</td>
                        <td className="col-num font-semibold text-emerald-900">{formatRupees(day.net_paise)}</td>
                        <td className="col-utr">{day.utrs?.[0] || '—'}</td>
                        <td className="col-download">
                          <button
                            type="button"
                            className="admin-download-icon-btn"
                            onClick={(event) => handleDownloadDay(day.date, event)}
                            disabled={exportingDay === day.date}
                            aria-label={`${t('accountsAdmin.downloadExcel')} ${day.date}`}
                            title={t('accountsAdmin.downloadExcel')}
                          >
                            {exportingDay === day.date ? (
                              <RefreshCcw size={18} className="animate-spin" />
                            ) : (
                              <Download size={18} strokeWidth={2.25} aria-hidden />
                            )}
                          </button>
                        </td>
                      </tr>
                      {isOpen ? (
                        <tr key={`${day.date}-detail`}>
                          <td colSpan={9} className="bg-emerald-50/40 p-0">
                            {dayLoading ? (
                              <div className="py-12" aria-hidden="true" />
                            ) : (
                              <div className="overflow-x-auto px-2 py-3 sm:px-4">
                                <table className="admin-report-table w-full text-sm">
                                  <thead>
                                    <tr>
                                      <th>{t('accountsAdmin.source')}</th>
                                      <th>{t('accountsAdmin.payerName')}</th>
                                      <th>{t('accountsAdmin.phone')}</th>
                                      <th>{t('accountsAdmin.productDetail')}</th>
                                      <th>{t('accountsAdmin.method')}</th>
                                      <th>{t('accountsAdmin.gross')}</th>
                                      <th>{t('accountsAdmin.fees')}</th>
                                      <th>{t('accountsAdmin.net')}</th>
                                      <th>{t('accountsAdmin.paymentId')}</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {(dayDetail?.transactions || []).map((row, index) => (
                                      <tr key={`${row.entity_id}-${row.payment_id}-${index}`}>
                                        <td className="whitespace-nowrap">
                                          <span
                                            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${
                                              row.source === 'book'
                                                ? 'bg-amber-100 text-amber-800'
                                                : row.source === 'subscription'
                                                  ? 'bg-emerald-100 text-emerald-800'
                                                  : 'bg-slate-100 text-slate-600'
                                            }`}
                                          >
                                            {row.source === 'book'
                                              ? t('accountsAdmin.sourceBook')
                                              : row.source === 'subscription'
                                                ? t('accountsAdmin.sourceSubscription')
                                                : t('accountsAdmin.sourceOther')}
                                          </span>
                                        </td>
                                        <td className="font-semibold text-ink">{row.name || '—'}</td>
                                        <td className="whitespace-nowrap">{row.phone || '—'}</td>
                                        <td className="max-w-[280px] text-ink">{row.detail || '—'}</td>
                                        <td>{row.method || '—'}</td>
                                        <td>{formatRupees(row.credit_paise)}</td>
                                        <td>{formatRupees(row.fee_paise + row.tax_paise)}</td>
                                        <td className="font-semibold">{formatRupees(row.net_paise)}</td>
                                        <td className="font-mono text-xs">{row.payment_id || row.entity_id || '—'}</td>
                                      </tr>
                                    ))}
                                    {!dayDetail?.transactions?.length ? (
                                      <tr>
                                        <td colSpan={9} className="py-4 text-center text-muted">
                                          {t('accountsAdmin.noTransactions')}
                                        </td>
                                      </tr>
                                    ) : null}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  );
                })}
                {!days.length && !isLoading ? (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-muted">
                      {t('accountsAdmin.none')}
                    </td>
                  </tr>
                ) : null}
                {displayTotals && days.length ? (
                  <tr className="admin-report-table__total-row">
                    <td />
                    <td className="col-date">
                      {filters.day ? t('accountsAdmin.dayTotal') : t('accountsAdmin.monthTotal')}
                    </td>
                    <td className="col-num">{displayTotals.payment_count}</td>
                    <td className="col-num">{formatRupees(displayTotals.credit_paise)}</td>
                    <td className="col-num">{formatRupees(displayTotals.fee_paise)}</td>
                    <td className="col-num">{formatRupees(displayTotals.tax_paise)}</td>
                    <td className="col-num">{formatRupees(displayTotals.net_paise)}</td>
                    <td />
                    <td />
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          {days.length > 0 ? (
            <div className="admin-report-pagination">
              <p className="text-sm text-muted">
                {t('admin.pagination.showing', {
                  from: (daysPage - 1) * DAYS_PAGE_SIZE + 1,
                  to: Math.min(daysPage * DAYS_PAGE_SIZE, days.length),
                  total: days.length
                })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="admin-report-btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() => {
                    setDaysPage((p) => Math.max(1, p - 1));
                    setExpandedDay(null);
                    setDayDetail(null);
                  }}
                  disabled={daysPage <= 1 || isLoading}
                >
                  <ChevronLeft size={16} aria-hidden />
                  {t('admin.pagination.previous')}
                </button>
                <span className="px-2 text-sm font-semibold text-ink">
                  {t('admin.pagination.pageOf', { page: daysPage, total: daysTotalPages })}
                </span>
                <button
                  type="button"
                  className="admin-report-btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                  onClick={() => {
                    setDaysPage((p) => Math.min(daysTotalPages, p + 1));
                    setExpandedDay(null);
                    setDayDetail(null);
                  }}
                  disabled={daysPage >= daysTotalPages || isLoading}
                >
                  {t('admin.pagination.next')}
                  <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </AdminBrandedLayout>
    </>
  );
}
