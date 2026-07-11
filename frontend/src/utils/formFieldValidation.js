/**
 * UIDAI / Aadhaar-style field rules for Indian forms.
 * Allows Latin + Devanagari letters where names and place names are concerned.
 */

const LATIN = 'A-Za-z';
const DEVANAGARI = '\u0900-\u097F';
const LETTERS = `${LATIN}${DEVANAGARI}`;

export const FIELD_LIMITS = {
  personName: { min: 2, max: 30 },
  rehbar: { min: 2, max: 40 },
  careOf: { min: 2, max: 35 },
  houseNo: { min: 1, max: 25 },
  addressLine: { min: 2, max: 40 },
  placeName: { min: 2, max: 30 }
};

/** Per-form-field max length for HTML maxLength and validation messages. */
export const FIELD_MAX_LENGTH = {
  firstName: FIELD_LIMITS.personName.max,
  lastName: FIELD_LIMITS.personName.max,
  careOf: FIELD_LIMITS.careOf.max,
  rehbar: FIELD_LIMITS.rehbar.max,
  houseNo: FIELD_LIMITS.houseNo.max,
  street: FIELD_LIMITS.addressLine.max,
  area: FIELD_LIMITS.addressLine.max,
  landmark: FIELD_LIMITS.addressLine.max,
  town: FIELD_LIMITS.placeName.max,
  district: FIELD_LIMITS.placeName.max,
  postOffice: FIELD_LIMITS.placeName.max,
  state: FIELD_LIMITS.placeName.max
};

export function maxLengthForField(field) {
  return FIELD_MAX_LENGTH[field] ?? undefined;
}

const PERSON_NAME_RE = new RegExp(`^[${LETTERS}\\s.'-]+$`);
const HOUSE_NO_RE = new RegExp(`^[0-9${LETTERS}\\s.,#/()-]+$`);
const ADDRESS_LINE_RE = new RegExp(`^[0-9${LETTERS}\\s.,#/()-]+$`);
const PLACE_NAME_RE = new RegExp(`^[${LETTERS}\\s.-]+$`);
const HAS_LETTER_RE = new RegExp(`[${LETTERS}]`);

function collapseSpaces(value) {
  return String(value || '').replace(/\s{2,}/g, ' ');
}

export function sanitizePersonName(value) {
  return collapseSpaces(
    String(value || '')
      .replace(new RegExp(`[^${LETTERS}\\s.'-]`, 'g'), '')
      .slice(0, FIELD_LIMITS.personName.max)
  );
}

export function sanitizeRehbar(value) {
  return collapseSpaces(
    String(value || '')
      .replace(new RegExp(`[^${LETTERS}\\s.'-]`, 'g'), '')
      .slice(0, FIELD_LIMITS.rehbar.max)
  );
}

export function sanitizeCareOf(value) {
  return collapseSpaces(
    String(value || '')
      .replace(new RegExp(`[^${LETTERS}\\s.'-]`, 'g'), '')
      .slice(0, FIELD_LIMITS.careOf.max)
  );
}

export function sanitizeHouseNo(value) {
  return String(value || '')
    .replace(new RegExp(`[^0-9${LETTERS}\\s.,#/()-]`, 'g'), '')
    .slice(0, FIELD_LIMITS.houseNo.max);
}

export function sanitizeAddressLine(value) {
  return collapseSpaces(
    String(value || '')
      .replace(new RegExp(`[^0-9${LETTERS}\\s.,#/()-]`, 'g'), '')
      .slice(0, FIELD_LIMITS.addressLine.max)
  );
}

export function sanitizePlaceName(value) {
  return collapseSpaces(
    String(value || '')
      .replace(new RegExp(`[^${LETTERS}\\s.-]`, 'g'), '')
      .slice(0, FIELD_LIMITS.placeName.max)
  );
}

export const FIELD_SANITIZERS = {
  firstName: sanitizePersonName,
  lastName: sanitizePersonName,
  careOf: sanitizeCareOf,
  rehbar: sanitizeRehbar,
  houseNo: sanitizeHouseNo,
  street: sanitizeAddressLine,
  area: sanitizeAddressLine,
  landmark: sanitizeAddressLine,
  town: sanitizePlaceName,
  district: sanitizePlaceName,
  postOffice: sanitizePlaceName,
  state: sanitizePlaceName
};

