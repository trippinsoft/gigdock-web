"use client";

// Pre-signup wizard.
//
// Order:
//   Step 1  Work Roles (required, ≥1)
//   Step 2  Create account (email + password, plus an inline "Set up GigFit
//           next" checkbox for performer/mixed selections)
//
// After successful signUp we hand off to /signup/complete which calls
// set_work_roles under the new session, clears the pending metadata, and
// routes on to `next` (or /profile?from=onboarding&next=... for users who
// opted into GigFit next). The wizard passes the selected role keys /
// "other" text / gigfit intent through Supabase auth user_metadata so the
// selection survives auto-confirm AND the email-confirmation callback
// bounce.
//
// Nothing sensitive goes into metadata — only occupation role_key strings,
// a bounded free-text "Other" (≤60 chars, same cap the RPC enforces), and
// one boolean intent flag. GigFit demographic data is never touched here;
// it is collected later on /profile.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { WorkRoleCatalogRow } from "@/lib/workRoles";
import { hasPerformerRole } from "@/lib/workRoles";
import WorkRolesPicker from "@/components/app/WorkRolesPicker";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { trackOnboarding } from "@/lib/onboardingEvents";

type Intent = "save" | "applied" | "gigfit" | "manage" | "default";
type Step = "roles" | "account";

const COPY: Record<Intent, { heading: string; sub: string; cta: string }> = {
  save: {
    heading: "Save opportunities and come back anytime",
    sub: "Create your free GigDock account to save opportunities, keep track of what you've applied to, and pick up where you left off.",
    cta: "Create free account",
  },
  applied: {
    heading: "Keep track of where you've applied",
    sub: "Create your free GigDock account to mark opportunities as applied and keep your job search organized in one place.",
    cta: "Create free account",
  },
  gigfit: {
    heading: "Create your free GigFit profile",
    sub: "Takes just a minute. Your profile details are used to help match you with film & TV casting opportunities.",
    cta: "Get my GigFit matches",
  },
  manage: {
    heading: "Keep your gig work organized",
    sub: "Create your free GigDock account to keep gigs, dates, earnings, payments and records together in one place.",
    cta: "Create free account",
  },
  default: {
    heading: "Create your free GigDock account",
    sub: "Save opportunities, track what you've applied to, and unlock GigFit matching — all free.",
    cta: "Create free account",
  },
};

