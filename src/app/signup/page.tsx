"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import PublicShell from "@/components/PublicShell";

type Intent = "save" | "applied" | "gigfit" | "default";

// Copy is tailored to the action that sent the user here, so the account gate
// explains WHY an account is useful rather than being a generic dead-end form.
const COPY: Record<Intent, { heading: string; sub: string; cta: string }> = {
  save: {
    heading: "Save opportunities and come back anytime",
    sub: "Create your free GigDock account to save opportunities, keep track of what you’ve applied to, and pick up where you left off.",
    cta: "Create free account",
  },
  applied: {
    heading: "Keep track of where you’ve applied",
    sub: "Create your free GigDock account to mark opportunities as applied and keep your job search organized in one place.",
    cta: "Create free account",
  },
  gigfit: {
    heading: "Create your free GigFit profile",
    sub: "Takes just a minute. Your profile details are used to help match you with film & TV casting opportunities.",
    cta: "Get my GigFit matches",
  },
  default: {
    heading: "Create your free GigDock account",
    sub: "Save opportunities, track what you’ve applied to, and unlock GigFit matching — all free.",
    cta: "Create free account",
  },
};

// Only accept our own opportunity ids (hex + dashes) so the return path can't be
// turned into an open redirect.
function safeOppId(v: string | null): string | null {
  return v && /^[0-9a-f-]{16,}$/i.test(v) ? v : null;
}

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const supabase = createSupabaseBrowser();

  const rawIntent = params.get("intent");
  const intent: Intent =
    rawIntent === "save" || rawIntent === "applied" || rawIntent === "gigfit"
      ? rawIntent
      : "default";
  const oppId = safeOppId(params.get("opportunity"));

  // Where to send the user after they have an account — and finish what they
  // started (auto-save / auto-mark-applied via ?do=, or GigFit setup). An
  // explicit same-site ?next= (e.g. bounced back from /login) wins.
  const nextParam = params.get("next");
  const completionPath = useMemo(() => {
    if (nextParam && nextParam.startsWith("/")) return nextParam;
    if (intent === "gigfit") return "/profile";
    if ((intent === "save" || intent === "applied") && oppId) {
      return `/opportunities/${oppId}?do=${intent}`;
    }
    return "/opportunities";
  }, [intent, oppId, nextParam]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [checkEmail, setCheckEmail] = useState(false);

  // Already signed in? Skip the gate and go straight to finishing the task.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace(completionPath);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completionPath]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const emailRedirectTo =
      typeof window !== "undefined" ? `${window.location.origin}${completionPath}` : undefined;

    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo },
    });

    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }

    // If the project auto-confirms, we get a session now — continue the task.
    if (data.session) {
      router.push(completionPath);
      router.refresh();
      return;
    }
    // Otherwise email confirmation is required; the confirm link returns them to
    // completionPath, so the task still finishes after they confirm.
    setCheckEmail(true);
    setLoading(false);
  }

  const copy = COPY[intent];
  const loginHref = `/login?next=${encodeURIComponent(completionPath)}`;

  return (
    <PublicShell>
      <div className="max-w-md mx-auto py-6">
        {checkEmail ? (
          <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-7 text-center">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Check your email</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              We sent a confirmation link to <span className="font-medium">{email}</span>. Confirm it
              and you’ll come right back to pick up where you left off.
            </p>
          </div>
        ) : (
          <>
            <span className="inline-block text-base sm:text-lg font-bold tracking-[0.14em] uppercase text-blue-600 dark:text-blue-400">
              Your Gig Life. Simplified.
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {copy.heading}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{copy.sub}</p>

            <form onSubmit={handleSignup} className="mt-6 space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  placeholder="At least 6 characters"
                  className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm transition-colors"
              >
                {loading ? "Creating account…" : copy.cta}
              </button>
            </form>

            <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400 text-center">
              Already have an account?{" "}
              <Link href={loginHref} className="text-blue-600 dark:text-blue-400 font-medium">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </PublicShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
