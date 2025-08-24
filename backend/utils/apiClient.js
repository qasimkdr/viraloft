// backend/utils/apiClient.js
const axios = require('axios');

const BASE_URL = process.env.SMM_API_URL;   // e.g. https://panel.example.com/api/v2
const API_KEY  = process.env.SMM_API_KEY;

if (!BASE_URL || !API_KEY) {
  throw new Error('Missing SMM_API_URL or SMM_API_KEY in environment');
}

// Single axios client (avoid duplicate declarations)
const client = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
});

/**
 * Helper: POST x-www-form-urlencoded to vendor
 */
async function postForm(path, obj) {
  const body = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => {
    if (v !== undefined && v !== null) body.append(k, String(v));
  });
  const { data } = await client.post(path || '', body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

/**
 * Fetch services list from vendor
 * Typical vendor: POST { key, action: 'services' }
 * Returns an array of services (raw from vendor).
 */
async function getServices() {
  const data = await postForm('', { key: API_KEY, action: 'services' });

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.services)) return data.services;

  if (data?.error || data?.message) {
    const err = new Error(data.error || data.message);
    err.response = { data };
    throw err;
  }

  const err = new Error('Unexpected services response');
  err.response = { data };
  throw err;
}

/**
 * Place order with vendor
 * Typical vendor: POST { key, action: 'add', service, quantity, link, comments? }
 * On success returns an object containing order id (order | order_id | data.order).
 * On failure throws with vendor message in err.response.data.
 */
async function addOrder(service, quantity, link, comments) {
  const payload = {
    key: API_KEY,
    action: 'add',
    service,
    quantity,
    link,
  };
  if (comments) payload.comments = comments;

  const data = await postForm('', payload);

  const hasOrder =
    data?.order ||
    data?.order_id ||
    data?.data?.order ||
    data?.data?.order_id;

  if (hasOrder) return data;

  const msg = data?.error || data?.message || 'Vendor order error';
  const err = new Error(msg);
  err.response = { data };
  throw err;
}

/**
 * Get order status from vendor
 * Typical vendor: POST { key, action: 'status', order }
 * Returns the vendor's status payload (must include a 'status' field).
 */
async function getOrderStatus(order) {
  const data = await postForm('', { key: API_KEY, action: 'status', order });

  if (data?.status) return data;

  const err = new Error(data?.error || data?.message || 'Vendor status error');
  err.response = { data };
  throw err;
}

module.exports = {
  getServices,
  addOrder,
  getOrderStatus,
};
