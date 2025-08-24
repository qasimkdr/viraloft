import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";

// --- Currency helpers ---
const FX = { USD: 1, PKR: 280, AED: 3.6725, EUR: 0.92 };
const convertFromUSD = (usd, currency) => Number(usd || 0) * (FX[currency] || 1);
const money = (usd, currency) =>
  convertFromUSD(usd, currency).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// --- Status → badge color ---
const statusStyle = (s) => {
  const v = String(s || "").toLowerCase();
  if (["completed", "success", "done"].includes(v))
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (["pending", "processing", "inprogress", "in progress"].includes(v))
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (["partial"].includes(v))
    return "bg-blue-100 text-blue-800 border-blue-200";
  if (["canceled", "cancelled", "refunded", "failed", "error"].includes(v))
    return "bg-rose-100 text-rose-800 border-rose-200";
  return "bg-gray-100 text-gray-800 border-gray-200";
};

const isTerminal = (s) => {
  const v = String(s || "").toLowerCase();
  return ["completed", "success", "done", "canceled", "cancelled", "refunded", "failed", "error"].includes(v);
};

export default function OrdersPage() {
  const { token, currency } = useContext(AuthContext);

  // data + ui state
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // filters
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  // paging
  const [page, setPage] = useState(1);
  const limit = 20;

  // ref to always read latest orders inside interval
  const ordersRef = useRef([]);
  useEffect(() => { ordersRef.current = orders; }, [orders]);

  const authHeader = { Authorization: `Bearer ${token}` };

  // fetch page
  const fetchPage = async (pageNo) => {
    const r = await axios.get("/api/orders", {
      headers: authHeader,
      params: { page: pageNo, limit },
    });
    const items = Array.isArray(r.data?.items) ? r.data.items : r.data || [];
    const more =
      typeof r.data?.hasMore === "boolean" ? r.data.hasMore : items.length === limit;
    return { items, more };
  };

  // initial load
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { items, more } = await fetchPage(1);
        if (!mounted) return;
        setOrders(items);
        setHasMore(more);
        setPage(1);
      } catch {
        if (!mounted) return;
        setOrders([]);
        setHasMore(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // load more
  const handleLoadMore = async () => {
    if (!hasMore || loadingMore) return;
    try {
      setLoadingMore(true);
      const { items, more } = await fetchPage(page + 1);
      setOrders((prev) => [...prev, ...items]);
      setHasMore(more);
      setPage((p) => p + 1);
      // refresh statuses for the newly added ones
      setTimeout(refreshStatuses, 0);
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
    }
  };

  // ---- Live status refresh (batch) ----
  const refreshStatuses = async () => {
    if (!token) return;
    // Only poll non-terminal ones with a vendor id
    const targets = ordersRef.current.filter(
      (o) => o.apiOrderId && !isTerminal(o.status)
    );
    if (targets.length === 0) return;

    try {
      const ids = targets.map((o) => String(o.apiOrderId));
      const { data } = await axios.post(
        "/api/orders/status/batch",
        { ids },
        { headers: authHeader }
      );
      const map = data?.results || {};
      if (Object.keys(map).length === 0) return;

      setOrders((prev) =>
        prev.map((o) => {
          const hit = map[String(o.apiOrderId)];
          if (hit?.ok && hit.status && hit.status !== o.status) {
            return { ...o, status: hit.status };
          }
          return o;
        })
      );
    } catch {
      // silent fail (UI keeps existing statuses)
    }
  };

  // Kick an immediate refresh once data arrives, then poll every 15s (only when tab visible)
  useEffect(() => {
    if (!token) return;
    let timer;
    const start = () => {
      refreshStatuses(); // immediate
      timer = setInterval(() => {
        if (document.visibilityState === "visible") refreshStatuses();
      }, 15000);
    };
    start();
    return () => { if (timer) clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // client-side filter
  const filtered = useMemo(() => {
    const qn = q.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesQ =
        !qn ||
        String(o.serviceName || "").toLowerCase().includes(qn) ||
        String(o.apiOrderId || "").toLowerCase().includes(qn) ||
        String(o.link || "").toLowerCase().includes(qn);
      const matchesStatus =
        !status || String(o.status || "").toLowerCase() === status.toLowerCase();
      return matchesQ && matchesStatus;
    });
  }, [orders, q, status]);

  const copyLink = async (text) => {
    try { await navigator.clipboard.writeText(text || ""); } catch {}
  };

  const fmtDate = (iso) => {
    try { return new Date(iso).toLocaleString(); } catch { return iso || "—"; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 animate-gradient-x">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4">
          <div className="flex-1">
            <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">
              My Orders
            </h2>
          </div>

          {/* Filters + manual refresh */}
          <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search service / ID / link…"
              className="w-full sm:w-72 rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/80 px-3 py-2 outline-none focus:ring-2 focus:ring-white/70"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full sm:w-44 rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 outline-none focus:ring-2 focus:ring-white/70"
            >
              <option value="" className="bg-white text-gray-900">All Statuses</option>
              <option value="pending" className="bg-white text-gray-900">Pending / Processing</option>
              <option value="completed" className="bg-white text-gray-900">Completed</option>
              <option value="partial" className="bg-white text-gray-900">Partial</option>
              <option value="canceled" className="bg-white text-gray-900">Canceled / Failed</option>
            </select>

            <button
              onClick={refreshStatuses}
              className="h-10 px-4 rounded-xl text-sm font-semibold text-gray-900 bg-white hover:bg-white/90"
              title="Refresh statuses"
            >
              Refresh statuses
            </button>
          </div>
        </div>

        {/* Content card */}
        <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-0 overflow-hidden">
          {/* Table header */}
          <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-3 bg-white/10 text-white text-xs font-semibold uppercase tracking-wide">
            <div className="col-span-2">ORDER ID</div>
            <div className="col-span-3">Service</div>
            <div className="col-span-1 text-right">Qty</div>
            <div className="col-span-3">Date</div>
            <div className="col-span-1 text-right">Price</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div className="divide-y divide-white/10">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3 grid md:grid-cols-12 gap-2 items-center">
                  <div className="h-4 bg-white/20 rounded col-span-2" />
                  <div className="h-4 bg-white/20 rounded col-span-3" />
                  <div className="h-4 bg-white/20 rounded col-span-1" />
                  <div className="h-4 bg-white/20 rounded col-span-3" />
                  <div className="h-4 bg-white/20 rounded col-span-1" />
                  <div className="h-6 bg-white/20 rounded col-span-2" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="p-8 text-center text-white/90">
              <p className="text-lg font-semibold">No orders found</p>
              <p className="text-sm opacity-90 mt-1">Try adjusting your filters or search query.</p>
            </div>
          )}

          {/* Rows */}
          {!loading && filtered.length > 0 && (
            <div className="divide-y divide-white/10">
              {filtered.map((o) => {
                const priceUSD = Number(o.price || 0); // stored USD
                const displayPrice = money(priceUSD, currency);
                return (
                  <div key={o._id} className="px-4 py-4 grid grid-cols-1 md:grid-cols-12 md:items-center gap-3 text-white">
                    {/* API ID */}
                    <div className="md:col-span-2">
                      <div className="md:hidden text-[11px] uppercase opacity-80">API ID</div>
                      <div className="font-medium">{o.apiOrderId || "—"}</div>
                    </div>

                    {/* Service */}
                    <div className="md:col-span-3">
                      <div className="md:hidden text-[11px] uppercase opacity-80">Service</div>
                      <div className="whitespace-normal break-words leading-snug">{o.serviceName || "—"}</div>
                    </div>

                    {/* Quantity */}
                    <div className="md:col-span-1 md:text-right">
                      <div className="md:hidden text-[11px] uppercase opacity-80">Quantity</div>
                      <div className="font-medium">{o.quantity}</div>
                    </div>

                    {/* Date */}
                    <div className="md:col-span-3">
                      <div className="md:hidden text-[11px] uppercase opacity-80">Date</div>
                      <div className="text-sm">{fmtDate(o.createdAt)}</div>
                    </div>

                    {/* Price */}
                    <div className="md:col-span-1 md:text-right">
                      <div className="md:hidden text-[11px] uppercase opacity-80">Price</div>
                      <div className="font-semibold">{currency} {displayPrice}</div>
                    </div>

                    {/* Status */}
                    <div className="md:col-span-2 md:text-right">
                      <div className="md:hidden text-[11px] uppercase opacity-80">Status</div>
                      <span className={"inline-flex items-center px-2.5 py-1 rounded-full text-xs border " + statusStyle(o.status)}>
                        {String(o.status || "—").toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Load more */}
        {!loading && hasMore && (
          <div className="flex justify-center">
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="mt-5 inline-flex items-center justify-center h-11 px-5 rounded-xl text-sm font-semibold text-gray-900 bg-white hover:bg-white/90 disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