export function sanitizeFormField(field, value) {
  const sanitizer = FIELD_SANITIZERS[field];
  return sanitizer ? sanitizer(value) : value;
}

function validatePersonNameValue(value, { required = true, min = FIELD_LIMITS.personName.min, max = FIELD_LIMITS.personName.max } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) {
    return required ? { valid: false, reason: 'required' } : { valid: true, value: '' };
  }
  if (trimmed.length < min) return { valid: false, reason: 'tooShort' };
  if (trimmed.length > max) return { valid: false, reason: 'tooLong' };
  if (!PERSON_NAME_RE.test(trimmed)) return { valid: false, reason: 'invalidChars' };
  if (!HAS_LETTER_RE.test(trimmed)) return { valid: false, reason: 'noLetter' };
  return { valid: true, value: trimmed };
}

function validateHouseNoValue(value, { required = true } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return required ? { valid: false, reason: 'required' } : { valid: true, value: '' };
  if (trimmed.length < FIELD_LIMITS.houseNo.min) return { valid: false, reason: 'tooShort' };
  if (trimmed.length > FIELD_LIMITS.houseNo.max) return { valid: false, reason: 'tooLong' };
  if (!HOUSE_NO_RE.test(trimmed)) return { valid: false, reason: 'invalidChars' };
  return { valid: true, value: trimmed };
}

function validateAddressLineValue(value, { required = true } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return required ? { valid: false, reason: 'required' } : { valid: true, value: '' };
  if (trimmed.length < FIELD_LIMITS.addressLine.min) return { valid: false, reason: 'tooShort' };
  if (trimmed.length > FIELD_LIMITS.addressLine.max) return { valid: false, reason: 'tooLong' };
  if (!ADDRESS_LINE_RE.test(trimmed)) return { valid: false, reason: 'invalidChars' };
  return { valid: true, value: trimmed };
}

function validatePlaceNameValue(value, { required = true } = {}) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return required ? { valid: false, reason: 'required' } : { valid: true, value: '' };
  if (trimmed.length < FIELD_LIMITS.placeName.min) return { valid: false, reason: 'tooShort' };
  if (trimmed.length > FIELD_LIMITS.placeName.max) return { valid: false, reason: 'tooLong' };
  if (!PLACE_NAME_RE.test(trimmed)) return { valid: false, reason: 'invalidChars' };
  if (!HAS_LETTER_RE.test(trimmed)) return { valid: false, reason: 'noLetter' };
  return { valid: true, value: trimmed };
}

function assignPersonNameError(errors, field, value, t, { requiredKey, invalidKey, tooLongKey, min = FIELD_LIMITS.personName.min, max = FIELD_LIMITS.personName.max }) {
  const result = validatePersonNameValue(value, { required: true, min, max });
  if (result.valid) return;
  if (result.reason === 'required') errors[field] = t(requiredKey);
  else if (result.reason === 'tooLong') errors[field] = t(tooLongKey, { max });
  else errors[field] = t(invalidKey);
}

function assignOptionalPersonNameError(errors, field, value, t, { invalidKey, tooLongKey, max = FIELD_LIMITS.careOf.max }) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return;
  const result = validatePersonNameValue(value, { required: false, min: FIELD_LIMITS.careOf.min, max });
  if (!result.valid) {
    errors[field] = result.reason === 'tooLong' ? t(tooLongKey, { max }) : t(invalidKey);
  }
}

function assignAddressLineError(errors, field, value, t, { requiredKey, invalidKey, tooLongKey }) {
  const result = validateAddressLineValue(value, { required: true });
  if (result.valid) return;
  if (result.reason === 'required') errors[field] = t(requiredKey);
  else if (result.reason === 'tooLong') errors[field] = t(tooLongKey, { max: FIELD_LIMITS.addressLine.max });
  else errors[field] = t(invalidKey);
}

function assignPlaceNameError(errors, field, value, t, { requiredKey, invalidKey, tooLongKey }) {
  const result = validatePlaceNameValue(value, { required: true });
  if (result.valid) return;
  if (result.reason === 'required') errors[field] = t(requiredKey);
  else if (result.reason === 'tooLong') errors[field] = t(tooLongKey, { max: FIELD_LIMITS.placeName.max });
  else errors[field] = t(invalidKey);
}

