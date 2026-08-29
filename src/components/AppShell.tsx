"use client";

// Authenticated back-office shell. Desktop-first: a persistent grouped left rail
// on large screens, a top bar + slide-down menu on mobile. Provides the Pro plan
// to nested client components and shows the account control.

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { ProProvider, ProBadge } from "@/components/app/pro";

type NavItem = { href: string; label: string; icon: React.ReactNode; match?: string | string[]; pro?: boolean; newTab?: boolean };
type NavGroup = { label: string | null; items: NavItem[] };

// Grouped by user job (Part IV): Today · Find work · Manage work · Money.
const GROUPS: NavGroup[] = [
  { label: null, items: [{ href: "/today", label: "Today", icon: iconHome() }] },
  { label: "Find work", items: [{ href: "/opportunities", label: "Opportunities", icon: iconSearch() }] },
  {
    label: "Manage work",
    items: [
      { href: "/gigs", label: "My Gigs", icon: iconBriefcase() },
      { href: "/calendar", label: "Calendar", icon: iconCalendar() },
      { href: "/documents", label: "Documents", icon: iconDoc() },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/payments", label: "Payments", icon: iconDollar() },
      { href: "/insights", label: "Insights", icon: iconChart() },
      { href: "/reports", label: "Advanced Reports", icon: iconFileText(), pro: true },
      { href: "/tax-ready", label: "Tax Ready", icon: iconTax(), pro: true },
    ],
  },
  // Public reading pages — a real <a target=_blank> so the app tab (and rail)
  // stays put. Guides and Get the app both live in PublicShell.
  {
    label: "Learn",
    items: [
      { href: "/guides", label: "Guides", icon: iconBook(), newTab: true },
      { href: "/app", label: "Get the app", icon: iconPhone(), newTab: true },
    ],
  },
  // Identity + app preferences. Profile, Settings, and Help & feedback are
  // in-app pages (AppShell). Projects / gig companies / payroll live under Settings.
  {
    label: "Account",
    items: [
      { href: "/profile", label: "Profile / GigFit", icon: iconUser() },
      { href: "/settings", label: "Settings", icon: iconGear(), match: ["/settings", "/projects", "/companies", "/payroll", "/delete-account"] },
      { href: "/feedback", label: "Help & feedback", icon: iconHelp() },
    ],
  },
];

export default function AppShell({
  children,
  userEmail,
  plan = "free",
}: {
  children: React.ReactNode;
  userEmail?: string | null;
  plan?: "free" | "pro";
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
    const bases = [item.match ?? item.href].flat();
    return bases.some((base) => pathname === base || pathname.startsWith(base + "/"));
  };

  const navLink = (item: NavItem, onNavigate?: () => void) => {
    const active = !item.newTab && isActive(item);
    const className = `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
      active
        ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/60 hover:text-zinc-900 dark:hover:text-zinc-100"
    }`;
    const inner = (
      <>
        <span className="shrink-0">{item.icon}</span>
        <span>{item.label}</span>
        {item.pro && (
          <span className="ml-auto rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Pro</span>
        )}
        {item.newTab && (
          <svg className="ml-auto shrink-0 text-zinc-300 dark:text-zinc-600" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="opens in a new tab"><path d="M7 17 17 7M8 7h9v9" /></svg>
        )}
      </>
    );
    // Native <a> for new-tab Learn links so Next.js client navigation cannot
    // take over the current app tab (same-tab would drop the user into PublicShell).
    if (item.newTab) {
      return (
        <a
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link key={item.href} href={item.href} onClick={onNavigate} className={className}>
        {inner}
      </Link>
    );
  };

  const nav = (onNavigate?: () => void) =>
    GROUPS.map((g, i) => (
      <div key={i} className={i > 0 ? "mt-4" : ""}>
        {g.label && <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">{g.label}</div>}
        <div className="flex flex-col gap-0.5">{g.items.map((it) => navLink(it, onNavigate))}</div>
      </div>
    ));

  const account = (
    <div>
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700 text-xs font-semibold text-zinc-600 dark:text-zinc-200">
          {(userEmail ?? "?").slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs text-zinc-500 dark:text-zinc-400" title={userEmail ?? undefined}>{userEmail}</div>
          {plan === "pro" ? (
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">GigDock Pro <span className="text-green-600 dark:text-green-400">✓</span></div>
          ) : (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">GigDock</span>
              <Link href="/pro?from=account" className="text-xs font-medium text-violet-700 dark:text-violet-300 hover:underline">Explore Pro →</Link>
            </div>
          )}
        </div>
      </div>
      <button onClick={signOut} className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-800 dark:hover:text-zinc-100 transition-colors">
        Sign out
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center justify-between h-14 px-4">
          <Link href="/today" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gigdock-logo.png" alt="GigDock" className="h-7 w-7" />
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">GigDock</span>
            {plan === "pro" && <ProBadge />}
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={menuOpen}
            className="inline-flex items-center justify-center h-9 w-9 -mr-1 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {menuOpen ? (<><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></>) : (<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>)}
            </svg>
          </button>
        </div>
        {menuOpen && (
          <div className="border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2">
            <nav>{nav(() => setMenuOpen(false))}</nav>
            <div className="mt-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">{account}</div>
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
          <nav className="flex-1 overflow-y-auto p-3">{nav()}</nav>
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">{account}</div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6">
          <ProProvider plan={plan}>{children}</ProProvider>
        </main>
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
function iconBook() { return svg(<><path d="M12 7v13" /><path d="M3 5a2 2 0 0 1 2-2h4a3 3 0 0 1 3 3 3 3 0 0 1 3-3h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5a2 2 0 0 0-2 2 2 2 0 0 0-2-2H5a2 2 0 0 1-2-2z" /></>); }
function iconPhone() { return svg(<><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></>); }
function iconUser() { return svg(<><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>); }
function iconGear() { return svg(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>); }
function iconHelp() { return svg(<><circle cx="12" cy="12" r="9" /><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" /><path d="M12 17h.01" /></>); }
function iconFileText() { return svg(<><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M9 13h6M9 17h4" /></>); }
function iconTax() { return svg(<><rect x="4" y="7" width="16" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /><path d="M12 11v5M9.5 12.5h3.5a1.25 1.25 0 0 1 0 2.5H11a1.25 1.25 0 0 0 0 2.5h3.5" /></>); }
