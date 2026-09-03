// frontend/src/lib/format.js
export const FX = { USD: 1, PKR: 280, AED: 3.6725, EUR: 0.92 };

export const convertFromUSD = (usd, currency) => Number(usd || 0) * (FX[currency] || 1);

export const money = (usd, currency = 'PKR') =>
  convertFromUSD(usd, currency).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleString();
  } catch {
    return d || '—';
  }
};

export const orderStatusBadge = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('pending')) return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s.includes('processing')) return 'bg-blue-50 text-blue-700 border-blue-200';
  if (s.includes('completed') || s.includes('success')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s.includes('cancel') || s.includes('failed')) return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

export const accountStatusBadge = (status) => {
  const s = (status || 'active').toLowerCase();
  if (s === 'active') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'suspended') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'banned') return 'bg-rose-50 text-rose-700 border-rose-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

export const roleBadge = (role) => {
  const r = (role || 'user').toLowerCase();
  if (r === 'admin') return 'bg-violet-50 text-violet-700 border-violet-200';
  if (r === 'staff') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-slate-50 text-slate-700 border-slate-200';
};

export const ticketStatusBadge = (status) => {
  const s = String(status || '').toLowerCase();
  if (s === 'resolved') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (s === 'pending' || s === 'open') return 'bg-amber-50 text-amber-700 border-amber-200';
  if (s === 'closed') return 'bg-slate-100 text-slate-700 border-slate-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

export const priorityBadge = (p) => {
  const v = String(p || 'normal').toLowerCase();
  if (v === 'urgent') return 'bg-rose-50 text-rose-700 border-rose-200';
  if (v === 'high') return 'bg-orange-50 text-orange-700 border-orange-200';
  if (v === 'low') return 'bg-sky-50 text-sky-700 border-sky-200';
  return 'bg-violet-50 text-violet-700 border-violet-200';
};
