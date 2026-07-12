import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye, EyeOff, Lock, LogOut, Pencil, Plus, RefreshCcw, Users } from 'lucide-react';
import Alert from '../components/Alert.jsx';
import AdminAddSubscriptionModal from '../components/AdminAddSubscriptionModal.jsx';
import AdminAddBookOrderModal from '../components/AdminAddBookOrderModal.jsx';
import { InlineLoader, LoadingBlock } from '../components/Loader.jsx';
import PageHeader from '../components/PageHeader.jsx';
import {
  adminLogin,
  downloadBookOrdersPdf,
  downloadBookOrdersExcel,
  downloadBookOrdersSummaryPdf,
  downloadSubmissionsExcel,
  downloadSubmissionsPdf,
  downloadSubmissionsSummaryPdf,
  downloadSubmissionLabelsPdf,
  getBookSubscriptions,
  getBookOrdersSummary,
  getSubmissions,
  getSubmissionsSummary,
  listAdminUsers,
  updateAdminUser
} from '../services/api.js';
import { BOOK_PICKUP_COUNTERS } from '../constants/bookCounters.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import {
  ADMIN_PORTAL_SLUG,
  clearAdminSession,
  getAdminRole,
  getAdminToken,
  isAdminAuthenticated,
  isAdminPortalConfigured,
  saveAdminSession
} from '../utils/adminAuth.js';
import { useSeo } from '../utils/seo.js';
import { normalizePaymentStatus } from '../utils/subscriptionPeriod.js';

function displayPaymentStatus(item) {
  return normalizePaymentStatus(item?.payment_status, item);
}

function formatUptoPeriod(item) {
  const month = item?.upto_month;
  const year = item?.upto_year;
  if (month == null || month === '' || year == null || year === '') return '—';
  return `${month} / ${year}`;
}

function currentAccountingFilterDefaults() {
  const now = new Date();
  return {
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear())
  };
}

const DEFAULT_BOOK_FILTERS = {
  status: 'verified',
  search: '',
  ...currentAccountingFilterDefaults()
};

const DEFAULT_BOOK_SUMMARY_FILTERS = {
  status: 'verified',
  counter: 'all',
  ...currentAccountingFilterDefaults()
};

const ADMIN_POLL_INTERVAL_MS = 20_000;
const BOOKS_PAGE_SIZE = 10;

const DEFAULT_PAYMENT_FILTERS = {
  audience: 'online',
  status: 'verified',
  search: '',
  ...currentAccountingFilterDefaults()
};

const DEFAULT_SUBSCRIPTION_SUMMARY_FILTERS = {
  audience: 'online',
  status: 'verified',
  ...currentAccountingFilterDefaults()
};

const ACCOUNTING_YEAR_START = 2020;

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

const EMPTY_USER_FILTERS = {
  is_verified: '',
  audience: '',
  min_subscriber: '',
  max_subscriber: ''
};

function formatSubscriberNo(item) {
  const raw = item?.subscriber_no;
  if (raw != null && String(raw).trim() !== '') return String(raw).trim();
  return '—';
}

function submissionRowKey(item) {
  return item.row_uuid || `${item?.subscriber_no}-${item?.created_at}` || String(item?.id ?? '');
}

function formatSubmissionAddress(item) {
  const line = [
    item.care_of || item.careOf,
    item.house_no || item.address_1,
    item.street || item.address_2,
    item.mark || item.landmark,
    item.area,
    item.post_office || item.postOffice,
    item.town || item.city,
    item.district || item.tehsil,
    item.state,
    item.pin || item.pincode,
    item.rehbar || item.through
  ]
    .filter(Boolean)
    .join(', ');
  if (line && item.address) return `${line}. ${item.address}`;
  if (line) return line;
  if (item.address) return item.address;
  return [item.state, item.pin].filter(Boolean).join(' - ') || '-';
}

function PaymentFilters({
  filters,
  counts,
  onChange,
  onApply,
  onAddManual,
  onDownloadPdf,
  onDownloadExcel,
  onDownloadLabels,
  isLoading,
  isExporting,
  t,
  locale
}) {
  const monthOptions = accountingMonthOptions(locale);
  const yearOptions = accountingYearOptions();

  return (
    <div className="admin-report-filters">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.audience')}</span>
          <select className="input" value={filters.audience} onChange={(e) => onChange('audience', e.target.value)}>
            <option value="online">{t('admin.filters.audienceOnline')}</option>
            <option value="legacy">{t('admin.filters.audienceLegacy')}</option>
            <option value="all">{t('admin.filterAll')}</option>
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.status')}</span>
          <select className="input" value={filters.status} onChange={(e) => onChange('status', e.target.value)}>
            <option value="verified">
              {t('admin.filterVerified')} ({counts.verified ?? 0})
            </option>
            <option value="pending">
              {t('admin.filterPending')} ({counts.pending ?? 0})
            </option>
            <option value="all">
              {t('admin.filterAll')} ({counts.all ?? 0})
            </option>
            <option value="failed">{t('admin.filterFailed')}</option>
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.accountingYear')}</span>
          <select className="input" value={filters.year} onChange={(e) => onChange('year', e.target.value)}>
            <option value="all">{t('admin.filterAll')}</option>
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.accountingMonth')}</span>
          <select className="input" value={filters.month} onChange={(e) => onChange('month', e.target.value)}>
            <option value="all">{t('admin.filterAll')}</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="admin-report-label">{t('admin.filters.search')}</span>
        <input
          className="input"
          value={filters.search}
          onChange={(e) => onChange('search', e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onApply();
            }
          }}
          placeholder={t('admin.filters.searchPlaceholderSubscriptions')}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          className="admin-report-btn-primary h-[42px]"
          type="button"
          onClick={onAddManual}
          disabled={isLoading}
        >
          <Plus size={18} aria-hidden />
          {t('admin.manualSubscription.addButton')}
        </button>
        <button
          className="admin-report-btn-secondary h-[42px]"
          type="button"
          onClick={onApply}
          disabled={isLoading}
        >
          {isLoading ? <InlineLoader size={20} /> : <RefreshCcw size={18} aria-hidden />}
          {isLoading ? t('admin.refreshing') : t('admin.refresh')}
        </button>
        <button
          className="admin-report-btn-secondary h-[42px]"
          type="button"
          onClick={onDownloadLabels}
          disabled={isLoading || isExporting}
        >
          <Download size={16} />
          {t('admin.filters.downloadLabels')}
        </button>
        <button
          className="admin-report-btn-secondary h-[42px]"
          type="button"
          onClick={onDownloadPdf}
          disabled={isLoading || isExporting}
        >
          <Download size={16} />
          {t('admin.filters.downloadPdf')}
        </button>
        <button
          className="admin-report-btn-secondary h-[42px]"
          type="button"
          onClick={onDownloadExcel}
          disabled={isLoading || isExporting}
        >
          <Download size={16} />
          {t('admin.filters.downloadExcel')}
        </button>
      </div>
      <p className="text-sm text-muted">{t('admin.filters.labelsHint')}</p>
    </div>
  );
}

