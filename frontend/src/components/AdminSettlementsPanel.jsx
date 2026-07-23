import { useCallback, useEffect, useMemo, useState, Fragment } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Download, RefreshCcw } from 'lucide-react';
import { LoadingBlock } from './Loader.jsx';
import { downloadSettlementDayExcel, getSettlementRecon } from '../services/api.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { useToast } from './ToastProvider.jsx';
import { ACCOUNTS_PORTAL_SLUG } from '../utils/adminAuth.js';

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

/**
 * Razorpay settlements recon panel — shared by Accounts portal and main Admin tab.
 */
export default function AdminSettlementsPanel({
  token,
  portalSlug = ACCOUNTS_PORTAL_SLUG,
  onAuthError
}) {
  const { t, language } = useTranslation();
  const toast = useToast();
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

  const [isLoading, setIsLoading] = useState(false);
  const [filters, setFilters] = useState(currentAccountingDefaults);
  const [summary, setSummary] = useState(null);
  const [expandedDay, setExpandedDay] = useState(null);
  const [dayDetail, setDayDetail] = useState(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [daysPage, setDaysPage] = useState(1);
  const [exportingDay, setExportingDay] = useState(null);

  function handleError(err) {
    // Parent (AdminPage / AccountsPage) surfaces a friendly error toast + session handling.
    onAuthError?.(err);
  }

  const loadSummary = useCallback(
    async (activeToken = token, activeFilters = filters) => {
      if (!activeToken) return;
      setIsLoading(true);
      setExpandedDay(null);
      setDayDetail(null);
      setDaysPage(1);
      try {
        const data = await getSettlementRecon(activeToken, activeFilters, portalSlug);
        setSummary(data);
      } catch (err) {
        handleError(err);
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onAuthError is stable enough via parent
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
    try {
      const data = await getSettlementRecon(
        token,
        { year: filters.year, month: filters.month, day: String(day) },
        portalSlug
      );
      setDayDetail(data);
    } catch (err) {
      handleError(err);
    } finally {
      setDayLoading(false);
    }
  }

  async function handleDownloadDay(dateKey, event) {
    event.stopPropagation();
    if (!token || !dateKey) return;
    const day = dayFromDateKey(dateKey);
    if (!day) return;

    setExportingDay(dateKey);
    try {
      await downloadSettlementDayExcel(
        token,
        { year: filters.year, month: filters.month, day: String(day), dateKey },
        portalSlug
      );
      toast.success(t('admin.toasts.downloadStarted'));
    } catch (err) {
      handleError(err);
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

  const monthOptions = accountingMonthOptions(locale);
  const yearOptions = accountingYearOptions();

  function sourceLabel(source) {
    if (source === 'book') return t('accountsAdmin.sourceBook');
    if (source === 'subscription') return t('accountsAdmin.sourceSubscription');
    return t('accountsAdmin.sourceOther');
  }

  function sourceBadgeClass(source) {
    if (source === 'book') return 'bg-amber-100 text-amber-800';
    if (source === 'subscription') return 'bg-emerald-100 text-emerald-800';
    return 'bg-slate-100 text-slate-600';
  }

  function renderDayTransactions() {
    if (dayLoading) {
      return <div className="py-10" aria-hidden="true" />;
    }

    const rows = dayDetail?.transactions || [];
    if (!rows.length) {
      return <p className="px-4 py-5 text-center text-sm text-muted">{t('accountsAdmin.noTransactions')}</p>;
    }

    return (
      <>
        <div className="space-y-3 p-3 md:hidden">
          {rows.map((row, index) => (
            <div
              key={`${row.entity_id}-${row.payment_id}-${index}-m`}
              className="admin-settlement-txn-card"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${sourceBadgeClass(row.source)}`}>
                  {sourceLabel(row.source)}
                </span>
                <span className="text-sm font-bold text-emerald-900">{formatRupees(row.net_paise)}</span>
              </div>
              <div className="mt-2 font-semibold text-ink">{row.name || '—'}</div>
              <div className="mt-1 text-sm text-muted">{row.phone || '—'}</div>
              {row.detail ? <div className="mt-1 text-sm text-ink">{row.detail}</div> : null}
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-xs font-semibold uppercase text-emerald-700">{t('accountsAdmin.method')}</div>
                  <div>{row.method || '—'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-emerald-700">{t('accountsAdmin.gross')}</div>
                  <div>{formatRupees(row.credit_paise)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-emerald-700">{t('accountsAdmin.fees')}</div>
                  <div>{formatRupees(row.fee_paise + row.tax_paise)}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase text-emerald-700">{t('accountsAdmin.paymentId')}</div>
                  <div className="break-all font-mono text-xs">{row.payment_id || row.entity_id || '—'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto px-2 py-3 sm:px-4 md:block">
          <table className="admin-report-table min-w-[760px] w-full text-sm">
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
              {rows.map((row, index) => (
                <tr key={`${row.entity_id}-${row.payment_id}-${index}`}>
                  <td className="whitespace-nowrap">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${sourceBadgeClass(row.source)}`}>
                      {sourceLabel(row.source)}
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
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <>
      {isLoading || dayLoading ? (
        <LoadingBlock label={dayLoading ? t('accountsAdmin.loadingDay') : t('accountsAdmin.loading')} />
      ) : null}

      <div className="admin-report-filters mb-6">
        <div className="admin-filter-row admin-settlements-filters">
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
          <div className="admin-filter-field admin-filter-field--actions">
            <span className="admin-filter-action__spacer" aria-hidden="true" />
            <button
              type="button"
              className="admin-report-btn-secondary inline-flex w-full items-center justify-center gap-2"
              onClick={() => loadSummary()}
              disabled={isLoading || !token}
            >
              <RefreshCcw size={16} aria-hidden />
              {t('admin.refresh')}
            </button>
          </div>
        </div>
      </div>

      {displayTotals ? (
        <div className="admin-stat-grid admin-settlements-stats">
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

        {/* Mobile: day cards */}
        <div className="space-y-3 p-3 md:hidden">
          {!days.length && !isLoading ? (
            <p className="py-8 text-center text-muted">{t('accountsAdmin.none')}</p>
          ) : null}
          {paginatedDays.map((day) => {
            const isOpen = expandedDay === day.date;
            return (
              <div key={day.date} className="admin-settlement-day-card">
                <button
                  type="button"
                  className="admin-settlement-day-card__header"
                  onClick={() => loadDayDetail(day.date)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-base font-bold text-ink">{day.date}</div>
                      <div className="mt-1 text-sm text-muted">
                        {day.payment_count} {t('accountsAdmin.payments')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-emerald-900">{formatRupees(day.net_paise)}</span>
                      <span className="text-emerald-800">
                        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                      </span>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className="text-xs font-semibold uppercase text-emerald-700">{t('accountsAdmin.gross')}</div>
                      <div className="tabular-nums">{formatRupees(day.credit_paise)}</div>
                    </div>
                    <div>
                      <div className="text-xs font-semibold uppercase text-emerald-700">{t('accountsAdmin.feesTax')}</div>
                      <div className="tabular-nums">{formatRupees(day.fee_paise + day.tax_paise)}</div>
                    </div>
                  </div>
                  {day.utrs?.[0] ? (
                    <div className="mt-2 break-all font-mono text-xs text-muted">
                      {t('accountsAdmin.utr')}: {day.utrs[0]}
                    </div>
                  ) : null}
                </button>
                <div className="admin-settlement-day-card__actions">
                  <button
                    type="button"
                    className="admin-report-btn-secondary w-full !min-h-11 text-sm"
                    onClick={(event) => handleDownloadDay(day.date, event)}
                    disabled={exportingDay === day.date}
                  >
                    {exportingDay === day.date ? (
                      <RefreshCcw size={16} className="animate-spin" />
                    ) : (
                      <Download size={16} strokeWidth={2.25} aria-hidden />
                    )}
                    {t('accountsAdmin.downloadExcel')}
                  </button>
                </div>
                {isOpen ? <div className="border-t border-emerald-100 bg-emerald-50/40">{renderDayTransactions()}</div> : null}
              </div>
            );
          })}
          {displayTotals && days.length ? (
            <div className="rounded-xl border border-emerald-300 bg-emerald-100 px-4 py-3 font-bold text-emerald-950">
              <div className="flex items-center justify-between gap-3">
                <span>{filters.day ? t('accountsAdmin.dayTotal') : t('accountsAdmin.monthTotal')}</span>
                <span>{formatRupees(displayTotals.net_paise)}</span>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm font-semibold">
                <div>
                  {t('accountsAdmin.payments')}: {displayTotals.payment_count}
                </div>
                <div>
                  {t('accountsAdmin.gross')}: {formatRupees(displayTotals.credit_paise)}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Desktop: table */}
        <div className="admin-report-table-wrap hidden md:block">
          <table className="admin-report-table admin-settlements-table min-w-[760px] w-full text-base">
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
                          {renderDayTransactions()}
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
            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                type="button"
                className="admin-report-btn-secondary flex-1 !min-h-11 px-3 py-2 text-sm disabled:opacity-50 sm:flex-none"
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
              <span className="shrink-0 px-1 text-sm font-semibold text-ink">
                {t('admin.pagination.pageOf', { page: daysPage, total: daysTotalPages })}
              </span>
              <button
                type="button"
                className="admin-report-btn-secondary flex-1 !min-h-11 px-3 py-2 text-sm disabled:opacity-50 sm:flex-none"
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
    </>
  );
}
