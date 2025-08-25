// frontend/src/pages/Dashboard.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import axios from 'axios';
import gsap from 'gsap';
import { AuthContext } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const PAGE_SIZE = 20;

const FX = { USD: 1, PKR: 280, AED: 3.6725, EUR: 0.92 };
const convertFromUSD = (usd, currency) => (Number(usd || 0) * (FX[currency] || 1));
const money = (usd, currency) =>
  convertFromUSD(usd, currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

// ---- pricing helpers (mirror backend logic) ----
const toNum = (v, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const lc = (s) => String(s || '').toLowerCase();

// Heuristic: detect per-item/package/software services
const isPerItemService = (svc) => {
  const min = toNum(svc?.min, 1);
  const max = toNum(svc?.max, 1000);
  if (min === 1 && max === 1) return true;

  const t = lc(svc?.type);
  const n = lc(svc?.name);
  const c = lc(svc?.category);

  if (t.includes('package') || t.includes('software') || t.includes('license')) return true;
  if (n.includes('package') || n.includes('software') || n.includes('license')) return true;
  if (c.includes('package') || c.includes('software') || c.includes('license')) return true;

  return false;
};

// Commission-inclusive display rate (USD)
const displayRateUSD = (svc) => {
  const base = toNum(svc?.rate, 0);
  return base * 1.2;
};

export default function Dashboard() {
  const { token, user, currency, updateCurrency } = useContext(AuthContext);
  const [services, setServices] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);

  const [q, setQ] = useState('');
  const [category, setCategory] = useState('All');

  // all categories (fetched independently so the dropdown shows every category immediately)
  const [allCategories, setAllCategories] = useState(['All']);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const containerRef = useRef(null);
  const gridRef = useRef(null);
  const sentinelRef = useRef(null);
  const qDebounceRef = useRef(null);
  const ioRef = useRef(null);

  const navigate = useNavigate();

  // ✅ send category to backend (omit when "All")
  const fetchPage = async (offset, query, cat) => {
    const params = { offset, limit: PAGE_SIZE, q: query || '' };
    if (cat && cat !== 'All') params.category = cat;

    const res = await axios.get('/api/services', {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    return Array.isArray(res.data) ? res.data : [];
  };

  // Fetch ALL categories up-front (paged under the hood) so the dropdown has the full list
  useEffect(() => {
    let cancelled = false;

    const fetchAllCats = async () => {
      if (!token) return;
      setLoadingCategories(true);
      const seen = new Set();
      const PAGE_LIMIT = 200; // backend cap
      let offset = 0;
      const MAX_LOOPS = 100; // 100 * 200 = 20k services
      let loops = 0;

      try {
        while (loops < MAX_LOOPS) {
          const r = await axios.get('/api/services', {
            headers: { Authorization: `Bearer ${token}` },
            params: { offset, limit: PAGE_LIMIT, q: '' },
          });
          const arr = Array.isArray(r.data) ? r.data : [];
          arr.forEach((s) => seen.add(s.category || 'Other'));
          offset += PAGE_LIMIT;
          loops += 1;
          if (arr.length < PAGE_LIMIT) break;
        }
        if (!cancelled) {
          const list = ['All', ...Array.from(seen).filter(Boolean).sort()];
          setAllCategories(list);
        }
      } catch {
        if (!cancelled) setAllCategories((prev) => (prev?.length ? prev : ['All']));
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    fetchAllCats();
    return () => { cancelled = true; };
  }, [token]);

  // ✅ Single debounced loader for q + category (no duplicate effect)
  useEffect(() => {
    if (qDebounceRef.current) clearTimeout(qDebounceRef.current);

    qDebounceRef.current = setTimeout(async () => {
      setLoadingInitial(true);
      setEndReached(false);
      if (ioRef.current) {
        ioRef.current.disconnect();
        ioRef.current = null;
      }
      try {
        const first = await fetchPage(0, q, category);
        setServices(first);
        if (first.length < PAGE_SIZE) setEndReached(true);
        if (gridRef.current) gridRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch {
        setServices([]);
        setEndReached(true);
      } finally {
        setLoadingInitial(false);
      }
    }, 300);

    return () => clearTimeout(qDebounceRef.current);
  }, [q, category, token]); // 👈 include category

  // infinite scroll (respects current category)
  useEffect(() => {
    if (!sentinelRef.current || loadingInitial || endReached) return;
    if (ioRef.current) ioRef.current.disconnect();

    const io = new IntersectionObserver(
      async (entries) => {
        const first = entries[0];
        if (first.isIntersecting && !loadingMore && !endReached) {
          setLoadingMore(true);
          try {
            const next = await fetchPage(services.length, q, category);
            setServices((prev) => [...prev, ...next]);
            if (next.length < PAGE_SIZE) setEndReached(true);
          } catch { /* noop */ }
          setLoadingMore(false);
        }
      },
      { rootMargin: '300px 0px 300px 0px' }
    );

    io.observe(sentinelRef.current);
    ioRef.current = io;

    return () => {
      io.disconnect();
      ioRef.current = null;
    };
  }, [services.length, loadingInitial, loadingMore, endReached, q, category, token]);

  // fallback categories from currently loaded services (used only if allCategories not ready yet)
  const fallbackCategories = useMemo(() => {
    const set = new Set(services.map((s) => s.category || 'Other'));
    return ['All', ...Array.from(set).sort()];
  }, [services]);

  const categoriesOptions = allCategories?.length > 1 ? allCategories : fallbackCategories;

  // GSAP entrance
  useEffect(() => {
    if (loadingInitial) return;
    const cards = document.querySelectorAll('.svc-card');
    if (!cards.length) return;
    const tl = gsap.timeline();
    tl.fromTo(
      cards,
      { autoAlpha: 0, y: 18, rotateX: -4 },
      { autoAlpha: 1, y: 0, rotateX: 0, duration: 0.5, ease: 'power2.out', stagger: { each: 0.04, from: 'random' } }
    );
    return () => tl.kill();
  }, [loadingInitial, services.length]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 animate-gradient-x">
        <Navbar />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-5 sm:py-6" ref={containerRef}>
          {/* Header / balance / currency */}
          <div className="mb-5 sm:mb-6">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow">
              Hi, {user?.username}
            </h2>
            <div className="mt-3 w-full">
              <div className="relative rounded-2xl p-[1px] bg-gradient-to-r from-indigo-500/60 via-fuchsia-500/60 to-emerald-500/60">
                <div className="rounded-2xl bg-white p-4 sm:p-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-gray-500">Current Balance</p>
                    <p className="text-xl sm:text-2xl md:text-3xl font-semibold wrap-anywhere">
                      {currency} {money(user?.balance ?? 0, currency)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 sm:gap-3">
                    <label className="text-xs sm:text-sm text-gray-600">Currency</label>
                    <select
                      value={currency}
                      onChange={(e) => updateCurrency(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    >
                      {['PKR','USD','AED','EUR'].map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            <input
              type="text"
              className="col-span-1 sm:col-span-2 rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/80 px-3 sm:px-4 py-3 outline-none focus:ring-2 focus:ring-white/70"
              placeholder="Search services… (type to query live)"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <select
              className="rounded-xl border border-white/30 bg-white/20 text-white px-3 sm:px-4 py-3 outline-none focus:ring-2 focus:ring-white/70 focus:bg-white focus:text-gray-900"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              title="Filter by category"
            >
              {categoriesOptions.map((c) => (
                <option key={c} value={c} className="bg-white text-gray-900">
                  {loadingCategories && c !== 'All' ? `${c} (loading…)` : c}
                </option>
              ))}
            </select>
          </div>

          {/* Grid anchor for smooth scroll */}
          <div ref={gridRef} />

          {/* Services */}
          {loadingInitial ? (
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
                  const perItem = isPerItemService(svc);
                  const rateUSD = displayRateUSD(svc); // includes +20%
                  const unitSuffix = perItem ? '/unit' : '/1k';

                  return (
                    <li key={svc.service} className="svc-card group">
                      <div className={`rounded-2xl p-4 sm:p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${color}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="text-base sm:text-lg font-semibold leading-snug wrap-anywhere line-clamp-2">
                              {svc.name}
                            </h4>
                            <p className="text-xs sm:text-sm opacity-90 wrap-anywhere">
                              {(svc.category || 'Other')} • {svc.type || '—'}
                            </p>
                          </div>
                          <span
                            className="shrink-0 inline-flex items-center h-7 sm:h-8 px-2.5 sm:px-3 rounded-xl text-[10px] sm:text-xs font-medium bg-white/20 backdrop-blur"
                            title={`Rate (incl. 20%) ${unitSuffix}`}
                          >
                            {currency} {money(rateUSD, currency)}{unitSuffix}
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
                          <div className="rounded-xl bg-white/20 backdrop-blur p-2">
                            <p className="text-[10px] sm:text-[11px] uppercase opacity-80">Rate (incl. 20%)</p>
                            <p className="font-semibold">
                              {currency} {money(rateUSD, currency)}{unitSuffix}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 sm:mt-4 flex items-center justify-between">
                          <button
                            onClick={() => navigate(`/create-order?service=${svc.service}`)}
                            className="inline-flex items-center justify-center h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium bg-white/20 backdrop-blur hover:bg-white/30 transition"
                          >
                            Order Now
                          </button>
                          <span className="text-[10px] sm:text-[11px] opacity-75 wrap-anywhere">ID: {svc.service}</span>
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
    </>
  );
}
