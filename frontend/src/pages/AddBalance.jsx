import React, { useContext, useMemo, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../lib/api';
import { AuthContext } from '../context/AuthContext';

const methods = ['JazzCash', 'Easypaisa', 'Bank Transfer', 'Crypto', 'Other'];

export default function AddBalance() {
  const { token, user, currency } = useContext(AuthContext);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('JazzCash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const numericAmount = useMemo(() => Number(amount), [amount]);
  const validAmount = Number.isFinite(numericAmount) && numericAmount > 0;

  const submitRequest = async (event) => {
    event.preventDefault();
    setSuccess('');
    setError('');

    if (!validAmount) {
      setError('Enter a valid amount greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      const subject = `Balance top-up request - ${currency || 'USD'} ${numericAmount}`;
      const message = [
        `User: ${user?.username || user?.email || 'Account holder'}`,
        `Requested amount: ${currency || 'USD'} ${numericAmount}`,
        `Preferred payment method: ${method}`,
        reference ? `Payment/reference ID: ${reference}` : 'Payment/reference ID: Not provided yet',
        note ? `Note: ${note}` : 'Note: None',
        '',
        'Please send the payment instructions or verify the payment and credit my balance after confirmation.',
      ].join('\n');

      const response = await api.post('/api/tickets',
        { subject, message, priority: 'normal' },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const ticketId = response?.data?.ticket?._id;
      setSuccess(ticketId
        ? `Balance request submitted. Ticket ID: ${ticketId}`
        : 'Balance request submitted successfully.');
      setAmount('');
      setReference('');
      setNote('');
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not submit the balance request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-white">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-8">
          <span className="inline-flex rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-indigo-200">
            Wallet
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">Add Balance</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
            Submit a top-up request for your account. Balance is credited only after payment is verified by Viraloft staff.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
          <form onSubmit={submitRequest} className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20 sm:p-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Amount</span>
                <div className="flex overflow-hidden rounded-xl border border-white/10 bg-black/20 focus-within:border-indigo-400/50">
                  <span className="grid place-items-center border-r border-white/10 px-3 text-sm font-bold text-slate-400">{currency || 'USD'}</span>
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="1000"
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-white outline-none placeholder:text-slate-600"
                    required
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-200">Preferred payment method</span>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#0d1424] px-4 py-3 text-white outline-none focus:border-indigo-400/50"
                >
                  {methods.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
            </div>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Payment / reference ID <span className="font-normal text-slate-500">(optional)</span></span>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Enter transaction ID if you already paid"
                className="w-full rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/50"
              />
            </label>

            <label className="mt-5 block">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Note <span className="font-normal text-slate-500">(optional)</span></span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows="4"
                placeholder="Any information staff should know"
                className="w-full resize-y rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none placeholder:text-slate-600 focus:border-indigo-400/50"
              />
            </label>

            {error && <div className="mt-5 rounded-xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>}
            {success && <div className="mt-5 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">{success}</div>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-xl bg-indigo-500 px-5 font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {submitting ? 'Submitting…' : 'Submit balance request'}
            </button>
          </form>

          <aside className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-violet-500/5 p-5 sm:p-7">
            <h2 className="text-lg font-bold">How it works</h2>
            <ol className="mt-4 space-y-4 text-sm leading-6 text-slate-300">
              <li><strong className="text-white">1.</strong> Enter the amount and preferred payment method.</li>
              <li><strong className="text-white">2.</strong> Viraloft staff will reply to your support request with payment instructions or verification.</li>
              <li><strong className="text-white">3.</strong> Your balance is credited after the payment is confirmed.</li>
            </ol>
            <div className="mt-6 rounded-2xl border border-amber-300/15 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
              Do not send money to an account that was not provided through an official Viraloft support response.
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
