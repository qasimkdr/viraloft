import React, { useContext, useEffect, useMemo, useState } from "react";
import axios from "axios"; // You can swap to your configured api client if you prefer
import Navbar from "../components/Navbar";
import { AuthContext } from "../context/AuthContext";

// ---- helpers ----
const isStaff = (u) => {
  const r = String(u?.role || "").toLowerCase();
  return r === "admin" || r === "staff";
};
const badge = (status) => {
  const s = String(status || "").toLowerCase();
  if (s === "resolved") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "pending" || s === "open") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "closed") return "bg-gray-200 text-gray-800 border-gray-300";
  return "bg-blue-100 text-blue-800 border-blue-200";
};
const priorityPill = (p) => {
  const v = String(p || "normal").toLowerCase();
  if (v === "urgent") return "bg-rose-100 text-rose-800 border-rose-200";
  if (v === "high") return "bg-orange-100 text-orange-800 border-orange-200";
  if (v === "low") return "bg-sky-100 text-sky-800 border-sky-200";
  return "bg-violet-100 text-violet-800 border-violet-200";
};
const fmt = (d) => { try { return new Date(d).toLocaleString(); } catch { return d || "—"; } };

export default function SupportPage() {
  const { token, user } = useContext(AuthContext);
  const staffMode = isStaff(user);

  // create form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priorityNew, setPriorityNew] = useState("normal");

  // conversation reply
  const [newMessage, setNewMessage] = useState("");
  const [activeTicketId, setActiveTicketId] = useState(null);

  // browsing / lists
  const [scope, setScope] = useState(staffMode ? "all" : "my"); // my | all
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");

  const [tickets, setTickets] = useState([]);
  const [stats, setStats] = useState({ total: 0, open: 0, pending: 0, resolved: 0, unread: 0, mine: 0 });
  const [page, setPage] = useState(1);
  const limit = 15;
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // staff/admin: user search + DM modal (optional; backend endpoint may not exist)
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [userResults, setUserResults] = useState([]);
  const [dmText, setDmText] = useState("");
  const [dmTo, setDmTo] = useState(null);
  const [sendingDM, setSendingDM] = useState(false);

  // ---- API helpers ----
  const fetchPage = async (pageNo) => {
    const params = staffMode
      ? { page: pageNo, limit, scope, q, status: statusFilter, priority: priorityFilter, assignedTo: assignedFilter }
      : { page: pageNo, limit, scope: "my" };

    Object.keys(params).forEach((k) => (params[k] === "" || params[k] == null) && delete params[k]);

    const r = await axios.get("/api/tickets", {
      headers: { Authorization: `Bearer ${token}` },
      params,
    });

    const items = Array.isArray(r.data?.items) ? r.data.items : Array.isArray(r.data) ? r.data : [];
    const more = typeof r.data?.hasMore === "boolean" ? r.data.hasMore : items.length === limit;
    const s = r.data?.stats || {};
    return { items, more, stats: s };
  };

  const refresh = async () => {
    try {
      setLoading(true);
      const { items, more, stats: s } = await fetchPage(1);
      setTickets(items);
      setHasMore(more);
      setPage(1);
      if (s && Object.keys(s).length) setStats((prev) => ({ ...prev, ...s }));
    } catch {
      setTickets([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!staffMode) {
      setScope("my");
      setQ("");
      setStatusFilter("");
      setPriorityFilter("");
      setAssignedFilter("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffMode]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const { items, more, stats: s } = await fetchPage(1);
        if (!mounted) return;
        setTickets(items);
        setHasMore(more);
        setPage(1);
        if (s && Object.keys(s).length) {
          setStats((prev) => ({ ...prev, ...s }));
        } else {
          // local fallback
          const calc = {
            total: items.length,
            open: items.filter((t) => ["open"].includes(String(t.status).toLowerCase())).length,
            pending: items.filter((t) => ["pending"].includes(String(t.status).toLowerCase())).length,
            resolved: items.filter((t) => ["resolved"].includes(String(t.status).toLowerCase())).length,
            unread: items.filter((t) => t.isRead === false).length,
            mine: items.filter((t) => String(t.assignedTo?._id || t.assignedTo) === String(user?._id)).length,
          };
          setStats(calc);
        }
      } catch {
        if (!mounted) return;
        setTickets([]);
        setHasMore(false);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, scope, q, statusFilter, priorityFilter, assignedFilter, staffMode]);

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    try {
      setLoadingMore(true);
      const { items, more } = await fetchPage(page + 1);
      setTickets((prev) => [...prev, ...items]);
      setHasMore(more);
      setPage((p) => p + 1);
    } catch {/* ignore */} finally { setLoadingMore(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await axios.post(
      "/api/tickets",
      { subject, message, priority: priorityNew },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setSubject("");
    setMessage("");
    setPriorityNew("normal");
    refresh();
  };

  const sendMessage = async (ticketId) => {
    if (!newMessage.trim()) return;
    await axios.post(
      `/api/tickets/${ticketId}/message`,
      { text: newMessage },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    setNewMessage("");
    setActiveTicketId(null);
    refresh();
  };

  // staff/admin: inline actions (never rendered for users)
  const patchTicket = async (ticketId, payload) => {
    await axios.patch(`/api/tickets/${ticketId}`, payload, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setTickets((prev) => prev.map((t) => (t._id === ticketId ? { ...t, ...payload } : t)));
  };

  const assignToMe = (t) => patchTicket(t._id, { assignedTo: user?._id || null });
  const clearAssign = (t) => patchTicket(t._id, { assignedTo: null });
  const toggleRead = (t) => patchTicket(t._id, { isRead: !t.isRead });
  const setStatus = (t, val) => patchTicket(t._id, { status: val });
  const setPriority = (t, val) => patchTicket(t._id, { priority: val });

  // staff/admin: user search + DM modal (optional; requires backend endpoints)
  const searchUsers = async () => {
    const qq = userQuery.trim();
    if (!qq) { setUserResults([]); return; }
    const r = await axios.get("/api/users/search", {
      headers: { Authorization: `Bearer ${token}` },
      params: { q: qq },
    });
    setUserResults(Array.isArray(r.data) ? r.data : []);
  };
  const sendDM = async () => {
    if (!dmTo || !dmText.trim()) return;
    try {
      setSendingDM(true);
      await axios.post("/api/staff/messages", { to: dmTo._id, text: dmText }, { headers: { Authorization: `Bearer ${token}` } });
      setDmText(""); setDmTo(null); setUserModalOpen(false);
    } catch {/* ignore */} finally { setSendingDM(false); }
  };

  // fallback counters
  const computed = useMemo(() => {
    const counts = {
      total: tickets.length,
      open: tickets.filter((t) => ["open"].includes(String(t.status).toLowerCase())).length,
      pending: tickets.filter((t) => ["pending"].includes(String(t.status).toLowerCase())).length,
      resolved: tickets.filter((t) => ["resolved"].includes(String(t.status).toLowerCase())).length,
      unread: tickets.filter((t) => t.isRead === false).length,
      mine: tickets.filter((t) => String(t.assignedTo?._id || t.assignedTo) === String(user?._id)).length,
    };
    return Object.keys(stats).length ? stats : counts;
  }, [tickets, stats, user]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 animate-gradient-x">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
        <div className="flex items-end justify-between gap-4 mb-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">Support</h2>
            <p className="text-white/90">
              {staffMode ? "Manage tickets, assign, prioritize and reply." : "Create a ticket and track responses from our team."}
            </p>
          </div>

          {/* Quick counters — only show full set to staff */}
          {staffMode ? (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
              {[
                ["Total", computed.total],
                ["Open", computed.open],
                ["Pending", computed.pending],
                ["Resolved", computed.resolved],
                ["Unread", computed.unread],
                ["My Queue", computed.mine],
              ].map(([label, val]) => (
                <div key={label} className="rounded-xl bg-white/20 backdrop-blur border border-white/25 px-3 py-2 text-white text-center">
                  <div className="text-[11px] uppercase opacity-80">{label}</div>
                  <div className="font-semibold">{val}</div>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        {/* Layout differs for user vs staff */}
        {staffMode ? (
          <>
            {/* Staff: New Ticket + Filters */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* New Ticket */}
              <div className="lg:col-span-1 rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4">
                <h3 className="text-white font-semibold mb-3">New Ticket</h3>
                <form onSubmit={handleCreate} className="space-y-3">
                  <div>
                    <label className="block text-sm text-white/80 mb-1">Subject</label>
                    <input
                      type="text"
                      className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 placeholder-white/70 outline-none focus:ring-2 focus:ring-white/70"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-sm text-white/80">Message</label>
                      <select
                        value={priorityNew}
                        onChange={(e) => setPriorityNew(e.target.value)}
                        className="rounded-lg border border-white/30 bg-white/20 text-white px-2 py-1 text-xs outline-none"
                      >
                        <option value="low" className="bg-white text-gray-900">Low</option>
                        <option value="normal" className="bg-white text-gray-900">Normal</option>
                        <option value="high" className="bg-white text-gray-900">High</option>
                        <option value="urgent" className="bg-white text-gray-900">Urgent</option>
                      </select>
                    </div>
                    <textarea
                      rows="4"
                      className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 placeholder-white/70 outline-none focus:ring-2 focus:ring-white/70"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="w-full h-10 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90">
                    Create Ticket
                  </button>
                </form>
              </div>

              {/* Filters + Actions */}
              <div className="lg:col-span-2 rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4">
                <div className="flex flex-col md:flex-row gap-3 md:items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-white/80 mb-1">Search</label>
                    <input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search subject/message/ticket id…"
                      className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 placeholder-white/70 outline-none focus:ring-2 focus:ring-white/70"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-white/80 mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 outline-none"
                    >
                      <option value="" className="bg-white text-gray-900">All</option>
                      <option value="open" className="bg-white text-gray-900">Open</option>
                      <option value="pending" className="bg-white text-gray-900">Pending</option>
                      <option value="resolved" className="bg-white text-gray-900">Resolved</option>
                      <option value="closed" className="bg-white text-gray-900">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-white/80 mb-1">Priority</label>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value)}
                      className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 outline-none"
                    >
                      <option value="" className="bg-white text-gray-900">All</option>
                      <option value="low" className="bg-white text-gray-900">Low</option>
                      <option value="normal" className="bg-white text-gray-900">Normal</option>
                      <option value="high" className="bg-white text-gray-900">High</option>
                      <option value="urgent" className="bg-white text-gray-900">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-white/80 mb-1">Scope</label>
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 outline-none"
                    >
                      <option value="all" className="bg-white text-gray-900">All Tickets</option>
                      <option value="my" className="bg-white text-gray-900">My Tickets</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-white/80 mb-1">Assigned</label>
                    <input
                      value={assignedFilter}
                      onChange={(e) => setAssignedFilter(e.target.value)}
                      placeholder="User ID / Staff ID"
                      className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 placeholder-white/70 outline-none"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={refresh}
                      className="h-10 px-4 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90"
                    >
                      Refresh
                    </button>
                    <button
                      onClick={() => setUserModalOpen(true)}
                      className="h-10 px-4 rounded-xl border border-white/40 text-white hover:bg-white/10"
                    >
                      DM User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          // USER: simplified New Ticket only (no filters, no counters, no DM)
          <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 mb-5">
            <h3 className="text-white font-semibold mb-3">Open New Ticket</h3>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-sm text-white/80 mb-1">Subject</label>
                <input
                  type="text"
                  className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 placeholder-white/70 outline-none focus:ring-2 focus:ring-white/70"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-1">Message</label>
                <textarea
                  rows="4"
                  className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 placeholder-white/70 outline-none focus:ring-2 focus:ring-white/70"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="w-full h-10 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90">
                Create Ticket
              </button>
            </form>
          </div>
        )}

        {/* Ticket list (shared) */}
        <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 divide-y divide-white/10">
          {loading && (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-white/20 animate-pulse" />
              ))}
            </div>
          )}

          {!loading && tickets.length === 0 && (
            <div className="p-8 text-center text-white/90">
              <p className="text-lg font-semibold">
                {staffMode ? "No tickets found" : "No tickets yet"}
              </p>
              <p className="text-sm opacity-90 mt-1">
                {staffMode ? "Try changing filters or refresh." : "Open a new ticket and our team will respond."}
              </p>
            </div>
          )}

          {!loading &&
            tickets.map((t) => (
              <div key={t._id} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-white font-semibold">{t.subject || "—"}</h4>
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${badge(t.status)}`}>
                        {String(t.status || "open").toUpperCase()}
                      </span>
                      {staffMode && (
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs border ${priorityPill(t.priority)}`}>
                          PRIORITY: {String(t.priority || "normal").toUpperCase()}
                        </span>
                      )}
                      {!t.isRead && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs border border-yellow-200 bg-yellow-100 text-yellow-800">
                          UNREAD
                        </span>
                      )}
                    </div>
                    <div className="text-white/80 text-xs mt-1">
                      Ticket ID: {t._id} • Created {fmt(t.createdAt)}
                      {staffMode && t.assignedTo && (
                        <> • Assigned to: <span className="font-medium">{t.assignedTo?.name || t.assignedTo}</span></>
                      )}
                    </div>
                  </div>

                  {/* Staff controls ONLY visible to staff/admin */}
                  {staffMode && (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={String(t.status || "open").toLowerCase()}
                        onChange={(e) => setStatus(t, e.target.value)}
                        className="rounded-lg border border-white/30 bg-white/20 text-white px-2 py-1 text-xs outline-none"
                        title="Change status"
                      >
                        <option value="open" className="bg-white text-gray-900">Open</option>
                        <option value="pending" className="bg-white text-gray-900">Pending</option>
                        <option value="resolved" className="bg-white text-gray-900">Resolved</option>
                        <option value="closed" className="bg-white text-gray-900">Closed</option>
                      </select>

                      <select
                        value={String(t.priority || "normal").toLowerCase()}
                        onChange={(e) => setPriority(t, e.target.value)}
                        className="rounded-lg border border-white/30 bg-white/20 text-white px-2 py-1 text-xs outline-none"
                        title="Set priority"
                      >
                        <option value="low" className="bg-white text-gray-900">Low</option>
                        <option value="normal" className="bg-white text-gray-900">Normal</option>
                        <option value="high" className="bg-white text-gray-900">High</option>
                        <option value="urgent" className="bg-white text-gray-900">Urgent</option>
                      </select>

                      <button
                        onClick={() => assignToMe(t)}
                        className="text-xs px-3 py-1 rounded-lg border border-white/30 text-white hover:bg-white/10"
                        title="Assign to me"
                      >
                        Assign to me
                      </button>
                      <button
                        onClick={() => clearAssign(t)}
                        className="text-xs px-3 py-1 rounded-lg border border-white/30 text-white hover:bg-white/10"
                        title="Clear assignment"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => toggleRead(t)}
                        className="text-xs px-3 py-1 rounded-lg border border-white/30 text-white hover:bg-white/10"
                        title={t.isRead ? "Mark unread" : "Mark read"}
                      >
                        {t.isRead ? "Mark Unread" : "Mark Read"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Messages */}
                <div className="mt-3 rounded-xl bg-white/10 border border-white/20 p-3 max-h-60 overflow-y-auto space-y-2">
                  {(t.messages || []).map((m, idx) => (
                    <div key={idx} className="text-sm text-white">
                      <div className="flex items-center gap-2">
                        <strong className="text-white/90">
                          {String(m.sender) === String(user?._id)
                            ? "Me"
                            : m.senderName || (m.senderRole ? m.senderRole.toUpperCase() : "User")}
                        </strong>
                        <span className="text-[11px] opacity-80">{fmt(m.createdAt || m.date)}</span>
                      </div>
                      <div className="whitespace-pre-wrap">{m.text}</div>
                    </div>
                  ))}

                  {activeTicketId === t._id ? (
                    <div className="mt-2 space-y-2">
                      <textarea
                        rows="2"
                        className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 placeholder-white/70 outline-none focus:ring-2 focus:ring-white/70"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your reply…"
                      />
                      <div className="flex gap-2">
                        <button
                          className="h-10 px-4 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90"
                          onClick={() => sendMessage(t._id)}
                        >
                          Send
                        </button>
                        <button
                          className="h-10 px-4 rounded-xl border border-white/40 text-white hover:bg-white/10"
                          onClick={() => { setActiveTicketId(null); setNewMessage(""); }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="mt-2 text-sm px-3 py-1 rounded-lg border border-white/30 text-white hover:bg-white/10"
                      onClick={() => setActiveTicketId(t._id)}
                    >
                      Reply
                    </button>
                  )}
                </div>
              </div>
            ))}

          {!loading && hasMore && (
            <div className="p-4 flex justify-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="h-11 px-5 rounded-xl text-sm font-semibold text-gray-900 bg-white hover:bg-white/90 disabled:opacity-60"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* DM User Modal — renders ONLY for staff/admin (requires /api/users/search & /api/staff/messages) */}
      {staffMode && userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setUserModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-white font-semibold">Direct Message a User</h4>
              <button className="text-white/80 hover:text-white" onClick={() => setUserModalOpen(false)} title="Close">✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs text-white/80 mb-1">Search user</label>
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchUsers()}
                  placeholder="Name / Email / ID"
                  className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 placeholder-white/70 outline-none focus:ring-2 focus:ring-white/70"
                />
              </div>
              <div className="md:self-end">
                <button onClick={searchUsers} className="w-full h-10 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90">
                  Search
                </button>
              </div>
            </div>

            <div className="mt-3 max-h-40 overflow-y-auto rounded-xl border border-white/25 bg-white/10 divide-y divide-white/10">
              {userResults.length === 0 ? (
                <div className="px-3 py-2 text-white/80 text-sm">No results</div>
              ) : (
                userResults.map((u) => (
                  <button
                    key={u._id}
                    type="button"
                    onClick={() => setDmTo(u)}
                    className={`w-full text-left px-3 py-2 text-white text-sm hover:bg-white/10 ${dmTo?._id === u._id ? "bg-white/10" : ""}`}
                  >
                    <div className="font-medium">{u.name || u.username || u.email || u._id}</div>
                    <div className="text-xs opacity-80">{u.email} • ID: {u._id}</div>
                  </button>
                ))
              )}
            </div>

            <div className="mt-3">
              <label className="block text-xs text-white/80 mb-1">Message</label>
              <textarea
                rows="3"
                value={dmText}
                onChange={(e) => setDmText(e.target.value)}
                disabled={!dmTo}
                className="w-full rounded-xl border border-white/30 bg-white/20 text-white px-3 py-2 placeholder-white/70 outline-none focus:ring-2 focus:ring-white/70 disabled:opacity-60"
                placeholder={dmTo ? `DM to ${dmTo.name || dmTo.email || dmTo._id}` : "Select a user above"}
              />
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button onClick={() => setUserModalOpen(false)} className="h-10 px-4 rounded-xl border border-white/40 text-white hover:bg-white/10">
                Close
              </button>
              <button
                onClick={sendDM}
                disabled={!dmTo || !dmText.trim() || sendingDM}
                className="h-10 px-4 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90 disabled:opacity-60"
              >
                {sendingDM ? "Sending…" : "Send DM"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
