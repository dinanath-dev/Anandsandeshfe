import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import Alert from './Alert.jsx';
import { InlineLoader } from './Loader.jsx';
import { BOOK_PICKUP_COUNTERS } from '../constants/bookCounters.js';
import { createAdminBookOrder, getBooks } from '../services/api.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

function freshLine() {
  return { book_id: '', quantity: '1' };
}

function freshForm() {
  return {
    name: '',
    mobile: '',
    email: '',
    pickup_counter: '',
    saleDate: new Date().toISOString().slice(0, 10),
    amountReceived: '',
    receiptNo: '',
    lines: [freshLine()]
  };
}

function FormSection({ title, children }) {
  return (
    <section className="rounded-xl border border-ink/10 bg-slate-50/90 p-4">
      <h3 className="mb-4 text-xs font-black uppercase tracking-wider text-ink">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function FieldError({ message }) {
  if (!message) return null;
  return <span className="mt-1 block text-xs text-red-600">{message}</span>;
}

export default function AdminAddBookOrderModal({ open, token, portalSlug, onClose, onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(freshForm);
  const [books, setBooks] = useState([]);
  const [booksLoading, setBooksLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setBooksLoading(true);
    getBooks()
      .then((data) => {
        if (!cancelled) setBooks(data?.books || []);
      })
      .catch(() => {
        if (!cancelled) setBooks([]);
      })
      .finally(() => {
        if (!cancelled) setBooksLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const computedTotal = useMemo(() => {
    return form.lines.reduce((sum, line) => {
      const book = books.find((b) => b.id === line.book_id);
      const qty = Number(line.quantity) || 0;
      const rate = Number(book?.counter_sale_rate ?? book?.sales_rate) || 0;
      return sum + rate * qty;
    }, 0);
  }, [form.lines, books]);

  if (!open) return null;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setSubmitError('');
  }

  function updateLine(index, key, value) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.map((line, i) => (i === index ? { ...line, [key]: value } : line))
    }));
    setErrors((prev) => ({ ...prev, [`line_${index}_${key}`]: '' }));
    setSubmitError('');
  }

  function addLine() {
    setForm((prev) => ({ ...prev, lines: [...prev.lines, freshLine()] }));
  }

  function removeLine(index) {
    setForm((prev) => ({
      ...prev,
      lines: prev.lines.length <= 1 ? prev.lines : prev.lines.filter((_, i) => i !== index)
    }));
  }

  function validate() {
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = t('admin.manualBookOrder.nameRequired');
    if (!form.mobile.trim()) nextErrors.mobile = t('form.errors.mobileRequired');
    if (!form.pickup_counter) nextErrors.pickup_counter = t('books.errors.counterRequired');
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = t('form.errors.emailInvalid');
    }
    if (form.amountReceived !== '' && (!Number.isFinite(Number(form.amountReceived)) || Number(form.amountReceived) < 0)) {
      nextErrors.amountReceived = t('admin.manualSubscription.amountInvalid');
    }

    let hasBook = false;
    form.lines.forEach((line, index) => {
      if (!line.book_id) {
        nextErrors[`line_${index}_book_id`] = t('admin.manualBookOrder.bookRequired');
      } else {
        hasBook = true;
      }
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty < 1) {
        nextErrors[`line_${index}_quantity`] = t('admin.manualBookOrder.quantityInvalid');
      }
    });
    if (!hasBook) nextErrors.lines = t('admin.manualBookOrder.bookRequired');

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function buildPayload() {
    return {
      name: form.name.trim(),
      mobile: form.mobile.trim(),
      email: form.email.trim() || undefined,
      pickup_counter: form.pickup_counter,
      sale_date: form.saleDate || undefined,
      receipt_no: form.receiptNo.trim() || undefined,
      amount_received: form.amountReceived !== '' ? Number(form.amountReceived) : undefined,
      items: form.lines
        .filter((line) => line.book_id)
        .map((line) => ({
          book_id: line.book_id,
          quantity: Number(line.quantity) || 1
        }))
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSubmitError('');
    try {
      const data = await createAdminBookOrder(token, buildPayload(), portalSlug);
      setCreatedOrder(data?.order || null);
      onCreated?.(data?.order);
    } catch (err) {
      setSubmitError(err?.message || t('admin.manualBookOrder.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setForm(freshForm());
    setErrors({});
    setSubmitError('');
    setCreatedOrder(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-add-book-order-title"
      onClick={handleClose}
    >
      <div className="card admin-modal-panel max-w-3xl shadow-card" onClick={(e) => e.stopPropagation()}>
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ink/10 px-4 py-4 sm:px-5">
          <div className="min-w-0 pr-2">
            <h2 id="admin-add-book-order-title" className="text-lg font-black text-ink sm:text-xl">
              {t('admin.manualBookOrder.title')}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t('admin.manualBookOrder.subtitle')}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-ink/10 p-2 text-muted hover:bg-ink/5"
            onClick={handleClose}
            aria-label={t('common.cancel')}
          >
            <X size={18} />
          </button>
        </header>

        {createdOrder ? (
          <div className="admin-modal-body px-4 py-5 sm:px-5">
            <Alert type="success">
              {t('admin.manualBookOrder.success', {
                orderId: String(createdOrder.id || '').slice(0, 8),
                amount: createdOrder.total_amount_paise != null
                  ? (createdOrder.total_amount_paise / 100).toFixed(2)
                  : '0.00'
              })}
            </Alert>
          </div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
            <div className="admin-modal-body admin-modal-form space-y-4 px-4 py-4 sm:px-5 sm:py-5">
              {submitError ? <Alert>{submitError}</Alert> : null}

              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-900">
                {t('admin.manualBookOrder.cashNote')}
              </p>

              <FormSection title={t('admin.manualBookOrder.customer')}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">{t('admin.table.name')}</span>
                    <input
                      className={`input ${errors.name ? 'border-red-400' : ''}`}
                      value={form.name}
                      onChange={(e) => updateField('name', e.target.value)}
                    />
                    <FieldError message={errors.name} />
                  </label>
                  <label className="block">
                    <span className="label">{t('form.labels.mobile')}</span>
                    <input
                      className={`input ${errors.mobile ? 'border-red-400' : ''}`}
                      value={form.mobile}
                      onChange={(e) => updateField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputMode="numeric"
                    />
                    <FieldError message={errors.mobile} />
                  </label>
                </div>
                <label className="block">
                  <span className="label">
                    {t('form.labels.email')}{' '}
                    <span className="font-normal text-muted">({t('admin.manualSubscription.optional')})</span>
                  </span>
                  <input
                    className={`input ${errors.email ? 'border-red-400' : ''}`}
                    type="email"
                    value={form.email}
                    onChange={(e) => updateField('email', e.target.value)}
                  />
                  <FieldError message={errors.email} />
                </label>
              </FormSection>

              <FormSection title={t('admin.manualBookOrder.sale')}>
                <label className="block">
                  <span className="label">{t('books.pickupCounter')}</span>
                  <select
                    className={`input ${errors.pickup_counter ? 'border-red-400' : ''}`}
                    value={form.pickup_counter}
                    onChange={(e) => updateField('pickup_counter', e.target.value)}
                  >
                    <option value="">{t('books.selectCounter')}</option>
                    {BOOK_PICKUP_COUNTERS.map((counter) => (
                      <option key={counter.code} value={counter.code}>
                        {counter.label}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.pickup_counter} />
                </label>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink">{t('admin.manualBookOrder.books')}</span>
                    <button type="button" className="admin-report-btn-secondary !px-3 !py-1.5 text-sm" onClick={addLine}>
                      <Plus size={16} />
                      {t('admin.manualBookOrder.addBook')}
                    </button>
                  </div>
                  {booksLoading ? (
                    <p className="text-sm text-muted">{t('common.loading')}</p>
                  ) : null}
                  {form.lines.map((line, index) => (
                    <div key={`book-line-${index}`} className="grid gap-3 rounded-lg border border-ink/10 bg-white p-3 sm:grid-cols-[1fr_100px_40px]">
                      <label className="block min-w-0">
                        <span className="label">{t('admin.books.title')}</span>
                        <select
                          className={`input ${errors[`line_${index}_book_id`] ? 'border-red-400' : ''}`}
                          value={line.book_id}
                          onChange={(e) => updateLine(index, 'book_id', e.target.value)}
                        >
                          <option value="">{t('admin.manualBookOrder.selectBook')}</option>
                          {books.map((book) => (
                            <option key={book.id} value={book.id}>
                              {book.name} — ₹{Number(book.counter_sale_rate ?? book.sales_rate).toFixed(0)}
                            </option>
                          ))}
                        </select>
                        <FieldError message={errors[`line_${index}_book_id`]} />
                      </label>
                      <label className="block">
                        <span className="label">{t('admin.manualBookOrder.qty')}</span>
                        <input
                          className={`input ${errors[`line_${index}_quantity`] ? 'border-red-400' : ''}`}
                          type="number"
                          min="1"
                          max="10"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                        />
                        <FieldError message={errors[`line_${index}_quantity`]} />
                      </label>
                      <div className="flex items-end justify-end">
                        <button
                          type="button"
                          className="rounded-lg border border-ink/10 p-2 text-muted hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                          onClick={() => removeLine(index)}
                          disabled={form.lines.length <= 1}
                          aria-label={t('admin.manualBookOrder.removeBook')}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  <FieldError message={errors.lines} />
                  <p className="text-sm font-semibold text-emerald-900">
                    {t('admin.manualBookOrder.estimatedTotal', { amount: computedTotal.toFixed(2) })}
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">{t('admin.manualBookOrder.saleDate')}</span>
                    <input
                      className="input"
                      type="date"
                      value={form.saleDate}
                      onChange={(e) => updateField('saleDate', e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="label">
                      {t('admin.manualSubscription.amount')}{' '}
                      <span className="font-normal text-muted">({t('admin.manualSubscription.optional')})</span>
                    </span>
                    <input
                      className={`input ${errors.amountReceived ? 'border-red-400' : ''}`}
                      type="number"
                      min="0"
                      step="1"
                      value={form.amountReceived}
                      onChange={(e) => updateField('amountReceived', e.target.value)}
                      placeholder={computedTotal > 0 ? String(computedTotal) : ''}
                    />
                    <FieldError message={errors.amountReceived} />
                  </label>
                </div>

                <label className="block">
                  <span className="label">
                    {t('admin.manualSubscription.receiptNo')}{' '}
                    <span className="font-normal text-muted">({t('admin.manualSubscription.optional')})</span>
                  </span>
                  <input className="input" value={form.receiptNo} onChange={(e) => updateField('receiptNo', e.target.value)} />
                </label>
              </FormSection>
            </div>

            <footer className="flex shrink-0 flex-wrap gap-2 border-t border-ink/10 bg-white px-4 py-4 sm:px-5">
              <button className="btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 sm:flex-none" type="submit" disabled={saving || booksLoading}>
                {saving ? <InlineLoader size={18} /> : null}
                {saving ? t('admin.manualBookOrder.saving') : t('admin.manualBookOrder.save')}
              </button>
              <button className="btn-secondary min-h-11 flex-1 sm:flex-none" type="button" onClick={handleClose} disabled={saving}>
                {t('common.cancel')}
              </button>
            </footer>
          </form>
        )}

        {createdOrder ? (
          <footer className="shrink-0 border-t border-ink/10 px-4 py-4 sm:px-5">
            <button className="btn-primary w-full sm:w-auto" type="button" onClick={handleClose}>
              {t('admin.done')}
            </button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}
