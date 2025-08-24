import React, { useLayoutEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Navbar from "../components/Navbar.jsx";

// Viraloft — Terms & Conditions (React + Tailwind + GSAP)

export default function Terms() {
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const ctx = gsap.context(() => {
      gsap.utils.toArray(".glass-card").forEach((el, i) => {
        gsap.from(el, {
          opacity: 0,
          y: 28,
          duration: 0.8,
          ease: "power2.out",
          delay: i * 0.03,
          scrollTrigger: { trigger: el, start: "top 85%" },
        });
      });
    });
    return () => ctx.revert();
  }, []);

  const navLinks = [
    { id: "welcome", label: "1. Welcome" },
    { id: "services", label: "2. Services" },
    { id: "payments", label: "3. Payments" },
    { id: "refunds", label: "4. Refunds" },
    { id: "privacy", label: "5. Privacy" },
    { id: "security", label: "6. Account Security" },
    { id: "liability", label: "7. Liability" },
    { id: "conduct", label: "8. Conduct & Updates" },
    { id: "refill", label: "9. Refill / No-Refill" },
    { id: "speed", label: "10. Pricing & Speed" },
    { id: "links", label: "11. Link Validity" },
    { id: "service-policy", label: "12. Service Policy" },
    { id: "contact", label: "Contact" },
  ];

  const scrollTo = (id) => (e) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <Navbar />
      {/* Match other pages: animated gradient background */}
      <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 animate-gradient-x text-slate-100">
        {/* Shell */}
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
          {/* Top in-page nav */}
          <nav className="glass-card mb-6 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-xl">
            <a href="#top" className="flex items-center gap-3" onClick={scrollTo("top")}>
              {/* Use your public logo */}
              <img
                src="/LogoIcon.png"
                alt="Viraloft"
                className="h-9 w-9 select-none object-contain"
                draggable="false"
              />
              <span className="text-base font-extrabold tracking-tight text-white">Viraloft</span>
            </a>
            <div className="hidden gap-4 text-sm font-semibold text-white/90 sm:flex">
              {navLinks.slice(0, 4).map((l) => (
                <a key={l.id} href={`#${l.id}`} onClick={scrollTo(l.id)} className="hover:text-white">
                  {l.label}
                </a>
              ))}
            </div>
            <a
              href="#contact"
              onClick={scrollTo("contact")}
              className="rounded-xl bg-gradient-to-tr from-teal-400 to-sky-400 px-3 py-2 text-sm font-black text-slate-900 shadow-lg ring-1 ring-white/30"
            >
              Contact
            </a>
          </nav>

          {/* Hero */}
          <header id="top" className="mb-6">
            <h1 className="text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              Terms & Conditions
            </h1>
            <p className="mt-2 max-w-3xl text-white/90">
              Welcome to <span className="font-bold text-white">Viraloft</span>. We provide safe, ethical, and policy-compliant digital services. By using our platform, you agree to the terms outlined below.
            </p>
          </header>

          {/* TOC */}
          <section className="glass-card mb-6 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gradient-to-tr from-fuchsia-500 to-sky-400 px-3 py-1 text-xs font-black text-slate-900 shadow">
              Overview
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {navLinks.map((l) => (
                <a
                  key={l.id}
                  href={`#${l.id}`}
                  onClick={scrollTo(l.id)}
                  className="rounded-xl border border-white/20 bg-white/80 px-3 py-2 text-sm font-bold text-slate-900 shadow hover:bg-white"
                >
                  {l.label}
                </a>
              ))}
            </div>
          </section>

          {/* Sections */}
          <Section id="welcome" title="1. Welcome">
            We proudly declare that <b>Viraloft</b> does not cause financial harm, national security risk, or privacy violations. Our goal is to offer safe and ethical digital services that respect users and comply with national laws and platform policies.
          </Section>

          <Section id="services" title="2. Services">
            <Sub>2.1 Local Engagement Services</Sub>
            <p className="text-white/90">
              Cosmetic metrics (likes, followers, views) intended to enhance appearance only. These do not guarantee organic growth, monetization, or platform approvals.
            </p>
            <Sub className="mt-4">2.2 Real Ad Services</Sub>
            <p className="text-white/90">
              Official ad services on Facebook, YouTube, Instagram, and TikTok. 100% policy-compliant. We do not support content involving smoking, weapons, politics, hate speech, or any harmful activities.
            </p>
            <Callout>Recommendation: choose Real Ad Services for sustainable, long-term growth.</Callout>
          </Section>

          <Section id="payments" title="3. Payments">
            <List>
              <li>All orders are prepaid via JazzCash, Easypaisa, Upaisa, or debit/credit card.</li>
              <li>Every transaction is logged for transparency and security.</li>
              <li>Fraud or chargeback abuse may result in account suspension.</li>
            </List>
          </Section>

          <Section id="refunds" title="4. Refund & Return Policy">
            <List>
              <li>Deposits are <b>non-refundable to bank accounts</b> once credited.</li>
              <li>If a guaranteed service is undelivered or fails, the equivalent amount is credited to your <b>Viraloft panel balance</b>.</li>
              <li>Panel balance can be used for other services but is not transferable or withdrawable.</li>
              <li>Non-guaranteed services are provided as-is without refund entitlement.</li>
            </List>
          </Section>

          <Section id="privacy" title="5. Privacy Policy">
            Your personal information is kept confidential. We do not sell or share data with third parties. Data is used to process orders, provide support, and improve services. You may request account/data deletion via support.
          </Section>

          <Section id="security" title="6. Account Security">
            <List>
              <li>Keep login credentials private and secure.</li>
              <li>Two-Factor Authentication (2FA) is available in your account settings.</li>
            </List>
          </Section>

          <Section id="liability" title="7. Limited Liability">
            We do not harm your accounts or content. If a platform removes content or limits reach, it is typically due to that platform’s policies. Users must follow each platform’s community and advertising guidelines.
          </Section>

          <Section id="conduct" title="8. User Conduct & Terms Updates">
            <List>
              <li>Respectful communication with our team is required at all times.</li>
              <li>Abusive users may be limited or blocked without notice.</li>
              <li>Terms may be updated without prior notice. Continued use indicates acceptance of changes.</li>
            </List>
          </Section>

          <Section id="refill" title="9. Refill & No-Refill Services">
            <p className="text-white/90">
              <b>Refill services</b> include a warranty period during which drops may be refilled or credited.
              <b> Non-refill services</b> are used at your own discretion and are not covered by refill or refund.
            </p>
          </Section>

          <Section id="speed" title="10. Pricing & Speed">
            <List>
              <li><b>Best Speed</b> services are recommended for reliable, faster results.</li>
              <li><b>Cheapest</b> services may be slower and require additional patience.</li>
            </List>
          </Section>

          <Section id="links" title="11. Link Validity & Public Access">
            <List>
              <li>Provide correct, public links for each order.</li>
              <li>Video/Post link → Likes, Views, Comments</li>
              <li>Profile link → Followers</li>
              <li>Channel link → YouTube Subscribers</li>
              <li>Invalid/private links may cause failure; Viraloft is not responsible for such orders.</li>
            </List>
          </Section>

          <Section id="service-policy" title="12. Service Delivery Policy (Digital-Only)">
            <List>
              <li>No physical shipping is involved.</li>
              <li>Delivery times vary per service and are shown in service details.</li>
              <li>Guaranteed services specify coverage; non-guaranteed services do not include refill.</li>
            </List>
          </Section>

          <Section id="contact" title="Contact & Company Information">
            <p className="text-white/90">
              <b>Viraloft</b>
              <br />Office: <i>Near National Bank OF Pakistan in Khan wahan, Distt: Naushahro Feroze</i>
              <br />Phone: <i>+923163273012</i>
              <br />Email: <a className="text-sky-300 underline" href="mailto:kdrqasim@gmail.com">kdrqasim@gmail.com</a>
            </p>
            <p className="text-white/70">For legal inquiries or data requests, please contact us via email.</p>
          </Section>

          {/* Footer */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-white/70">
            <span className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-semibold backdrop-blur">
              © {new Date().getFullYear()} Viraloft — All rights reserved.
            </span>
            <span className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 font-semibold backdrop-blur">
              Version 1.0 · Last updated {new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" })}
            </span>
          </div>
        </div>
      </main>
    </>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="glass-card mb-6 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <h2 className="mb-2 text-2xl font-bold text-white">{title}</h2>
      <div className="prose prose-invert max-w-none prose-p:leading-7 prose-li:leading-7">
        {children}
      </div>
    </section>
  );
}

function Sub({ children, className = "" }) {
  return <h3 className={`text-lg font-semibold text-white ${className}`}>{children}</h3>;
}

function List({ children }) {
  return <ul className="list-disc space-y-2 pl-5 text-white/90">{children}</ul>;
}

function Callout({ children }) {
  return (
    <div className="mt-4 rounded-xl border border-dashed border-white/30 bg-white/10 p-4 font-semibold text-white">
      {children}
    </div>
  );
}