function UserFilters({ filters, onChange, onApply, isLoading, t }) {
  return (
    <div className="admin-report-filters mb-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <label className="block">
        <span className="admin-report-label">{t('admin.filters.audience')}</span>
        <select className="input" value={filters.audience} onChange={(e) => onChange('audience', e.target.value)}>
          <option value="">{t('admin.filterAll')}</option>
          <option value="online">{t('admin.filters.audienceOnline')}</option>
          <option value="legacy">{t('admin.filters.audienceLegacy')}</option>
        </select>
      </label>
      <label className="block">
        <span className="admin-report-label">{t('admin.users.verified')}</span>
        <select className="input" value={filters.is_verified} onChange={(e) => onChange('is_verified', e.target.value)}>
          <option value="">{t('admin.filterAll')}</option>
          <option value="true">{t('common.yes')}</option>
          <option value="false">{t('common.no')}</option>
        </select>
      </label>
      <label className="block">
        <span className="admin-report-label">{t('admin.filters.minSubscriber')}</span>
        <input
          className="input"
          type="number"
          min="1"
          value={filters.min_subscriber}
          onChange={(e) => onChange('min_subscriber', e.target.value)}
          placeholder="71000"
        />
      </label>
      <label className="block">
        <span className="admin-report-label">{t('admin.filters.maxSubscriber')}</span>
        <input
          className="input"
          type="number"
          min="1"
          value={filters.max_subscriber}
          onChange={(e) => onChange('max_subscriber', e.target.value)}
        />
      </label>
      <button
        className="admin-report-btn-secondary h-[42px] self-end"
        type="button"
        onClick={onApply}
        disabled={isLoading}
      >
        {isLoading ? <InlineLoader size={18} /> : <RefreshCcw size={16} />}
        {t('admin.filters.apply')}
      </button>
      </div>
    </div>
  );
}

function BookOrderFilters({ filters, onChange, onApply, onAddManual, onDownloadPdf, onDownloadExcel, isLoading, isExporting, t, locale }) {
  const monthOptions = accountingMonthOptions(locale);
  const yearOptions = accountingYearOptions();

  return (
    <div className="admin-report-filters">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.status')}</span>
          <select className="input" value={filters.status} onChange={(e) => onChange('status', e.target.value)}>
            <option value="verified">{t('admin.filterVerified')}</option>
            <option value="pending">{t('admin.filterPending')}</option>
            <option value="">{t('admin.filterAll')}</option>
            <option value="failed">{t('admin.filterFailed')}</option>
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.search')}</span>
          <input
            className="input"
            value={filters.search}
            onChange={(e) => onChange('search', e.target.value)}
            placeholder={t('admin.filters.searchPlaceholder')}
          />
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.accountingYear')}</span>
          <select className="input" value={filters.year} onChange={(e) => onChange('year', e.target.value)}>
            <option value="all">{t('admin.filterAll')}</option>
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.accountingMonth')}</span>
          <select className="input" value={filters.month} onChange={(e) => onChange('month', e.target.value)}>
            <option value="all">{t('admin.filterAll')}</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="admin-report-btn-primary h-[42px]" type="button" onClick={onAddManual} disabled={isLoading}>
          <Plus size={18} aria-hidden />
          {t('admin.manualBookOrder.addButton')}
        </button>
        <button className="admin-report-btn-primary" type="button" onClick={onApply} disabled={isLoading}>
          {isLoading ? <InlineLoader size={18} /> : <RefreshCcw size={16} />}
          {t('admin.filters.apply')}
        </button>
        <button
          className="admin-report-btn-secondary"
          type="button"
          onClick={onDownloadPdf}
          disabled={isLoading || isExporting}
        >
          <Download size={16} />
          {t('admin.filters.downloadPdf')}
        </button>
        <button
          className="admin-report-btn-secondary"
          type="button"
          onClick={onDownloadExcel}
          disabled={isLoading || isExporting}
        >
          <Download size={16} />
          {t('admin.filters.downloadExcel')}
        </button>
      </div>
    </div>
  );
}

function formatSalesRupees(paise) {
  const n = Number(paise);
  if (!Number.isFinite(n)) return '—';
  return `₹${(n / 100).toFixed(2)}`;
}

function adminTabClass(isActive) {
  return isActive ? 'admin-report-tab admin-report-tab--active' : 'admin-report-tab admin-report-tab--inactive';
}

