import { useCallback, useEffect, useRef, useState } from 'react';
import { Boxes, History, PackageMinus, PackagePlus, RefreshCw, Save, Search } from 'lucide-react';
import { LoadingBlock } from './Loader.jsx';
import {
  adjustBookInventory,
  getBookInventory,
  getBookInventoryMovements,
  setBookInventory
} from '../services/api.js';
import { BOOK_PICKUP_COUNTERS } from '../constants/bookCounters.js';

const DEFAULT_COUNTER = BOOK_PICKUP_COUNTERS[0]?.code || 'all';

function stockStatus(quantity, threshold) {
  if (quantity <= 0) return 'out';
  if (quantity <= threshold) return 'low';
  return 'ok';
}

function statusPillClass(status) {
  if (status === 'out') return 'bg-red-100 text-red-700';
  if (status === 'low') return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-800';
}

function qtyClass(status) {
  if (status === 'out') return 'tabular-nums font-bold text-red-600';
  if (status === 'low') return 'tabular-nums font-bold text-amber-700';
  return 'tabular-nums font-bold text-emerald-800';
}

function reasonLabel(reason, t) {
  const key = `admin.inventory.reasons.${reason}`;
  const label = t(key);
  return label === key ? reason : label;
}

/** Editable row (single-counter view): add stock inline + open the manage modal. */
function InventoryRow({ book, counterCode, token, portalSlug, t, toast, onChanged, onManage }) {
  const [addQty, setAddQty] = useState('');
  const [saving, setSaving] = useState(false);
  const status = stockStatus(book.quantity, book.low_stock_threshold);

  async function handleAdd(event) {
    event.preventDefault();
    const amount = Number(addQty);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('admin.inventory.errors.amount'));
      return;
    }
    setSaving(true);
    try {
      await adjustBookInventory(
        token,
        { book_id: book.book_id, counter_code: counterCode, amount, direction: 'in' },
        portalSlug
      );
      toast.success(t('admin.inventory.toasts.saved'));
      setAddQty('');
      onChanged();
    } catch (err) {
      toast.showError(err, { fallback: t('admin.inventory.toasts.error') });
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr>
      <td className="text-ink">{book.book_name}</td>
      <td className={qtyClass(status)}>{book.quantity}</td>
      <td>
        <form onSubmit={handleAdd} className="flex items-center gap-2">
          <input
            className="input !h-10 w-20 text-base"
            type="number"
            min="1"
            value={addQty}
            placeholder={t('admin.inventory.addPlaceholder')}
            onChange={(e) => setAddQty(e.target.value)}
          />
          <button type="submit" className="admin-report-btn-primary px-3 py-2 text-sm" disabled={saving}>
            <PackagePlus size={15} />
            {t('admin.inventory.add')}
          </button>
        </form>
      </td>
      <td>
        <span className={`admin-report-badge ${statusPillClass(status)}`}>
          {t(`admin.inventory.statusLabels.${status}`)}
        </span>
        <span className="ml-2 text-xs text-muted">
          {t('admin.inventory.threshold')}: {book.low_stock_threshold}
        </span>
      </td>
      <td className="text-right">
        <button type="button" className="admin-report-btn-secondary px-3 py-2 text-sm" onClick={onManage}>
          <Boxes size={15} />
          {t('admin.inventory.manage')}
        </button>
      </td>
    </tr>
  );
}

