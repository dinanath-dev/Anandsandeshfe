import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPin } from 'lucide-react';
import DonationFormRow from './DonationFormRow.jsx';
import { COUNTRIES, DEFAULT_COUNTRY, isIndiaCountry } from '../data/countries.js';
import { INDIAN_STATES } from '../data/indianStates.js';
import { getDistrictsForIndianState, matchIndianDistrict } from '../data/indianDistricts.js';
import { lookupIndianPincode } from '../utils/lookupIndianPincode.js';
import { sanitizeNationalMobile } from '../utils/mobileNumber.js';
import { sanitizeFormField, maxLengthForField } from '../utils/formFieldValidation.js';
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
  const [postOfficeOptions, setPostOfficeOptions] = useState([]);
  const lookupSeq = useRef(0);
  const india = isIndiaCountry(form.country || DEFAULT_COUNTRY);
  const districtOptions = india ? getDistrictsForIndianState(form.state) : [];

  async function runPinLookup(pin) {
    const digits = String(pin || '').replace(/\D/g, '');
    if (!india || digits.length !== 6) return;

    const seq = ++lookupSeq.current;
    setPinLookup('loading');
    try {
      const result = await lookupIndianPincode(digits);
      if (lookupSeq.current !== seq) return;
      if (!result) {
        setPostOfficeOptions([]);
        setPinLookup('notFound');
        return;
      }
      setPostOfficeOptions(result.postOffices || []);
      setForm((current) => {
        const nextState = result.state || current.state;
        const next = {
          ...current,
          town: result.town || current.town,
          state: nextState,
          district: matchIndianDistrict(nextState, result.district || current.district)
        };
        const offices = result.postOffices || [];
        const currentPostOffice = String(current.postOffice || '').trim();
        if (currentPostOffice && offices.includes(currentPostOffice)) {
          return next;
        }
        if (offices.length === 1) {
          next.postOffice = offices[0];
        } else if (!currentPostOffice && result.defaultPostOffice) {
          next.postOffice = result.defaultPostOffice;
        } else if (currentPostOffice && offices.length > 0 && !offices.includes(currentPostOffice)) {
          next.postOffice = '';
        }
        return next;
      });
      setPinLookup('success');
    } catch {
      if (lookupSeq.current === seq) {
        setPostOfficeOptions([]);
        setPinLookup('error');
      }
    }
  }

  useEffect(() => {
    if (!india) {
      setPinLookup('idle');
      setPostOfficeOptions([]);
      return undefined;
    }

    const pin = String(form.pin || '').replace(/\D/g, '');
    if (pin.length !== 6) {
      setPinLookup('idle');
      setPostOfficeOptions([]);
      return undefined;
    }

    const timer = window.setTimeout(() => runPinLookup(pin), 500);
    return () => window.clearTimeout(timer);
  }, [form.pin, india, setForm]);

  useEffect(() => {
    setPinLookup('idle');
    setPostOfficeOptions([]);
  }, [form.country]);

  function handleCountryChange(value) {
    if (onCountryChange) {
      onCountryChange(value);
      setPinLookup('idle');
      setPostOfficeOptions([]);
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

  function handleFieldChange(field, raw) {
    updateField(field, sanitizeFormField(field, raw));
  }

  function handleStateChange(value) {
    setForm((current) => {
      const districts = getDistrictsForIndianState(value);
      const currentDistrict = String(current.district || '').trim();
      let district = currentDistrict;
      if (districts.length > 0) {
        district = districts.includes(currentDistrict)
          ? currentDistrict
          : matchIndianDistrict(value, currentDistrict);
        if (!districts.includes(district)) district = '';
      }
      return { ...current, state: value, district };
    });
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
            onChange={(e) => handleFieldChange('houseNo', e.target.value)}
            maxLength={maxLengthForField('houseNo')}
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
            onChange={(e) => handleFieldChange('street', e.target.value)}
            maxLength={maxLengthForField('street')}
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
            onChange={(e) => handleFieldChange('area', e.target.value)}
            maxLength={maxLengthForField('area')}
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
            onChange={(e) => handleFieldChange('landmark', e.target.value)}
            maxLength={maxLengthForField('landmark')}
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
          {india && postOfficeOptions.length > 0 ? (
            <select
              id={`${idPrefix}-post-office`}
              className={inputClass('postOffice', errors)}
              value={form.postOffice}
              onChange={(e) => handleFieldChange('postOffice', e.target.value)}
            >
              <option value="">{t('form.placeholders.selectPostOffice')}</option>
              {postOfficeOptions.map((office) => (
                <option key={office} value={office}>
                  {office}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${idPrefix}-post-office`}
              className={inputClass('postOffice', errors)}
              value={form.postOffice}
              onChange={(e) => handleFieldChange('postOffice', e.target.value)}
              maxLength={maxLengthForField('postOffice')}
              placeholder={t('form.placeholders.postOffice')}
            />
          )}
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
            onChange={(e) => handleFieldChange('town', e.target.value)}
            maxLength={maxLengthForField('town')}
            placeholder={t('form.placeholders.town')}
            autoComplete="address-level2"
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
              onChange={(e) => handleStateChange(e.target.value)}
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
              onChange={(e) => handleFieldChange('state', e.target.value)}
              maxLength={maxLengthForField('state')}
              placeholder={t('form.placeholders.stateProvince')}
              autoComplete="address-level1"
            />
          )}
        </DonationFormRow>

        <DonationFormRow
          className="donation-form-address-grid__span-4"
          label={t('form.labels.district')}
          required
          error={errors.district}
          labelFor={`${idPrefix}-district`}
        >
          {india && form.state && districtOptions.length > 0 ? (
            <select
              id={`${idPrefix}-district`}
              className={inputClass('district', errors)}
              value={form.district}
              onChange={(e) => handleFieldChange('district', e.target.value)}
            >
              <option value="">{t('form.placeholders.selectDistrict')}</option>
              {districtOptions.map((district) => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={`${idPrefix}-district`}
              className={inputClass('district', errors)}
              value={form.district}
              onChange={(e) => handleFieldChange('district', e.target.value)}
              maxLength={maxLengthForField('district')}
              placeholder={
                india && !form.state
                  ? t('form.placeholders.selectStateFirst')
                  : t('form.placeholders.district')
              }
              autoComplete="address-level3"
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
