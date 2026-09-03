// frontend/src/components/admin/StatCard.jsx
import React from 'react';

export default function StatCard({ label, value, hint, tone = 'slate', loading }) {
  const tones = {
    slate: 'bg-white border-slate-200 text-slate-900',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    rose: 'bg-rose-50 border-rose-200 text-rose-900',
  };
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${tones[tone] || tones.slate}`}>
      <p className="text-xs sm:text-sm font-medium opacity-70">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-16 rounded bg-black/10 animate-pulse" />
      ) : (
        <p className="mt-1 text-2xl sm:text-3xl font-bold">{value}</p>
      )}
      {hint && <p className="mt-1 text-xs opacity-60">{hint}</p>}
    </div>
  );
}
