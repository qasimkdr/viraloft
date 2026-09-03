// frontend/src/components/admin/UserDetailModal.jsx
import React, { useContext, useEffect, useState } from 'react';
import api from '../../lib/api';
import { AuthContext } from '../../context/AuthContext';
import {
  money, fmtDate, orderStatusBadge, accountStatusBadge, roleBadge,
} from '../../lib/format';

/**
 * Full account detail view: profile, recent orders, recent tickets,
 * recent balance transactions. When `canManage` is true (admin), also
 * exposes balance credit/debit, role change, and suspend/ban controls.
 * Staff get the same view in read-only mode — they can see everything
 * about an account to help a user, but can't touch balance/role/status.
 */
export default function UserDetailModal({ userId, canManage, onClose, onChanged }) {
  const { currency = 'PKR' } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [data, setData] = useState(null);

  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const load = async () => {
    setLoading(true);
    setErr('');
    try {
      const r = await api.get(`/api/admin/users/${userId}/detail`);
      setData(r.data);
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to load account details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [userId]);

  const flash = (msg) => { setNotice(msg); setTimeout(() => setNotice(''), 2500); };

  const adjustBalance = async (type) => {
    const num = Number(amount);
    if (!Number.isFinite(num) || num <= 0) {
      setErr('Enter a positive amount first.');
      return;
    }
    setBusy(true);
    setErr('');
    try {
      await api.post(`/api/admin/users/${userId}/balance`, { amount: num, type, reason });
      setAmount('');
      setReason('');
      await load();
      flash(type === 'credit' ? 'Balance added.' : 'Balance removed.');
      onChanged?.();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update balance');
    } finally {
      setBusy(false);
    }
  };

  const changeRole = async (role) => {
    setBusy(true);
    setErr('');
    try {
      await api.put(`/api/admin/users/${userId}`, { role });
      await load();
      flash('Role updated.');
      onChanged?.();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update role');
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = async (status) => {
    if (status !== 'active' && !window.confirm(`Are you sure you want to set this account to "${status}"?`)) return;
    setBusy(true);
    setErr('');
    try {
      await api.put(`/api/admin/users/${userId}/status`, { status, reason });
      await load();
      flash('Account status updated.');
      onChanged?.();
    } catch (e) {
      setErr(e?.response?.data?.message || 'Failed to update account status');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto bg-white sm:rounded-2xl shadow-xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-5 py-4 flex items-center justify-between z-10">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Account details</h3>
            {data?.user && <p className="text-xs text-slate-500">{data.user.email}</p>}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 text-slate-500">✕</button>
        </div>

        <div className="p-5 space-y-6">
          {err && <div className="rounded-xl border border-rose-200 bg-rose-50 text-rose-700 px-4 py-3 text-sm">{err}</div>}
          {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">{notice}</div>}

          {loading || !data ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
            </div>
          ) : (
            <>
              {/* Profile */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Username" value={data.user.username} />
                <Field label="Role">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${roleBadge(data.user.role)}`}>
                    {data.user.role}
                  </span>
                </Field>
                <Field label="Status">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${accountStatusBadge(data.user.status)}`}>
                    {data.user.status || 'active'}
                  </span>
                </Field>
                <Field label="Balance" value={`${currency} ${money(data.user.balance, currency)}`} />
                <Field label="Total orders" value={data.summary.totalOrders} />
                <Field label="Total spent" value={`USD ${Number(data.summary.totalSpentUSD || 0).toFixed(2)}`} />
                <Field label="Email verified" value={data.user.emailVerified ? 'Yes' : 'No'} />
                <Field label="Joined" value={fmtDate(data.user.createdAt)} />
              </div>

              {canManage && (
                <div className="rounded-xl border border-slate-200 p-4 space-y-4">
                  <h4 className="text-sm font-semibold text-slate-900">Manage account</h4>

                  {/* Balance */}
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Add / remove balance (USD)</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full sm:w-32 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Reason (optional, shown in audit log)"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2">
                        <button
                          disabled={busy}
                          onClick={() => adjustBalance('credit')}
                          className="h-[38px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-50"
                        >
                          + Add
                        </button>
                        <button
                          disabled={busy}
                          onClick={() => adjustBalance('debit')}
                          className="h-[38px] px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium disabled:opacity-50"
                        >
                          − Remove
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Role + status */}
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
                      <select
                        disabled={busy}
                        value={data.user.role}
                        onChange={(e) => changeRole(e.target.value)}
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="user">user</option>
                        <option value="staff">staff</option>
                        <option value="admin">admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Account status</label>
                      <div className="flex gap-2">
                        {['active', 'suspended', 'banned'].map((s) => (
                          <button
                            key={s}
                            disabled={busy}
                            onClick={() => changeStatus(s)}
                            className={`px-3 py-2 rounded-lg text-sm font-medium border capitalize disabled:opacity-50 ${
                              data.user.status === s
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent orders */}
              <Section title={`Recent orders (${data.orders.length})`}>
                {data.orders.length === 0 ? (
                  <Empty text="No orders yet." />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Service</th>
                          <th className="text-left px-3 py-2 font-medium">Qty</th>
                          <th className="text-left px-3 py-2 font-medium">Price</th>
                          <th className="text-left px-3 py-2 font-medium">Status</th>
                          <th className="text-left px-3 py-2 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.orders.map((o) => (
                          <tr key={o._id}>
                            <td className="px-3 py-2 max-w-[220px] truncate" title={o.serviceName}>{o.serviceName}</td>
                            <td className="px-3 py-2">{o.quantity}</td>
                            <td className="px-3 py-2">USD {Number(o.price).toFixed(2)}</td>
                            <td className="px-3 py-2">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs border ${orderStatusBadge(o.status)}`}>{o.status}</span>
                            </td>
                            <td className="px-3 py-2 text-slate-500">{fmtDate(o.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Section>

              {/* Recent tickets */}
              <Section title={`Recent support tickets (${data.tickets.length})`}>
                {data.tickets.length === 0 ? (
                  <Empty text="No support tickets." />
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {data.tickets.map((t) => (
                      <li key={t._id} className="px-3 py-2 flex items-center justify-between text-sm">
                        <span className="truncate">{t.subject}</span>
                        <span className="text-xs text-slate-500 capitalize shrink-0 ml-2">{t.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              {/* Transactions */}
              <Section title={`Balance history (${data.transactions.length})`}>
                {data.transactions.length === 0 ? (
                  <Empty text="No balance changes recorded." />
                ) : (
                  <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                    {data.transactions.map((tx) => (
                      <li key={tx._id} className="px-3 py-2 text-sm flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <span className={`font-medium ${tx.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {tx.type === 'credit' ? '+' : '−'}${Number(tx.amount).toFixed(2)}
                          </span>
                          <span className="text-slate-500"> — {tx.reason || tx.source}</span>
                          {tx.performedBy?.username && (
                            <span className="text-slate-400"> by {tx.performedBy.username}</span>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 shrink-0">{fmtDate(tx.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, children }) {
  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-sm font-medium text-slate-900 truncate">{children ?? value ?? '—'}</div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-900 mb-2">{title}</h4>
      {children}
    </div>
  );
}

function Empty({ text }) {
  return <div className="text-sm text-slate-400 rounded-lg border border-dashed border-slate-200 p-4 text-center">{text}</div>;
}
