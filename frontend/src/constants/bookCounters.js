/** Publication Society book sales counters (Anandpur, Sant Nagar, Prayag Dham). */
export const BOOK_PICKUP_COUNTERS = [
  {
    code: 'ASK-A1',
    label: 'ASK-A1 — Mah. NNA / Bh. Ramdhan (Shri AnandPur Dham)'
  },
  {
    code: 'ASK-A2',
    label: 'ASK-A2 — Bai Atul Shant Anand (Shri AnandPur Dham)'
  },
  {
    code: 'ASK-S1',
    label: 'ASK-S1 — Bh. Karan (Shri Sant Nagar)'
  },
  {
    code: 'ASK-S2',
    label: 'ASK-S2 — Bai Dharam Anmol Anand (Shri Sant Nagar)'
  },
  {
    code: 'ASK-P1',
    label: 'ASK-P1 — Bh. Ashish – Kartik (Shri Prayag Dham)'
  },
  {
    code: 'ASK-P2',
    label: 'ASK-P2 — Bai Shudh Shital Anand (Shri Prayag Dham)'
  }
];

export const BOOK_PICKUP_COUNTER_CODES = BOOK_PICKUP_COUNTERS.map((c) => c.code);

const byCode = new Map(BOOK_PICKUP_COUNTERS.map((c) => [c.code, c.label]));
const byLabel = new Map(BOOK_PICKUP_COUNTERS.map((c) => [c.label, c.code]));

export function pickupCounterLabel(code) {
  return byCode.get(code) || code;
}

/** Accept stored code or legacy full label; returns canonical code or empty string. */
export function normalizePickupCounter(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (byCode.has(raw)) return raw;
  return byLabel.get(raw) || '';
}
