// frontend/src/lib/api.js
import axios from 'axios';

const isDev = import.meta.env.DEV;

// In dev, use a relative base so /api/... goes through Vite's proxy.
// In prod, use VITE_API_BASE or fall back to same-origin.
const baseURL = isDev
  ? ''
  : (import.meta.env.VITE_API_BASE?.replace(/\/$/, '') || window.location.origin);

const api = axios.create({
  baseURL,
  withCredentials: false,
});

// Attach token automatically to every request (including /api/services)
api.interceptors.request.use((config) => {
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
