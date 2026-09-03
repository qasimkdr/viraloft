// frontend/src/pages/VerifyEmail.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

export default function VerifyEmail() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(60); // 60s cooldown
  const navigate = useNavigate();

  const cdLabel = useMemo(() => {
    const mm = String(Math.floor(cooldown / 60)).padStart(2, '0');
    const ss = String(cooldown % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [cooldown]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setMsg('');
    setLoading(true);
    try {
      const payload = {
        email: String(email).toLowerCase().trim(),
        code: String(code).trim(),
      };
      // ✅ your backend route is /api/auth/verify
      const r = await api.post('/api/auth/verify', payload);
      setMsg(r.data?.message || 'Verified');

      if (r.data?.token) {
        localStorage.setItem('token', r.data.token);
        if (r.data?.user) localStorage.setItem('user', JSON.stringify(r.data.user));
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setMsg('');
    setLoading(true);
    try {
      const payload = { email: String(email).toLowerCase().trim() };
      if (!payload.email) {
        setMsg('Please enter your email first');
        return;
      }
      // ✅ your backend route is /api/auth/resend
      const r = await api.post('/api/auth/resend', payload);
      setMsg(r.data?.message || 'Code resent');
      setCooldown(60); // reset cooldown
    } catch (err) {
      setMsg(err?.response?.data?.message || 'Resend failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 animate-gradient-x flex items-center">
      <div className="max-w-md w-full mx-auto bg-white/20 backdrop-blur border border-white/25 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Verify your email</h1>
        <p className="text-white/90 text-sm mb-4">
          Enter the email you registered with and the 6-digit code we sent you.
        </p>

        <form onSubmit={handleVerify} className="space-y-3">
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            inputMode="email"
            className="w-full rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-white/70"
          />
          <input
            type="text"
            required
            inputMode="numeric"
            maxLength={6}
            placeholder="6-digit code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\\D/g, '').slice(0, 6))}
            className="w-full rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/80 px-4 py-3 outline-none focus:ring-2 focus:ring-white/70 tracking-widest text-center"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 rounded-xl text-sm font-semibold text-gray-900 bg-white hover:bg-white/90 disabled:opacity-60"
          >
            {loading ? 'Verifying…' : 'Verify'}
          </button>
        </form>

        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={handleResend}
            disabled={loading || !email || cooldown > 0}
            className="text-sm underline decoration-white/60 underline-offset-2 disabled:opacity-60"
            title={!email ? 'Enter your email first' : cooldown > 0 ? `Wait ${cdLabel}` : ''}
          >
            {cooldown > 0 ? `Resend code in ${cdLabel}` : 'Resend code'}
          </button>
          <button
            onClick={() => { setCode(''); setMsg(''); }}
            className="text-sm text-white/80 hover:text-white"
          >
            Clear code
          </button>
        </div>

        {msg && (
          <div className="mt-4 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm">
            {msg}
          </div>
        )}
      </div>
    </div>
  );
}
