import {
  getDialCode,
  mobileHintForCountry,
  PHONE_COUNTRY_OPTIONS,
  sanitizeNationalMobile
} from '../utils/mobileNumber.js';
import { DEFAULT_COUNTRY } from '../data/countries.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

function inputClass(field, errors) {
  return `donation-input ${errors[field] ? 'donation-input--invalid' : ''}`;
}

/** Mobile input with selectable country code — syncs postal address country. */
export default function MobileNumberField({
  id,
  country,
  onCountryChange,
  value,
  onChange,
  errors = {},
  hint = true
}) {
  const { t } = useTranslation();
  const selectedCountry = country || DEFAULT_COUNTRY;
  const hintText = hint ? mobileHintForCountry(selectedCountry, t) : '';

  return (
    <div>
      <div className="donation-phone-input">
        <select
          className="donation-phone-prefix-select"
          value={selectedCountry}
          onChange={(e) => onCountryChange?.(e.target.value)}
          aria-label={t('form.mobileCountryCodeLabel')}
          title={t('form.mobileCountryCodeLabel')}
        >
          {PHONE_COUNTRY_OPTIONS.map(({ country: c, dialCode: code }) => (
            <option key={c} value={c}>
              +{code}
            </option>
          ))}
        </select>
        <input
          id={id}
          className={`${inputClass('mobile', errors)} donation-phone-number`}
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(sanitizeNationalMobile(e.target.value, selectedCountry))}
          autoComplete="tel-national"
          aria-describedby={hint ? `${id}-hint` : undefined}
          placeholder={t('form.placeholders.mobileNational')}
        />
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="donation-field-hint">
          {hintText}
        </p>
      ) : null}
    </div>
  );
}