export default function SignupWizard({
  catalog,
  nextPath,
  intent,
}: {
  catalog: WorkRoleCatalogRow[];
  nextPath: string;
  intent: Intent;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  const [step, setStep] = useState<Step>("roles");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [otherDetail, setOtherDetail] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [wantsGigfit, setWantsGigfit] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const selectedKeys = useMemo(() => Array.from(selected).sort(), [selected]);
  const anyPerformer = useMemo(
    () => hasPerformerRole(selectedKeys, catalog),
    [selectedKeys, catalog]
  );

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackOnboarding("onboarding_started", { entry_point: "web_signup" });
  }, []);

  function toggle(roleKey: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(roleKey)) next.delete(roleKey);
      else next.add(roleKey);
      return next;
    });
  }

  function goToAccount() {
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one to continue.");
      return;
    }
    trackOnboarding("work_roles_selected", {
      role_count: selectedKeys.length,
      roles: selectedKeys,
      has_performer_role: anyPerformer,
      has_crew_role: catalog.some(
        (r) => selected.has(r.role_key) && r.category === "crew"
      ),
      entry_point: "web_signup",
    });
    setStep("account");
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            `/signup/complete?next=${encodeURIComponent(nextPath)}`
          )}`
        : undefined;

    // Only carry non-sensitive handoff data. `hasPerformerRole` is a
    // convenience flag mirrored from the catalog so /signup/complete can
    // avoid a second catalog fetch if it needs to decide about the GigFit
    // offer without one.
    const boundedOther = otherDetail.trim().slice(0, 60);
    const { data, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          pending_work_roles: selectedKeys,
          pending_work_roles_other: selected.has("other") ? boundedOther || null : null,
          pending_has_performer_role: anyPerformer,
          pending_wants_gigfit: anyPerformer ? wantsGigfit : false,
        },
      },
    });

    if (signErr) {
      setError(signErr.message);
      setLoading(false);
      return;
    }

    // Auto-confirm project → we already have a session. Send the client
    // straight to /signup/complete which performs the handoff.
    if (data.session) {
      router.push(`/signup/complete?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
      return;
    }

    // Email-confirmation project → user must click the confirmation link.
    // That link lands on /auth/callback (PKCE code exchange) which then
    // forwards to /signup/complete?next=... via the honored ?next= query.
    setCheckEmail(true);
    setLoading(false);
  }

  const copy = COPY[intent];
  const loginHref = `/login?next=${encodeURIComponent(nextPath)}`;

  if (checkEmail) {
    return (
      <div className="mx-auto max-w-xl pt-10">
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-7 text-center">
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            Check your email
          </h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
            We sent a confirmation link to <span className="font-medium">{email}</span>.
            Confirm it and you&rsquo;ll finish setting up your GigDock account.
          </p>
        </div>
      </div>
    );
  }

  const totalSteps = 2;
  const stepIndex = step === "roles" ? 1 : 2;

  return (
    <div className="pt-6 sm:pt-10">
      {/* Progress indicator lives here — the wizard owns its own step state. */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
            <span
              key={n}
              className={`h-1.5 flex-1 rounded-full ${
                n <= stepIndex
                  ? "bg-blue-600 dark:bg-blue-500"
                  : "bg-zinc-200 dark:bg-zinc-800"
              }`}
            />
          ))}
        </div>
        <div className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-zinc-500 dark:text-zinc-400">
          Step {stepIndex} of {totalSteps} · {step === "roles" ? "Work Roles" : "Create account"}
        </div>
      </div>

      {step === "roles" ? (
        <>
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
              What kind of work do you do?
            </h1>
            <p className="mt-3 text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Select all that apply. We&rsquo;ll use this to tailor GigDock to
              the work you actually do. You can update it later from Profile.
            </p>
          </div>

          <WorkRolesPicker
            catalog={catalog}
            selected={selected}
            onToggle={toggle}
            otherDetail={otherDetail}
            onOtherDetailChange={setOtherDetail}
          />

          {error && (
            <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="mt-10 flex items-center justify-between gap-3">
            <div className="text-xs text-zinc-500 dark:text-zinc-400">
              {selected.size === 0 ? "Choose at least one to continue." : `${selected.size} selected`}
            </div>
            <button
              type="button"
              onClick={goToAccount}
              disabled={selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
            >
              Continue
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-8">
            <span className="inline-block text-sm font-bold tracking-[0.14em] uppercase text-blue-600 dark:text-blue-400">
              Your Gig Life. Simplified.
            </span>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              {copy.heading}
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{copy.sub}</p>
          </div>

          <form onSubmit={handleSignup} className="mx-auto max-w-md space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Email
              </label>
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
              <label
                htmlFor="password"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Password
              </label>
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

            {anyPerformer && (
              <label className="flex items-start gap-2 rounded-lg border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-3 py-2">
                <input
                  type="checkbox"
                  checked={wantsGigfit}
                  onChange={(e) => setWantsGigfit(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-zinc-700 dark:text-zinc-200">
                  <span className="font-medium">Set up GigFit next</span> —
                  <span className="text-zinc-500 dark:text-zinc-400">
                    {" "}
                    match with casting opportunities based on your profile. You
                    can always skip and come back later.
                  </span>
                </span>
              </label>
            )}

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("roles")}
                className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
              >
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
              >
                {loading ? "Creating account…" : copy.cta}
              </button>
            </div>

            <p className="pt-2 text-sm text-zinc-500 dark:text-zinc-400 text-center">
              Already have an account?{" "}
              <Link href={loginHref} className="text-blue-600 dark:text-blue-400 font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </>
      )}
    </div>
  );
}
