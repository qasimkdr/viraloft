// frontend/src/pages/Services.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { Link } from 'react-router-dom';

// Currency helpers (public page defaults to PKR, user can change)
const FX = { USD: 1, PKR: 280, AED: 3.6725, EUR: 0.92 };
const convertFromUSD = (usd, currency) => Number(usd || 0) * (FX[currency] || 1);
const money = (usd, currency) =>
  convertFromUSD(usd, currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Paging sizes
const PAGE_SIZE = 24;     // for visible services (infinite scroll)
const CATS_PAGE = 200;    // larger page size just for building full category list quickly

const colorways = [
  'from-indigo-500/95 to-violet-500/95',
  'from-emerald-500/95 to-teal-500/95',
  'from-sky-500/95 to-blue-600/95',
  'from-fuchsia-500/95 to-pink-500/95',
  'from-amber-500/95 to-orange-500/95',
  'from-cyan-500/95 to-sky-500/95',
  'from-rose-500/95 to-red-500/95',
  'from-purple-500/95 to-indigo-500/95',
];

// Detect services that are priced per item (not per 1000)
const isPerItem = (svc) => {
  const min = Number(svc.min || 0);
  const max = Number(svc.max || 0);
  if (min === 1 && max === 1) return true;
  const t = String(svc.type || '').toLowerCase();
  const n = String(svc.name || '').toLowerCase();
  const c = String(svc.category || '').toLowerCase();
  if ([t, n, c].some(s => s.includes('package') || s.includes('software') || s.includes('license'))) return true;
  return false;
};

// For a given service, compute the correct display USD rate (incl. +20% which backend already added into markupRate)
// - if per item: markupRate is per 1000 → convert to per-unit by dividing by 1000
// - else: show per-1000 directly
const displayRateUSD = (svc) => {
  const mr = Number(svc.markupRate || 0);
  if (isPerItem(svc)) return mr / 1000;
  return mr; // per 1k
};

export default function Services() {
  const [currency, setCurrency] = useState('PKR');

  // Full category list (loaded once by scanning pages)
  const [categories, setCategories] = useState(['All']);
  const [catsLoading, setCatsLoading] = useState(true);

  // Current filters
  const [category, setCategory] = useState('All');
  const [q, setQ] = useState('');

  // Services to display
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);

  // infra
  const sentinelRef = useRef(null);
  const ioRef = useRef(null);
  const qDebounceRef = useRef(null);

  // ---------- API helpers ----------
  const fetchServicesPage = async (offset, query, cat, pageSize = PAGE_SIZE) => {
    const params = { offset, limit: pageSize };
    if (query) params.q = query;
    if (cat && cat !== 'All') params.category = cat;
    const res = await axios.get('/api/services/public', { params });
    return Array.isArray(res.data) ? res.data : [];
  };

  // Build full category list up-front by scanning pages (independent of visible list)
  useEffect(() => {
    let cancelled = false;
    const buildCategories = async () => {
      setCatsLoading(true);
      const seen = new Set();
      let offset = 0;
      try {
        for (let loops = 0; loops < 200; loops++) {
          const batch = await fetchServicesPage(offset, '', 'All', CATS_PAGE);
          batch.forEach(s => seen.add(s.category || 'Other'));
          if (batch.length < CATS_PAGE) break;
          offset += CATS_PAGE;
        }
        if (cancelled) return;
        const sorted = Array.from(seen).filter(Boolean).sort();
        setCategories(['All', ...sorted]);
      } catch {
        if (!cancelled) setCategories(['All']); // fallback
      } finally {
        if (!cancelled) setCatsLoading(false);
      }
    };
    buildCategories();
    return () => { cancelled = true; };
  }, []);

  // initial load + debounced search
  useEffect(() => {
    if (qDebounceRef.current) clearTimeout(qDebounceRef.current);
    qDebounceRef.current = setTimeout(async () => {
      setLoading(true);
      setEndReached(false);
      if (ioRef.current) { ioRef.current.disconnect(); ioRef.current = null; }
      try {
        const first = await fetchServicesPage(0, q, category);
        setServices(first);
        if (first.length < PAGE_SIZE) setEndReached(true);
      } catch {
        setServices([]);
        setEndReached(true);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(qDebounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category]);

  // infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || loading || endReached) return;
    if (ioRef.current) ioRef.current.disconnect();

    const io = new IntersectionObserver(async (entries) => {
      if (entries[0].isIntersecting && !loadingMore && !endReached) {
        setLoadingMore(true);
        try {
          const next = await fetchServicesPage(services.length, q, category);
          setServices(prev => [...prev, ...next]);
          if (next.length < PAGE_SIZE) setEndReached(true);
        } catch { /* ignore */ }
        setLoadingMore(false);
      }
    }, { rootMargin: '300px 0px 300px 0px' });

    io.observe(sentinelRef.current);
    ioRef.current = io;
    return () => { io.disconnect(); ioRef.current = null; };
  }, [services.length, loading, endReached, loadingMore, q, category]);

  // (Optional) derive visible categories from current list (kept for resilience if global load fails)
  const derivedCategories = useMemo(() => {
    const set = new Set((services || []).map(s => s.category || 'Other'));
    const arr = Array.from(set).sort();
    // merge with global categories; ensure 'All' first
    const merged = new Set(['All', ...categories.slice(1), ...arr]);
    return Array.from(merged);
  }, [services, categories]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 animate-gradient-x">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">Viraloft Services</h1>
            <p className="text-white/90 text-sm">Public catalog</p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-white/90 text-sm">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 outline-none focus:ring-2 focus:ring-white/70"
            >
              {['PKR','USD','AED','EUR'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <input
            type="text"
            className="col-span-1 sm:col-span-2 rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/80 px-3 sm:px-4 py-3 outline-none focus:ring-2 focus:ring-white/70"
            placeholder="Search services…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="rounded-xl border border-white/30 bg-white/20 text-white px-3 sm:px-4 py-3 outline-none focus:ring-2 focus:ring-white/70 focus:bg-white focus:text-gray-900"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {(catsLoading ? ['All', ...derivedCategories.filter(c => c !== 'All')] : derivedCategories).map((c) => (
              <option key={c} value={c} className="bg-white text-gray-900">{c}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="h-40 grid place-items-center">
            <div className="animate-pulse text-white/90">Loading services…</div>
          </div>
        ) : services.length === 0 ? (
          <div className="text-white/90">No services found.</div>
        ) : (
          <>
            <ul className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
              {services.map((svc, i) => {
                const color = colorways[i % colorways.length];
                const perItem = isPerItem(svc);
                const rateUSD = displayRateUSD(svc);
                const label = perItem ? 'per item' : '/1k';

                return (
                  <li key={svc.service} className="svc-card group">
                    <div className={`rounded-2xl p-4 sm:p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${color}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="text-base sm:text-lg font-semibold leading-snug break-words line-clamp-2">
                            {svc.name}
                          </h4>
                          <p className="text-xs sm:text-sm opacity-90 break-words">
                            {(svc.category || 'Other')} • {svc.type || '—'}
                          </p>
                        </div>
                        <span
                          className="shrink-0 inline-flex items-center h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-medium bg-white/20 backdrop-blur"
                          title={`Rate (incl. 20%) ${label}`}
                        >
                          {currency} {money(rateUSD, currency)}{label}
                        </span>
                      </div>

                      <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 text-xs sm:text-sm">
                        <div className="rounded-xl bg-white/20 backdrop-blur p-2">
                          <p className="text-[10px] sm:text-[11px] uppercase opacity-80">Min</p>
                          <p className="font-semibold">{svc.min}</p>
                        </div>
                        <div className="rounded-xl bg-white/20 backdrop-blur p-2">
                          <p className="text-[10px] sm:text-[11px] uppercase opacity-80">Max</p>
                          <p className="font-semibold">{svc.max}</p>
                        </div>
                        <div className="rounded-xl bg-white/20 backdrop-blur p-2 text-center">
                          <p className="text-[10px] sm:text-[11px] uppercase opacity-80">ID</p>
                          <p className="font-semibold">{svc.service}</p>
                        </div>
                      </div>

                      <div className="mt-3 sm:mt-4 flex items-center justify-between">
                        <Link
                          to="/register"
                          className="inline-flex items-center justify-center h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium bg-white/20 backdrop-blur hover:bg-white/30 transition"
                        >
                          Get Started
                        </Link>
                        <span className="text-[10px] sm:text-[11px] opacity-75 break-words">Commission included</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {!endReached && (
              <div ref={sentinelRef} className="py-6 sm:py-8 text-center text-xs sm:text-sm text-white/90">
                {loadingMore ? 'Loading more…' : 'Scroll to load more'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
