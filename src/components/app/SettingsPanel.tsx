"use client";

// Web Settings — the account/app-preferences surface mirrored from the mobile
// More → Settings screen. Web follows the system light/dark theme and has no
// biometric option, so those mobile rows are informational / omitted here.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
      <h2 className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
        {title}
      </h2>
      <div className="divide-y divide-zinc-100 dark:divide-zinc-800">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="text-sm text-zinc-600 dark:text-zinc-400">{label}</span>
      <span className="min-w-0 text-sm text-zinc-900 dark:text-zinc-100 text-right">{children}</span>
    </div>
  );
}

export default function SettingsPanel({
  email,
  plan,
}: {
  email: string | null;
  plan: "free" | "pro";
}) {
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/opportunities");
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Settings</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Account and app preferences.</p>
      </header>

      <Card title="Account">
        <Row label="Email">
          <span className="truncate">{email ?? "—"}</span>
        </Row>
        <Row label="Plan">
          {plan === "pro" ? (
            <span className="font-semibold">GigDock Pro <span className="text-green-600 dark:text-green-400">✓</span></span>
          ) : (
            <span className="inline-flex items-center gap-2">
              <span className="font-semibold">GigDock</span>
              <Link href="/pro?from=settings" className="font-medium text-violet-700 dark:text-violet-300 hover:underline">Explore Pro →</Link>
            </span>
          )}
        </Row>
      </Card>

      <Card title="Appearance">
        <Row label="Theme">
          <span className="text-zinc-500 dark:text-zinc-400">Follows your system setting</span>
        </Row>
      </Card>

      <Card title="Manage">
        <div className="px-4 py-3">
          <button
            onClick={signOut}
            className="text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:underline"
          >
            Sign out
          </button>
        </div>
        <div className="px-4 py-3">
          <Link
            href="/delete-account"
            className="text-sm font-medium text-red-600 dark:text-red-400 hover:underline"
          >
            Delete account
          </Link>
          <p className="mt-1 text-xs text-zinc-400 dark:text-zinc-500">
            Permanently deletes your account, GigFit profile(s), and saved and applied lists. This can’t be undone.
          </p>
        </div>
      </Card>
    </div>
  );
}
