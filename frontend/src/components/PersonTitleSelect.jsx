import { PERSON_TITLE_OPTIONS } from '../constants/personTitles.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function PersonTitleSelect({ id, value, onChange, className = '', invalid = false }) {
  const { t } = useTranslation();
  const cls = ['donation-input', invalid ? 'donation-input--invalid' : '', className].filter(Boolean).join(' ');

  return (
    <select id={id} className={cls} value={value} onChange={onChange} autoComplete="honorific-prefix">
      {PERSON_TITLE_OPTIONS.map((opt) => (
        <option key={opt.value || '__none'} value={opt.value}>
          {t(opt.labelKey)}
        </option>
      ))}
    </select>
  );
}
