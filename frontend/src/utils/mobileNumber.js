import { COUNTRIES, DEFAULT_COUNTRY, isIndiaCountry } from '../data/countries.js';

/** ITU dial codes and national number length bounds per country name. */
export const COUNTRY_DIAL_CODES = {
  India: { dialCode: '91', minLength: 10, maxLength: 10, pattern: /^[6-9]\d{9}$/ },
  Afghanistan: { dialCode: '93', minLength: 9, maxLength: 9 },
  Albania: { dialCode: '355', minLength: 8, maxLength: 9 },
  Algeria: { dialCode: '213', minLength: 8, maxLength: 9 },
  Andorra: { dialCode: '376', minLength: 6, maxLength: 9 },
  Angola: { dialCode: '244', minLength: 9, maxLength: 9 },
  'Antigua and Barbuda': { dialCode: '1', minLength: 10, maxLength: 10 },
  Argentina: { dialCode: '54', minLength: 10, maxLength: 10 },
  Armenia: { dialCode: '374', minLength: 8, maxLength: 8 },
  Australia: { dialCode: '61', minLength: 9, maxLength: 9 },
  Austria: { dialCode: '43', minLength: 10, maxLength: 13 },
  Azerbaijan: { dialCode: '994', minLength: 9, maxLength: 9 },
  Bahamas: { dialCode: '1', minLength: 10, maxLength: 10 },
  Bahrain: { dialCode: '973', minLength: 8, maxLength: 8 },
  Bangladesh: { dialCode: '880', minLength: 10, maxLength: 10 },
  Barbados: { dialCode: '1', minLength: 10, maxLength: 10 },
  Belarus: { dialCode: '375', minLength: 9, maxLength: 9 },
  Belgium: { dialCode: '32', minLength: 8, maxLength: 9 },
  Belize: { dialCode: '501', minLength: 7, maxLength: 7 },
  Benin: { dialCode: '229', minLength: 8, maxLength: 8 },
  Bhutan: { dialCode: '975', minLength: 8, maxLength: 8 },
  Bolivia: { dialCode: '591', minLength: 8, maxLength: 8 },
  'Bosnia and Herzegovina': { dialCode: '387', minLength: 8, maxLength: 8 },
  Botswana: { dialCode: '267', minLength: 7, maxLength: 8 },
  Brazil: { dialCode: '55', minLength: 10, maxLength: 11 },
  Brunei: { dialCode: '673', minLength: 7, maxLength: 7 },
  Bulgaria: { dialCode: '359', minLength: 8, maxLength: 9 },
  'Burkina Faso': { dialCode: '226', minLength: 8, maxLength: 8 },
  Burundi: { dialCode: '257', minLength: 8, maxLength: 8 },
  Cambodia: { dialCode: '855', minLength: 8, maxLength: 9 },
  Cameroon: { dialCode: '237', minLength: 9, maxLength: 9 },
  Canada: { dialCode: '1', minLength: 10, maxLength: 10 },
  'Cape Verde': { dialCode: '238', minLength: 7, maxLength: 7 },
  'Central African Republic': { dialCode: '236', minLength: 8, maxLength: 8 },
  Chad: { dialCode: '235', minLength: 8, maxLength: 8 },
  Chile: { dialCode: '56', minLength: 9, maxLength: 9 },
  China: { dialCode: '86', minLength: 11, maxLength: 11 },
  Colombia: { dialCode: '57', minLength: 10, maxLength: 10 },
  Comoros: { dialCode: '269', minLength: 7, maxLength: 7 },
  Congo: { dialCode: '242', minLength: 9, maxLength: 9 },
  'Costa Rica': { dialCode: '506', minLength: 8, maxLength: 8 },
  Croatia: { dialCode: '385', minLength: 8, maxLength: 9 },
  Cuba: { dialCode: '53', minLength: 8, maxLength: 8 },
  Cyprus: { dialCode: '357', minLength: 8, maxLength: 8 },
  'Czech Republic': { dialCode: '420', minLength: 9, maxLength: 9 },
  Denmark: { dialCode: '45', minLength: 8, maxLength: 8 },
  Djibouti: { dialCode: '253', minLength: 8, maxLength: 8 },
  Dominica: { dialCode: '1', minLength: 10, maxLength: 10 },
  'Dominican Republic': { dialCode: '1', minLength: 10, maxLength: 10 },
  Ecuador: { dialCode: '593', minLength: 9, maxLength: 9 },
  Egypt: { dialCode: '20', minLength: 10, maxLength: 10 },
  'El Salvador': { dialCode: '503', minLength: 8, maxLength: 8 },
  'Equatorial Guinea': { dialCode: '240', minLength: 9, maxLength: 9 },
  Eritrea: { dialCode: '291', minLength: 7, maxLength: 7 },
  Estonia: { dialCode: '372', minLength: 7, maxLength: 8 },
  Eswatini: { dialCode: '268', minLength: 8, maxLength: 8 },
  Ethiopia: { dialCode: '251', minLength: 9, maxLength: 9 },
  Fiji: { dialCode: '679', minLength: 7, maxLength: 7 },
  Finland: { dialCode: '358', minLength: 9, maxLength: 10 },
  France: { dialCode: '33', minLength: 9, maxLength: 9 },
  Gabon: { dialCode: '241', minLength: 7, maxLength: 8 },
  Gambia: { dialCode: '220', minLength: 7, maxLength: 7 },
  Georgia: { dialCode: '995', minLength: 9, maxLength: 9 },
  Germany: { dialCode: '49', minLength: 10, maxLength: 11 },
  Ghana: { dialCode: '233', minLength: 9, maxLength: 9 },
  Greece: { dialCode: '30', minLength: 10, maxLength: 10 },
  Grenada: { dialCode: '1', minLength: 10, maxLength: 10 },
  Guatemala: { dialCode: '502', minLength: 8, maxLength: 8 },
  Guinea: { dialCode: '224', minLength: 9, maxLength: 9 },
  'Guinea-Bissau': { dialCode: '245', minLength: 7, maxLength: 7 },
  Guyana: { dialCode: '592', minLength: 7, maxLength: 7 },
  Haiti: { dialCode: '509', minLength: 8, maxLength: 8 },
  Honduras: { dialCode: '504', minLength: 8, maxLength: 8 },
  Hungary: { dialCode: '36', minLength: 9, maxLength: 9 },
  Iceland: { dialCode: '354', minLength: 7, maxLength: 7 },
  Indonesia: { dialCode: '62', minLength: 9, maxLength: 11 },
  Iran: { dialCode: '98', minLength: 10, maxLength: 10 },
  Iraq: { dialCode: '964', minLength: 10, maxLength: 10 },
  Ireland: { dialCode: '353', minLength: 9, maxLength: 9 },
  Israel: { dialCode: '972', minLength: 9, maxLength: 9 },
  Italy: { dialCode: '39', minLength: 9, maxLength: 10 },
  Jamaica: { dialCode: '1', minLength: 10, maxLength: 10 },
  Japan: { dialCode: '81', minLength: 10, maxLength: 10 },
  Jordan: { dialCode: '962', minLength: 9, maxLength: 9 },
  Kazakhstan: { dialCode: '7', minLength: 10, maxLength: 10 },
  Kenya: { dialCode: '254', minLength: 9, maxLength: 9 },
  Kiribati: { dialCode: '686', minLength: 5, maxLength: 8 },
  Kuwait: { dialCode: '965', minLength: 8, maxLength: 8 },
  Kyrgyzstan: { dialCode: '996', minLength: 9, maxLength: 9 },
  Laos: { dialCode: '856', minLength: 8, maxLength: 10 },
  Latvia: { dialCode: '371', minLength: 8, maxLength: 8 },
  Lebanon: { dialCode: '961', minLength: 7, maxLength: 8 },
  Lesotho: { dialCode: '266', minLength: 8, maxLength: 8 },
  Liberia: { dialCode: '231', minLength: 7, maxLength: 8 },
  Libya: { dialCode: '218', minLength: 9, maxLength: 9 },
  Liechtenstein: { dialCode: '423', minLength: 7, maxLength: 9 },
  Lithuania: { dialCode: '370', minLength: 8, maxLength: 8 },
  Luxembourg: { dialCode: '352', minLength: 8, maxLength: 9 },
  Madagascar: { dialCode: '261', minLength: 9, maxLength: 9 },
  Malawi: { dialCode: '265', minLength: 9, maxLength: 9 },
  Malaysia: { dialCode: '60', minLength: 9, maxLength: 10 },
  Maldives: { dialCode: '960', minLength: 7, maxLength: 7 },
  Mali: { dialCode: '223', minLength: 8, maxLength: 8 },
  Malta: { dialCode: '356', minLength: 8, maxLength: 8 },
  'Marshall Islands': { dialCode: '692', minLength: 7, maxLength: 7 },
  Mauritania: { dialCode: '222', minLength: 8, maxLength: 8 },
  Mauritius: { dialCode: '230', minLength: 8, maxLength: 8 },
  Mexico: { dialCode: '52', minLength: 10, maxLength: 10 },
  Micronesia: { dialCode: '691', minLength: 7, maxLength: 7 },
  Moldova: { dialCode: '373', minLength: 8, maxLength: 8 },
  Monaco: { dialCode: '377', minLength: 8, maxLength: 9 },
  Mongolia: { dialCode: '976', minLength: 8, maxLength: 8 },
  Montenegro: { dialCode: '382', minLength: 8, maxLength: 8 },
  Morocco: { dialCode: '212', minLength: 9, maxLength: 9 },
  Mozambique: { dialCode: '258', minLength: 9, maxLength: 9 },
  Myanmar: { dialCode: '95', minLength: 8, maxLength: 10 },
  Namibia: { dialCode: '264', minLength: 9, maxLength: 9 },
  Nauru: { dialCode: '674', minLength: 7, maxLength: 7 },
  Nepal: { dialCode: '977', minLength: 10, maxLength: 10 },
  Netherlands: { dialCode: '31', minLength: 9, maxLength: 9 },
  'New Zealand': { dialCode: '64', minLength: 8, maxLength: 10 },
  Nicaragua: { dialCode: '505', minLength: 8, maxLength: 8 },
  Niger: { dialCode: '227', minLength: 8, maxLength: 8 },
  Nigeria: { dialCode: '234', minLength: 10, maxLength: 10 },
  'North Korea': { dialCode: '850', minLength: 8, maxLength: 10 },
  'North Macedonia': { dialCode: '389', minLength: 8, maxLength: 8 },
  Norway: { dialCode: '47', minLength: 8, maxLength: 8 },
  Oman: { dialCode: '968', minLength: 8, maxLength: 8 },
  Pakistan: { dialCode: '92', minLength: 10, maxLength: 10 },
  Palau: { dialCode: '680', minLength: 7, maxLength: 7 },
  Palestine: { dialCode: '970', minLength: 9, maxLength: 9 },
  Panama: { dialCode: '507', minLength: 8, maxLength: 8 },
  'Papua New Guinea': { dialCode: '675', minLength: 8, maxLength: 8 },
  Paraguay: { dialCode: '595', minLength: 9, maxLength: 9 },
  Peru: { dialCode: '51', minLength: 9, maxLength: 9 },
  Philippines: { dialCode: '63', minLength: 10, maxLength: 10 },
  Poland: { dialCode: '48', minLength: 9, maxLength: 9 },
  Portugal: { dialCode: '351', minLength: 9, maxLength: 9 },
  Qatar: { dialCode: '974', minLength: 8, maxLength: 8 },
  Romania: { dialCode: '40', minLength: 9, maxLength: 9 },
  Russia: { dialCode: '7', minLength: 10, maxLength: 10 },
  Rwanda: { dialCode: '250', minLength: 9, maxLength: 9 },
  'Saint Kitts and Nevis': { dialCode: '1', minLength: 10, maxLength: 10 },
  'Saint Lucia': { dialCode: '1', minLength: 10, maxLength: 10 },
  'Saint Vincent and the Grenadines': { dialCode: '1', minLength: 10, maxLength: 10 },
  Samoa: { dialCode: '685', minLength: 5, maxLength: 7 },
  'San Marino': { dialCode: '378', minLength: 6, maxLength: 10 },
  'Sao Tome and Principe': { dialCode: '239', minLength: 7, maxLength: 7 },
  'Saudi Arabia': { dialCode: '966', minLength: 9, maxLength: 9 },
  Senegal: { dialCode: '221', minLength: 9, maxLength: 9 },
  Serbia: { dialCode: '381', minLength: 8, maxLength: 9 },
  Seychelles: { dialCode: '248', minLength: 7, maxLength: 7 },
  'Sierra Leone': { dialCode: '232', minLength: 8, maxLength: 8 },
  Singapore: { dialCode: '65', minLength: 8, maxLength: 8 },
  Slovakia: { dialCode: '421', minLength: 9, maxLength: 9 },
  Slovenia: { dialCode: '386', minLength: 8, maxLength: 8 },
  'Solomon Islands': { dialCode: '677', minLength: 5, maxLength: 7 },
  Somalia: { dialCode: '252', minLength: 8, maxLength: 8 },
  'South Africa': { dialCode: '27', minLength: 9, maxLength: 9 },
  'South Korea': { dialCode: '82', minLength: 9, maxLength: 10 },
  'South Sudan': { dialCode: '211', minLength: 9, maxLength: 9 },
  Spain: { dialCode: '34', minLength: 9, maxLength: 9 },
  'Sri Lanka': { dialCode: '94', minLength: 9, maxLength: 9 },
  Sudan: { dialCode: '249', minLength: 9, maxLength: 9 },
  Suriname: { dialCode: '597', minLength: 7, maxLength: 7 },
  Sweden: { dialCode: '46', minLength: 9, maxLength: 9 },
  Switzerland: { dialCode: '41', minLength: 9, maxLength: 9 },
  Syria: { dialCode: '963', minLength: 9, maxLength: 9 },
  Taiwan: { dialCode: '886', minLength: 9, maxLength: 9 },
  Tajikistan: { dialCode: '992', minLength: 9, maxLength: 9 },
  Tanzania: { dialCode: '255', minLength: 9, maxLength: 9 },
  Thailand: { dialCode: '66', minLength: 9, maxLength: 9 },
  'Timor-Leste': { dialCode: '670', minLength: 8, maxLength: 8 },
  Togo: { dialCode: '228', minLength: 8, maxLength: 8 },
  Tonga: { dialCode: '676', minLength: 5, maxLength: 7 },
  'Trinidad and Tobago': { dialCode: '1', minLength: 10, maxLength: 10 },
  Tunisia: { dialCode: '216', minLength: 8, maxLength: 8 },
  Turkey: { dialCode: '90', minLength: 10, maxLength: 10 },
  Turkmenistan: { dialCode: '993', minLength: 8, maxLength: 8 },
  Tuvalu: { dialCode: '688', minLength: 5, maxLength: 6 },
  Uganda: { dialCode: '256', minLength: 9, maxLength: 9 },
  Ukraine: { dialCode: '380', minLength: 9, maxLength: 9 },
  'United Arab Emirates': { dialCode: '971', minLength: 9, maxLength: 9 },
  'United Kingdom': { dialCode: '44', minLength: 10, maxLength: 10 },
  'United States': { dialCode: '1', minLength: 10, maxLength: 10 },
  Uruguay: { dialCode: '598', minLength: 8, maxLength: 8 },
  Uzbekistan: { dialCode: '998', minLength: 9, maxLength: 9 },
  Vanuatu: { dialCode: '678', minLength: 5, maxLength: 7 },
  'Vatican City': { dialCode: '39', minLength: 9, maxLength: 10 },
  Venezuela: { dialCode: '58', minLength: 10, maxLength: 10 },
  Vietnam: { dialCode: '84', minLength: 9, maxLength: 10 },
  Yemen: { dialCode: '967', minLength: 9, maxLength: 9 },
  Zambia: { dialCode: '260', minLength: 9, maxLength: 9 },
  Zimbabwe: { dialCode: '263', minLength: 9, maxLength: 9 }
};

