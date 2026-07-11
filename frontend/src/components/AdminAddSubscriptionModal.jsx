import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Alert from './Alert.jsx';
import AddressFieldsBlock from './AddressFieldsBlock.jsx';
import { InlineLoader } from './Loader.jsx';
import { DEFAULT_COUNTRY } from '../data/countries.js';
import { createAdminSubmission } from '../services/api.js';
import { sanitizeFormField, validateIndianFormFields } from '../utils/formFieldValidation.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

function freshForm() {
  return {
    firstName: '',
    lastName: '',
    mobile: '',
    email: '',
    country: DEFAULT_COUNTRY,
    careOf: '',
    houseNo: '',
    street: '',
    landmark: '',
    area: '',
    postOffice: '',
    state: '',
    town: '',
    district: '',
    pin: '',
    gender: '',
    rehbar: '',
    anandSandesh: '',
    spiritualBliss: '',
    subscription: 'yearly',
    subsAmount: '',
    receiptNo: '',
    startDate: new Date().toISOString().slice(0, 10)
  };
}

function buildPayload(form) {
  return {
    first_name: form.firstName.trim(),
    last_name: form.lastName.trim(),
    mobile: form.mobile.trim(),
    email: form.email.trim() || undefined,
    gender: form.gender,
    care_of: form.careOf.trim() || undefined,
    house_no: form.houseNo.trim(),
    street: form.street.trim(),
    area: form.area.trim(),
    post_office: form.postOffice.trim(),
    town: form.town.trim(),
    district: form.district.trim(),
    state: form.state.trim(),
    country: form.country.trim() || DEFAULT_COUNTRY,
    pin: form.pin.trim(),
    rehbar: form.rehbar.trim(),
    mark: form.landmark.trim() || undefined,
    anand_sandesh_lang: form.anandSandesh || null,
    spiritual_bliss: form.spiritualBliss || null,
    subscription_type: form.subscription,
    subs_amount: form.subsAmount !== '' ? Number(form.subsAmount) : undefined,
    receipt_no: form.receiptNo.trim() || undefined,
    start_date: form.startDate || undefined
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

export default function AdminAddSubscriptionModal({ open, token, onClose, onCreated }) {
  const { t } = useTranslation();
  const [form, setForm] = useState(freshForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [saving, setSaving] = useState(false);
  const [createdNo, setCreatedNo] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: '' }));
    setSubmitError('');
  }

  function handleCountryChange(country) {
    setForm((prev) => ({ ...prev, country }));
  }

  function validate() {
    const nextErrors = validateIndianFormFields(form, t, { requireRehbar: true, requireAddress: true });
    if (!form.gender) nextErrors.gender = t('form.errors.genderRequired');
    if (!form.subscription) nextErrors.subscription = t('form.errors.subscriptionRequired');
    if (!form.mobile.trim()) nextErrors.mobile = t('form.errors.mobileRequired');
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = t('form.errors.emailInvalid');
    }
    if (form.subsAmount !== '' && (!Number.isFinite(Number(form.subsAmount)) || Number(form.subsAmount) < 0)) {
      nextErrors.subsAmount = t('admin.manualSubscription.amountInvalid');
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setSubmitError('');
    try {
      const data = await createAdminSubmission(token, buildPayload(form));
      const subscriberNo = data?.submission?.subscriber_no ?? data?.submission?.subscriberNo;
      setCreatedNo(subscriberNo != null ? String(subscriberNo) : null);
      onCreated?.(data?.submission);
    } catch (err) {
      setSubmitError(err?.message || t('admin.manualSubscription.saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setForm(freshForm());
    setErrors({});
    setSubmitError('');
    setCreatedNo(null);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/55 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-add-subscription-title"
      onClick={handleClose}
    >
      <div
        className="card admin-modal-panel max-w-3xl shadow-card"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-ink/10 px-4 py-4 sm:px-5">
          <div className="min-w-0 pr-2">
            <h2 id="admin-add-subscription-title" className="text-lg font-black text-ink sm:text-xl">
              {t('admin.manualSubscription.title')}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{t('admin.manualSubscription.subtitle')}</p>
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

        {createdNo ? (
          <div className="admin-modal-body px-4 py-5 sm:px-5">
            <Alert type="success">
              {t('admin.manualSubscription.success', { subscriberNo: createdNo })}
            </Alert>
          </div>
        ) : (
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit} noValidate>
            <div className="admin-modal-body admin-modal-form space-y-4 px-4 py-4 sm:px-5 sm:py-5">
              {submitError ? <Alert>{submitError}</Alert> : null}

              <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm font-medium text-emerald-900">
                {t('admin.manualSubscription.subscriberAuto')}
              </p>

              <FormSection title={t('form.personalSectionTitle')}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">{t('form.labels.firstName')}</span>
                    <input
                      className={`input ${errors.firstName ? 'border-red-400' : ''}`}
                      value={form.firstName}
                      onChange={(e) => updateField('firstName', sanitizeFormField('firstName', e.target.value))}
                      maxLength={30}
                    />
                    <FieldError message={errors.firstName} />
                  </label>
                  <label className="block">
                    <span className="label">{t('form.labels.lastName')}</span>
                    <input
                      className={`input ${errors.lastName ? 'border-red-400' : ''}`}
                      value={form.lastName}
                      onChange={(e) => updateField('lastName', sanitizeFormField('lastName', e.target.value))}
                      maxLength={30}
                    />
                    <FieldError message={errors.lastName} />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">{t('form.labels.mobile')}</span>
                    <input
                      className={`input ${errors.mobile ? 'border-red-400' : ''}`}
                      value={form.mobile}
                      onChange={(e) => updateField('mobile', e.target.value.replace(/\D/g, '').slice(0, 10))}
                      inputMode="numeric"
                      placeholder="10-digit mobile"
                    />
                    <FieldError message={errors.mobile} />
                  </label>
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
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">{t('form.labels.gender')}</span>
                    <select
                      className={`input ${errors.gender ? 'border-red-400' : ''}`}
                      value={form.gender}
                      onChange={(e) => updateField('gender', e.target.value)}
                    >
                      <option value="">{t('form.placeholders.selectGender')}</option>
                      <option value="male">{t('form.placeholders.male')}</option>
                      <option value="female">{t('form.placeholders.female')}</option>
                    </select>
                    <FieldError message={errors.gender} />
                  </label>
                  <label className="block">
                    <span className="label">{t('form.labels.rehbar')}</span>
                    <input
                      className={`input ${errors.rehbar ? 'border-red-400' : ''}`}
                      value={form.rehbar}
                      onChange={(e) => updateField('rehbar', sanitizeFormField('rehbar', e.target.value))}
                      maxLength={40}
                    />
                    <FieldError message={errors.rehbar} />
                  </label>
                </div>
              </FormSection>

              <AddressFieldsBlock
                form={form}
                errors={errors}
                updateField={updateField}
                setForm={setForm}
                onCountryChange={handleCountryChange}
                idPrefix="adminSub"
                showSectionTitle
              />

              <FormSection title={t('admin.manualSubscription.plan')}>
                <div className="grid gap-3 sm:grid-cols-2">
                  {[
                    { value: 'yearly', label: t('admin.oneYear') },
                    { value: 'five_year', label: t('admin.fiveYear') }
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold transition ${
                        form.subscription === option.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-ink/10 bg-white text-ink hover:border-primary/40'
                      }`}
                    >
                      <input
                        type="radio"
                        className="sr-only"
                        name="adminSubscription"
                        value={option.value}
                        checked={form.subscription === option.value}
                        onChange={(e) => updateField('subscription', e.target.value)}
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
                <FieldError message={errors.subscription} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">{t('form.labels.anandSandesh')}</span>
                    <select
                      className="input"
                      value={form.anandSandesh}
                      onChange={(e) => updateField('anandSandesh', e.target.value)}
                    >
                      <option value="">{t('admin.filterAll')}</option>
                      <option value="hindi">{t('common.hindi')}</option>
                      <option value="english">{t('common.english')}</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="label">{t('admin.manualSubscription.startDate')}</span>
                    <input
                      className="input"
                      type="date"
                      value={form.startDate}
                      onChange={(e) => updateField('startDate', e.target.value)}
                    />
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="label">
                      {t('admin.manualSubscription.amount')}{' '}
                      <span className="font-normal text-muted">({t('admin.manualSubscription.optional')})</span>
                    </span>
                    <input
                      className={`input ${errors.subsAmount ? 'border-red-400' : ''}`}
                      type="number"
                      min="0"
                      step="1"
                      value={form.subsAmount}
                      onChange={(e) => updateField('subsAmount', e.target.value)}
                    />
                    <FieldError message={errors.subsAmount} />
                  </label>
                  <label className="block">
                    <span className="label">
                      {t('admin.manualSubscription.receiptNo')}{' '}
                      <span className="font-normal text-muted">({t('admin.manualSubscription.optional')})</span>
                    </span>
                    <input
                      className="input"
                      value={form.receiptNo}
                      onChange={(e) => updateField('receiptNo', e.target.value)}
                    />
                  </label>
                </div>
              </FormSection>
            </div>

            <footer className="flex shrink-0 flex-wrap gap-2 border-t border-ink/10 bg-white px-4 py-4 sm:px-5">
              <button className="btn-primary inline-flex min-h-11 flex-1 items-center justify-center gap-2 sm:flex-none" type="submit" disabled={saving}>
                {saving ? <InlineLoader size={18} /> : null}
                {saving ? t('admin.manualSubscription.saving') : t('admin.manualSubscription.save')}
              </button>
              <button className="btn-secondary min-h-11 flex-1 sm:flex-none" type="button" onClick={handleClose} disabled={saving}>
                {t('common.cancel')}
              </button>
            </footer>
          </form>
        )}

        {createdNo ? (
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
