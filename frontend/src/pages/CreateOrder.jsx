// frontend/src/pages/CreateOrder.jsx
import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import api from '../lib/api';

const FX = { USD: 1, PKR: 280, AED: 3.6725, EUR: 0.92 };
const convertFromUSD = (usd, currency) => (Number(usd || 0) * (FX[currency] || 1));
const money = (usd, currency) =>
  convertFromUSD(usd, currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const isPerItemService = (s) => {
  const min = Number(s?.min ?? 1);
  const max = Number(s?.max ?? 1000);
  if (min === 1 && max === 1) return true;
  const txt = `${(s?.type || '')} ${(s?.name || '')} ${(s?.category || '')}`.toLowerCase();
  return /package|software|license/.test(txt);
};

const computeFallback = (svc, qtyRaw) => {
  if (!svc) return null;
  const minLocal = Number(svc.min ?? 1);
  const maxLocal = Number(svc.max ?? 1000000);
  const qty = Math.min(Math.max(Number(qtyRaw || 0), minLocal), maxLocal);

  const baseRate = Number(svc.rate || 0);
  const perItem = isPerItemService(svc);
  const basePriceUSD = perItem ? baseRate * qty : baseRate * (qty / 1000);
  const commissionUSD = basePriceUSD * 0.20;
  const totalUSD = basePriceUSD + commissionUSD;
  const perUnitUSD = qty > 0 ? totalUSD / qty : 0;

  return {
    rateType: perItem ? 'per_item' : 'per_1000',
    quantity: qty,
    baseRateUSD: baseRate,
    basePriceUSD,
    commissionUSD,
    totalUSD,
    perUnitUSD,
    min: minLocal,
    max: maxLocal,
  };
};

export default function CreateOrder() {
  const { currency, user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const preselectServiceId = searchParams.get('service');

  const [services, setServices] = useState([]);              // currently loaded services for the chosen category (+search)
  const [servicesLoading, setServicesLoading] = useState(true);

  const [allCategories, setAllCategories] = useState([]);    // full category list (from all pages)
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [query, setQuery] = useState('');

  const [qty, setQty] = useState(1);
  const [link, setLink] = useState('');
  const [message, setMessage] = useState('');

  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);
  const [quoteErr, setQuoteErr] = useState('');

  const [serverBounds, setServerBounds] = useState({ min: 1, max: 1000 });

  const [showConfirm, setShowConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [preflight, setPreflight] = useState(null);
  const [placeErr, setPlaceErr] = useState(null); // {status, msg, vendor}

  // When we find the preselected service across the paged scan, we stash its id here
  // and apply it after the category list for that service is fetched.
  const [preselectPendingId, setPreselectPendingId] = useState(null);

  const formRef = useRef(null);
  useEffect(() => {
    const el = formRef.current;
    if (!el) return;
    const handler = (e) => {
      const tag = e.target?.tagName?.toLowerCase();
      if (e.key === 'Enter' && (tag === 'input' || tag === 'select')) e.preventDefault();
    };
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, []);

  // 1) Fetch ALL categories up-front (paged). Also try to locate preselected service id while scanning.
  useEffect(() => {
    let cancelled = false;

    const fetchAllCategoriesAndMaybePreselect = async () => {
      setLoadingCategories(true);
      const seen = new Set();
      const PAGE_LIMIT = 200;
      let offset = 0;
      let foundSvc = null;

      try {
        for (let loops = 0; loops < 100; loops++) {
          const r = await api.get('/api/services', { params: { offset, limit: PAGE_LIMIT, q: '' } });
          const arr = Array.isArray(r.data) ? r.data : [];
          for (const s of arr) {
            seen.add(s.category || 'Other');
          }
          if (preselectServiceId && !foundSvc) {
            const hit = arr.find(s => String(s.service) === String(preselectServiceId));
            if (hit) foundSvc = hit;
          }
          if (arr.length < PAGE_LIMIT) break;
          offset += PAGE_LIMIT;
        }

        if (cancelled) return;
        setAllCategories(Array.from(seen).filter(Boolean).sort());

        // If a ?service= was provided and we found it, select its category now.
        if (foundSvc) {
          setSelectedCategory(foundSvc.category || 'Other');
          setPreselectPendingId(String(foundSvc.service));
          // We do NOT set bounds here; we’ll do it after the category’s services load.
        }
      } catch {
        if (!cancelled) setAllCategories([]);
      } finally {
        if (!cancelled) setLoadingCategories(false);
      }
    };

    fetchAllCategoriesAndMaybePreselect();
    return () => { cancelled = true; };
  }, [preselectServiceId]);

  // 2) Fetch services for the selected category (and optional search) with debounce; paged to get full list.
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      if (!selectedCategory) {
        setServices([]);
        setServicesLoading(false);
        return;
      }
      setServicesLoading(true);
      const PAGE_LIMIT = 200;
      let offset = 0;
      let list = [];

      try {
        for (let loops = 0; loops < 100; loops++) {
          const params = { offset, limit: PAGE_LIMIT, category: selectedCategory };
          if (query?.trim()) params.q = query.trim();
          const r = await api.get('/api/services', { params });
          const arr = Array.isArray(r.data) ? r.data : [];
          list = list.concat(arr);
          if (arr.length < PAGE_LIMIT) break;
          offset += PAGE_LIMIT;
        }
        if (cancelled) return;
        setServices(list);
      } catch {
        if (!cancelled) setServices([]);
      } finally {
        if (!cancelled) setServicesLoading(false);
      }
    }, 300);

    return () => { cancelled = true; clearTimeout(t); };
  }, [selectedCategory, query]);

  // If we had a pending preselect id, apply it once services for that category have loaded.
  useEffect(() => {
    if (!preselectPendingId || servicesLoading) return;
    const found = services.find(s => String(s.service) === String(preselectPendingId));
    if (found) {
      setSelectedId(String(found.service));
      const minInit = Number(found.min || 1);
      const maxInit = Number(found.max || 1000);
      setServerBounds({ min: minInit, max: maxInit });
      setQty((old) => {
        const n = Number(old || 0);
        if (!Number.isFinite(n) || n < minInit) return minInit;
        if (n > maxInit) return maxInit;
        return n;
      });
      setPreselectPendingId(null);
    }
  }, [preselectPendingId, services, servicesLoading]);

  // --- derive filtered list & selected service ---
  const filteredServices = useMemo(() => {
    // Services are already fetched according to selectedCategory & query.
    return services || [];
  }, [services]);

  const selected = useMemo(
    () =>
      filteredServices.find(s => String(s.service) === String(selectedId)) ||
      services.find(s => String(s.service) === String(selectedId)),
    [filteredServices, services, selectedId]
  );

  // keep server bounds in sync with selected
  useEffect(() => {
    if (!selected) return;
    const nextMin = Number(selected.min || 1);
    const nextMax = Number(selected.max || 1000);
    setServerBounds({ min: nextMin, max: nextMax });
    setQty((old) => {
      const n = Number(old || 0);
      if (!Number.isFinite(n) || n < nextMin) return nextMin;
      if (n > nextMax) return nextMax;
      return n;
    });
  }, [selected]);

  const [debouncedQty, setDebouncedQty] = useState(qty);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQty(qty), 250);
    return () => clearTimeout(t);
  }, [qty]);

  // Live quote
  useEffect(() => {
    let cancelled = false;
    const fetchQuote = async () => {
      setQuote(null);
      setQuoteErr('');
      if (!selectedId) return;
      const q = Math.min(Math.max(Number(debouncedQty || 0), serverBounds.min), serverBounds.max);
      if (q <= 0) return;

      setQuoting(true);
      try {
        const r = await api.post('/api/orders/quote', { serviceId: Number(selectedId), quantity: q });
        if (cancelled) return;

        const sMin = Number(r.data?.min ?? serverBounds.min ?? 1);
        const sMax = Number(r.data?.max ?? serverBounds.max ?? 1000);
        setServerBounds({ min: sMin, max: sMax });

        if (q < sMin || q > sMax || r.data?.quantity !== q) {
          setQty(r.data?.quantity ?? Math.min(Math.max(q, sMin), sMax));
          setQuoting(false);
          return;
        }
        setQuote(r.data);
      } catch (e) {
        if (!cancelled) setQuoteErr(e?.response?.data?.message || 'Failed to get live price');
      } finally {
        if (!cancelled) setQuoting(false);
      }
    };
    fetchQuote();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, debouncedQty]);

  const effective = useMemo(() => {
    if (quote && Number.isFinite(Number(quote.totalUSD))) return quote;
    const fb = computeFallback(selected, qty);
    return fb || { rateType: 'per_1000', totalUSD: 0, perUnitUSD: 0, quantity: qty || 0, min: serverBounds.min, max: serverBounds.max };
  }, [quote, selected, qty, serverBounds.min, serverBounds.max]);

  const rateType = effective.rateType || 'per_1000';
  const perUnitUSD = Number(effective.perUnitUSD || 0);
  const totalUSD = Number(effective.totalUSD || 0);

  const userBalanceUSD = Number(user?.balance || 0);
  const costInCurrency = convertFromUSD(totalUSD, currency);
  const balanceInCurrency = convertFromUSD(userBalanceUSD, currency);
  const deficit = Math.max(0, costInCurrency - balanceInCurrency);

  const clampQtyOnBlur = () => {
    setQty((v) => {
      const n = Number(v || 0);
      if (!Number.isFinite(n) || n < serverBounds.min) return serverBounds.min;
      if (n > serverBounds.max) return serverBounds.max;
      return n;
    });
  };

  const openConfirm = async () => {
    setMessage('');
    setPlaceErr(null);
    if (!selected) return setMessage('Please select a service.');
    if (!link) return setMessage('Please provide a valid link/URL.');

    const nQty = Number(qty || 0);
    if (!Number.isFinite(nQty)) return setMessage('Invalid quantity.');

    try {
      const r = await api.post('/api/orders/quote', { serviceId: Number(selectedId), quantity: nQty });
      const sMin = Number(r.data?.min ?? serverBounds.min ?? 1);
      const sMax = Number(r.data?.max ?? serverBounds.max ?? 1000);

      const serverQty = Number(r.data?.quantity ?? nQty);
      setServerBounds({ min: sMin, max: sMax });
      setPreflight({ ...r.data, serviceName: selected?.name || '', adjusted: serverQty !== nQty, userRequestedQty: nQty });
      setQty(serverQty);
      setShowConfirm(true);
    } catch (e) {
      setMessage(e?.response?.data?.message || 'Failed to confirm price. Try again.');
    }
  };

  const handlePlace = async () => {
    setConfirming(true);
    setPlaceErr(null);
    setMessage('');
    try {
      const nQty = Number(preflight?.quantity || qty || 0);
      const r = await api.post('/api/orders', { serviceId: Number(selectedId), quantity: nQty, link });
      setShowConfirm(false);
      setMessage(`Order placed! ID: ${r.data?.apiOrderId || r.data?.order?._id || '—'}`);
      setLink('');
    } catch (err) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Failed to place order';
      const vendor = err?.response?.data?.vendor || null;
      setPlaceErr({ status, msg, vendor });
    } finally {
      setConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 animate-gradient-x">
      <Navbar />

      <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
        <div className="mb-5">
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">Create Order</h1>
          <p className="text-white/90 text-sm sm:text-base mt-1">
            We strongly recommend you to chose <strong>Best Speed / Non-Drop </strong>service, but you can select cheapet Non-Guarantee service at your own Risk.
          </p>
        </div>

        <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="space-y-5">
          {/* Category & Service */}
          <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 sm:p-5 overflow-visible">
            <label className="block text-sm font-medium text-white mb-2">Category & Service</label>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-start">
              {/* Category select */}
              <div className="lg:col-span-1">
                <label className="block text-xs text-white/80 mb-1">Category</label>
                {loadingCategories ? (
                  <div className="h-[46px] rounded-xl bg-white/20 animate-pulse" />
                ) : (
                  <select
                    value={selectedCategory}
                    onChange={(e) => { setSelectedCategory(e.target.value); setSelectedId(''); setQuery(''); }}
                    className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-4 py-3 outline-none focus:ring-2 focus:ring-white/70 focus:bg-white focus:text-gray-900"
                  >
                    <option value="" disabled className="bg-white text-gray-900">Select a category</option>
                    {allCategories.map(cat => (
                      <option key={cat} value={cat} className="bg-white text-gray-900">{cat}</option>
                    ))}
                  </select>
                )}
              </div>

              {/* Service search */}
              <div className="lg:col-span-1">
                <label className="block text-xs text-white/80 mb-1">Search within category</label>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={!selectedCategory ? 'Choose a category first' : 'Search service by name or ID…'}
                  disabled={!selectedCategory}
                  className={`w-full rounded-xl border px-4 py-3 outline-none focus:ring-2
                    ${selectedCategory
                      ? 'border-white/30 bg-white/20 text-white placeholder-white/80 focus:ring-white/70'
                      : 'border-white/10 bg-white/10 text-white/60 placeholder-white/40 cursor-not-allowed'}`}
                />
              </div>

              {/* Service list with price */}
              <div className="lg:col-span-1">
                <label className="block text-xs text-white/80 mb-1">Service</label>
                {servicesLoading ? (
                  <div className="h-[46px] rounded-xl bg-white/20 animate-pulse" />
                ) : !selectedCategory ? (
                  <div className="w-full h-[46px] flex items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/60 text-sm">
                    Select a category first
                  </div>
                ) : (
                  <div className="relative">
                    <div className="max-h-56 overflow-y-auto rounded-xl border border-white/30 bg-white/20 text-white divide-y divide-white/10">
                      {filteredServices.length === 0 && (
                        <div className="px-4 py-2 text-sm text-white/70">No services found</div>
                      )}
                      {filteredServices.map((s) => {
                        const isActive = String(selectedId) === String(s.service);
                        const perItem = isPerItemService(s);
                        const baseRateUSD = Number(s.rate || 0) * 1.2;
                        const display = perItem
                          ? `${currency} ${money(baseRateUSD, currency)} each`
                          : `${currency} ${money(baseRateUSD, currency)}/1000`;

                        return (
                          <button
                            key={s.service}
                            type="button"
                            onClick={() => {
                              setSelectedId(String(s.service));
                              const nextMin = Number(s.min || 1);
                              const nextMax = Number(s.max || 1000);
                              setServerBounds({ min: nextMin, max: nextMax });
                              setQty((old) => {
                                const n = Number(old || 0);
                                if (!Number.isFinite(n) || n < nextMin) return nextMin;
                                if (n > nextMax) return nextMax;
                                return n;
                              });
                            }}
                            className={`w-full text-left px-4 py-2 hover:bg-white/10 transition ${isActive ? 'bg-white/20' : ''}`}
                            title={`${s.name} — ID ${s.service}`}
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start gap-2">
                              <span className="text-sm whitespace-normal break-words leading-snug">
                                {s.name}{' '}
                                <span className="opacity-70 text-xs">(ID: {s.service})</span>
                              </span>
                              <span className="shrink-0 text-xs sm:text-[13px] font-medium sm:text-right">
                                {display}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {selected && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-xl bg-white/20 backdrop-blur p-3 text-white">
                  <div className="text-[11px] uppercase opacity-80">Category</div>
                  <div className="font-semibold">{selected.category || 'Other'}</div>
                </div>
                <div className="rounded-XL bg-white/20 backdrop-blur p-3 text-white">
                  <div className="text-[11px] uppercase opacity-80">Type</div>
                  <div className="font-semibold">{isPerItemService(selected) ? 'Per Item' : 'Per 1000'}</div>
                </div>
                <div className="rounded-xl bg-white/20 backdrop-blur p-3 text-white">
                  <div className="text-[11px] uppercase opacity-80">
                    {effective.rateType === 'per_1000' ? 'Rate / 1000 (incl. 20%)' : 'Per Unit (incl. 20%)'}
                  </div>
                  <div className="font-semibold">
                    {effective.rateType === 'per_1000'
                      ? `${currency} ${money((Number(effective.perUnitUSD||0)) * 1000, currency)}`
                      : `${currency} ${money(Number(effective.perUnitUSD||0), currency)}`}
                    {quoting && <span className="ml-2 text-xs opacity-80">…updating</span>}
                  </div>
                </div>
              </div>
            )}
            {quoteErr && (
              <div className="mt-2 text-xs text-yellow-200">
                Live price unavailable ({quoteErr}). Using fallback price.
              </div>
            )}
          </div>

          {/* Link + Quantity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 sm:p-5 lg:col-span-2">
              <label className="block text-sm font-medium text-white mb-2">Link / URL</label>
              <input
                type="url"
                required
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://example.com/your-post"
                className="w-full rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-white/70"
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-white mb-2">Quantity</label>
                  <input
                    type="number"
                    min={serverBounds.min}
                    max={serverBounds.max}
                    step={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
                    onBlur={clampQtyOnBlur}
                    className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-4 py-3 outline-none focus:ring-2 focus:ring-white/70"
                  />
                  <p className="text-xs text-white/80 mt-1">Allowed: {serverBounds.min} – {serverBounds.max}</p>
                </div>

                <div className="rounded-xl bg-white/10 border border-white/20 p-3 text-white">
                  <div className="text-[11px] uppercase opacity-80">Per Unit (incl. 20%)</div>
                  <div className="font-semibold">
                    {currency} {money(Number(effective.perUnitUSD||0), currency)}
                    {quoting && <span className="ml-2 text-xs opacity-80">…updating</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Cost & Confirm */}
            <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 sm:p-5 h-fit">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/80">Estimated Cost (incl. 20%)</p>
                  <p className="text-2xl font-bold text-white">
                    {currency} {money(Number(effective.totalUSD||0), currency)} {quoting && <span className="text-sm opacity-80">…</span>}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-white/80">Your Balance</p>
                  <p className="text-base font-semibold text-white">
                    {currency} {money(Number(user?.balance || 0), currency)}
                  </p>
                </div>
              </div>

              {deficit > 0 && (
                <div className="mt-3 rounded-xl border border-red-300 bg-red-100/80 text-red-800 px-3 py-2 text-sm">
                  Not enough balance. Required: <strong>{currency} {money(Number(effective.totalUSD||0), currency)}</strong>.
                </div>
              )}

              <button
                type="button"
                onClick={openConfirm}
                disabled={quoting || !selected || !selectedCategory || !link || deficit > 0}
                className="mt-4 w-full h-11 rounded-xl text-sm font-semibold text-gray-900 bg-white hover:bg-white/90 disabled:opacity-60"
              >
                Review & Confirm
              </button>

              {message && (
                <div className="mt-3 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white">
                  {message}
                </div>
              )}
            </div>
          </div>
        </form>
      </div>

      {/* ---------- Confirm Modal ---------- */}
      {showConfirm && preflight && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirm(false)} />
          <div className="relative w-full max-w-md mx-auto rounded-2xl bg-white/15 backdrop-blur border border-white/25 p-5 text-white">
            <h2 className="text-xl font-semibold mb-3">Confirm Order</h2>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-80">Service</span>
                <span className="font-medium text-right">{preflight.serviceName || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Type</span>
                <span className="font-medium">{preflight.rateType === 'per_item' ? 'Per Item' : 'Per 1000'}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Allowed</span>
                <span className="font-medium">{preflight.min} – {preflight.max}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Quantity</span>
                <span className="font-medium">{preflight.quantity}</span>
              </div>
              {preflight.adjusted && (
                <div className="text-xs text-yellow-200">
                  Note: Quantity was adjusted from {preflight.userRequestedQty} to {preflight.quantity} by the server.
                </div>
              )}
              <div className="flex justify-between pt-2">
                <span className="opacity-80">Per Unit (incl. 20%)</span>
                <span className="font-semibold">{currency} {money(preflight.perUnitUSD, currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Estimated Total (incl. 20%)</span>
                <span className="font-semibold">{currency} {money(preflight.totalUSD, currency)}</span>
              </div>

              {placeErr && (
                <div className="mt-3 rounded-xl border border-red-300 bg-red-100/80 text-red-800 px-3 py-2">
                  <div className="text-sm font-semibold">Failed to place order</div>
                  <div className="text-sm mt-1">Reason: {placeErr.msg}{placeErr.status ? ` (HTTP ${placeErr.status})` : ''}</div>
                  {placeErr.vendor && (
                    <div className="text-xs mt-1">Vendor: {placeErr.vendor}</div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => { setPlaceErr(null); setShowConfirm(false); }}
                className="h-10 px-4 rounded-lg border border-white/30 bg-white/10 hover:bg-white/20"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handlePlace}
                disabled={confirming}
                className="h-10 px-4 rounded-lg font-semibold text-gray-900 bg-white hover:bg-white/90 disabled:opacity-60"
              >
                {confirming ? 'Placing…' : 'Confirm & Place'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
