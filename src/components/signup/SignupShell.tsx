// Standalone onboarding shell. Deliberately plain: GigDock wordmark, a wide
// centered content column, generous responsive gutters, and no navigation
// affordances — no left rail, no marketing header, and no in-page links back
// into the app. A new user cannot break out of onboarding from here because
// there is nowhere clickable that leads into GigDock. The only escape hatch
// is "Already have an account? Sign in" in the footer.
//
// Progress indicators live INSIDE `SignupWizard`, where the actual step
// state exists — this component takes no step / next / searchParams input.

import Link from "next/link";

export default function SignupShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-svh flex flex-col bg-zinc-50 dark:bg-zinc-950">
      <header className="w-full">
        <div className="mx-auto max-w-[960px] px-6 sm:px-8 py-5 flex items-center">
          <span className="inline-flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gigdock-logo.png" alt="GigDock" className="h-7 w-7" />
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
              GigDock
            </span>
          </span>
        </div>
      </header>

      <main className="flex-1 w-full">
        <div className="mx-auto max-w-[960px] px-6 sm:px-8 pb-16">{children}</div>
      </main>

      <footer className="w-full border-t border-zinc-200 dark:border-zinc-800">
        <div className="mx-auto max-w-[960px] px-6 sm:px-8 py-4 text-xs text-zinc-500 dark:text-zinc-400 flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} GigDock</span>
          <span>
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign in
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
