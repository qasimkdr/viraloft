import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import httpPublic from '../lib/httpPublic';

const FX = { USD: 1, PKR: 280, AED: 3.6725, EUR: 0.92 };
const PAGE_SIZE = 24;
const CATS_PAGE = 200;

const convertFromUSD = (usd, currency) => Number(usd || 0) * (FX[currency] || 1);
const money = (usd, currency) => convertFromUSD(usd, currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isPerItem = (service) => {
  const min = Number(service?.min || 0);
  const max = Number(service?.max || 0);
  if (min === 1 && max === 1) return true;
  const haystack = [service?.type, service?.name, service?.category].join(' ').toLowerCase();
  return ['package', 'software', 'license'].some((word) => haystack.includes(word));
};

const displayRateUSD = (service) => {
  const markupRate = Number(service?.markupRate || 0);
  return isPerItem(service) ? markupRate / 1000 : markupRate;
};

export default function Services() {
  const [currency, setCurrency] = useState('PKR');
  const [categories, setCategories] = useState(['All']);
  const [category, setCategory] = useState('All');
  const [q, setQ] = useState('');
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [endReached, setEndReached] = useState(false);

  const sentinelRef = useRef(null);
  const ioRef = useRef(null);
  const debounceRef = useRef(null);
  const catsAbortRef = useRef(null);
  const loadAbortRef = useRef(null);
  const moreAbortRef = useRef(null);

  const fetchPage = async (offset, query, cat, limit = PAGE_SIZE, signal) => {
    const params = { offset, limit };
    if (query) params.q = query;
    if (cat && cat !== 'All') params.category = cat;
    const response = await httpPublic.get('/services/public', { params, signal });
    return Array.isArray(response.data) ? response.data : [];
  };

  useEffect(() => {
    catsAbortRef.current?.abort();
    const controller = new AbortController();
    catsAbortRef.current = controller;
    let mounted = true;

    (async () => {
      const seen = new Set();
      let offset = 0;
      try {
        for (let loop = 0; loop < 100; loop += 1) {
          const batch = await fetchPage(offset, '', 'All', CATS_PAGE, controller.signal);
          batch.forEach((service) => seen.add(service.category || 'Other'));
          if (batch.length < CATS_PAGE) break;
          offset += CATS_PAGE;
        }
        if (mounted) setCategories(['All', ...Array.from(seen).filter(Boolean).sort()]);
      } catch {
        if (mounted) setCategories(['All']);
      }
    })();

    return () => { mounted = false; controller.abort(); };
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (ioRef.current) ioRef.current.disconnect();
      loadAbortRef.current?.abort();
      const controller = new AbortController();
      loadAbortRef.current = controller;
      setLoading(true);
      setEndReached(false);
      try {
        const first = await fetchPage(0, q, category, PAGE_SIZE, controller.signal);
        setServices(first);
        setEndReached(first.length < PAGE_SIZE);
      } catch (error) {
        if (error?.name !== 'CanceledError' && error?.name !== 'AbortError') {
          setServices([]);
          setEndReached(true);
        }
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => clearTimeout(debounceRef.current);
  }, [q, category]);

  useEffect(() => {
    if (!sentinelRef.current || loading || endReached) return undefined;
    ioRef.current?.disconnect();

    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting || loadingMore || endReached) return;
      setLoadingMore(true);
      moreAbortRef.current?.abort();
      const controller = new AbortController();
      moreAbortRef.current = controller;
      try {
        const next = await fetchPage(services.length, q, category, PAGE_SIZE, controller.signal);
        setServices((current) => [...current, ...next]);
        if (next.length < PAGE_SIZE) setEndReached(true);
      } catch {
        // A canceled load-more request does not need user-facing error UI.
      } finally {
        setLoadingMore(false);
      }
    }, { rootMargin: '320px 0px' });

    observer.observe(sentinelRef.current);
    ioRef.current = observer;
    return () => observer.disconnect();
  }, [services.length, loading, loadingMore, endReached, q, category]);

  const categoryOptions = useMemo(() => {
    const visible = services.map((service) => service.category || 'Other');
    return Array.from(new Set(['All', ...categories.slice(1), ...visible]));
  }, [categories, services]);

  return (
    <div className="min-h-screen bg-[#060914] text-slate-100">
      <Navbar />
      <main>
        <section className="border-b border-white/10 px-4 py-14 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl">
              <span className="eyebrow">Public service catalog</span>
              <h1 className="mt-4 text-4xl font-bold tracking-[-.045em] text-white sm:text-6xl">Explore available Viraloft services.</h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
                Search the live catalog, compare service limits and review displayed pricing before creating an account and placing an order.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-8 sm:px-6 sm:py-10">
          <div className="mx-auto max-w-7xl">
            <div className="glass-3d mb-8 grid gap-3 rounded-2xl p-3 sm:grid-cols-[1fr_240px_150px] sm:p-4">
              <label className="sr-only" htmlFor="service-search">Search services</label>
              <input
                id="service-search"
                type="search"
                className="h-12 rounded-xl border border-white/10 bg-black/20 px-4 text-white outline-none placeholder:text-slate-500 focus:border-indigo-400"
                placeholder="Search by service, platform or category…"
                value={q}
                onChange={(event) => setQ(event.target.value)}
              />
              <label className="sr-only" htmlFor="service-category">Category</label>
              <select id="service-category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-[#0b1220] px-4 text-white outline-none focus:border-indigo-400">
                {categoryOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <label className="sr-only" htmlFor="service-currency">Currency</label>
              <select id="service-currency" value={currency} onChange={(event) => setCurrency(event.target.value)} className="h-12 rounded-xl border border-white/10 bg-[#0b1220] px-4 text-white outline-none focus:border-indigo-400">
                {['PKR', 'USD', 'AED', 'EUR'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="grid min-h-52 place-items-center rounded-2xl border border-white/10 bg-white/[.025] text-slate-400">Loading services…</div>
            ) : services.length === 0 ? (
              <div className="grid min-h-52 place-items-center rounded-2xl border border-white/10 bg-white/[.025] px-6 text-center text-slate-400">No services match your search.</div>
            ) : (
              <>
                <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {services.map((service, index) => {
                    const perItem = isPerItem(service);
                    const rate = displayRateUSD(service);
                    return (
                      <li key={service.service ?? `${service.name}-${index}`} className="interactive-3d flex min-h-72 flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-[#101a30] to-[#0a1020] p-5 shadow-xl shadow-black/10">
                        <div className="mb-5 flex items-start justify-between gap-3">
                          <span className="rounded-lg border border-indigo-400/20 bg-indigo-400/10 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[.12em] text-indigo-200">{service.category || 'Other'}</span>
                          <span className="text-[11px] font-semibold text-slate-500">ID {service.service}</span>
                        </div>
                        <h2 className="text-lg font-semibold leading-7 text-white">{service.name}</h2>
                        <p className="mt-2 text-sm text-slate-400">{service.type || 'Standard service'}</p>
                        <div className="mt-5 grid grid-cols-2 gap-2">
                          <div className="rounded-xl border border-white/10 bg-black/15 p-3"><span className="block text-[10px] uppercase tracking-wider text-slate-500">Minimum</span><strong className="mt-1 block text-sm text-white">{service.min}</strong></div>
                          <div className="rounded-xl border border-white/10 bg-black/15 p-3"><span className="block text-[10px] uppercase tracking-wider text-slate-500">Maximum</span><strong className="mt-1 block text-sm text-white">{service.max}</strong></div>
                        </div>
                        <div className="mt-auto pt-5">
                          <div className="mb-3 flex items-end justify-between gap-2"><span className="text-xs text-slate-500">Displayed rate</span><strong className="text-base text-white">{currency} {money(rate, currency)} <small className="font-medium text-slate-500">{perItem ? '/unit' : '/1k'}</small></strong></div>
                          <Link to="/register" className="flex h-11 items-center justify-center rounded-xl bg-indigo-500 px-4 text-sm font-bold text-white transition hover:bg-indigo-400">Create account to order</Link>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {!endReached && <div ref={sentinelRef} className="py-10 text-center text-sm text-slate-500">{loadingMore ? 'Loading more services…' : 'More services load as you scroll'}</div>}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
