const axios = require('axios');

const BASE_URL = process.env.SMM_API_URL;

function buildHeaders() {
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'User-Agent': process.env.SMM_API_USER_AGENT || 'Viraloft/1.0',
  };

  if (process.env.SMM_API_REFERER) headers.Referer = process.env.SMM_API_REFERER;
  if (process.env.SMM_API_ORIGIN) headers.Origin = process.env.SMM_API_ORIGIN;

  return headers;
}

const client = axios.create({
  baseURL: BASE_URL || 'http://localhost',
  timeout: Number(process.env.SMM_API_TIMEOUT_MS || 20000),
  maxRedirects: 5,
  validateStatus: () => true,
});

async function postForm(path, obj) {
  const body = new URLSearchParams();
  Object.entries(obj || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) body.append(key, String(value));
  });

  const response = await client.post(path || '', body.toString(), {
    headers: buildHeaders(),
  });

  if (response.status >= 200 && response.status < 300) return response.data;

  const providerMessage =
    response?.data?.error ||
    response?.data?.message ||
    (typeof response?.data === 'string' ? response.data.slice(0, 500) : '') ||
    response.statusText ||
    `HTTP ${response.status}`;

  const err = new Error(`SMM provider rejected request (${response.status}): ${providerMessage}`);
  err.status = response.status;
  err.providerStatus = response.status;
  err.providerMessage = providerMessage;
  err.response = response;
  throw err;
}

module.exports = { postForm };
