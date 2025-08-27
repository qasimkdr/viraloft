// frontend/src/lib/api.js
import axios from 'axios';

const isDev = import.meta.env.DEV;

// In dev, use relative base so /api/... goes through Vite proxy.
// In prod, use VITE_API_BASE or fall back to same-origin.
const baseURL = isDev
  ? '' // Vite proxy handles /api
  : (import.meta.env.VITE_API_BASE?.replace(/\/$/, '') || window.location.origin);

const api = axios.create({
  baseURL,
  withCredentials: false,
});

// --- NEW: normalize relative URLs so they always include /api ---
api.interceptors.request.use((config) => {
  // prefix /api if url is relative and not already starting with /api
  if (config.url && !/^https?:\/\//i.test(config.url)) {
    const u = config.url.startsWith('/') ? config.url : `/${config.url}`;
    if (!u.startsWith('/api/')) {
      config.url = `/api${u}`;
    } else {
      config.url = u; // already /api/...
    }
  }

  // attach token
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export default api;
