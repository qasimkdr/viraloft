// frontend/src/pages/StaffDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import AdminShell from '../components/admin/AdminShell';
import StatCard from '../components/admin/StatCard';
import UserDetailModal from '../components/admin/UserDetailModal';
import { fmtDate, orderStatusBadge, roleBadge } from '../lib/format';

const TABS = [
  { key: 'orders', label: 'Orders queue' },
  { key: 'users', label: 'Look up user' },
];

export default function StaffDashboard() {
  const [tab, setTab] = useState('orders');

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const [userQuery, setUserQuery] = useState('');
  const [userResults, setUserResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const loadOrders = async () => {
    setLoadingOrders(true);
    setErr('');
    try {
      const r = await api.get('/api/staff/orders');
      setOrders(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => { loadOrders(); }, []);

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/staff/orders/${id}`, { status });
      await loadOrders();
      flash('Order updated.');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update order');
    }
  };

  const searchUsers = async (e) => {
    e?.preventDefault?.();
    const q = userQuery.trim();
    if (!q) { setUserResults([]); return; }
    setSearching(true);
    try {
      const r = await api.get('/api/users/search', { params: { q } });
      setUserResults(Array.isArray(r.data) ? r.data : []);
    } catch {
      setUserResults([]);
    } finally {
      setSearching(false);
    }
  };

  const summary = useMemo(() => {
    const pending = orders.filter((o) => /pending/i.test(o.status)).length;
    const processing = orders.filter((o) => /processing/i.test(o.status)).length;
    return { total: orders.length, pending, processing };
  }, [orders]);

  return (
    <AdminShell
      title="Staff Dashboard"
      subtitle="Process orders and help users — full account edits stay with admins."
      roleLabel="Staff"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {err && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{err}</div>}
      {toast && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">{toast}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-5">
        <StatCard label="Orders in queue" value={summary.total} loading={loadingOrders} />
        <StatCard label="Pending" value={summary.pending} loading={loadingOrders} tone="amber" />
        <StatCard label="Processing" value={summary.processing} loading={loadingOrders} tone="indigo" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Support tickets</h3>
            <p className="text-xs text-slate-500 mt-0.5">Reply, assign, and manage priority from the shared Support inbox.</p>
          </div>
          <Link to="/support" className="h-9 px-4 inline-flex items-center rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium">
            Open Support inbox
          </Link>
        </div>
      </div>

      {tab === 'orders' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Orders needing action</h2>
            <button onClick={loadOrders} className="h-9 px-3 rounded-lg border border-slate-300 hover:bg-slate-50 text-sm text-slate-700">Refresh</button>
          </div>
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">API ID</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Service</th>
                  <th className="text-left px-4 py-3 font-medium">Qty</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingOrders ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-full animate-pulse" /></td></tr>
                  ))
                ) : orders.length === 0 ? (
                  <tr><td className="px-4 py-4 text-slate-400" colSpan={6}>Queue is clear — no orders need action.</td></tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-600">{o.apiOrderId || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{o.user?.username || '—'}</td>
                      <td className="px-4 py-3"><div className="max-w-[280px] truncate" title={o.serviceName}>{o.serviceName}</div></td>
                      <td className="px-4 py-3">{o.quantity}</td>
                      <td className="px-4 py-3"><span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${orderStatusBadge(o.status)}`}>{o.status}</span></td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => updateStatus(o._id, 'processing')} className="rounded-lg border border-slate-300 hover:bg-slate-50 px-2.5 py-1 text-xs text-slate-700">Processing</button>
                          <button onClick={() => updateStatus(o._id, 'completed')} className="rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 text-xs">Complete</button>
                          <button onClick={() => updateStatus(o._id, 'canceled')} className="rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 px-2.5 py-1 text-xs">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">Look up a user</h2>
          <p className="text-sm text-slate-500 mb-4">
            View a user's orders, tickets, and balance history to help them faster. Balance, role, and account
            status changes are handled by admins.
          </p>
          <form onSubmit={searchUsers} className="flex gap-2 mb-4">
            <input
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder="Search by username, email, or user ID…"
              className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button type="submit" disabled={searching} className="h-[38px] px-4 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium disabled:opacity-50">
              {searching ? 'Searching…' : 'Search'}
            </button>
          </form>

          {userResults.length > 0 && (
            <div className="overflow-auto rounded-xl border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Username</th>
                    <th className="text-left px-4 py-3 font-medium">Email</th>
                    <th className="text-left px-4 py-3 font-medium">Role</th>
                    <th className="text-left px-4 py-3 font-medium">Joined</th>
                    <th className="text-left px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {userResults.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.username}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${roleBadge(u.role)}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedUserId(u._id)} className="rounded-lg border border-slate-300 hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                          View details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          canManage={false}
          onClose={() => setSelectedUserId(null)}
        />
      )}
    </AdminShell>
  );
}
