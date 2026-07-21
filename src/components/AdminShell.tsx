"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import type { AdminTab } from "@/lib/types";

const TABS: { key: AdminTab; label: string; href: string }[] = [
  { key: "review", label: "Review", href: "/admin" },
  { key: "active", label: "Active", href: "/admin/active" },
  { key: "discards", label: "Discards", href: "/admin/discards" },
  { key: "duplicates", label: "Duplicates", href: "/admin/duplicates" },
  { key: "sources", label: "Sources", href: "/admin/sources" },
  { key: "hidden", label: "Hidden / Expired", href: "/admin/hidden" },
  { key: "find", label: "Find post", href: "/admin/find" },
];

export default function AdminShell({
  children,
  userEmail,
  displayName,
}: {
  children: React.ReactNode;
  userEmail: string;
  displayName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  function activeTab(): AdminTab {
    if (pathname.startsWith("/admin/active")) return "active";
    if (pathname.startsWith("/admin/discards")) return "discards";
    if (pathname.startsWith("/admin/duplicates")) return "duplicates";
    if (pathname.startsWith("/admin/sources")) return "sources";
    if (pathname.startsWith("/admin/hidden")) return "hidden";
    if (pathname.startsWith("/admin/find")) return "find";
    return "review";
  }

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const current = activeTab();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Top bar */}
      <header className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <span className="font-bold text-lg text-zinc-900 dark:text-zinc-100">
                GigDock
              </span>
              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                Admin
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-500 dark:text-zinc-400 hidden sm:inline">
                {displayName}
              </span>
              <button
                onClick={handleLogout}
                className="text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <nav className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto -mb-px">
            {TABS.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  current === tab.key
                    ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                    : "border-transparent text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}
