const STORAGE_KEY = 'anand_book_order_draft';

export function saveBookOrderDraft(draft) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadBookOrderDraft() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearBookOrderDraft() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** @param {unknown} order API book order */
export function draftFromBookOrder(order) {
  if (!order || typeof order !== 'object') return null;

  const cart = {};
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  if (items.length > 0) {
    for (const item of items) {
      if (item?.book_id) cart[item.book_id] = Number(item.quantity) || 1;
    }
  } else if (order.book_id) {
    cart[order.book_id] = Number(order.quantity) || 1;
  }

  return {
    bookOrderId: order.id || null,
    fulfillmentMode: order.fulfillment_mode || 'counter_sale',
    step: 2,
    form: {
      name: String(order.name || '').trim(),
      counter: String(order.pickup_counter || order.counter || '').trim(),
      mobile: String(order.phone || '').trim(),
      email: String(order.email || '').trim(),
      address: String(order.address_1 || '').trim(),
      houseNo: String(order.address_1 || '').trim(),
      street: String(order.address_2 || '').trim().split('\n')[0] || '',
      area: String(order.address_2 || '').trim().split('\n')[1] || '',
      postOffice: String(order.address_2 || '').trim().split('\n')[2] || '',
      landmark: '',
      state: String(order.state || '').trim(),
      town: String(order.city || '').trim(),
      district: String(order.district || '').trim(),
      pin: String(order.pincode || '').trim(),
      gender: String(order.gender || '').trim()
    },
    cart
  };
}
