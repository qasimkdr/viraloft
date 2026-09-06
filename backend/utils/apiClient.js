// backend/utils/apiClient.js
const { postForm } = require('./providerRequest');

const BASE_URL = process.env.SMM_API_URL;
const API_KEY = process.env.SMM_API_KEY;
const SERVICE_CACHE_MS = Math.max(5000, Number(process.env.SMM_SERVICES_CACHE_MS || 60000));

let warned = false;
let serviceCache = { data: null, expiresAt: 0 };
let servicesInFlight = null;

function assertConfigured() {
  if (!BASE_URL || !API_KEY) {
    if (!warned) {
      console.warn('[apiClient] SMM_API_URL / SMM_API_KEY not configured — vendor/service endpoints will be unavailable until set in .env');
      warned = true;
    }
    const err = new Error('Service provider is not configured on the server yet');
    err.status = 503;
    throw err;
  }
}

function normalizeServicesResponse(raw) {
  let data = raw;

  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      const err = new Error('Service provider returned an invalid response');
      err.status = 502;
      throw err;
    }
  }

  const candidates = [data, data?.services, data?.data, data?.data?.services];
  const services = candidates.find(Array.isArray);
  if (services) return services;

  if (data?.error || data?.message) {
    const err = new Error(data.error || data.message);
    err.status = 502;
    err.response = { data };
    throw err;
  }

  const err = new Error('Unexpected services response from provider');
  err.status = 502;
  err.response = { data };
  throw err;
}

async function getServices(options = {}) {
  assertConfigured();
  const forceRefresh = Boolean(options.forceRefresh);
  const now = Date.now();

  if (!forceRefresh && Array.isArray(serviceCache.data) && serviceCache.expiresAt > now) {
    return serviceCache.data;
  }

  if (!forceRefresh && servicesInFlight) return servicesInFlight;

  servicesInFlight = (async () => {
    try {
      const raw = await postForm('', { key: API_KEY, action: 'services' });
      const services = normalizeServicesResponse(raw);
      serviceCache = { data: services, expiresAt: Date.now() + SERVICE_CACHE_MS };
      return services;
    } catch (err) {
      if (Array.isArray(serviceCache.data) && serviceCache.data.length) {
        console.warn('[apiClient] Vendor services refresh failed; serving stale cache:', err.message);
        return serviceCache.data;
      }

      const upstreamStatus = err?.providerStatus || err?.response?.status || err?.status;
      if (upstreamStatus === 401 || upstreamStatus === 403) {
        console.error('[apiClient] Provider authentication/access rejected:', err.message);
        const accessErr = new Error(
          upstreamStatus === 403
            ? 'Service provider denied this server request. Check SMM API URL/key and provider IP/domain restrictions.'
            : 'Service provider rejected the API credentials. Check SMM_API_KEY.'
        );
        accessErr.status = 502;
        accessErr.providerStatus = upstreamStatus;
        accessErr.cause = err;
        throw accessErr;
      }

      if (!err.status) err.status = 502;
      throw err;
    } finally {
      servicesInFlight = null;
    }
  })();

  return servicesInFlight;
}

function clearServicesCache() {
  serviceCache = { data: null, expiresAt: 0 };
}

async function addOrder(service, quantity, link, comments) {
  assertConfigured();
  const payload = { key: API_KEY, action: 'add', service, quantity, link };
  if (comments) payload.comments = comments;

  const data = await postForm('', payload);
  const hasOrder = data?.order || data?.order_id || data?.data?.order || data?.data?.order_id;
  if (hasOrder) return data;

  const msg = data?.error || data?.message || 'Vendor order error';
  const err = new Error(msg);
  err.status = 502;
  err.response = { data };
  throw err;
}

async function getOrderStatus(order) {
  assertConfigured();
  const data = await postForm('', { key: API_KEY, action: 'status', order });
  if (data?.status) return data;

  const err = new Error(data?.error || data?.message || 'Vendor status error');
  err.status = 502;
  err.response = { data };
  throw err;
}

module.exports = {
  isConfigured: () => Boolean(BASE_URL && API_KEY),
  getServices,
  clearServicesCache,
  addOrder,
  getOrderStatus,
};
