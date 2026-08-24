"use client";

// Authenticated back-office shell. Desktop-first: a persistent left rail on
// large screens, a top bar + slide-down menu on mobile. Distinct from
// PublicShell (marketing / opportunity discovery). Surfaces that aren't built
// yet render as disabled "Soon" items so the nav shows the whole workspace.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
  ready: boolean;
  /** Match by exact path prefix for active state. */
  match?: string;
};

// Persistent workspace nav (brief §9). Order = display order.
const NAV: NavItem[] = [
  { href: "/today", label: "Today", ready: false, icon: iconHome() },
  { href: "/opportunities", label: "Opportunities", ready: true, icon: iconSearch() },
  { href: "/gigs", label: "Gigs", ready: true, icon: iconBriefcase() },
  { href: "/calendar", label: "Calendar", ready: false, icon: iconCalendar() },
  { href: "/payments", label: "Payments", ready: false, icon: iconDollar() },
  { href: "/insights", label: "Insights", ready: false, icon: iconChart() },
  { href: "/documents", label: "Documents", ready: false, icon: iconDoc() },
];

export default function AppShell({
  children,
  userEmail,
}: {
  children: React.ReactNode;
  userEmail?: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createSupabaseBrowser();

  async function signOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/opportunities");
    router.refresh();
  }

  const isActive = (item: NavItem) => {
    const base = item.match ?? item.href;
    return pathname === base || pathname.startsWith(base + "/");
  };

  const navLink = (item: NavItem, onNavigate?: () => void) => {
    const active = isActive(item);
    if (!item.ready) {
      return (
        <div
          key={item.href}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 dark:text-zinc-600 cursor-default select-none"
          aria-disabled
        >
          <span className="shrink-0 opacity-70">{item.icon}</span>
          <span className="flex-1">{item.label}</span>
          <span className="text-[10px] uppercase tracking-wide font-semibold text-zinc-300 dark:text-zinc-700 border border-zinc-200 dark:border-zinc-800 rounded px-1 py-0.5">
            Soon
          </span>
        </div>
      );
    }
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={onNavigate}
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          active
            ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
            : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
      >
        <span className="shrink-0">{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/gigs" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gigdock-logo.png" alt="GigDock" className="h-7 w-7" />
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">GigDock</span>
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="inline-flex items-center justify-center h-9 w-9 -mr-1 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (
                <>
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2">
            <nav className="flex flex-col gap-0.5">
              {NAV.map((item) => navLink(item, () => setMenuOpen(false)))}
            </nav>
            <div className="mt-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              {userEmail && (
                <p className="px-3 py-1 text-xs text-zinc-400 dark:text-zinc-500 truncate">{userEmail}</p>
              )}
              <button
                onClick={signOut}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="mx-auto max-w-[1400px] lg:flex">
        {/* Desktop left rail */}
        <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:h-screen lg:sticky lg:top-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <div className="h-14 flex items-center gap-2 px-5 border-b border-zinc-200 dark:border-zinc-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gigdock-logo.png" alt="GigDock" className="h-7 w-7" />
            <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-100">GigDock</span>
          </div>
          <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
            {NAV.map((item) => navLink(item))}
          </nav>
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
            {userEmail && (
              <p className="px-3 pb-1 text-xs text-zinc-400 dark:text-zinc-500 truncate" title={userEmail}>
                {userEmail}
              </p>
            )}
            <button
              onClick={signOut}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors"
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">{children}</main>
      </div>
    </div>
  );
}

/* ── inline icons (no dependency; stroke = currentColor) ───────────────────── */
function svg(children: React.ReactNode) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function iconHome() { return svg(<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></>); }
function iconSearch() { return svg(<><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>); }
function iconBriefcase() { return svg(<><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /><path d="M3 12h18" /></>); }
function iconCalendar() { return svg(<><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>); }
function iconDollar() { return svg(<><path d="M12 2v20" /><path d="M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5s2.2 3 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3" /></>); }
function iconChart() { return svg(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>); }
function iconDoc() { return svg(<><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M9 13h6M9 17h6" /></>); }
