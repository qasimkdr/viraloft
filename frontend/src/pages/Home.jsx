// frontend/src/pages/Home.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import gsap from 'gsap';
import Navbar from '../components/Navbar';

/**
 * Viraloft — Public landing page (logged-out)
 * - Keeps your original sections (Hero, Counters, Why Choose Us, Services, Reviews)
 * - Adds: Trusted By, How It Works, What Makes Us Different, Policies, Extended FAQ, Newsletter, CTA
 * - Uses your existing gradient background + glass look + GSAP entrances
 */

const counters = [
  { label: 'Completed Orders', end: 128.4, suffix: 'K+' },
  { label: 'Satisfied Customers', end: 42.7, suffix: 'K+' },
  { label: 'Years in Service', end: 3,   suffix: '+'  },
  { label: 'Average Rating', end: 4.9,   suffix: '★'  },
];

const features = [
  { title: 'Fast Delivery',        desc: 'Most orders start within minutes.',                 icon: ZapIcon },
  { title: 'Best in Pakistan',     desc: 'Local support, PKR-friendly pricing.',            icon: TrophyIcon },
  { title: 'Secure Payments',      desc: 'Trusted gateways & wallet balance.',              icon: ShieldIcon },
  { title: '24/7 Support',         desc: 'Real humans, real solutions.',                    icon: HeadsetIcon },
];

// DO NOT add more services than these (as requested)
const services = [
  { key: 'tiktok',    title: 'TikTok',    list: ['Likes', 'Followers', 'Views', 'Comments'],              icon: TikTokIcon,    color: 'from-fuchsia-500 to-pink-500' },
  { key: 'instagram', title: 'Instagram', list: ['Likes', 'Followers', 'Reels Views', 'Comments'],        icon: InstagramIcon, color: 'from-rose-500 to-red-500' },
  { key: 'facebook',  title: 'Facebook',  list: ['Likes', 'Followers', 'Page Growth', 'Comments'],        icon: FacebookIcon,  color: 'from-blue-500 to-sky-500' },
  { key: 'twitter',   title: 'X (Twitter)', list: ['Likes', 'Followers', 'Retweets', 'Views'],            icon: TwitterIcon,   color: 'from-slate-700 to-gray-900' },
  { key: 'youtube',   title: 'YouTube',   list: ['Subscribers', 'Likes', 'Views', 'Comments'],            icon: YouTubeIcon,   color: 'from-red-500 to-rose-600' },
  { key: 'spotify',   title: 'Spotify',   list: ['Plays', 'Followers', 'Playlist Boost'],                 icon: SpotifyIcon,   color: 'from-emerald-500 to-green-600' },
  { key: 'canva',     title: 'Canva',     list: ['Team Seats', 'Templates Boost'],                        icon: CanvaIcon,     color: 'from-cyan-500 to-sky-500' },
  { key: 'chatgpt',   title: 'ChatGPT',   list: ['Plus Guidance', 'API Setup'],                           icon: ChatGPTIcon,   color: 'from-emerald-600 to-teal-600' },
];

const reviews = [
  { name: 'Ahsan I.', handle: '@ahsanvlogs', text: 'Super fast and reliable. My YouTube order started in under 2 minutes!', avatar: 'AI' },
  { name: 'Hira K.',  handle: '@hiraa',      text: 'Prices are great, plus I love the PKR balance and instant updates.',     avatar: 'HK' },
  { name: 'Usman R.', handle: '@usman_dev',  text: 'Support helped me choose the right package. Very satisfied!',            avatar: 'UR' },
];

// Extra content sections
const trustedBadges = ['Nova', 'Astra', 'Meridian', 'Lumina', 'Bolt', 'Orion'];
const howItWorks = [
  ['Create account', 'Register in seconds and secure your wallet.', UserPlusIcon],
  ['Browse services', 'Pick the platform & service you need.', GridIcon],
  ['Get a live quote', 'Quantity adjusts price; min/max auto-validated.', CalculatorIcon],
  ['Place order', 'We process safely; you track statuses in real time.', RocketIcon],
];
const differentiators = [
  ['Real Ad Services', '100% policy-compliant ads for long-term growth.', BadgeCheckIcon],
  ['Local Payments', 'JazzCash, Easypaisa, Upaisa & cards supported.', WalletIcon],
  ['Transparent Logs', 'Orders & transactions are recorded for clarity.', ListIcon],
  ['Refill Options', 'Eligible services include refill coverage periods.', RefreshIcon],
];