const FALLBACK_PHONE = { dialCode: '91', minLength: 7, maxLength: 15 };

export function getPhoneConfig(country) {
  const name = String(country || DEFAULT_COUNTRY).trim() || DEFAULT_COUNTRY;
  return COUNTRY_DIAL_CODES[name] || FALLBACK_PHONE;
}

export function getDialCode(country) {
  return getPhoneConfig(country).dialCode;
}

export function sanitizeNationalMobile(raw, country) {
  const { maxLength } = getPhoneConfig(country);
  return String(raw || '').replace(/\D/g, '').slice(0, maxLength);
}

export function validateNationalMobile(national, country) {
  const digits = sanitizeNationalMobile(national, country);
  if (!digits) return { valid: false, reason: 'required' };

  const config = getPhoneConfig(country);
  if (digits.length < config.minLength || digits.length > config.maxLength) {
    return { valid: false, reason: 'length' };
  }
  if (config.pattern && !config.pattern.test(digits)) {
    return { valid: false, reason: 'pattern' };
  }
  return { valid: true, digits };
}

/** Split stored phone into national number for the form (India keeps 10-digit legacy rows). */
export function parseMobileFromStorage(stored, country) {
  const raw = String(stored || '').trim();
  if (!raw) return { national: '' };

  const config = getPhoneConfig(country);
  const digits = raw.replace(/\D/g, '');

  if (isIndiaCountry(country)) {
    if (digits.length >= 10) return { national: digits.slice(-10) };
    return { national: digits };
  }

  if (raw.startsWith('+')) {
    const dial = config.dialCode;
    if (digits.startsWith(dial)) return { national: digits.slice(dial.length) };
  }

  if (digits.startsWith(config.dialCode)) {
    return { national: digits.slice(config.dialCode.length) };
  }

  return { national: digits };
}

