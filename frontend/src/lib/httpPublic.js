import axios from 'axios';

let base = (import.meta.env.VITE_API_BASE || '').replace(/\/+$/, '');
if (base.endsWith('/api')) base = base.slice(0, -4); // strip accidental /api

const httpPublic = axios.create({
  baseURL: `${base}/api`,
  timeout: 20000,
});

export default httpPublic;