const faq = [
  ['Is Viraloft safe to use?', 'Yes. We follow platform rules and provide compliant options (like Real Ad Services).'],
  ['How do you bill?', 'Prepaid wallet. Deposit via local gateways or cards; spend on any service.'],
  ['What if a link is private/invalid?', 'Orders need public, correct links. Invalid links may fail (no responsibility).'],
  ['Do you issue refunds?', 'Undelivered guaranteed services are credited back to your panel balance.'],
  ['When will my order start?', 'Usually within minutes, but timing depends on service and platform conditions.'],
  ['Where are policies?', 'See the Terms & Policies page for Privacy, Refunds, and Service rules.'],
];

export default function Home() {
  const navigate = useNavigate();
  const containerRef = useRef(null);

  // Counter state
  const [values, setValues] = useState(counters.map(() => 0));
  const ioRef = useRef(null);
  const hasAnimated = useRef(false);

  // Animate counters when section enters viewport
  useEffect(() => {
    const section = document.getElementById('metrics');
    if (!section) return;

    const onEnter = () => {
      if (hasAnimated.current) return;
      hasAnimated.current = true;

      counters.forEach((c, i) => {
        const obj = { val: 0 };
        gsap.to(obj, {
          val: c.end,
          duration: 2 + (i * 0.4),
          ease: 'power2.out',
          onUpdate: () => {
            setValues((prev) => {
              const copy = [...prev];
              copy[i] = obj.val;
              return copy;
            });
          },
        });
      });
    };

    const io = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) onEnter();
    }, { threshold: 0.4 });
    io.observe(section);
    ioRef.current = io;
    return () => io.disconnect();
  }, []);

  // Entrance animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.hero-in', { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out' });
      gsap.fromTo('.feature-card', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.05, ease: 'power2.out', delay: 0.15 });
      gsap.fromTo('.service-card', { autoAlpha: 0, y: 18, rotateX: -4 }, { autoAlpha: 1, y: 0, rotateX: 0, duration: 0.5, stagger: 0.04, ease: 'power2.out', delay: 0.2 });
      gsap.fromTo('.review-card', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.08, ease: 'power2.out', delay: 0.25 });
      gsap.fromTo('.badge-card', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.2 });
      gsap.fromTo('.step-card', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.25 });
      gsap.fromTo('.diff-card', { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5, stagger: 0.05, ease: 'power2.out', delay: 0.25 });
      gsap.fromTo('.faq-item', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.04, ease: 'power2.out', delay: 0.2 });
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const fmt = (n, idx) => {
    const { suffix } = counters[idx];
    const val = counters[idx].end >= 10 ? Number(n).toFixed(1) : Math.round(n);
    return `${val}${suffix}`;
  };

  // Newsletter mock submit
  const [email, setEmail] = useState('');
  const [newsletterMsg, setNewsletterMsg] = useState('');
  const handleNewsletter = (e) => {
    e.preventDefault();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setNewsletterMsg('Please enter a valid email.');
      return;
    }
    setNewsletterMsg('Thanks! We’ll keep you posted with updates.');
    setEmail('');
  };

  return (
    <>
      <Navbar />
      <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 animate-gradient-x">
        {/* Hero */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pt-6 pb-10 sm:pb-14">
          <div className="text-center">
            <h1 className="hero-in text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white drop-shadow-sm">
              Grow Faster on Socials — <span className="text-emerald-200">Effortlessly</span>
            </h1>
            <p className="hero-in mt-3 sm:mt-4 text-white/90 text-sm sm:text-base md:text-lg max-w-2xl mx-auto">
              One dashboard for TikTok, Instagram, Facebook, X, YouTube, Spotify & more. Refill your balance, order services, and track results in real time.
            </p>
            <div className="hero-in mt-5 flex items-center justify-center gap-3">
              <Link to="/register" className="inline-flex items-center h-11 px-5 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90">
                Get Started
              </Link>
              <button
                onClick={() => navigate('/login')}
                className="inline-flex items-center h-11 px-5 rounded-xl border border-white/60 text-white font-semibold hover:bg-white/10"
              >
                Login
              </button>
            </div>
          </div>
        </section>

        {/* Trusted By */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10 sm:pb-14">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 sm:p-5">
            <p className="text-center text-white/80 text-xs sm:text-sm mb-3">Trusted by creators & brands</p>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
              {trustedBadges.map((b) => (
                <div key={b} className="badge-card rounded-xl bg-white/15 border border-white/25 py-3 text-center text-white font-semibold">{b}</div>
              ))}
            </div>
          </div>
        </section>

        {/* Counters */}
        <section id="metrics" className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10 sm:pb-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {counters.map((c, i) => (
              <div key={c.label} className="rounded-2xl bg-white/15 backdrop-blur border border-white/25 p-4 sm:p-5 text-center text-white">
                <div className="text-2xl sm:text-3xl md:text-4xl font-extrabold">
                  {fmt(values[i], i)}
                </div>
                <div className="mt-1 text-xs sm:text-sm opacity-90">{c.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10 sm:pb-14">
          <h2 className="text-white text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Why choose Viraloft</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {features.map((f) => (
              <div key={f.title} className="feature-card rounded-2xl p-4 sm:p-5 bg-white/20 backdrop-blur border border-white/25 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                    <f.icon />
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                </div>
                <p className="mt-2 text-sm opacity-90">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10 sm:pb-14">
          <h2 className="text-white text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {howItWorks.map(([title, desc, Icon], idx) => (
              <div key={title} className="step-card rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 sm:p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center"><Icon /></div>
                  <div>
                    <div className="text-[11px] uppercase opacity-80">Step {idx + 1}</div>
                    <h3 className="text-lg font-semibold">{title}</h3>
                  </div>
                </div>
                <p className="mt-2 text-sm opacity-90">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Services (unchanged list) */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10 sm:pb-14">
          <h2 className="text-white text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Our services</h2>
          <ul className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
            {services.map((s) => (
              <li key={s.key} className="service-card group">
                <div className={`rounded-2xl p-4 sm:p-5 text-white shadow-sm hover:shadow-lg transition-all duration-300 bg-gradient-to-br ${s.color}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center">
                          <s.icon />
                        </div>
                        <h3 className="text-lg font-semibold">{s.title}</h3>
                      </div>
                      <p className="text-xs sm:text-sm opacity-90 mt-1">We provide:</p>
                    </div>
                  </div>

                  <ul className="mt-3 grid grid-cols-2 gap-2 text-xs sm:text-sm">
                    {s.list.map((item) => (
                      <li key={item} className="rounded-xl bg-white/20 backdrop-blur p-2 text-center">{item}</li>
                    ))}
                  </ul>

                  <div className="mt-4 flex items-center justify-between">
                    <Link
                      to="/register"
                      className="inline-flex items-center justify-center h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-medium bg-white/20 backdrop-blur hover:bg-white/30 transition"
                    >
                      Start now
                    </Link>
                    <span className="text-[11px] opacity-80">Trusted • Fast • Secure</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* What makes us different */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10 sm:pb-14">
          <h2 className="text-white text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">What makes us different</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {differentiators.map(([title, desc, Icon]) => (
              <div key={title} className="diff-card rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 sm:p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center"><Icon /></div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                </div>
                <p className="mt-2 text-sm opacity-90">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Policies / Compliance strip */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10 sm:pb-14">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-4 sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {[
                ['Privacy Policy', 'We do not sell or share your personal data.', LockIcon],
                ['Refund Policy', 'Undelivered guaranteed services → credited to balance.', RefundIcon],
                ['Service Policy', 'Digital-only delivery; timing varies per service.', PackageIcon],
                ['Terms & Conditions', 'Always be respectful and follow platform rules.', DocumentIcon],
              ].map(([title, desc, Icon]) => (
                <div key={title} className="rounded-xl bg-white/15 border border-white/25 p-3 text-white">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-white/20 flex items-center justify-center"><Icon /></div>
                    <div className="font-semibold">{title}</div>
                  </div>
                  <p className="mt-1 text-xs opacity-90">{desc}</p>
                  <button
                    onClick={() => navigate('/terms')}
                    className="mt-2 text-[12px] underline decoration-white/60 underline-offset-2"
                  >
                    Read more
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Reviews */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-14">
          <h2 className="text-white text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">What customers say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
            {reviews.map((r) => (
              <div key={r.handle} className="review-card rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 sm:p-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-white/25 flex items-center justify-center font-semibold">{r.avatar}</div>
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs opacity-90">{r.handle}</div>
                  </div>
                </div>
                <p className="mt-3 text-sm opacity-95">{r.text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Extended FAQ */}
        <section className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-12">
          <h2 className="text-white text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Frequently asked questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {faq.map(([q, a]) => (
              <details key={q} className="faq-item rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-4 text-white">
                <summary className="cursor-pointer font-semibold">{q}</summary>
                <p className="mt-2 text-sm opacity-90">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Newsletter */}
        <section className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 pb-12">
          <div className="rounded-2xl bg-white/20 backdrop-blur border border-white/25 p-5 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center"><MailIcon /></div>
                <div>
                  <div className="text-lg font-semibold">Stay in the loop</div>
                  <p className="text-sm opacity-90">Product updates, tips, and new services — never spam.</p>
                </div>
              </div>
              <form onSubmit={handleNewsletter} className="flex gap-2 w-full sm:w-auto">
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 sm:w-72 rounded-xl border border-white/30 bg-white/20 text-white placeholder-white/70 px-3 py-2 outline-none focus:ring-2 focus:ring-white/70"
                />
                <button className="shrink-0 h-10 px-4 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90">
                  Subscribe
                </button>
              </form>
            </div>
            {newsletterMsg && (
              <div className="mt-3 text-sm">{newsletterMsg}</div>
            )}
          </div>
        </section>

        {/* Big CTA */}
        <section className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 pb-16">
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/20 p-6 sm:p-8 text-center text-white">
            <h3 className="text-2xl sm:text-3xl font-extrabold">Ready to level up your social growth?</h3>
            <p className="mt-2 text-white/90">Create your Viraloft account and place your first order in minutes.</p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <Link to="/register" className="inline-flex items-center h-11 px-5 rounded-xl bg-white text-gray-900 font-semibold hover:bg-white/90">
                Create free account
              </Link>
              <button
                onClick={() => navigate('/terms')}
                className="inline-flex items-center h-11 px-5 rounded-xl border border-white/60 text-white font-semibold hover:bg-white/10"
              >
                Read our policies
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/20 bg-white/10">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between text-white/90 text-sm">
            <div className="flex items-center gap-2 mb-2 sm:mb-0">
              <LogoIcon />
              <span>Viraloft</span>
            </div>
            <div className="flex gap-4">
              <button onClick={() => navigate('/terms')} className="hover:underline">Terms</button>
              <button onClick={() => navigate('/support')} className="hover:underline">Support</button>
              <button onClick={() => navigate('/login')} className="hover:underline">Login</button>
              <button onClick={() => navigate('/register')} className="hover:underline">Register</button>
            </div>
            <div className="opacity-90 mt-2 sm:mt-0">© {new Date().getFullYear()} Viraloft. All rights reserved.</div>
          </div>
        </footer>
      </div>
    </>
  );
}

/* ---------------- Inline Icons ---------------- */
function LogoIcon()       { return <svg viewBox="0 0 24 24" className="h-6 w-6 text-white" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 15h-2v-2h2Zm0-4h-2V7h2Z"/></svg>; }
function ZapIcon()        { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M13 2 3 14h7v8l11-14h-8z"/></svg>; }
function TrophyIcon()     { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M19 4h2v3a5 5 0 0 1-5 5h-.1A6 6 0 0 1 13 14v3h3v2H8v-2h3v-3a6 6 0 0 1-2.9-2H7a5 5 0 0 1-5-5V4h2V3h15v1Zm-2 1H5v2a3 3 0 0 0 3 3h.3a6 6 0 0 0 7.4 0H16a3 3 0 0 0 3-3V5Z"/></svg>; }
function ShieldIcon()     { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M12 2 3 6v6c0 5 3.9 9.4 9 10 5.1-.6 9-5 9-10V6l-9-4Z"/></svg>; }
function HeadsetIcon()    { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M12 3a8 8 0 0 0-8 8v6a3 3 0 0 0 3 3h3v-7H7v-2a5 5 0 0 1 10 0v2h-3v7h3a3 3 0 0 0 3-3v-6a8 8 0 0 0-8-8Z"/></svg>; }
function TikTokIcon()     { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M16.5 3a5.5 5.5 0 0 0 3 3.5v2a7.5 7.5 0 0 1-3-.77v6.02A6.75 6.75 0 1 1 9 6.25v2.21A4.75 4.75 0 1 0 13.5 13V3h3Z"/></svg>; }
function InstagramIcon()  { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm6.5-.75a1.25 1.25 0 1 0 0-2.5 1.25 1.25 0 0 0 0 2.5Z"/><path fillRule="evenodd" d="M7 2.5h10A4.5 4.5 0 0 1 21.5 7v10A4.5 4.5 0 0 1 17 21.5H7A4.5 4.5 0 0 1 2.5 17V7A4.5 4.5 0 0 1 7 2.5Zm10 2H7A2.5 2.5 0 0 0 4.5 7v10A2.5 2.5 0 0 0 7 19.5h10a2.5 2.5 0 0 0 2.5-2.5V7A2.5 2.5 0 0 0 17 4.5Z" clipRule="evenodd"/></svg>; }
function FacebookIcon()   { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M13 20v-7h2.5l.5-3H13V8.25c0-.86.28-1.5 1.7-1.5H16V4.1C15.65 4.06 14.68 4 13.6 4 11.33 4 10 5.24 10 7.78V10H7.5v3H10v7h3Z"/></svg>; }
function TwitterIcon()    { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M19.6 7.2c.01.2.01.4.01.6 0 6.1-4.65 13.2-13.16 13.2A13.06 13.06 0 0 1 2 19.4c.3.03.6.04.9.04A9.26 9.26 0 0 0 8 17.6a4.63 4.63 0 0 1-4.32-3.2c.3.05.6.08.92.08.44 0 .86-.06 1.26-.17A4.62 4.62 0 0 1 3 9.8v-.06c.62.34 1.33.55 2.08.58A4.62 4.62 0 0 1 3.9 6.3a13.13 13.13 0 0 0 9.54 4.84 5.22 5.22 0 0 1-.11-1.06 4.62 4.62 0 0 1 7.99-3.16 9.23 9.23 0 0 0 2.94-1.12 4.63 4.63 0 0 1-2.03 2.55 9.16 9.16 0 0 0 2.65-.73 9.92 9.92 0 0 1-2.28 2.36Z"/></svg>; }
function YouTubeIcon()    { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M23 12s0-3.2-.41-4.61a3 3 0 0 0-2.11-2.12C18.97 4.75 12 4.75 12 4.75s-6.97 0-8.48.52A3 3 0 0 0 1.41 7.4C1 8.8 1 12 1 12s0 3.2.41 4.61a3 3 0 0 0 2.11 2.12c1.51.52 8.48.52 8.48.52s6.97 0 8.48-.52a3 3 0 0 0 2.11-2.12C23 15.2 23 12 23 12Zm-13 3.18V8.82L15.5 12 10 15.18Z"/></svg>; }
function SpotifyIcon()    { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M12 1.8A10.2 10.2 0 1 0 22.2 12 10.2 10.2 0 0 0 12 1.8Zm4.63 14.67a.75.75 0 0 1-1.03.25c-2.8-1.7-6.32-2.08-10.48-1.14a.75.75 0 1 1-.32-1.46c4.5-1 8.34-.57 11.43 1.3.35.22.46.67.25 1.05ZM17.9 13a.9.9 0 0 1-1.25.3c-3.2-1.98-8.1-2.55-11.87-1.38a.9.9 0 1 1-.54-1.73c4.24-1.33 9.56-.69 13.22 1.54.42.26.55.82.3 1.27Zm.13-2.96c-3.65-2.18-9.75-2.38-13.25-1.29a1.05 1.05 0 1 1-.61-2.02c4.18-1.26 10.93-1.02 15.2 1.5a1.05 1.05 0 0 1-1.34 1.8Z"/></svg>; }
function CanvaIcon()      { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M19 3H5A2 2 0 0 0 3 5v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2Zm-7 14.5c-2.48 0-4.5-2.02-4.5-4.5S9.52 8.5 12 8.5 16.5 10.52 16.5 13 14.48 17.5 12 17.5Z"/></svg>; }
function ChatGPTIcon()    { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor"><path d="M11.9 2.1a5.2 5.2 0 0 1 4.34 2.33 5.2 5.2 0 0 1 6.3 6.92A5.2 5.2 0 0 1 18 20.4H9.2a5.2 5.2 0 0 1-4.34-2.33 5.2 5.2 0 0 1-6.3-6.92A5.2 5.2 0 0 1 6 3.6h8Z"/></svg>; }
function UserPlusIcon()   { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z"/><path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><path d="M19 8v6"/><path d="M22 11h-6"/></svg>; }
function GridIcon()       { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/></svg>; }
function CalculatorIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h8M8 14h2M12 14h2M16 14h0M8 18h2M12 18h2M16 18h0"/></svg>; }
function RocketIcon()     { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 13c0 3 3 6 7 6s7-3 7-6-3-9-7-9-7 6-7 9Z"/><path d="M9 13a3 3 0 1 0 6 0"/></svg>; }
function BadgeCheckIcon() { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 12 2 2 4-4"/><path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/></svg>; }
function WalletIcon()     { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M16 13h.01"/></svg>; }
function ListIcon()       { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>; }
function RefreshIcon()    { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v6h-6"/></svg>; }
function LockIcon()       { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>; }
function RefundIcon()     { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 10a9 9 0 1 0 9-9"/><path d="M3 10h7"/><path d="M7 6l3 4-3 4"/></svg>; }
function PackageIcon()    { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21 16-9 5-9-5V8l9-5 9 5v8Z"/><path d="M3.3 7.3 12 12l8.7-4.7M12 22V12"/></svg>; }
function DocumentIcon()   { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6"/></svg>; }
function MailIcon()       { return <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16v16H4z"/><path d="m22 6-10 7L2 6"/></svg>; }