function BookSummaryFilters({ filters, onChange, onApply, onDownloadPdf, isLoading, isExporting, t, locale }) {
  const monthOptions = accountingMonthOptions(locale);
  const yearOptions = accountingYearOptions();

  return (
    <div className="admin-report-filters">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.status')}</span>
          <select className="input text-base" value={filters.status} onChange={(e) => onChange('status', e.target.value)}>
            <option value="verified">{t('admin.filterVerified')}</option>
            <option value="pending">{t('admin.filterPending')}</option>
            <option value="">{t('admin.filterAll')}</option>
            <option value="failed">{t('admin.filterFailed')}</option>
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.booksSummary.counter')}</span>
          <select className="input text-base" value={filters.counter} onChange={(e) => onChange('counter', e.target.value)}>
            <option value="all">{t('admin.booksSummary.allCounters')}</option>
            {BOOK_PICKUP_COUNTERS.map((counter) => (
              <option key={counter.code} value={counter.code}>
                {counter.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.accountingYear')}</span>
          <select className="input text-base" value={filters.year} onChange={(e) => onChange('year', e.target.value)}>
            <option value="all">{t('admin.filterAll')}</option>
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.accountingMonth')}</span>
          <select className="input text-base" value={filters.month} onChange={(e) => onChange('month', e.target.value)}>
            <option value="all">{t('admin.filterAll')}</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="admin-report-btn-primary !text-base" type="button" onClick={onApply} disabled={isLoading}>
          {isLoading ? <InlineLoader size={18} /> : <RefreshCcw size={18} />}
          {t('admin.filters.apply')}
        </button>
        <button
          className="admin-report-btn-secondary !text-base"
          type="button"
          onClick={onDownloadPdf}
          disabled={isLoading || isExporting}
        >
          <Download size={18} />
          {t('admin.booksSummary.downloadPdf')}
        </button>
      </div>
    </div>
  );
}

function SummaryTableColGroup() {
  return (
    <colgroup>
      <col className="summary-col-book" />
      <col className="summary-col-qty" />
      <col className="summary-col-sales" />
    </colgroup>
  );
}

function publicationLabel(code, t) {
  if (code === 'hindi') return t('admin.subscriptionsSummary.hindi');
  if (code === 'english') return t('admin.subscriptionsSummary.english');
  if (code === 'spiritual_bliss') return t('admin.subscriptionsSummary.spiritualBliss');
  return code;
}

function SubscriptionSummaryFilters({
  filters,
  counts,
  onChange,
  onApply,
  onDownloadPdf,
  isLoading,
  isExporting,
  t,
  locale
}) {
  const monthOptions = accountingMonthOptions(locale);
  const yearOptions = accountingYearOptions();
  const verifiedCount = counts.verified ?? 0;
  const pendingCount = counts.pending ?? 0;
  const allCount = counts.all ?? 0;

  return (
    <div className="admin-report-filters">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.audience')}</span>
          <select className="input text-base" value={filters.audience} onChange={(e) => onChange('audience', e.target.value)}>
            <option value="online">{t('admin.filters.audienceOnline')}</option>
            <option value="legacy">{t('admin.filters.audienceLegacy')}</option>
            <option value="all">{t('admin.filterAll')}</option>
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.subscriptionsSummary.statusFilterLabel')}</span>
          <select className="input text-base" value={filters.status} onChange={(e) => onChange('status', e.target.value)}>
            <option value="verified">
              {t('admin.subscriptionsSummary.verifiedSubscribers', { count: verifiedCount })}
            </option>
            <option value="pending">
              {t('admin.subscriptionsSummary.pendingSubscribers', { count: pendingCount })}
            </option>
            <option value="all">
              {t('admin.subscriptionsSummary.allSubscribers', { count: allCount })}
            </option>
            <option value="failed">{t('admin.filterFailed')}</option>
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.accountingYear')}</span>
          <select className="input text-base" value={filters.year} onChange={(e) => onChange('year', e.target.value)}>
            <option value="all">{t('admin.filterAll')}</option>
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="admin-report-label">{t('admin.filters.accountingMonth')}</span>
          <select className="input text-base" value={filters.month} onChange={(e) => onChange('month', e.target.value)}>
            <option value="all">{t('admin.filterAll')}</option>
            {monthOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <button className="admin-report-btn-primary !text-base" type="button" onClick={onApply} disabled={isLoading}>
          {isLoading ? <InlineLoader size={18} /> : <RefreshCcw size={18} />}
          {t('admin.filters.apply')}
        </button>
        <button
          className="admin-report-btn-secondary !text-base"
          type="button"
          onClick={onDownloadPdf}
          disabled={isLoading || isExporting}
        >
          <Download size={18} />
          {t('admin.subscriptionsSummary.downloadPdf')}
        </button>
      </div>
    </div>
  );
}

function SubscriptionSummaryTable({ summary, subscriberCount, t }) {
  const durations = summary?.durations || [];
  const hasData = (summary?.totals?.total_quantity || 0) > 0;
  const subscribers = summary?.subscriber_count ?? subscriberCount;

  if (!hasData) {
    return (
      <div className="admin-report-card border border-emerald-200/70 bg-emerald-50/80 p-10 text-center text-base font-medium text-emerald-800">
        {t('admin.subscriptionsSummary.none')}
      </div>
    );
  }

  function durationLabel(code) {
    if (code === 'five_year') return t('admin.subscriptionsSummary.fiveYear');
    return t('admin.subscriptionsSummary.oneYear');
  }

  function renderPublicationTable(publications, totals, totalLabel) {
    return (
      <table className="admin-report-table admin-summary-table min-w-[480px] text-base">
        <SummaryTableColGroup />
        <thead>
          <tr>
            <th>{t('admin.subscriptionsSummary.publication')}</th>
            <th>{t('admin.subscriptionsSummary.copies')}</th>
            <th>{t('admin.subscriptionsSummary.totalSales')}</th>
          </tr>
        </thead>
        <tbody>
          {publications
            .filter((row) => row.quantity > 0)
            .map((row) => (
              <tr key={row.code}>
                <td className="text-ink">{publicationLabel(row.code, t)}</td>
                <td className="font-semibold text-emerald-800">{row.quantity}</td>
                <td className="font-semibold text-emerald-900">{formatSalesRupees(row.total_sales_paise)}</td>
              </tr>
            ))}
          <tr className="admin-report-table__total-row">
            <td>{totalLabel}</td>
            <td>{totals.total_quantity}</td>
            <td>{formatSalesRupees(totals.total_sales_paise)}</td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <div className="space-y-6">
      {subscribers != null && summary.totals ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-emerald-300/80 bg-white px-4 py-4 text-center shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {t('admin.subscriptionsSummary.subscribersLabel')}
            </div>
            <div className="mt-1 text-3xl font-bold text-emerald-900">{subscribers}</div>
          </div>
          <div className="rounded-xl border border-emerald-300/80 bg-white px-4 py-4 text-center shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
              {t('admin.subscriptionsSummary.copiesLabel')}
            </div>
            <div className="mt-1 text-3xl font-bold text-emerald-900">{summary.totals.total_quantity}</div>
          </div>
        </div>
      ) : null}

      {subscribers != null && summary.totals ? (
        <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-base text-emerald-900">
          {t('admin.subscriptionsSummary.countsHint', {
            subscribers,
            copies: summary.totals.total_quantity
          })}
        </p>
      ) : null}

      {durations.map((section) => (
        <div key={section.code} className="admin-report-card">
          <div className="admin-report-section-title">
            {t('admin.subscriptionsSummary.sectionTitle')} — {durationLabel(section.code)}
          </div>
          <div className="admin-report-table-wrap">
            {renderPublicationTable(section.publications, section.totals, t('admin.subscriptionsSummary.grandTotalCopies'))}
          </div>
        </div>
      ))}

      {durations.length > 1 && summary.totals ? (
        <div className="admin-report-card">
          <div className="admin-report-table-wrap">
            <table className="admin-report-table admin-summary-table min-w-[480px] text-base">
              <SummaryTableColGroup />
              <tbody>
                <tr className="admin-report-table__total-row">
                  <td>{t('admin.subscriptionsSummary.combinedTotals')}</td>
                  <td>{summary.totals.total_quantity}</td>
                  <td>{formatSalesRupees(summary.totals.total_sales_paise)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BookSummaryTables({ summary, t }) {
  if (!summary?.counters?.length) {
    return (
      <div className="admin-report-card border border-emerald-200/70 bg-emerald-50/80 p-10 text-center text-base font-medium text-emerald-800">
        {t('admin.booksSummary.none')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {summary.counters.map((counter) => (
        <div key={counter.code} className="admin-report-card">
          <div className="admin-report-section-title sm:text-xl">{counter.label}</div>
          <div className="admin-report-table-wrap">
            <table className="admin-report-table admin-summary-table min-w-[480px] text-base">
              <SummaryTableColGroup />
              <thead>
                <tr>
                  <th>{t('admin.booksSummary.bookName')}</th>
                  <th>{t('admin.booksSummary.quantity')}</th>
                  <th>{t('admin.booksSummary.totalSales')}</th>
                </tr>
              </thead>
              <tbody>
                {counter.books.map((book) => (
                  <tr key={`${counter.code}-${book.book_name}`}>
                    <td className="text-ink">{book.book_name}</td>
                    <td className="font-semibold text-emerald-800">{book.quantity}</td>
                    <td className="font-semibold text-emerald-900">{formatSalesRupees(book.total_sales_paise)}</td>
                  </tr>
                ))}
                <tr className="admin-report-table__total-row">
                  <td>{t('admin.booksSummary.grandTotal')}</td>
                  <td>{counter.total_quantity}</td>
                  <td>{formatSalesRupees(counter.total_sales_paise)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ))}

      {summary.counters.length > 1 && summary.totals ? (
        <div className="admin-report-card">
          <div className="admin-report-table-wrap">
            <table className="admin-report-table admin-summary-table min-w-[480px] text-base">
              <SummaryTableColGroup />
              <tbody>
                <tr className="admin-report-table__total-row">
                  <td>{t('admin.booksSummary.combinedTotals')}</td>
                  <td>{summary.totals.total_quantity}</td>
                  <td>{formatSalesRupees(summary.totals.total_sales_paise)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UserEditModal({ user, onClose, onSave, saving, t }) {
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    email: user.email || '',
    subscriber_no: user.subscriber_no ?? '',
    is_verified: Boolean(user.is_verified)
  });

  function handleSubmit(event) {
    event.preventDefault();
    onSave({
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      subscriber_no: form.subscriber_no === '' ? undefined : Number(form.subscriber_no),
      is_verified: form.is_verified
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <form onSubmit={handleSubmit} className="admin-login-card w-full max-w-md">
        <h2 className="text-xl font-black text-emerald-950">{t('admin.users.editTitle')}</h2>
        <p className="text-xs text-muted">{t('admin.users.editId')}: {user.id}</p>
        <label className="block">
          <span className="label">{t('admin.users.fullName')}</span>
          <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">{t('admin.emailLabel')}</span>
          <input className="input" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label className="block">
          <span className="label">{t('admin.users.subscriberNo')}</span>
          <input
            className="input"
            type="number"
            min="1"
            value={form.subscriber_no}
            onChange={(e) => setForm({ ...form, subscriber_no: e.target.value })}
          />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-emerald-900">
          <input
            type="checkbox"
            checked={form.is_verified}
            onChange={(e) => setForm({ ...form, is_verified: e.target.checked })}
          />
          {t('admin.users.verified')}
        </label>
        <div className="flex gap-2">
          <button className="admin-report-btn-primary flex-1" type="submit" disabled={saving}>
            {saving ? t('admin.users.saving') : t('admin.users.save')}
          </button>
          <button className="admin-report-btn-secondary flex-1" type="button" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AdminPage({ portalSlug = ADMIN_PORTAL_SLUG, booksOnly: booksOnlyPortal = false }) {

  useSeo({
    title: booksOnlyPortal ? 'Books Admin — Anand Sandesh Karyalay' : 'Admin — Anand Sandesh Karyalay',
    description: booksOnlyPortal
      ? 'Staff administration for Anand Sandesh Karyalay book orders.'
      : 'Staff administration for Anand Sandesh Karyalay subscriptions.',
    canonical: booksOnlyPortal
      ? 'https://anandsandeshkaryalay.online/books-admin'
      : 'https://anandsandeshkaryalay.online/admin',
    noindex: true
  });

  const { t, language } = useTranslation();
  const locale = language === 'hi' ? 'hi-IN' : 'en-IN';

  const [token, setToken] = useState(() => getAdminToken(portalSlug));
  const [role, setRole] = useState(() => getAdminRole(portalSlug));
  const [activeTab, setActiveTab] = useState(booksOnlyPortal ? 'bookOrders' : 'subscriptions');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const PAYMENTS_PAGE_SIZE = 10;

  const [paymentFilters, setPaymentFilters] = useState(DEFAULT_PAYMENT_FILTERS);
  const [paymentPage, setPaymentPage] = useState(1);
  const [paymentPagination, setPaymentPagination] = useState({
    page: 1,
    pageSize: PAYMENTS_PAGE_SIZE,
    total: 0,
    totalPages: 1
  });
  const [paymentCounts, setPaymentCounts] = useState({ all: 0, pending: 0, verified: 0 });
  const [subscriptionSubTab, setSubscriptionSubTab] = useState('list');
  const [subscriptionSummaryFilters, setSubscriptionSummaryFilters] = useState(DEFAULT_SUBSCRIPTION_SUMMARY_FILTERS);
  const [subscriptionSummary, setSubscriptionSummary] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [bookRows, setBookRows] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [userFilters, setUserFilters] = useState(EMPTY_USER_FILTERS);
  const [editingUser, setEditingUser] = useState(null);
  const [bookFilters, setBookFilters] = useState(DEFAULT_BOOK_FILTERS);
  const [bookSummaryFilters, setBookSummaryFilters] = useState(DEFAULT_BOOK_SUMMARY_FILTERS);
  const [bookSubTab, setBookSubTab] = useState('orders');
  const [bookSummary, setBookSummary] = useState(null);
  const [bookPage, setBookPage] = useState(1);
  const [bookPagination, setBookPagination] = useState({
    page: 1,
    pageSize: BOOKS_PAGE_SIZE,
    total: 0,
    totalPages: 1
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [showAddBookOrder, setShowAddBookOrder] = useState(false);

  const superAdmin = role === 'super_admin';
  const booksAdminRole = role === 'books_admin';
  const booksOnlyView = booksOnlyPortal || booksAdminRole;
  const showSubscriptionsTab = !booksOnlyView;
  const showUsersTab = superAdmin && !booksOnlyView;

  const tabHasCachedData =
    (activeTab === 'subscriptions' && subscriptionSubTab === 'list' && submissions.length > 0) ||
    (activeTab === 'subscriptions' && subscriptionSubTab === 'summary' && subscriptionSummary != null) ||
    (activeTab === 'bookOrders' && bookRows.length > 0) ||
    (activeTab === 'users' && users.length > 0);

  const loadingOverlayLabel = isExporting
    ? t('admin.exporting')
    : tabHasCachedData
      ? t('admin.refreshing')
      : t('loaders.loadingSubmissions');

  function handleAuthError(err) {
    setError(err.message);
    if (err.status === 401) {
      clearAdminSession(portalSlug);
      setToken('');
      setRole('');
    }
  }

  const loadSubmissions = useCallback(
    async (activeToken = token, { silent = false } = {}) => {
      if (!activeToken) return;
      if (!silent) {
        setIsLoading(true);
        setError('');
      }
      try {
        const data = await getSubmissions(activeToken, {
          page: paymentPage,
          limit: PAYMENTS_PAGE_SIZE,
          status: paymentFilters.status,
          audience: paymentFilters.audience,
          search: paymentFilters.search || undefined,
          month: paymentFilters.month,
          year: paymentFilters.year
        });
        setSubmissions(data.submissions || []);
        if (data.pagination) setPaymentPagination(data.pagination);
        if (data.counts) setPaymentCounts(data.counts);
      } catch (err) {
        if (!silent) handleAuthError(err);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [token, paymentPage, paymentFilters]
  );

  const loadUsers = useCallback(
    async (activeToken = token, search = userSearch, filters = userFilters) => {
      if (!activeToken || !superAdmin) return;
      setIsLoading(true);
      setError('');
      try {
        const data = await listAdminUsers(activeToken, {
          search: search || undefined,
          is_verified: filters.is_verified || undefined,
          audience: filters.audience || undefined,
          min_subscriber: filters.min_subscriber || undefined,
          max_subscriber: filters.max_subscriber || undefined
        });
        setUsers(data.users || []);
      } catch (err) {
        handleAuthError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [token, superAdmin, userSearch, userFilters]
  );

  const loadBookOrders = useCallback(
    async (activeToken = token, filters = bookFilters, { silent = false, page = bookPage } = {}) => {
      if (!activeToken) return;
      if (!silent) {
        setIsLoading(true);
        setError('');
      }
      try {
        const data = await getBookSubscriptions(
          activeToken,
          {
            status: filters.status || undefined,
            search: filters.search || undefined,
            month: filters.month,
            year: filters.year,
            page,
            limit: BOOKS_PAGE_SIZE
          },
          portalSlug
        );
        setBookRows(data.orders || []);
        if (data.pagination) setBookPagination(data.pagination);
      } catch (err) {
        if (!silent) handleAuthError(err);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [token, bookFilters, bookPage, portalSlug]
  );

  const loadBookSummary = useCallback(
    async (activeToken = token, filters = bookSummaryFilters, { silent = false } = {}) => {
      if (!activeToken) return;
      if (!silent) {
        setIsLoading(true);
        setError('');
      }
      try {
        const data = await getBookOrdersSummary(
          activeToken,
          {
            status: filters.status || undefined,
            month: filters.month,
            year: filters.year,
            counter: filters.counter
          },
          portalSlug
        );
        setBookSummary(data);
      } catch (err) {
        if (!silent) handleAuthError(err);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [token, bookSummaryFilters, portalSlug]
  );

  const loadSubscriptionSummary = useCallback(
    async (activeToken = token, filters = subscriptionSummaryFilters, { silent = false } = {}) => {
      if (!activeToken) return;
      if (!silent) {
        setIsLoading(true);
        setError('');
      }
      try {
        const data = await getSubmissionsSummary(activeToken, {
          status: filters.status,
          audience: filters.audience,
          month: filters.month,
          year: filters.year
        });
        setSubscriptionSummary(data);
      } catch (err) {
        if (!silent) handleAuthError(err);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [token, subscriptionSummaryFilters]
  );

  async function loadUsersNow() {
    await loadUsers();
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    if (!isAdminPortalConfigured(portalSlug)) {
      setError(
        booksOnlyPortal ? t('booksAdmin.portalNotConfigured') : t('admin.portalNotConfigured')
      );
      return;
    }
    try {
      const data = await adminLogin({ username, password }, portalSlug);
      saveAdminSession({ token: data.token, role: data.role, portal_slug: data.portal_slug }, portalSlug);
      setToken(data.token);
      setRole(data.role);
      setUsername('');
      setPassword('');
      if (data.role === 'books_admin' || booksOnlyPortal) {
        setActiveTab('bookOrders');
        await loadBookOrders(data.token);
      } else {
        await loadSubmissions(data.token);
      }
    } catch (err) {
      setError(err.message);
    }
  }

  function handleLogout() {
    clearAdminSession(portalSlug);
    setToken('');
    setRole('');
    setSubmissions([]);
    setSubscriptionSummary(null);
    setBookRows([]);
    setBookSummary(null);
    setBookPage(1);
    setUsers([]);
  }

  async function handleSaveUser(patch) {
    if (!editingUser) return;
    setIsSavingUser(true);
    setError('');
    try {
      await updateAdminUser(token, editingUser.id, patch);
      setEditingUser(null);
      await loadUsers();
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsSavingUser(false);
    }
  }

  function updateBookFilter(key, value) {
    setBookPage(1);
    setBookFilters((prev) => ({ ...prev, [key]: value }));
  }

  function updateBookSummaryFilter(key, value) {
    setBookSummaryFilters((prev) => ({ ...prev, [key]: value }));
  }

  function updatePaymentFilter(key, value) {
    setPaymentPage(1);
    setPaymentFilters((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }

  function updateUserFilter(key, value) {
    setUserFilters((prev) => ({ ...prev, [key]: value }));
  }

  function updateSubscriptionSummaryFilter(key, value) {
    setSubscriptionSummaryFilters((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
  }

  useEffect(() => {
    if (booksOnlyView && activeTab === 'subscriptions') {
      setActiveTab('bookOrders');
    }
  }, [booksOnlyView, activeTab]);

  useEffect(() => {
    if (!isAdminAuthenticated(portalSlug)) return;
    if (activeTab === 'subscriptions' && showSubscriptionsTab && subscriptionSubTab === 'list') loadSubmissions();
    if (activeTab === 'subscriptions' && showSubscriptionsTab && subscriptionSubTab === 'summary') loadSubscriptionSummary();
    if (activeTab === 'bookOrders' && bookSubTab === 'orders') loadBookOrders();
    if (activeTab === 'bookOrders' && bookSubTab === 'summary') loadBookSummary();
    if (activeTab === 'users' && showUsersTab) loadUsers();
  }, [
    token,
    activeTab,
    subscriptionSubTab,
    bookSubTab,
    showSubscriptionsTab,
    showUsersTab,
    loadSubmissions,
    loadSubscriptionSummary,
    loadBookOrders,
    loadBookSummary,
    loadUsers,
    portalSlug
  ]);

  useEffect(() => {
    if (!token || isExporting) return undefined;

    const poll = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      if (activeTab === 'subscriptions' && showSubscriptionsTab && subscriptionSubTab === 'list') {
        loadSubmissions(token, { silent: true });
      } else if (activeTab === 'bookOrders' && bookSubTab === 'orders') {
        loadBookOrders(token, bookFilters, { silent: true, page: bookPage });
      }
    };

    const intervalId = window.setInterval(poll, ADMIN_POLL_INTERVAL_MS);
    return () => window.clearInterval(intervalId);
  }, [
    token,
    activeTab,
    subscriptionSubTab,
    showSubscriptionsTab,
    loadSubmissions,
    loadBookOrders,
    bookSubTab,
    bookFilters,
    bookPage,
    isExporting
  ]);

  function applyPaymentFilters() {
    setPaymentPage(1);
    loadSubmissions();
  }

  async function handleDownloadSubmissionLabels() {
    setError('');
    setIsExporting(true);
    try {
      await downloadSubmissionLabelsPdf(token, paymentFilters);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDownloadPaymentsPdf() {
    setError('');
    setIsExporting(true);
    try {
      await downloadSubmissionsPdf(token, paymentFilters);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDownloadPaymentsExcel() {
    setError('');
    setIsExporting(true);
    try {
      await downloadSubmissionsExcel(token, paymentFilters);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsExporting(false);
    }
  }
  async function handleDownloadBookOrdersPdf() {
    setError('');
    setIsExporting(true);
    try {
      await downloadBookOrdersPdf(token, bookFilters, portalSlug);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDownloadBookOrdersExcel() {
    setError('');
    setIsExporting(true);
    try {
      await downloadBookOrdersExcel(token, bookFilters, portalSlug);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDownloadSubscriptionSummaryPdf() {
    setError('');
    setIsExporting(true);
    try {
      await downloadSubmissionsSummaryPdf(token, subscriptionSummaryFilters);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsExporting(false);
    }
  }

  async function handleDownloadBookSummaryPdf() {
    setError('');
    setIsExporting(true);
    try {
      await downloadBookOrdersSummaryPdf(token, bookSummaryFilters, portalSlug);
    } catch (err) {
      handleAuthError(err);
    } finally {
      setIsExporting(false);
    }
  }

  if (!token) {
    return (
      <main className="page-shell">
        <section className="content-wrap flex min-h-[calc(100vh-3rem)] items-center justify-center">
          <form onSubmit={handleLogin} className="admin-login-card sm:p-8">
            <div className="text-center">
              <Lock className="mx-auto mb-4 text-emerald-700" size={52} />
              <h1 className="text-3xl font-black text-emerald-950">
                {booksOnlyPortal ? t('booksAdmin.loginTitle') : t('admin.loginTitle')}
              </h1>
              <p className="mt-2 text-muted">
                {booksOnlyPortal ? t('booksAdmin.loginSubtitle') : t('admin.loginSubtitle')}
              </p>
            </div>
            {error ? <Alert>{error}</Alert> : null}
            {!isAdminPortalConfigured(portalSlug) ? (
              <Alert>
                {booksOnlyPortal ? t('booksAdmin.portalNotConfigured') : t('admin.portalNotConfigured')}
              </Alert>
            ) : null}
            <label className="block">
              <span className="label">{t('admin.usernameLabel')}</span>
              <input
                className="input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="label">{t('admin.passwordLabel')}</span>
              <div className="relative">
                <input
                  className="input pr-12"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-muted transition hover:text-ink"
                  aria-label={showPassword ? t('auth.togglePasswordHide') : t('auth.togglePasswordShow')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </label>
            <button className="admin-report-btn-primary w-full" type="submit" disabled={!isAdminPortalConfigured(portalSlug)}>
              {t('admin.loginButton')}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell">
      {isLoading || isExporting ? <LoadingBlock label={loadingOverlayLabel} /> : null}
      <section className="content-wrap py-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <PageHeader
            eyebrow={booksOnlyPortal ? t('booksAdmin.eyebrow') : t('admin.eyebrow')}
            title={booksOnlyPortal ? t('booksAdmin.pageTitle') : t('admin.pageTitle')}
            description={
              booksOnlyPortal
                ? t('booksAdmin.pageDescription')
                : superAdmin
                  ? t('admin.pageDescriptionSuper')
                  : t('admin.pageDescription')
            }
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="admin-report-badge">
              {superAdmin
                ? t('admin.roleSuper')
                : booksAdminRole
                  ? t('booksAdmin.roleBooksAdmin')
                  : t('admin.roleAdmin')}
            </span>
            <button className="admin-report-btn-secondary" type="button" onClick={handleLogout}>
              <LogOut size={16} />
              {t('admin.logout')}
            </button>
          </div>
        </div>

        {showSubscriptionsTab || showUsersTab ? (
          <div className="mb-5 flex flex-wrap gap-2">
            {showSubscriptionsTab ? (
              <button
                type="button"
                className={adminTabClass(activeTab === 'subscriptions')}
                onClick={() => setActiveTab('subscriptions')}
              >
                {t('admin.tabs.subscriptions')}
              </button>
            ) : null}
            {!booksOnlyPortal ? (
              <button
                type="button"
                className={adminTabClass(activeTab === 'bookOrders')}
                onClick={() => setActiveTab('bookOrders')}
              >
                {t('admin.tabs.bookOrders')}
              </button>
            ) : null}
            {showUsersTab ? (
              <button
                type="button"
                className={`inline-flex items-center gap-1 ${adminTabClass(activeTab === 'users')}`}
                onClick={() => setActiveTab('users')}
              >
                <Users size={15} />
                {t('admin.tabs.users')}
              </button>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <div className="mb-5">
            <Alert>{error}</Alert>
          </div>
        ) : null}

        {activeTab === 'subscriptions' && showSubscriptionsTab ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={adminTabClass(subscriptionSubTab === 'list')}
                onClick={() => setSubscriptionSubTab('list')}
              >
                {t('admin.subscriptionsSummary.tabList')}
              </button>
              <button
                type="button"
                className={adminTabClass(subscriptionSubTab === 'summary')}
                onClick={() => setSubscriptionSubTab('summary')}
              >
                {t('admin.subscriptionsSummary.tabSummary')}
              </button>
            </div>

            {subscriptionSubTab === 'list' ? (
              <>
            <PaymentFilters
              filters={paymentFilters}
              counts={paymentCounts}
              onChange={updatePaymentFilter}
              onApply={applyPaymentFilters}
              onAddManual={() => setShowAddSubscription(true)}
              onDownloadPdf={handleDownloadPaymentsPdf}
              onDownloadExcel={handleDownloadPaymentsExcel}
              onDownloadLabels={handleDownloadSubmissionLabels}
              isLoading={isLoading}
              isExporting={isExporting}
              t={t}
              locale={locale}
            />

            <div className="admin-report-card">
              <div className="admin-report-section-title">
                {t('admin.tabs.subscriptions')} ({paymentPagination.total || submissions.length})
              </div>
              <div className="admin-report-table-wrap">
                <table className="admin-report-table min-w-[640px] md:min-w-[720px] lg:min-w-[840px]">
                  <thead>
                    <tr>
                      <th>{t('admin.users.subscriberNo')}</th>
                      <th>{t('admin.table.name')}</th>
                      <th>{t('admin.table.contact')}</th>
                      <th>{t('admin.table.address')}</th>
                      <th>{t('admin.table.subscription')}</th>
                      <th>{t('admin.table.status')}</th>
                      <th>{t('admin.table.validUpto')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {submissions.map((item) => {
                      const status = displayPaymentStatus(item);
                      return (
                      <tr key={submissionRowKey(item)}>
                        <td className="font-semibold tabular-nums text-ink">{formatSubscriberNo(item)}</td>
                        <td>
                          <p className="font-bold text-ink">{item.name || t('admin.notSubmitted')}</p>
                          {item.gender ? (
                            <p className="text-xs capitalize text-muted">
                              {t('admin.genderLabel')} {item.gender}
                            </p>
                          ) : null}
                          <p className="text-xs text-muted">{new Date(item.created_at).toLocaleString()}</p>
                        </td>
                        <td className="text-muted">
                          <p>{item.mobile || '-'}</p>
                          <p>{item.email || '-'}</p>
                        </td>
                        <td className="max-w-72 text-muted">
                          <p className="whitespace-pre-wrap break-words">{formatSubmissionAddress(item)}</p>
                        </td>
                        <td className="max-w-[14rem] text-xs font-semibold text-ink">
                          <p>
                            {item.subscription_type === 'five_year'
                              ? t('admin.fiveYear')
                              : item.subscription_type === 'yearly'
                                ? t('admin.oneYear')
                                : item.subscription_type || '-'}
                          </p>
                          {item.anand_sandesh_lang ? (
                            <p className="mt-1 font-normal normal-case text-muted">
                              {t('admin.anandSandeshLabel')} {item.anand_sandesh_lang}
                            </p>
                          ) : null}
                        </td>
                        <td>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                              status === 'verified'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {status === 'verified'
                              ? t('admin.filterVerified')
                              : status === 'pending'
                                ? t('admin.filterPending')
                                : status}
                          </span>
                        </td>
                        <td className="text-sm font-medium tabular-nums text-ink">
                          {formatUptoPeriod(item)}
                        </td>
                      </tr>
                      );
                    })}
                    {!submissions.length ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-10">
                          <p className="text-center font-semibold text-muted">{t('admin.noSubmissions')}</p>
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {paymentPagination.total > 0 ? (
                <div className="admin-report-pagination">
                  <p className="text-sm text-muted">
                    {t('admin.pagination.showing', {
                      from: (paymentPagination.page - 1) * paymentPagination.pageSize + 1,
                      to: Math.min(
                        paymentPagination.page * paymentPagination.pageSize,
                        paymentPagination.total
                      ),
                      total: paymentPagination.total
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="admin-report-btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                      onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                      disabled={paymentPagination.page <= 1 || isLoading}
                    >
                      <ChevronLeft size={16} aria-hidden />
                      {t('admin.pagination.previous')}
                    </button>
                    <span className="px-2 text-sm font-semibold text-ink">
                      {t('admin.pagination.pageOf', {
                        page: paymentPagination.page,
                        total: paymentPagination.totalPages
                      })}
                    </span>
                    <button
                      type="button"
                      className="admin-report-btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                      onClick={() =>
                        setPaymentPage((p) => Math.min(paymentPagination.totalPages, p + 1))
                      }
                      disabled={paymentPagination.page >= paymentPagination.totalPages || isLoading}
                    >
                      {t('admin.pagination.next')}
                      <ChevronRight size={16} aria-hidden />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
              </>
            ) : (
              <>
                <SubscriptionSummaryFilters
                  filters={subscriptionSummaryFilters}
                  counts={paymentCounts}
                  onChange={updateSubscriptionSummaryFilter}
                  onApply={() => loadSubscriptionSummary(token, subscriptionSummaryFilters)}
                  onDownloadPdf={handleDownloadSubscriptionSummaryPdf}
                  isLoading={isLoading}
                  isExporting={isExporting}
                  t={t}
                  locale={locale}
                />
                <SubscriptionSummaryTable
                  summary={subscriptionSummary}
                  subscriberCount={
                    subscriptionSummaryFilters.status === 'verified'
                      ? paymentCounts.verified
                      : subscriptionSummaryFilters.status === 'pending'
                        ? paymentCounts.pending
                        : paymentCounts.all
                  }
                  t={t}
                />
              </>
            )}
          </>
        ) : null}

        {activeTab === 'bookOrders' ? (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              <button
                type="button"
                className={adminTabClass(bookSubTab === 'orders')}
                onClick={() => setBookSubTab('orders')}
              >
                {t('admin.booksSummary.tabOrders')}
              </button>
              <button
                type="button"
                className={adminTabClass(bookSubTab === 'summary')}
                onClick={() => setBookSubTab('summary')}
              >
                {t('admin.booksSummary.tabSummary')}
              </button>
            </div>

            {bookSubTab === 'orders' ? (
              <>
            <BookOrderFilters
              filters={bookFilters}
              onChange={updateBookFilter}
              onAddManual={() => setShowAddBookOrder(true)}
              onApply={() => {
                setBookPage(1);
                loadBookOrders(token, bookFilters, { page: 1 });
              }}
              onDownloadPdf={handleDownloadBookOrdersPdf}
              onDownloadExcel={handleDownloadBookOrdersExcel}
              isLoading={isLoading}
              isExporting={isExporting}
              t={t}
              locale={locale}
            />

            <div className="admin-report-card">
              <div className="admin-report-section-title">
                {t('admin.tabs.bookOrders')} ({bookPagination.total || bookRows.length})
              </div>
              <div className="admin-report-table-wrap">
                <table className="admin-report-table min-w-[640px]">
                  <thead>
                    <tr>
                      <th>{t('admin.books.orderId')}</th>
                      <th>{t('admin.table.name')}</th>
                      <th>{t('admin.books.title')}</th>
                      <th>{t('admin.books.amount')}</th>
                      <th>{t('admin.table.status')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookRows.map((item) => (
                      <tr key={item.id}>
                        <td className="font-mono text-xs">{String(item.id).slice(0, 8)}…</td>
                        <td className="font-semibold">{item.name || '-'}</td>
                        <td>{item.book_name || '-'}</td>
                        <td className="font-semibold text-emerald-900">
                          {item.total_amount_paise != null ? `₹${(item.total_amount_paise / 100).toFixed(2)}` : '-'}
                        </td>
                        <td>{item.payment_status || '-'}</td>
                      </tr>
                    ))}
                    {!bookRows.length ? (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-muted">
                          {t('admin.noBookOrders')}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {bookPagination.total > 0 ? (
                <div className="admin-report-pagination">
                  <p className="text-sm text-muted">
                    {t('admin.pagination.showing', {
                      from: (bookPagination.page - 1) * bookPagination.pageSize + 1,
                      to: Math.min(bookPagination.page * bookPagination.pageSize, bookPagination.total),
                      total: bookPagination.total
                    })}
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="admin-report-btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                      onClick={() => setBookPage((p) => Math.max(1, p - 1))}
                      disabled={bookPagination.page <= 1 || isLoading}
                    >
                      <ChevronLeft size={16} aria-hidden />
                      {t('admin.pagination.previous')}
                    </button>
                    <span className="px-2 text-sm font-semibold text-ink">
                      {t('admin.pagination.pageOf', {
                        page: bookPagination.page,
                        total: bookPagination.totalPages
                      })}
                    </span>
                    <button
                      type="button"
                      className="admin-report-btn-secondary px-3 py-2 text-sm disabled:opacity-50"
                      onClick={() =>
                        setBookPage((p) => Math.min(bookPagination.totalPages, p + 1))
                      }
                      disabled={bookPagination.page >= bookPagination.totalPages || isLoading}
                    >
                      {t('admin.pagination.next')}
                      <ChevronRight size={16} aria-hidden />
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
              </>
            ) : (
              <>
                <BookSummaryFilters
                  filters={bookSummaryFilters}
                  onChange={updateBookSummaryFilter}
                  onApply={() => loadBookSummary(token, bookSummaryFilters)}
                  onDownloadPdf={handleDownloadBookSummaryPdf}
                  isLoading={isLoading}
                  isExporting={isExporting}
                  t={t}
                  locale={locale}
                />
                <BookSummaryTables summary={bookSummary} t={t} />
              </>
            )}
          </>
        ) : null}

        {activeTab === 'users' && showUsersTab ? (
          <>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row">
              <input
                className="input max-w-md"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder={t('admin.users.searchPlaceholder')}
              />
            </div>
            <UserFilters
              filters={userFilters}
              onChange={updateUserFilter}
              onApply={loadUsersNow}
              isLoading={isLoading}
              t={t}
            />
            <div className="admin-report-card">
              <div className="admin-report-section-title">{t('admin.tabs.users')}</div>
              <div className="admin-report-table-wrap">
                <table className="admin-report-table min-w-[700px]">
                  <thead>
                    <tr>
                      <th>{t('admin.users.subscriberNo')}</th>
                      <th>{t('admin.users.fullName')}</th>
                      <th>{t('admin.emailLabel')}</th>
                      <th>{t('admin.users.verified')}</th>
                      <th>{t('admin.users.lastLogin')}</th>
                      <th>{t('admin.table.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id}>
                        <td>{user.subscriber_no ?? '-'}</td>
                        <td className="font-semibold">{user.full_name || '-'}</td>
                        <td className="text-muted">{user.email}</td>
                        <td>{user.is_verified ? t('common.yes') : t('common.no')}</td>
                        <td className="text-xs text-muted">
                          {user.last_login_at ? new Date(user.last_login_at).toLocaleString() : '-'}
                        </td>
                        <td>
                          <button
                            className="admin-report-btn-secondary px-3 py-1.5 text-xs"
                            type="button"
                            onClick={() => setEditingUser(user)}
                          >
                            <Pencil size={14} />
                            {t('admin.users.edit')}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {!users.length ? (
                      <tr>
                        <td colSpan="6" className="py-8 text-center text-muted">
                          {t('admin.users.none')}
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : null}
      </section>

      {editingUser ? (
        <UserEditModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSave={handleSaveUser}
          saving={isSavingUser}
          t={t}
        />
      ) : null}

      {showAddBookOrder ? (
        <AdminAddBookOrderModal
          open={showAddBookOrder}
          token={token}
          portalSlug={portalSlug}
          onClose={() => setShowAddBookOrder(false)}
          onCreated={() => loadBookOrders()}
        />
      ) : null}

      {showAddSubscription ? (
        <AdminAddSubscriptionModal
          open={showAddSubscription}
          token={token}
          onClose={() => setShowAddSubscription(false)}
          onCreated={() => loadSubmissions()}
        />
      ) : null}
    </main>
  );
}