function InventoryManageModal({ item, token, portalSlug, t, locale, toast, onClose, onSaved }) {
  const [current, setCurrent] = useState({
    quantity: item.quantity,
    low_stock_threshold: item.low_stock_threshold
  });
  const [setForm, setSetForm] = useState({
    quantity: String(item.quantity ?? 0),
    threshold: String(item.low_stock_threshold ?? 0)
  });
  const [adjustForm, setAdjustForm] = useState({ amount: '', direction: 'out', note: '' });
  const [savingSet, setSavingSet] = useState(false);
  const [savingAdjust, setSavingAdjust] = useState(false);
  const [movements, setMovements] = useState([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  const loadMovements = useCallback(async () => {
    setLoadingMovements(true);
    try {
      const data = await getBookInventoryMovements(
        token,
        { book_id: item.book_id, counter: item.counter_code, limit: 30 },
        portalSlug
      );
      setMovements(data.movements || []);
    } catch (err) {
      toast.showError(err, { fallback: t('admin.inventory.toasts.error') });
    } finally {
      setLoadingMovements(false);
    }
  }, [token, portalSlug, item.book_id, item.counter_code, toast, t]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  async function handleSet(event) {
    event.preventDefault();
    setSavingSet(true);
    try {
      const data = await setBookInventory(
        token,
        {
          book_id: item.book_id,
          counter_code: item.counter_code,
          quantity: Number(setForm.quantity) || 0,
          low_stock_threshold: Number(setForm.threshold) || 0
        },
        portalSlug
      );
      const inv = data.inventory;
      setCurrent({ quantity: inv.quantity, low_stock_threshold: inv.low_stock_threshold });
      toast.success(t('admin.inventory.toasts.saved'));
      await loadMovements();
      onSaved();
    } catch (err) {
      toast.showError(err, { fallback: t('admin.inventory.toasts.error') });
    } finally {
      setSavingSet(false);
    }
  }

  async function handleAdjust(event) {
    event.preventDefault();
    const amount = Number(adjustForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error(t('admin.inventory.errors.amount'));
      return;
    }
    setSavingAdjust(true);
    try {
      const data = await adjustBookInventory(
        token,
        {
          book_id: item.book_id,
          counter_code: item.counter_code,
          amount,
          direction: adjustForm.direction,
          note: adjustForm.note.trim() || undefined
        },
        portalSlug
      );
      const inv = data.inventory;
      setCurrent({ quantity: inv.quantity, low_stock_threshold: inv.low_stock_threshold });
      setSetForm((prev) => ({ ...prev, quantity: String(inv.quantity) }));
      setAdjustForm({ amount: '', direction: adjustForm.direction, note: '' });
      toast.success(t('admin.inventory.toasts.saved'));
      await loadMovements();
      onSaved();
    } catch (err) {
      toast.showError(err, { fallback: t('admin.inventory.toasts.error') });
    } finally {
      setSavingAdjust(false);
    }
  }

  const status = stockStatus(current.quantity, current.low_stock_threshold);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm">
      <div className="admin-login-card max-h-[90vh] w-full max-w-lg overflow-y-auto !border-emerald-300 !bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-black text-emerald-950">{item.book_name}</h2>
            <p className="text-xs text-muted">{item.counter_label || item.counter_code}</p>
          </div>
          <span className={`admin-report-badge ${statusPillClass(status)}`}>
            {t('admin.inventory.onHand')}: <span className="tabular-nums">{current.quantity}</span>
          </span>
        </div>

        <form onSubmit={handleSet} className="mt-2 rounded-xl border border-emerald-200/70 bg-white/70 p-4">
          <div className="mb-2 text-sm font-bold uppercase tracking-wide text-emerald-800">
            {t('admin.inventory.setStock')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">{t('admin.inventory.quantity')}</span>
              <input
                className="input"
                type="number"
                min="0"
                value={setForm.quantity}
                onChange={(e) => setSetForm({ ...setForm, quantity: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="label">{t('admin.inventory.threshold')}</span>
              <input
                className="input"
                type="number"
                min="0"
                value={setForm.threshold}
                onChange={(e) => setSetForm({ ...setForm, threshold: e.target.value })}
              />
            </label>
          </div>
          <button className="admin-report-btn-primary mt-3 w-full" type="submit" disabled={savingSet}>
            <Save size={16} />
            {savingSet ? t('admin.inventory.saving') : t('admin.inventory.saveSet')}
          </button>
        </form>

        <form onSubmit={handleAdjust} className="mt-3 rounded-xl border border-emerald-200/70 bg-white/70 p-4">
          <div className="mb-2 text-sm font-bold uppercase tracking-wide text-emerald-800">
            {t('admin.inventory.adjustStock')}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="label">{t('admin.inventory.direction')}</span>
              <select
                className="input"
                value={adjustForm.direction}
                onChange={(e) => setAdjustForm({ ...adjustForm, direction: e.target.value })}
              >
                <option value="in">{t('admin.inventory.stockIn')}</option>
                <option value="out">{t('admin.inventory.stockOut')}</option>
              </select>
            </label>
            <label className="block">
              <span className="label">{t('admin.inventory.amount')}</span>
              <input
                className="input"
                type="number"
                min="1"
                value={adjustForm.amount}
                onChange={(e) => setAdjustForm({ ...adjustForm, amount: e.target.value })}
              />
            </label>
          </div>
          <label className="mt-3 block">
            <span className="label">{t('admin.inventory.note')}</span>
            <input
              className="input"
              value={adjustForm.note}
              maxLength={500}
              placeholder={t('admin.inventory.notePlaceholder')}
              onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
            />
          </label>
          <button className="admin-report-btn-secondary mt-3 w-full" type="submit" disabled={savingAdjust}>
            {adjustForm.direction === 'in' ? <PackagePlus size={16} /> : <PackageMinus size={16} />}
            {savingAdjust ? t('admin.inventory.saving') : t('admin.inventory.applyAdjust')}
          </button>
        </form>

        <div className="mt-3 rounded-xl border border-emerald-200/70 bg-white/70 p-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-emerald-800">
            <History size={15} />
            {t('admin.inventory.history')}
          </div>
          {loadingMovements ? (
            <p className="py-4 text-center text-sm text-muted">{t('admin.inventory.loading')}</p>
          ) : movements.length ? (
            <div className="admin-report-table-wrap max-h-56 overflow-y-auto">
              <table className="admin-report-table min-w-[420px] text-sm">
                <thead>
                  <tr>
                    <th>{t('admin.inventory.when')}</th>
                    <th>{t('admin.inventory.change')}</th>
                    <th>{t('admin.inventory.balance')}</th>
                    <th>{t('admin.inventory.reason')}</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id}>
                      <td className="whitespace-nowrap text-xs text-muted">
                        {new Date(m.created_at).toLocaleString(locale)}
                      </td>
                      <td
                        className={`tabular-nums font-semibold ${
                          m.change < 0 ? 'text-red-600' : 'text-emerald-700'
                        }`}
                      >
                        {m.change > 0 ? `+${m.change}` : m.change}
                      </td>
                      <td className="tabular-nums text-ink">{m.balance_after}</td>
                      <td className="text-xs">
                        <span className="font-semibold text-emerald-900">{reasonLabel(m.reason, t)}</span>
                        {m.note ? <span className="block text-muted">{m.note}</span> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="py-4 text-center text-sm text-muted">{t('admin.inventory.noHistory')}</p>
          )}
        </div>

        <button className="admin-report-btn-secondary mt-4 w-full" type="button" onClick={onClose}>
          {t('common.close')}
        </button>
      </div>
    </div>
  );
}

export default function BookInventoryPanel({ token, portalSlug, t, locale, toast, onAuthError }) {
  const [filters, setFilters] = useState({ counter: DEFAULT_COUNTER, search: '', lowStock: false });
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notReady, setNotReady] = useState(false);
  const [managing, setManaging] = useState(null);
  const searchTimer = useRef(null);

  const load = useCallback(
    async (activeFilters = filters, { silent = false } = {}) => {
      if (!token) return;
      if (!silent) setIsLoading(true);
      try {
        const result = await getBookInventory(
          token,
          {
            counter: activeFilters.counter,
            search: activeFilters.search || undefined,
            lowStock: activeFilters.lowStock
          },
          portalSlug
        );
        setData(result);
        setNotReady(false);
      } catch (err) {
        if (err?.status === 401) {
          if (onAuthError) onAuthError(err);
        } else {
          // Most likely the inventory tables have not been created yet — show the
          // helpful empty state instead of spamming error toasts.
          setData({ counters: [] });
          setNotReady(true);
        }
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [token, portalSlug, filters, onAuthError]
  );

  // Debounce so typing in search doesn't fire a request per keystroke.
  useEffect(() => {
    if (searchTimer.current) window.clearTimeout(searchTimer.current);
    searchTimer.current = window.setTimeout(() => load(filters), 300);
    return () => {
      if (searchTimer.current) window.clearTimeout(searchTimer.current);
    };
  }, [filters, load]);

  function updateFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  const counters = data?.counters || [];
  const singleCounter = filters.counter !== 'all';

  return (
    <>
      {isLoading ? <LoadingBlock label={t('admin.inventory.loading')} /> : null}

      <div className="admin-report-filters admin-books-filters">
        <div className="admin-books-filters__fields">
          <label className="admin-filter-field">
            <span className="admin-report-label">{t('admin.inventory.counter')}</span>
            <select
              className="input text-base"
              value={filters.counter}
              onChange={(e) => updateFilter('counter', e.target.value)}
            >
              {BOOK_PICKUP_COUNTERS.map((counter) => (
                <option key={counter.code} value={counter.code}>
                  {counter.label}
                </option>
              ))}
              <option value="all">{t('admin.inventory.allCounters')}</option>
            </select>
          </label>
          <label className="admin-filter-field">
            <span className="admin-report-label">{t('admin.inventory.search')}</span>
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700" />
              <input
                className="input text-base !pl-9"
                value={filters.search}
                placeholder={t('admin.inventory.searchPlaceholder')}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>
          </label>
          <label className="admin-filter-field justify-end">
            <span className="admin-report-label">{t('admin.inventory.lowStockFilter')}</span>
            <label className="flex h-[46px] items-center gap-2 rounded-xl border border-emerald-300/70 bg-white px-3 text-base font-semibold text-emerald-900">
              <input
                type="checkbox"
                checked={filters.lowStock}
                onChange={(e) => updateFilter('lowStock', e.target.checked)}
              />
              {t('admin.inventory.lowStockOnly')}
            </label>
          </label>
        </div>
        <div className="admin-books-filters__actions admin-books-filters__actions--single">
          <button
            className="admin-report-btn-secondary !text-base"
            type="button"
            onClick={() => load(filters)}
            disabled={isLoading}
          >
            <RefreshCw size={18} />
            {t('admin.inventory.refresh')}
          </button>
        </div>
      </div>

      {singleCounter ? (
        <p className="mb-4 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-base text-emerald-900">
          {t('admin.inventory.addHint')}
        </p>
      ) : (
        <p className="mb-4 rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3 text-base text-emerald-900">
          {t('admin.inventory.overviewHint')}
        </p>
      )}

      {!counters.length ? (
        <div className="admin-report-card border border-emerald-200/70 bg-emerald-50/80 p-10 text-center text-base font-medium text-emerald-800">
          {notReady ? t('admin.inventory.none') : t('admin.inventory.noBooks')}
        </div>
      ) : (
        <div className="space-y-6">
          {counters.map((counter) => (
            <div key={counter.code} className="admin-report-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="admin-report-section-title sm:text-xl">{counter.label}</div>
                <div className="flex items-center gap-2">
                  <span className="admin-report-badge bg-emerald-100 text-emerald-800">
                    {t('admin.inventory.totalUnits')}: <span className="tabular-nums">{counter.total_quantity}</span>
                  </span>
                  {counter.low_stock_count > 0 ? (
                    <span className="admin-report-badge bg-amber-100 text-amber-800">
                      {t('admin.inventory.lowCount', { count: counter.low_stock_count })}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="admin-report-table-wrap">
                <table className="admin-report-table min-w-[640px] text-base">
                  <thead>
                    <tr>
                      <th>{t('admin.inventory.book')}</th>
                      <th>{t('admin.inventory.onHand')}</th>
                      {singleCounter ? (
                        <th>{t('admin.inventory.addStockCol')}</th>
                      ) : (
                        <th>{t('admin.inventory.threshold')}</th>
                      )}
                      <th>{t('admin.inventory.status')}</th>
                      <th className="text-right">{t('admin.inventory.action')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counter.books.length ? (
                      counter.books.map((book) => {
                        const manageItem = {
                          ...book,
                          counter_code: counter.code,
                          counter_label: counter.label
                        };
                        if (singleCounter) {
                          return (
                            <InventoryRow
                              key={`${counter.code}-${book.book_id}`}
                              book={book}
                              counterCode={counter.code}
                              token={token}
                              portalSlug={portalSlug}
                              t={t}
                              toast={toast}
                              onChanged={() => load(filters, { silent: true })}
                              onManage={() => setManaging(manageItem)}
                            />
                          );
                        }
                        const status = stockStatus(book.quantity, book.low_stock_threshold);
                        return (
                          <tr key={`${counter.code}-${book.book_id}`}>
                            <td className="text-ink">{book.book_name}</td>
                            <td className={qtyClass(status)}>{book.quantity}</td>
                            <td className="tabular-nums text-muted">{book.low_stock_threshold}</td>
                            <td>
                              <span className={`admin-report-badge ${statusPillClass(status)}`}>
                                {t(`admin.inventory.statusLabels.${status}`)}
                              </span>
                            </td>
                            <td className="text-right">
                              <button
                                type="button"
                                className="admin-report-btn-secondary px-3 py-2 text-sm"
                                onClick={() => setManaging(manageItem)}
                              >
                                <Boxes size={15} />
                                {t('admin.inventory.manage')}
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan="5" className="py-8 text-center text-muted">
                          {t('admin.inventory.noBooks')}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {managing ? (
        <InventoryManageModal
          item={managing}
          token={token}
          portalSlug={portalSlug}
          t={t}
          locale={locale}
          toast={toast}
          onClose={() => setManaging(null)}
          onSaved={() => load(filters, { silent: true })}
        />
      ) : null}
    </>
  );
}
