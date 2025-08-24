import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import gsap from 'gsap';
import Navbar from '../components/Navbar';
const badgesSeed = [
  { key: 'tiktokLikes', label: 'TikTok Likes', color: 'from-fuchsia-500 to-pink-500', icon: TikTokIcon, start: 125_400, step: [20, 120] },
  { key: 'instaFollowers', label: 'Instagram Followers', color: 'from-rose-500 to-red-500', icon: InstagramIcon, start: 89_200, step: [10, 80] },
  { key: 'fbComments', label: 'Facebook Comments', color: 'from-blue-500 to-sky-500', icon: FacebookIcon, start: 12_450, step: [5, 30] },
  { key: 'ytSubs', label: 'YouTube Subscribers', color: 'from-red-500 to-rose-600', icon: YouTubeIcon, start: 44_800, step: [7, 40] },
];

function formatCompact(n) {
  try {
    return Intl.NumberFormat(undefined, { notation: 'compact' }).format(n);
  } catch {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return String(n);
  }
}

const LoginPage = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const [stats, setStats] = useState(
    badgesSeed.reduce((acc, b) => {
      acc[b.key] = b.start;
      return acc;
    }, {})
  );

  const badgeRefs = useRef([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const timers = badgesSeed.map((b) =>
      setInterval(() => {
        setStats((prev) => {
          const [min, max] = b.step;
          const delta = Math.floor(Math.random() * (max - min + 1)) + min;
          return { ...prev, [b.key]: prev[b.key] + delta };
        });
      }, 900 + Math.random() * 1200)
    );
    return () => timers.forEach(clearInterval);
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const nodes = badgeRefs.current.filter(Boolean);
      gsap.fromTo(
        nodes,
        { y: 0, rotate: 0 },
        {
          y: (i) => (i % 2 === 0 ? -10 : 12),
          rotate: (i) => (i % 2 === 0 ? -1 : 1),
          duration: 3.5,
          ease: 'sine.inOut',
          yoyo: true,
          repeat: -1,
          stagger: 0.2,
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    }
  };

  return (
   <>
    <Navbar />
    <div
      ref={containerRef}
      className="min-h-screen relative flex items-center justify-center bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-emerald-500"
    >
      {/* dark overlay for contrast */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm -z-10" />

      {/* Floating stat badges */}
      <div className="pointer-events-none absolute inset-0 -z-0">
        <div className="mx-auto max-w-7xl h-full relative">
          <div className="absolute top-20 left-6 sm:left-16">
            <StatBadge
              innerRef={(el) => (badgeRefs.current[0] = el)}
              label={badgesSeed[0].label}
              color={badgesSeed[0].color}
              Icon={badgesSeed[0].icon}
              value={formatCompact(stats[badgesSeed[0].key])}
            />
          </div>
          <div className="absolute top-40 right-8 sm:right-24">
            <StatBadge
              innerRef={(el) => (badgeRefs.current[1] = el)}
              label={badgesSeed[1].label}
              color={badgesSeed[1].color}
              Icon={badgesSeed[1].icon}
              value={formatCompact(stats[badgesSeed[1].key])}
            />
          </div>
          <div className="absolute bottom-24 left-10 sm:left-20">
            <StatBadge
              innerRef={(el) => (badgeRefs.current[2] = el)}
              label={badgesSeed[2].label}
              color={badgesSeed[2].color}
              Icon={badgesSeed[2].icon}
              value={formatCompact(stats[badgesSeed[2].key])}
            />
          </div>
          <div className="absolute bottom-16 right-8 sm:right-28">
            <StatBadge
              innerRef={(el) => (badgeRefs.current[3] = el)}
              label={badgesSeed[3].label}
              color={badgesSeed[3].color}
              Icon={badgesSeed[3].icon}
              value={formatCompact(stats[badgesSeed[3].key])}
            />
          </div>
        </div>
      </div>

      {/* Glassy login card */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-3xl border border-white/40 bg-white/60 backdrop-blur-xl shadow-xl p-6 sm:p-8"
      >
        <div className="mb-6">
          <h2 className="mt-3 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Sign in to your account
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage orders, balance, and support in one place.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
          <input
            type="email"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            type="password"
            className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-sm transition"
        >
          Login
        </button>

        <p className="mt-4 text-sm text-gray-700">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Register
          </Link>
        </p>
      </form>
    </div>
    </>
  );
};

/* ---------- Stat Badge Component ---------- */
function StatBadge({ innerRef, label, color, Icon, value }) {
  return (
    <div
      ref={innerRef}
      className={`select-none rounded-2xl border border-white/30 bg-white/40 backdrop-blur-md shadow-md p-3 sm:p-4 flex items-center gap-3`}
    >
      <div className={`h-10 w-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-sm`}>
        <Icon />
      </div>
      <div>
        <div className="text-xs text-gray-600">{label}</div>
        <div className="text-base font-semibold text-gray-900">{value}</div>
      </div>
    </div>
  );
}

/* ---------- Simple SVG Icons ---------- */
function TikTokIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M16.5 3a5.5 5.5 0 0 0 3 3.5v2a7.5 7.5 0 0 1-3-.77v6.02A6.75 6.75 0 1 1 9 6.25v2.21A4.75 4.75 0 1 0 13.5 13V3h3Z"/></svg>; }
function InstagramIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5-.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"/><path fillRule="evenodd" d="M7 2.5h10A4.5 4.5 0 0 1 21.5 7v10A4.5 4.5 0 0 1 17 21.5H7A4.5 4.5 0 0 1 2.5 17V7A4.5 4.5 0 0 1 7 2.5Zm10 2H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5V7A2.5 2.5 0 0 0 17 4.5Z" clipRule="evenodd"/></svg>; }
function FacebookIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M13 20v-7h2.5l.5-3H13V8.25c0-.86.28-1.5 1.7-1.5H16V4.1C15.65 4.06 14.68 4 13.6 4 11.33 4 10 5.24 10 7.78V10H7.5v3H10v7h3Z"/></svg>; }
function YouTubeIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M23 12s0-3.2-.41-4.61a3 3 0 0 0-2.11-2.12C18.97 4.75 12 4.75 12 4.75s-6.97 0-8.48.52A3 3 0 0 0 1.41 7.4C1 8.8 1 12 1 12s0 3.2.41 4.61a3 3 0 0 0 2.11 2.12c1.51.52 8.48.52 8.48.52s6.97 0 8.48-.52a3 3 0 0 0 2.11-2.12C23 15.2 23 12 23 12Zm-13 3.18V8.82L15.5 12 10 15.18Z"/></svg>; }

export default LoginPage;
