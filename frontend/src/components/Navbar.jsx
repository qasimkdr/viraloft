import React, { useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const publicLinks = [
  { to: '/', label: 'Home' },
  { to: '/services', label: 'Services' },
  { to: '/blog', label: 'Resources' },
  { to: '/about', label: 'About' },
];

const memberLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/orders', label: 'Orders' },
  { to: '/create-order', label: 'New Order' },
  { to: '/support', label: 'Support' },
];

function BrandMark() {
  return (
    <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl border border-indigo-300/20 bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20" aria-hidden="true">
      <span className="absolute h-5 w-5 rotate-45 rounded-md border border-white/60" />
      <span className="relative text-xs font-black tracking-[-0.08em] text-white">VL</span>
    </span>
  );
}

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  const roleLinks = [
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
    ...(user?.role === 'staff' ? [{ to: '/staff', label: 'Staff' }] : []),
  ];
  const links = user ? [...roleLinks, ...memberLinks] : publicLinks;

  const NavLink = ({ to, label }) => {
    const active = location.pathname === to;
    return (
      <Link
        to={to}
        aria-current={active ? 'page' : undefined}
        className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${active ? 'bg-white/15 text-white shadow-sm' : 'text-slate-300 hover:text-white hover:bg-white/10'}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#070b16]/80 backdrop-blur-xl supports-[backdrop-filter]:bg-[#070b16]/70">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5 text-white" aria-label="Viraloft home">
            <BrandMark />
            <div className="min-w-0">
              <span className="block truncate text-lg font-extrabold tracking-tight">Viraloft</span>
              <span className="hidden text-[10px] font-semibold uppercase tracking-[.16em] text-slate-500 sm:block">Growth workspace</span>
            </div>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((link) => <NavLink key={link.to} {...link} />)}
          </div>

          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <button onClick={logout} className="h-10 rounded-xl border border-white/15 px-4 font-semibold text-white hover:bg-white/10">
                Logout
              </button>
            ) : (
              <>
                <Link to="/login" className="inline-flex h-10 items-center px-4 font-semibold text-slate-200">Login</Link>
                <Link to="/register" className="inline-flex h-10 items-center rounded-xl bg-indigo-500 px-5 font-bold text-white shadow-lg shadow-indigo-500/20 transition hover:bg-indigo-400">
                  Get started
                </Link>
              </>
            )}
          </div>

          <button
            onClick={() => setOpen((value) => !value)}
            aria-label="Toggle navigation menu"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/15 text-xl text-white md:hidden"
          >
            {open ? '×' : '☰'}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-[#080d19]/95 px-4 py-4 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map((link) => <NavLink key={link.to} {...link} />)}
            {!user && (
              <>
                <NavLink to="/contact" label="Contact" />
                <NavLink to="/privacy" label="Privacy" />
                <NavLink to="/terms" label="Terms" />
                <NavLink to="/login" label="Login" />
                <NavLink to="/register" label="Register" />
              </>
            )}
            {user && <button onClick={logout} className="rounded-xl px-3 py-2 text-left font-semibold text-slate-300 hover:bg-white/10">Logout</button>}
          </div>
        </div>
      )}
    </nav>
  );
}
