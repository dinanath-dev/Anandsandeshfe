import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import DonationFormRow from './DonationFormRow.jsx';
import { COUNTRIES, DEFAULT_COUNTRY, isIndiaCountry } from '../data/countries.js';
import { INDIAN_STATES } from '../data/indianStates.js';
import { lookupIndianPincode } from '../utils/lookupIndianPincode.js';
import { sanitizeNationalMobile } from '../utils/mobileNumber.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

function inputClass(field, errors) {
  return `donation-input ${errors[field] ? 'donation-input--invalid' : ''}`;
}

/**
 * Postal address: house → street → area → landmark → pin → post office →
 * town → district → state → country
 */
export default function AddressFieldsBlock({
  form,
  errors,
  updateField,
  setForm,
  onCountryChange,
  idPrefix = 'addr',
  showSectionTitle = true
}) {
  const { t } = useTranslation();
  const [pinLookup, setPinLookup] = useState('idle');
  const lookupSeq = useRef(0);
  const india = isIndiaCountry(form.country || DEFAULT_COUNTRY);

  async function runPinLookup(pin) {
    const digits = String(pin || '').replace(/\D/g, '');
    if (!india || digits.length !== 6) return;

    const seq = ++lookupSeq.current;
    setPinLookup('loading');
    try {
      const result = await lookupIndianPincode(digits);
      if (lookupSeq.current !== seq) return;
      if (!result) {
        setPinLookup('notFound');
        return;
      }
      setForm((current) => ({
        ...current,
        town: result.town || current.town,
        district: result.district || current.district,
        state: result.state || current.state
      }));
      setPinLookup('success');
    } catch {
      if (lookupSeq.current === seq) setPinLookup('error');
    }
  }

  useEffect(() => {
    if (!india) {
      setPinLookup('idle');
      return undefined;
    }

    const pin = String(form.pin || '').replace(/\D/g, '');
    if (pin.length !== 6) {
      setPinLookup('idle');
      return undefined;
    }

    const timer = window.setTimeout(() => runPinLookup(pin), 500);
    return () => window.clearTimeout(timer);
  }, [form.pin, india, setForm]);

  useEffect(() => {
    setPinLookup('idle');
  }, [form.country]);

  function handleCountryChange(value) {
    if (onCountryChange) {
      onCountryChange(value);
      setPinLookup('idle');
      return;
    }
    updateField('country', value);
    const trimmedPin = isIndiaCountry(value)
      ? String(form.pin || '').replace(/\D/g, '').slice(0, 6)
      : String(form.pin || '').replace(/\s/g, '').slice(0, 10);
    setForm((current) => ({
      ...current,
      country: value,
      pin: trimmedPin,
      mobile: sanitizeNationalMobile(current.mobile, value)
    }));
    setPinLookup('idle');
  }

  function handlePinChange(raw) {
    const next = india ? raw.replace(/\D/g, '').slice(0, 6) : raw.replace(/\s/g, '').slice(0, 10);
    updateField('pin', next);
    if (pinLookup === 'success' || pinLookup === 'notFound' || pinLookup === 'error') {
      setPinLookup('idle');
    }
  }

  const pinHint =
    pinLookup === 'loading'
      ? t('form.pinLookupLoading')
      : pinLookup === 'success'
        ? t('form.pinLookupSuccess')
        : pinLookup === 'notFound'
          ? t('form.pinLookupNotFound')
          : pinLookup === 'error'
            ? t('form.pinLookupError')
            : india
              ? t('form.pinLookupHintIndia')
              : t('form.pinLookupHint');

  return (
    <section
      className={`donation-form-section donation-form-section--teal ${showSectionTitle ? '' : 'donation-form-section--embedded'}`.trim()}
      aria-labelledby={showSectionTitle ? `${idPrefix}-address-heading` : undefined}
    >
      {showSectionTitle ? (
        <h2 id={`${idPrefix}-address-heading`} className="donation-form-section-title">
          {t('form.addressSectionTitle')}
        </h2>
      ) : null}

      <div className="donation-form-address-grid">
        <DonationFormRow
          className="donation-form-address-grid__span-6"
          label={t('form.labels.houseNo')}
          required
          error={errors.houseNo}
          labelFor={`${idPrefix}-house-no`}
        >
          <input
            id={`${idPrefix}-house-no`}
            className={inputClass('houseNo', errors)}
            value={form.houseNo}
            onChange={(e) => updateField('houseNo', e.target.value)}
            placeholder={t('form.placeholders.houseNo')}
            autoComplete="address-line1"
          />
        </DonationFormRow>

        <DonationFormRow
          className="donation-form-address-grid__span-6"
          label={t('form.labels.street')}
          required
          error={errors.street}
          labelFor={`${idPrefix}-street`}
        >
          <input
            id={`${idPrefix}-street`}
            className={inputClass('street', errors)}
            value={form.street}
            onChange={(e) => updateField('street', e.target.value)}
            placeholder={t('form.placeholders.street')}
            autoComplete="address-line2"
          />
        </DonationFormRow>

        <DonationFormRow
          className="donation-form-address-grid__span-6"
          label={t('form.labels.area')}
          required
          error={errors.area}
          labelFor={`${idPrefix}-area`}
        >
          <input
            id={`${idPrefix}-area`}
            className={inputClass('area', errors)}
            value={form.area}
            onChange={(e) => updateField('area', e.target.value)}
            placeholder={t('form.placeholders.area')}
            autoComplete="address-line3"
          />
        </DonationFormRow>

        <DonationFormRow
          className="donation-form-address-grid__span-6"
          label={t('form.labels.landmark')}
          optional={t('common.optional')}
          error={errors.landmark}
          labelFor={`${idPrefix}-landmark`}
        >
          <input
            id={`${idPrefix}-landmark`}
            className={inputClass('landmark', errors)}
            value={form.landmark}
            onChange={(e) => updateField('landmark', e.target.value)}
            placeholder={t('form.placeholders.landmark')}
          />
        </DonationFormRow>

        <DonationFormRow
          className="donation-form-address-grid__span-4"
          label={india ? t('form.labels.pin') : t('form.labels.pinPostal')}
          required
          error={errors.pin}
          labelFor={`${idPrefix}-pin`}
        >
          <div className="relative">
            <MapPin
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#009688]/55"
              aria-hidden
            />
            <input
              id={`${idPrefix}-pin`}
              className={`${inputClass('pin', errors)} donation-input--with-icon`}
              inputMode={india ? 'numeric' : 'text'}
              maxLength={india ? 6 : 10}
              value={form.pin}
              onChange={(e) => handlePinChange(e.target.value)}
              placeholder={india ? t('form.placeholders.pinIndia') : t('form.placeholders.pin')}
              autoComplete="postal-code"
            />
            {pinLookup === 'loading' ? (
              <Loader2
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[#009688]/70"
                aria-hidden
              />
            ) : null}
          </div>
          <p
            className={`pincode-lookup-hint ${pinLookup === 'success' ? 'pincode-lookup-hint--success' : ''} ${pinLookup === 'notFound' || pinLookup === 'error' ? 'pincode-lookup-hint--warn' : ''}`}
            aria-live="polite"
          >
            {pinHint}
          </p>
        </DonationFormRow>

        <DonationFormRow
          className="donation-form-address-grid__span-8"
          label={t('form.labels.postOffice')}
          required
          error={errors.postOffice}
          labelFor={`${idPrefix}-post-office`}
        >
          <input
            id={`${idPrefix}-post-office`}
            className={inputClass('postOffice', errors)}
            value={form.postOffice}
            onChange={(e) => updateField('postOffice', e.target.value)}
            placeholder={t('form.placeholders.postOffice')}
          />
        </DonationFormRow>

        <hr className="donation-form-address-divider" aria-hidden />

        <DonationFormRow
          className="donation-form-address-grid__span-4"
          label={t('form.labels.town')}
          required
          error={errors.town}
          labelFor={`${idPrefix}-town`}
        >
          <input
            id={`${idPrefix}-town`}
            className={inputClass('town', errors)}
            value={form.town}
            onChange={(e) => updateField('town', e.target.value)}
            placeholder={t('form.placeholders.town')}
            autoComplete="address-level2"
          />
        </DonationFormRow>

        <DonationFormRow
          className="donation-form-address-grid__span-4"
          label={t('form.labels.district')}
          required
          error={errors.district}
          labelFor={`${idPrefix}-district`}
        >
          <input
            id={`${idPrefix}-district`}
            className={inputClass('district', errors)}
            value={form.district}
            onChange={(e) => updateField('district', e.target.value)}
            placeholder={t('form.placeholders.district')}
            autoComplete="address-level3"
          />
        </DonationFormRow>

        <DonationFormRow
          className="donation-form-address-grid__span-4"
          label={india ? t('form.labels.state') : t('form.labels.stateProvince')}
          required
          error={errors.state}
          labelFor={`${idPrefix}-state`}
        >
          {india ? (
            <select
              id={`${idPrefix}-state`}
              className={inputClass('state', errors)}
              value={form.state}
              onChange={(e) => updateField('state', e.target.value)}
            >
              <option value="">{t('form.placeholders.selectState')}</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${idPrefix}-state`}
              className={inputClass('state', errors)}
              value={form.state}
              onChange={(e) => updateField('state', e.target.value)}
              placeholder={t('form.placeholders.stateProvince')}
              autoComplete="address-level1"
            />
          )}
        </DonationFormRow>

        <DonationFormRow
          className="donation-form-address-grid__span-6"
          label={t('form.labels.country')}
          required
          error={errors.country}
          labelFor={`${idPrefix}-country`}
        >
          <select
            id={`${idPrefix}-country`}
            className={inputClass('country', errors)}
            value={form.country || DEFAULT_COUNTRY}
            onChange={(e) => handleCountryChange(e.target.value)}
          >
            <option value="">{t('form.placeholders.selectCountry')}</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </DonationFormRow>
      </div>
    </section>
  );
}
