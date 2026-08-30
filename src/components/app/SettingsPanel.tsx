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

function NavRow({ href, label, hint }: { href: string; label: string; hint: string }) {
  return (
    <Link href={href} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition-colors">
      <div className="min-w-0">
        <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{label}</div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{hint}</div>
      </div>
      <svg className="shrink-0 text-zinc-400" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
    </Link>
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
              <Link href="/pro?from=settings" className="font-medium text-blue-700 dark:text-blue-300 hover:underline">Explore Pro →</Link>
            </span>
          )}
        </Row>
      </Card>

      <Card title="Appearance">
        <Row label="Theme">
          <span className="text-zinc-500 dark:text-zinc-400">Follows your system setting</span>
        </Row>
      </Card>

      <Card title="Setup">
        <NavRow href="/projects" label="Projects" hint="Productions you work on" />
        <NavRow href="/companies" label="Gig companies" hint="Companies you’ve worked with" />
        <NavRow href="/payroll" label="Payroll companies" hint="Companies that process your payments" />
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
