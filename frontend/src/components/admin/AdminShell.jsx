// frontend/src/components/admin/AdminShell.jsx
import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

/**
 * Shared modern dashboard shell for Admin & Staff panels.
 * A clean sidebar + topbar layout (distinct from the marketing/gradient
 * look of the public site) — the kind of neutral, information-dense
 * layout expected of an internal admin tool.
 *
 * Props:
 *  - title: string
 *  - subtitle: string
 *  - roleLabel: 'Admin' | 'Staff'
 *  - tabs: [{ key, label, icon? }]
 *  - activeTab, onTabChange
 *  - children
 */
export default function AdminShell({ title, subtitle, roleLabel, tabs, activeTab, onTabChange, children }) {
  const { user, logout } = useContext(AuthContext);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 bg-slate-900 text-slate-200 min-h-screen sticky top-0">
        <SidebarContent
          title={title}
          roleLabel={roleLabel}
          tabs={tabs}
          activeTab={activeTab}
          onTabChange={onTabChange}
          user={user}
        />
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 text-slate-200 flex flex-col">
            <SidebarContent
              title={title}
              roleLabel={roleLabel}
              tabs={tabs}
              activeTab={activeTab}
              onTabChange={(k) => { onTabChange(k); setMobileNavOpen(false); }}
              user={user}
            />
          </aside>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200">
          <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-600"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open menu"
              >
                <MenuIcon />
              </button>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">{title}</h1>
                {subtitle && <p className="text-xs sm:text-sm text-slate-500 truncate">{subtitle}</p>}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 border border-slate-200"
              >
                ← Back to site
              </Link>
              <div className="hidden sm:flex flex-col items-end leading-tight">
                <span className="text-sm font-medium text-slate-800">{user?.username}</span>
                <span className="text-[11px] text-slate-400 capitalize">{user?.role}</span>
              </div>
              <button
                onClick={logout}
                className="inline-flex items-center h-9 px-3 rounded-lg text-sm font-medium text-white bg-slate-900 hover:bg-slate-700"
              >
                Log out
              </button>
            </div>
          </div>

          {/* Tabs (mobile: horizontal scroll) */}
          <div className="md:hidden overflow-x-auto border-t border-slate-100">
            <div className="flex gap-1 px-3 py-2 min-w-max">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => onTabChange(t.key)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${
                    activeTab === t.key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

function SidebarContent({ title, roleLabel, tabs, activeTab, onTabChange, user }) {
  return (
    <>
      <div className="h-16 flex items-center gap-2 px-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-500 flex items-center justify-center font-bold text-white text-sm">
          V
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-white">Viraloft</div>
          <div className="text-[11px] text-slate-400">{roleLabel} Panel</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === t.key
                ? 'bg-white/10 text-white'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-white/10">
        <div className="text-xs text-slate-400">Signed in as</div>
        <div className="text-sm font-medium text-white truncate">{user?.email}</div>
      </div>
    </>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
    </svg>
  );
}
