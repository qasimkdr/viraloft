// frontend/src/pages/RegisterPage.jsx
import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import gsap from 'gsap';
import Navbar from '../components/Navbar';
import { AuthContext } from '../context/AuthContext';
import api from '../lib/api'; // ✅ shared client (adds /api prefix + uses VITE_API_BASE)

// --- Floating badges (same vibe as LoginPage) ---
const badgesSeed = [
  { key: 'tiktokLikes',    label: 'TikTok Likes',           color: 'from-pink-500 to-rose-500',    icon: TikTokIcon,    start: 132_800, step: [20, 120] },
  { key: 'instaFollowers', label: 'Instagram Followers',    color: 'from-fuchsia-500 to-pink-500', icon: InstagramIcon, start: 91_400,  step: [10, 80]  },
  { key: 'fbComments',     label: 'Facebook Comments',      color: 'from-sky-500 to-blue-600',     icon: FacebookIcon,  start: 13_120,  step: [5, 30]   },
  { key: 'ytSubs',         label: 'YouTube Subscribers',    color: 'from-amber-500 to-orange-600', icon: YouTubeIcon,   start: 46_500,  step: [7, 40]   },
];

// Small helper to pretty format numbers
function compact(n) {
  try {
    return Intl.NumberFormat(undefined, { notation: 'compact' }).format(n);
  } catch {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000)     return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }
}

export default function RegisterPage() {
  const navigate = useNavigate();
  useContext(AuthContext); // keep import for parity; not used here

  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // animated counters
  const [stats, setStats] = useState(() =>
    badgesSeed.reduce((acc, b) => ({ ...acc, [b.key]: b.start }), {})
  );
  const containerRef = useRef(null);

  useEffect(() => {
    // simple entrance animation
    if (!containerRef.current) return;
    gsap.fromTo(
      containerRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
    );
  }, []);

  // fun counters
  useEffect(() => {
    const id = setInterval(() => {
      setStats((s) => {
        const next = { ...s };
        for (const b of badgesSeed) {
          const [min, max] = b.step;
          const delta = Math.floor(Math.random() * (max - min + 1)) + min;
          next[b.key] = s[b.key] + delta;
        }
        return next;
      });
    }, 1500);
    return () => clearInterval(id);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setSubmitting(true);
    try {
      const payload = {
        username: form.username.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
      };

      // ✅ call backend directly via shared client (works in prod)
      const res = await api.post('/auth/register', payload);

      const msg = res?.data?.message || 'Registration successful. Please verify your email.';
      setMessage(msg);

      // Backend requires email verification before login
      navigate(`/verify-email?email=${encodeURIComponent(payload.email)}`, { replace: true });
    } catch (err) {
      setMessage(err?.response?.data?.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar />
      <div
        ref={containerRef}
        className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500"
      >
        {/* Floating stat badges */}
        <div className="absolute inset-0 pointer-events-none select-none">
          <div className="mx-auto max-w-7xl h-full relative">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4">
              {badgesSeed.map((b) => (
                <Badge key={b.key} label={b.label} value={compact(stats[b.key])} grad={b.color} Icon={b.icon} />
              ))}
            </div>
          </div>
        </div>

        {/* Card */}
        <div className="relative z-10 w-full max-w-md rounded-2xl backdrop-blur bg-white/10 border border-white/20 p-6 shadow-xl">
          <h1 className="text-xl font-semibold text-white mb-1">Create your account</h1>
          <p className="text-white/85 text-sm mb-5">Join Viraloft in seconds.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-100 mb-1">Username</label>
              <input
                type="text"
                className="w-full rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/70 px-4 py-3 outline-none focus:ring-2 focus:ring-white/70"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                placeholder="yourname"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-100 mb-1">Email</label>
              <input
                type="email"
                className="w-full rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/70 px-4 py-3 outline-none focus:ring-2 focus:ring-white/70"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-100 mb-1">Password</label>
              <input
                type="password"
                className="w-full rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/70 px-4 py-3 outline-none focus:ring-2 focus:ring-white/70"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-11 rounded-xl bg-white/20 text-white font-medium hover:bg-white/30 transition disabled:opacity-60"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          {message && (
            <div className="mt-4 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-sm text-white">
              {message}
            </div>
          )}

          <div className="mt-5 text-sm text-white/90">
            Already have an account?{' '}
            <Link to="/login" className="underline underline-offset-4 hover:no-underline">
              Log in
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- UI bits ---------- */
function Badge({ label, value, grad, Icon }) {
  return (
    <div className={`flex items-center gap-3 rounded-2xl px-3 py-2 bg-gradient-to-br ${grad} text-white/95 shadow-sm`}>
      <div className="shrink-0 h-8 w-8 rounded-xl bg-white/20 grid place-items-center">
        <Icon />
      </div>
      <div>
        <div className="text-xs text-white/90">{label}</div>
        <div className="text-base font-semibold text-white">{value}</div>
      </div>
    </div>
  );
}

/* ---------- Simple SVG Icons (inline) ---------- */
function TikTokIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M16.5 3v10a4.5 4.5 0 1 1-7.5 3.5 4.5 4.5 0 0 1 4.5-4.5V7.25c1.2 1.05 2.73 1.73 4.5 1.73V6.25a5.73 5.73 0 0 1-4.5-1.98Z"/></svg>; }
function InstagramIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path fillRule="evenodd" d="M7 3h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4Zm5 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5.5a1 1 0 1 0-2 0v1a1 1 0 1 0 2 0v-1Z" clipRule="evenodd"/></svg>; }
function FacebookIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M13 3h3v3h-3v2.5h3V12h-3v9h-3v-9H7.5v-3H10V7.78C10 5.24 11.33 4 13.6 4 14.5 4 15 4.24 15 5.25V6h-2V3Z"/></svg>; }
function YouTubeIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M21.58 7.19A3 3 0 0 0 19.5 5.2C17.47 5 12 5 12 5s-6.97 0-8.48.52A3 3 0 0 0 2.42 7.19 31 31 0 0 0 2.2 12a31 31 0 0 0 .22 4.81 3 3 0 0 0 2.08 1.99C6.53 19 12 19 12 19s5.47 0 7.5-.2a3 3 0 0 0 2.08-1.99A31 31 0 0 0 21.8 12a31 31 0 0 0-.22-4.81ZM10 15.18V8.82L15.5 12 10 15.18Z"/></svg>; }