/** Value sent to API / stored in DB. */
export function formatMobileForApi(national, country) {
  const parsed = validateNationalMobile(national, country);
  if (!parsed.valid) return String(national || '').replace(/\D/g, '');

  if (isIndiaCountry(country)) return parsed.digits;
  const dial = getDialCode(country);
  return `+${dial}${parsed.digits}`;
}

export function mobileHintForCountry(country, t) {
  const config = getPhoneConfig(country);
  const base = isIndiaCountry(country)
    ? t('form.mobileHintIndia')
    : config.minLength === config.maxLength
      ? t('form.mobileHintFixed', { count: config.minLength })
      : t('form.mobileHintRange', { min: config.minLength, max: config.maxLength });
  return `${base} · ${t('form.mobileCountrySync')}`;
}

/** Dropdown options: country name + dial code for mobile field. */
export const PHONE_COUNTRY_OPTIONS = COUNTRIES.map((country) => ({
  country,
  dialCode: getDialCode(country)
}));

/** Sync country across mobile code, address, pin, and mobile validation. */
export function applyCountryToForm(current, country) {
  const value = String(country || DEFAULT_COUNTRY).trim() || DEFAULT_COUNTRY;
  return {
    ...current,
    country: value,
    pin: isIndiaCountry(value)
      ? String(current.pin || '').replace(/\D/g, '').slice(0, 6)
      : String(current.pin || '').replace(/\s/g, '').slice(0, 10),
    mobile: sanitizeNationalMobile(current.mobile, value)
  };
}
