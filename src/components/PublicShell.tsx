"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const NAV = [
  { href: "/opportunities", label: "Opportunities" },
  { href: "/profile", label: "Profile" },
];


export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    setSignedIn(false);
    router.push("/opportunities");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3 min-w-0">
              <Link
                href="/opportunities"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/gigdock-logo.png" alt="GigDock" className="h-7 w-7 shrink-0" />
                <span className="font-bold text-xl sm:text-2xl tracking-tight text-zinc-900 dark:text-zinc-100">
                  GigDock
                </span>
              </Link>
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
                Beta
              </span>
              {/* Marketing tagline — desktop only (mobile header stays compact) */}
              <div className="hidden lg:block border-l border-zinc-200 dark:border-zinc-700 pl-3 min-w-0">
                <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight truncate">
                  Find Opportunities • Manage Gigs • Track Payments • Stay Organized
                </div>
              </div>
            </div>

            {/* Desktop nav */}
            <nav className="hidden sm:flex items-center gap-2">
              {NAV.map((n) => {
                const active = pathname.startsWith(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      active
                        ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                        : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
              {signedIn === false && (
                <Link
                  href="/login"
                  className="ml-1 px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                >
                  Sign in
                </Link>
              )}
              {signedIn === true && (
                <button
                  onClick={signOut}
                  className="ml-1 px-3 py-1.5 rounded-lg text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
                >
                  Sign out
                </button>
              )}
            </nav>

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="sm:hidden inline-flex items-center justify-center h-9 w-9 -mr-1 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
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
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <>
            <div className="sm:hidden relative z-30 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
              <nav className="px-4 py-2 flex flex-col gap-0.5">
                {NAV.map((n) => {
                  const active = pathname.startsWith(n.href);
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setMenuOpen(false)}
                      className={`px-3 py-2.5 rounded-lg text-base font-medium transition-colors ${
                        active
                          ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40"
                          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                      }`}
                    >
                      {n.label}
                    </Link>
                  );
                })}
                {signedIn === false && (
                  <Link
                    href="/login"
                    onClick={() => setMenuOpen(false)}
                    className="mt-1 px-3 py-2.5 rounded-lg text-base font-medium text-center bg-blue-600 hover:bg-blue-700 text-white transition-colors"
                  >
                    Sign in
                  </Link>
                )}
                {signedIn === true && (
                  <button
                    onClick={signOut}
                    className="mt-1 px-3 py-2.5 rounded-lg text-base font-medium text-left text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Sign out
                  </button>
                )}
              </nav>
            </div>
            {/* Tap-outside to close */}
            <div
              className="sm:hidden fixed inset-x-0 bottom-0 top-14 z-20"
              onClick={() => setMenuOpen(false)}
            />
          </>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}
