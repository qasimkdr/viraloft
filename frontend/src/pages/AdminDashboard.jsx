// frontend/src/pages/AdminDashboard.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { AuthContext } from '../context/AuthContext';
import AdminShell from '../components/admin/AdminShell';
import StatCard from '../components/admin/StatCard';
import UserDetailModal from '../components/admin/UserDetailModal';
import CreateStaffModal from '../components/admin/CreateStaffModal';
import { money, fmtDate, orderStatusBadge, accountStatusBadge, roleBadge } from '../lib/format';

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'users', label: 'Users' },
  { key: 'orders', label: 'Orders' },
  { key: 'staff', label: 'Staff accounts' },
  { key: 'audit', label: 'Audit log' },
];

export default function AdminDashboard() {
  const { currency = 'PKR' } = useContext(AuthContext);
  const [tab, setTab] = useState('overview');

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const [userQuery, setUserQuery] = useState('');
  const [orderQuery, setOrderQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderPage, setOrderPage] = useState(1);
  const pageSize = 15;

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [createStaffOpen, setCreateStaffOpen] = useState(false);

  const flash = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const loadCore = async () => {
    setLoading(true);
    setErr('');
    try {
      const [statsRes, usersRes, ordersRes] = await Promise.all([
        api.get('/api/admin/stats'),
        api.get('/api/admin/users'),
        api.get('/api/admin/orders'),
      ]);
      setStats(statsRes.data || null);
      setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCore(); }, []);

  useEffect(() => {
    if (tab !== 'audit') return;
    (async () => {
      setAuditLoading(true);
      try {
        const r = await api.get('/api/admin/audit-logs');
        setAuditLogs(Array.isArray(r.data) ? r.data : []);
      } catch {
        setAuditLogs([]);
      } finally {
        setAuditLoading(false);
      }
    })();
  }, [tab]);

  const reloadOrders = async () => {
    try {
      const r = await api.get('/api/admin/orders');
      setOrders(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to refresh orders');
    }
  };

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      String(u._id || '').toLowerCase().includes(q)
    );
  }, [users, userQuery]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    let list = orders;
    if (statusFilter !== 'all') list = list.filter((o) => (o.status || '').toLowerCase() === statusFilter);
    if (q) {
      list = list.filter((o) =>
        String(o.apiOrderId || '').toLowerCase().includes(q) ||
        (o.user?.username || '').toLowerCase().includes(q) ||
        (o.serviceName || '').toLowerCase().includes(q) ||
        String(o._id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [orders, orderQuery, statusFilter]);

  const orderTotalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const orderPageClamped = Math.min(orderPage, orderTotalPages);
  const pageOrders = useMemo(() => {
    const start = (orderPageClamped - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, orderPageClamped]);

  const updateOrderStatus = async (orderId, nextStatus) => {
    try {
      await api.put(`/api/admin/orders/${orderId}/status`, { status: nextStatus });
      await reloadOrders();
      flash('Order status updated.');
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update order');
    }
  };

  const staffAccounts = useMemo(() => users.filter((u) => u.role === 'staff' || u.role === 'admin'), [users]);

  return (
    <AdminShell
      title="Admin Dashboard"
      subtitle="Manage users, orders, staff access, and account security."
      roleLabel="Admin"
      tabs={TABS}
      activeTab={tab}
      onTabChange={setTab}
    >
      {err && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{err}</div>
      )}
      {toast && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">{toast}</div>
      )}

      {tab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total users" value={stats?.totalUsers ?? 0} loading={loading} tone="indigo" />
            <StatCard label="Total orders" value={stats?.totalOrders ?? 0} loading={loading} />
            <StatCard label="Completed orders" value={stats?.completedOrders ?? 0} loading={loading} tone="emerald" />
            <StatCard label="Pending orders" value={stats?.pendingOrders ?? 0} loading={loading} tone="amber" />
            <StatCard label="Open support tickets" value={stats?.openTickets ?? 0} loading={loading} tone="amber" hint="Manage in Support" />
            <StatCard label="Suspended accounts" value={stats?.suspendedCount ?? 0} loading={loading} tone="rose" />
            <StatCard label="Banned accounts" value={stats?.bannedCount ?? 0} loading={loading} tone="rose" />
            <StatCard
              label="Revenue (completed, USD)"
              value={`$${Number(stats?.totalRevenueUSD || 0).toFixed(2)}`}
              loading={loading}
              tone="emerald"
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Quick actions</h3>
            <div className="flex flex-wrap gap-3">
              <Link to="/support" className="h-10 px-4 inline-flex items-center rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium">
                Manage support tickets
              </Link>
              <button onClick={() => setCreateStaffOpen(true)} className="h-10 px-4 inline-flex items-center rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700">
                + Create staff / admin account
              </button>
              <button onClick={() => setTab('users')} className="h-10 px-4 inline-flex items-center rounded-lg border border-slate-300 hover:bg-slate-50 text-sm font-medium text-slate-700">
                Look up a user account
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">All users ({filteredUsers.length})</h2>
            <input
              className="w-full sm:w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Search username / email / id…"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
          </div>

          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Username</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Balance</th>
                  <th className="text-left px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-full animate-pulse" /></td></tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr><td className="px-4 py-4 text-slate-400" colSpan={6}>No users found.</td></tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.username}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${roleBadge(u.role)}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${accountStatusBadge(u.status)}`}>{u.status || 'active'}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{currency} {money(u.balance, currency)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedUserId(u._id)}
                          className="rounded-lg border border-slate-300 hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                        >
                          View details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Orders</h2>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                className="w-full sm:w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Search API ID / user / service…"
                value={orderQuery}
                onChange={(e) => { setOrderQuery(e.target.value); setOrderPage(1); }}
              />
              <select
                className="w-full sm:w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setOrderPage(1); }}
              >
                <option value="all">All statuses</option>
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="canceled">Canceled</option>
              </select>
            </div>
          </div>

          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">API ID</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Service</th>
                  <th className="text-left px-4 py-3 font-medium">Qty</th>
                  <th className="text-left px-4 py-3 font-medium">Price</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-full animate-pulse" /></td></tr>
                  ))
                ) : pageOrders.length === 0 ? (
                  <tr><td className="px-4 py-4 text-slate-400" colSpan={7}>No orders found.</td></tr>
                ) : (
                  pageOrders.map((o) => (
                    <tr key={o._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 text-slate-600">{o.apiOrderId || '—'}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">{o.user?.username || '—'}</td>
                      <td className="px-4 py-3">
                        <div className="max-w-[320px] truncate" title={o.serviceName}>{o.serviceName || '—'}</div>
                      </td>
                      <td className="px-4 py-3">{o.quantity}</td>
                      <td className="px-4 py-3">{currency} {money(o.price, currency)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${orderStatusBadge(o.status)}`}>{o.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <button onClick={() => updateOrderStatus(o._id, 'processing')} className="rounded-lg border border-slate-300 hover:bg-slate-50 px-2.5 py-1 text-xs text-slate-700">Processing</button>
                          <button onClick={() => updateOrderStatus(o._id, 'completed')} className="rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 px-2.5 py-1 text-xs">Complete</button>
                          <button onClick={() => updateOrderStatus(o._id, 'canceled')} className="rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 px-2.5 py-1 text-xs">Cancel</button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {!loading && orderTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-slate-500">Page {orderPageClamped} of {orderTotalPages} • {filteredOrders.length} orders</span>
              <div className="flex gap-2">
                <button onClick={() => setOrderPage((p) => Math.max(1, p - 1))} disabled={orderPageClamped === 1} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40">Prev</button>
                <button onClick={() => setOrderPage((p) => Math.min(orderTotalPages, p + 1))} disabled={orderPageClamped === orderTotalPages} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'staff' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Staff & admin accounts ({staffAccounts.length})</h2>
            <button onClick={() => setCreateStaffOpen(true)} className="h-9 px-4 rounded-lg bg-slate-900 hover:bg-slate-700 text-white text-sm font-medium">
              + New account
            </button>
          </div>
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
                {staffAccounts.length === 0 ? (
                  <tr><td className="px-4 py-4 text-slate-400" colSpan={5}>No staff/admin accounts yet.</td></tr>
                ) : (
                  staffAccounts.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50 transition">
                      <td className="px-4 py-3 font-medium text-slate-900">{u.username}</td>
                      <td className="px-4 py-3 text-slate-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${roleBadge(u.role)}`}>{u.role}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{fmtDate(u.createdAt)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => setSelectedUserId(u._id)} className="rounded-lg border border-slate-300 hover:bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                          View / manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'audit' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Audit log</h2>
          <p className="text-sm text-slate-500 mb-4">Sensitive actions across the panel — balance changes, role/status changes, staff account creation, order overrides.</p>
          <div className="overflow-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Actor</th>
                  <th className="text-left px-4 py-3 font-medium">Details</th>
                  <th className="text-left px-4 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLoading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="h-4 bg-slate-100 rounded w-full animate-pulse" /></td></tr>
                  ))
                ) : auditLogs.length === 0 ? (
                  <tr><td className="px-4 py-4 text-slate-400" colSpan={4}>No actions recorded yet.</td></tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-slate-50 transition align-top">
                      <td className="px-4 py-3 font-mono text-xs text-slate-700 whitespace-nowrap">{log.action}</td>
                      <td className="px-4 py-3 text-slate-700">{log.actor?.username || '—'} <span className="text-slate-400 capitalize">({log.actorRole})</span></td>
                      <td className="px-4 py-3 text-slate-500 max-w-[420px]">
                        <pre className="whitespace-pre-wrap break-words text-xs">{JSON.stringify(log.details || {}, null, 0)}</pre>
                      </td>
                      <td className="px-4 py-3 text-slate-400 whitespace-nowrap">{fmtDate(log.createdAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedUserId && (
        <UserDetailModal
          userId={selectedUserId}
          canManage
          onClose={() => setSelectedUserId(null)}
          onChanged={loadCore}
        />
      )}

      {createStaffOpen && (
        <CreateStaffModal
          onClose={() => setCreateStaffOpen(false)}
          onCreated={() => { loadCore(); flash('Account created.'); }}
        />
      )}
    </AdminShell>
  );
}
