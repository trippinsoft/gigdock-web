"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

const NAV = [
  { href: "/opportunities", label: "Opportunities" },
  { href: "/saved", label: "Saved" },
  { href: "/profile", label: "Profile" },
];

export default function PublicShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSignedIn(!!data.user));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
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
            <Link href="/opportunities" className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
              GigDock
            </Link>

            <nav className="flex items-center gap-1 sm:gap-2">
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
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">{children}</main>
    </div>
  );
}
