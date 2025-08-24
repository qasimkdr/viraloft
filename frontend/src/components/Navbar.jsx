// frontend/src/components/Navbar.jsx
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const panelRef = useRef(null);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Links for logged-in users (panel navigation)
  const commonLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/orders', label: 'Orders' },
    { to: '/create-order', label: 'New Order' },
    { to: '/support', label: 'Support' },
    { to: '/terms', label: 'Terms & Policies' },
  ];

  const roleLinks = [
    ...(user?.role === 'admin' ? [{ to: '/admin', label: 'Admin' }] : []),
    ...(user?.role === 'staff' ? [{ to: '/staff', label: 'Staff' }] : []),
  ];

  const NavLink = ({ to, label, onClick }) => {
    const active =
      location.pathname === to ||
      (to !== '/' && location.pathname.startsWith(to));
    return (
      <Link
        to={to}
        onClick={onClick}
        className={`px-3 py-2 rounded-lg text-sm font-medium transition
          ${active
            ? 'text-white bg-white/20'
            : 'text-white/90 hover:text-white hover:bg-white/10'}`}
      >
        {label}
      </Link>
    );
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 animate-gradient-x">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <LogoIcon />
              <span className="text-white font-semibold text-lg tracking-tight">
                Viraloft
              </span>
            </Link>

            {/* Desktop links */}
            <div className="hidden md:flex items-center gap-1">
              {user && roleLinks.map((l) => <NavLink key={l.to} {...l} />)}
              {user && commonLinks.map((l) => <NavLink key={l.to} {...l} />)}

              {/* Logged-out: show Home, Services, Terms & Policies */}
              {!user && (
                <>
                  <NavLink to="/" label="Home" />
                  <NavLink to="/services" label="Services" />
                  <NavLink to="/terms" label="Terms & Policies" />
                </>
              )}
            </div>

            {/* Desktop auth */}
            <div className="hidden md:flex items-center gap-2">
              {!user ? (
                <>
                  <Link
                    to="/login"
                    className="h-9 inline-flex items-center px-4 rounded-lg text-sm font-semibold text-white border border-white/50 hover:bg-white/10 transition"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    className="h-9 inline-flex items-center px-4 rounded-lg text-sm font-semibold text-gray-900 bg-white hover:bg-white/90 transition"
                  >
                    Register
                  </Link>
                </>
              ) : (
                <>
                  <div className="hidden sm:flex items-center gap-2 mr-1">
                    <span className="text-white/90 text-sm">
                      Hi, <span className="font-semibold">{user.username}</span>
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="h-9 inline-flex items-center px-4 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/30 transition"
                  >
                    Logout
                  </button>
                </>
              )}
            </div>

            {/* Hamburger (mobile) */}
            <button
              aria-label="Toggle menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 transition"
            >
              <HamburgerIcon open={open} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`md:hidden fixed inset-x-0 top-16 z-40 transform transition-all duration-250
          ${open ? 'translate-y-0 opacity-100 pointer-events-auto' : '-translate-y-2 opacity-0 pointer-events-none'}`}
      >
        <div
          className={`transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'} bg-black/30`}
          onClick={() => setOpen(false)}
        >
          {/* Panel */}
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            className="h-[calc(100vh-4rem)] overflow-y-auto px-3 sm:px-4 md:px-6 py-3
                       bg-white/15 backdrop-blur border-t border-white/25"
          >
            <div className="max-w-7xl mx-auto">
              <div className="rounded-2xl bg-white/10 border border-white/20 p-3">
                {user ? (
                  <>
                    {/* Role links */}
                    {roleLinks.length > 0 && (
                      <div className="flex flex-col gap-1 mb-2">
                        {roleLinks.map((l) => (
                          <NavLink key={l.to} {...l} onClick={() => setOpen(false)} />
                        ))}
                        <div className="h-px bg-white/20 my-1" />
                      </div>
                    )}

                    {/* Common links */}
                    <div className="flex flex-col gap-1">
                      {commonLinks.map((l) => (
                        <NavLink key={l.to} {...l} onClick={() => setOpen(false)} />
                      ))}
                    </div>

                    <div className="h-px bg-white/20 my-3" />

                    {/* User + Logout */}
                    <div className="flex items-center justify-between">
                      <span className="text-white/90 text-sm">
                        Hi, <span className="font-semibold">{user.username}</span>
                      </span>
                      <button
                        onClick={() => { setOpen(false); logout(); }}
                        className="h-9 inline-flex items-center px-4 rounded-lg text-sm font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/30 transition"
                      >
                        Logout
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col gap-1">
                    <NavLink to="/" label="Home" onClick={() => setOpen(false)} />
                    <NavLink to="/services" label="Services" onClick={() => setOpen(false)} />
                    <NavLink to="/login" label="Login" onClick={() => setOpen(false)} />
                    <NavLink to="/register" label="Register" onClick={() => setOpen(false)} />
                    <NavLink to="/terms" label="Terms & Policies" onClick={() => setOpen(false)} />
                  </div>
                )}
              </div>

              <div className="h-6" />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

function LogoIcon() {
  // Uses public/LogoIcon.png → available at /LogoIcon.png
  return (
    <img
      src="/LogoIcon.png"
      alt="Viraloft logo"
      className="h-7 w-7 object-contain select-none"
      draggable="false"
    />
  );
}

function HamburgerIcon({ open }) {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      {open ? (
        <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M4 7h16" strokeLinecap="round" />
          <path d="M4 12h16" strokeLinecap="round" />
          <path d="M4 17h16" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

export default Navbar;
