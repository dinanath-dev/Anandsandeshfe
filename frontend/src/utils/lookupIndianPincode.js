import { INDIAN_STATES } from '../data/indianStates.js';

/** Match API state name to our dropdown list */
export function matchIndianState(apiState) {
  const raw = String(apiState || '').trim();
  if (!raw) return '';

  const lower = raw.toLowerCase();
  const exact = INDIAN_STATES.find((s) => s.toLowerCase() === lower);
  if (exact) return exact;

  const compact = lower.replace(/\s+/g, '');
  const fuzzy = INDIAN_STATES.find((s) => s.toLowerCase().replace(/\s+/g, '') === compact);
  return fuzzy || raw;
}

function sortPostOffices(offices) {
  return [...offices].sort((a, b) => {
    const aDelivery = a.DeliveryStatus === 'Delivery' ? 0 : 1;
    const bDelivery = b.DeliveryStatus === 'Delivery' ? 0 : 1;
    if (aDelivery !== bDelivery) return aDelivery - bDelivery;
    return String(a.Name || '').localeCompare(String(b.Name || ''), 'en', { sensitivity: 'base' });
  });
}

function uniquePostOfficeNames(offices) {
  const seen = new Set();
  const names = [];
  for (const office of offices) {
    const name = String(office.Name || '').trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    names.push(name);
  }
  return names;
}

/**
 * Look up Indian pincode via India Post API.
 * @returns {Promise<{ town: string, district: string, state: string, postOffices: string[], defaultPostOffice: string } | null>}
 */
export async function lookupIndianPincode(pin) {
  const digits = String(pin || '').replace(/\D/g, '');
  if (digits.length !== 6) return null;

  const res = await fetch(`https://api.postalpincode.in/pincode/${digits}`);
  if (!res.ok) return null;

  const data = await res.json();
  const block = Array.isArray(data) ? data[0] : null;
  if (block?.Status !== 'Success' || !Array.isArray(block.PostOffice) || block.PostOffice.length === 0) {
    return null;
  }

  const offices = sortPostOffices(block.PostOffice);
  const postOffices = uniquePostOfficeNames(offices);
  const preferred =
    offices.find((o) => o.DeliveryStatus === 'Delivery' && o.BranchType === 'Head Post Office') ||
    offices.find((o) => o.DeliveryStatus === 'Delivery') ||
    offices[0];

  const town = String(preferred.Block || preferred.Name || '').trim();
  const district = String(preferred.District || '').trim();
  const state = matchIndianState(preferred.State);
  const defaultPostOffice =
    postOffices.length === 1
      ? postOffices[0]
      : String(preferred?.Name || '').trim() && postOffices.includes(String(preferred.Name).trim())
        ? String(preferred.Name).trim()
        : '';

  if (!town && !district && !state && postOffices.length === 0) return null;
  return { town, district, state, postOffices, defaultPostOffice };
}