function assignOptionalAddressLineError(errors, field, value, t, { invalidKey, tooLongKey }) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return;
  const result = validateAddressLineValue(value, { required: false });
  if (!result.valid) {
    errors[field] =
      result.reason === 'tooLong' ? t(tooLongKey, { max: FIELD_LIMITS.addressLine.max }) : t(invalidKey);
  }
}

/** Shared address + person-name validation for subscription, books, and profile forms. */
export function validateIndianFormFields(form, t, { requireRehbar = false, requireAddress = true } = {}) {
  const errors = {};

  assignPersonNameError(errors, 'firstName', form.firstName, t, {
    requiredKey: 'form.errors.firstNameRequired',
    invalidKey: 'form.errors.firstNameInvalid',
    tooLongKey: 'form.errors.firstNameTooLong'
  });
  assignPersonNameError(errors, 'lastName', form.lastName, t, {
    requiredKey: 'form.errors.lastNameRequired',
    invalidKey: 'form.errors.lastNameInvalid',
    tooLongKey: 'form.errors.lastNameTooLong'
  });
  assignOptionalPersonNameError(errors, 'careOf', form.careOf, t, {
    invalidKey: 'form.errors.careOfInvalid',
    tooLongKey: 'form.errors.careOfTooLong'
  });

  if (requireRehbar) {
    const rehbarResult = validatePersonNameValue(form.rehbar, {
      required: true,
      min: FIELD_LIMITS.rehbar.min,
      max: FIELD_LIMITS.rehbar.max
    });
    if (!rehbarResult.valid) {
      if (rehbarResult.reason === 'required') errors.rehbar = t('form.errors.rehbarRequired');
      else if (rehbarResult.reason === 'tooLong') {
        errors.rehbar = t('form.errors.rehbarTooLong', { max: FIELD_LIMITS.rehbar.max });
      } else errors.rehbar = t('form.errors.rehbarInvalid');
    }
  }

  if (!requireAddress) return errors;

  const houseResult = validateHouseNoValue(form.houseNo, { required: true });
  if (!houseResult.valid) {
    if (houseResult.reason === 'required') errors.houseNo = t('form.errors.houseNoRequired');
    else if (houseResult.reason === 'tooLong') {
      errors.houseNo = t('form.errors.houseNoTooLong', { max: FIELD_LIMITS.houseNo.max });
    } else errors.houseNo = t('form.errors.houseNoInvalid');
  }

  assignAddressLineError(errors, 'street', form.street, t, {
    requiredKey: 'form.errors.streetRequired',
    invalidKey: 'form.errors.streetInvalid',
    tooLongKey: 'form.errors.streetTooLong'
  });
  assignAddressLineError(errors, 'area', form.area, t, {
    requiredKey: 'form.errors.areaRequired',
    invalidKey: 'form.errors.areaInvalid',
    tooLongKey: 'form.errors.areaTooLong'
  });
  assignOptionalAddressLineError(errors, 'landmark', form.landmark, t, {
    invalidKey: 'form.errors.landmarkInvalid',
    tooLongKey: 'form.errors.landmarkTooLong'
  });

  assignPlaceNameError(errors, 'postOffice', form.postOffice, t, {
    requiredKey: 'form.errors.postOfficeRequired',
    invalidKey: 'form.errors.postOfficeInvalid',
    tooLongKey: 'form.errors.postOfficeTooLong'
  });
  assignPlaceNameError(errors, 'town', form.town, t, {
    requiredKey: 'form.errors.required',
    invalidKey: 'form.errors.townInvalid',
    tooLongKey: 'form.errors.townTooLong'
  });
  assignPlaceNameError(errors, 'district', form.district, t, {
    requiredKey: 'form.errors.districtRequired',
    invalidKey: 'form.errors.districtInvalid',
    tooLongKey: 'form.errors.districtTooLong'
  });

  if (!String(form.state || '').trim()) {
    errors.state = t('form.errors.stateRequired');
  } else {
    const stateResult = validatePlaceNameValue(form.state, { required: true });
    if (!stateResult.valid) {
      if (stateResult.reason === 'tooLong') {
        errors.state = t('form.errors.stateTooLong', { max: FIELD_LIMITS.placeName.max });
      } else errors.state = t('form.errors.stateInvalid');
    }
  }

  return errors;
}
