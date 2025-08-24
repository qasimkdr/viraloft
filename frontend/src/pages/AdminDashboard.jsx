// frontend/src/pages/AdminDashboard.jsx
import React, { useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';

// Simple currency conv.
const FX = { USD: 1, PKR: 280, AED: 3.6725, EUR: 0.92 };
const convert = (usd, currency) => Number(usd || 0) * (FX[currency] || 1);
const money = (usd, currency) =>
  convert(usd, currency).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const badge = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('pending')) return 'bg-amber-100 text-amber-800 border-amber-200';
  if (s.includes('processing')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s.includes('completed') || s.includes('success')) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  if (s.includes('canceled') || s.includes('cancelled') || s.includes('failed')) return 'bg-rose-100 text-rose-800 border-rose-200';
  return 'bg-slate-100 text-slate-800 border-slate-200';
};

export default function AdminDashboard() {
  const { token, currency = 'PKR' } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [orders, setOrders] = useState([]);

  // Editing state: map of userId -> { balance, role, dirty }
  const [editing, setEditing] = useState({});

  // Filters
  const [userQuery, setUserQuery] = useState('');
  const [orderQuery, setOrderQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Orders pagination
  const [orderPage, setOrderPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [statsRes, usersRes, ordersRes] = await Promise.all([
          axios.get('/api/admin/stats', { headers }),
          axios.get('/api/admin/users', { headers }),
          axios.get('/api/admin/orders', { headers }),
        ]);
        if (!ignore) {
          setStats(statsRes.data || null);
          setUsers(Array.isArray(usersRes.data) ? usersRes.data : []);
          setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
          setEditing({}); // reset editing map
        }
      } catch (e) {
        if (!ignore) setErr(e?.response?.data?.message || 'Failed to load admin data');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [token]);

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.username || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      String(u._id || '').toLowerCase().includes(q)
    );
  }, [users, userQuery]);

  const filteredOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    let list = orders;
    if (statusFilter !== 'all') {
      list = list.filter(o => (o.status || '').toLowerCase() === statusFilter);
    }
    if (q) {
      list = list.filter(o =>
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

  const reloadOrders = async () => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const ordersRes = await axios.get('/api/admin/orders', { headers });
      setOrders(Array.isArray(ordersRes.data) ? ordersRes.data : []);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to refresh orders');
    }
  };

  // ----- USER INLINE EDIT -----
  const startEdit = (u) => {
    setEditing((m) => ({
      ...m,
      [u._id]: { balance: String(u.balance ?? 0), role: u.role || 'user', dirty: false },
    }));
  };

  const cancelEdit = (id) => {
    setEditing((m) => {
      const copy = { ...m };
      delete copy[id];
      return copy;
    });
  };

  const onChangeEdit = (id, key, value) => {
    setEditing((m) => ({
      ...m,
      [id]: { ...(m[id] || {}), [key]: value, dirty: true },
    }));
  };

  const saveEdit = async (id) => {
    const row = editing[id];
    if (!row) return;

    // Basic validation
    const balanceNum = Number(row.balance);
    if (Number.isNaN(balanceNum) || balanceNum < 0) {
      setErr('Balance must be a non-negative number.');
      return;
    }
    const role = row.role;
    if (!['user', 'staff', 'admin'].includes(role)) {
      setErr('Invalid role selected.');
      return;
    }

    try {
      const headers = { Authorization: `Bearer ${token}` };
      const { data } = await axios.put(`/api/admin/users/${id}`, { balance: balanceNum, role }, { headers });

      // Update users list locally
      setUsers((list) => list.map((u) => (u._id === id ? { ...u, balance: data.balance, role: data.role } : u)));
      // Clear editing row
      cancelEdit(id);
      setToast('User updated successfully.');
      setTimeout(() => setToast(''), 2500);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update user');
    }
  };

  // ----- ORDER ACTIONS -----
  const updateOrderStatus = async (orderId, nextStatus) => {
    try {
      const headers = { Authorization: `Bearer ${token}` };
      await axios.put(`/api/admin/orders/${orderId}/status`, { status: nextStatus }, { headers });
      await reloadOrders();
      setToast('Order status updated.');
      setTimeout(() => setToast(''), 2000);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update order');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 animate-gradient-x">
      <Navbar />

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow">Admin Dashboard</h1>
          <p className="text-white/90 text-sm sm:text-base">Manage users, monitor orders, and view system stats.</p>
        </div>

        {/* Notifications */}
        {err && (
          <div className="mb-4 rounded-xl border border-rose-300 bg-rose-100/80 text-rose-800 px-4 py-3">
            {err}
          </div>
        )}
        {toast && (
          <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-100/80 text-emerald-800 px-4 py-3">
            {toast}
          </div>
        )}

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {loading ? (
            <>
              {[...Array(4)].map((_, i) => (
                <div key={i} className="rounded-2xl bg-white/20 border border-white/25 h-28 animate-pulse" />
              ))}
            </>
          ) : (
            <>
              <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 text-white">
                <p className="text-sm text-white/80">Total Orders</p>
                <p className="text-3xl font-bold">{stats?.totalOrders ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 text-white">
                <p className="text-sm text-white/80">Completed</p>
                <p className="text-3xl font-bold">{stats?.completedOrders ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 text-white">
                <p className="text-sm text-white/80">Pending</p>
                <p className="text-3xl font-bold">{stats?.pendingOrders ?? 0}</p>
              </div>
              <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 text-white">
                <p className="text-sm text-white/80">Users</p>
                <p className="text-3xl font-bold">{users.length}</p>
              </div>
            </>
          )}
        </div>

        {/* USERS */}
        <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 sm:p-5 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
            <h2 className="text-white text-xl font-semibold">Users</h2>
            <input
              className="w-full sm:w-64 rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/80 px-4 py-2 outline-none focus:ring-2 focus:ring-white/70"
              placeholder="Search username/email/id…"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
          </div>

          <div className="overflow-auto rounded-xl border border-white/25">
            <table className="min-w-full text-sm">
              <thead className="bg-white/10 sticky top-0 backdrop-blur text-white">
                <tr>
                  <th className="text-left px-4 py-3">Username</th>
                  <th className="text-left px-4 py-3">Email</th>
                  <th className="text-left px-4 py-3">Role</th>
                  <th className="text-left px-4 py-3">Balance</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white">
                {loading ? (
                  [...Array(6)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 5 }).map((__, j) => (
                        <td className="px-4 py-3" key={j}><div className="h-4 bg-white/20 rounded w-28" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-white/80" colSpan={5}>No users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map(u => {
                    const row = editing[u._id];
                    const isEditing = !!row;
                    return (
                      <tr key={u._id} className="hover:bg-white/10 transition">
                        <td className="px-4 py-3">{u.username}</td>
                        <td className="px-4 py-3">{u.email}</td>
                        <td className="px-4 py-3 capitalize">
                          {isEditing ? (
                            <select
                              className="rounded-lg border border-white/30 bg-white/20 text-white px-2 py-1 outline-none focus:ring-2 focus:ring-white/70"
                              value={row.role}
                              onChange={(e) => onChangeEdit(u._id, 'role', e.target.value)}
                            >
                              <option className="bg-white text-gray-900" value="user">user</option>
                              <option className="bg-white text-gray-900" value="staff">staff</option>
                              <option className="bg-white text-gray-900" value="admin">admin</option>
                            </select>
                          ) : (
                            u.role
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <input
                              type="number"
                              step="0.001"
                              className="w-32 rounded-lg border border-white/30 bg-white/20 text-white px-2 py-1 outline-none focus:ring-2 focus:ring-white/70"
                              value={row.balance}
                              onChange={(e) => onChangeEdit(u._id, 'balance', e.target.value)}
                            />
                          ) : (
                            <span>{currency} {money(u.balance, currency)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isEditing ? (
                            <div className="flex gap-2">
                              <button
                                onClick={() => saveEdit(u._id)}
                                disabled={!row.dirty}
                                className="rounded-lg bg-white/20 hover:bg-white/30 border border-white/25 px-3 py-1 text-xs disabled:opacity-50"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => cancelEdit(u._id)}
                                className="rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => startEdit(u)}
                              className="rounded-lg bg-white/20 hover:bg-white/30 border border-white/25 px-3 py-1 text-xs"
                            >
                              Edit
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ORDERS */}
        <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 sm:p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
            <h2 className="text-white text-xl font-semibold">Orders</h2>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                className="w-full sm:w-72 rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/80 px-4 py-2 outline-none focus:ring-2 focus:ring-white/70"
                placeholder="Search API ID / user / service…"
                value={orderQuery}
                onChange={(e) => { setOrderQuery(e.target.value); setOrderPage(1); }}
              />
              <select
                className="w-full sm:w-48 rounded-xl border border-white/30 bg-white/20 text-white px-4 py-2 outline-none focus:ring-2 focus:ring-white/70"
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setOrderPage(1); }}
              >
                <option value="all" className="bg-white text-gray-900">All statuses</option>
                <option value="pending" className="bg-white text-gray-900">Pending</option>
                <option value="processing" className="bg-white text-gray-900">Processing</option>
                <option value="completed" className="bg-white text-gray-900">Completed</option>
                <option value="failed" className="bg-white text-gray-900">Failed</option>
                <option value="canceled" className="bg-white text-gray-900">Canceled</option>
              </select>
            </div>
          </div>

          <div className="overflow-auto rounded-xl border border-white/25">
            <table className="min-w-full text-sm">
              <thead className="bg-white/10 sticky top-0 backdrop-blur text-white">
                <tr>
                  <th className="text-left px-4 py-3">API ID</th>
                  <th className="text-left px-4 py-3">Order ID</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Service</th>
                  <th className="text-left px-4 py-3">Qty</th>
                  <th className="text-left px-4 py-3">Price</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-left px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white">
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 8 }).map((__, j) => (
                        <td className="px-4 py-3" key={j}><div className="h-4 bg-white/20 rounded w-24" /></td>
                      ))}
                    </tr>
                  ))
                ) : pageOrders.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-white/80" colSpan={8}>No orders found.</td>
                  </tr>
                ) : (
                  pageOrders.map(o => (
                    <tr key={o._id} className="hover:bg-white/10 transition">
                      <td className="px-4 py-3">{o.apiOrderId || '—'}</td>
                      <td className="px-4 py-3">{o._id}</td>
                      <td className="px-4 py-3">{o.user?.username || '—'}</td>

                      {/* FULL service name — wraps nicely, no truncation */}
                      <td className="px-4 py-3">
                        <div className="max-w-[560px] whitespace-normal break-words leading-snug" title={o.serviceName}>
                          {o.serviceName || '—'}
                        </div>
                      </td>

                      <td className="px-4 py-3">{o.quantity}</td>
                      <td className="px-4 py-3">{currency} {money(o.price, currency)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badge(o.status)}`}>
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => updateOrderStatus(o._id, 'processing')}
                            className="rounded-lg bg-white/20 hover:bg-white/30 border border-white/25 px-3 py-1 text-xs"
                          >
                            Processing
                          </button>
                          <button
                            onClick={() => updateOrderStatus(o._id, 'completed')}
                            className="rounded-lg bg-white/20 hover:bg-white/30 border border-white/25 px-3 py-1 text-xs"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => updateOrderStatus(o._id, 'canceled')}
                            className="rounded-lg bg-white/20 hover:bg-white/30 border border-white/25 px-3 py-1 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {!loading && orderTotalPages > 1 && (
            <div className="flex items-center justify-between mt-4 text-white">
              <span className="text-sm opacity-90">
                Page {orderPageClamped} of {orderTotalPages} • {filteredOrders.length} orders
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrderPage(p => Math.max(1, p - 1))}
                  disabled={orderPageClamped === 1}
                  className="rounded-lg bg-white/20 hover:bg-white/30 border border-white/25 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <button
                  onClick={() => setOrderPage(p => Math.min(orderTotalPages, p + 1))}
                  disabled={orderPageClamped === orderTotalPages}
                  className="rounded-lg bg-white/20 hover:bg-white/30 border border-white/25 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Subtle footer */}
        <div className="text-center text-white/80 text-xs mt-6">
          Dil SMM Admin • Secure area
        </div>
      </div>
    </div>
  );
}
