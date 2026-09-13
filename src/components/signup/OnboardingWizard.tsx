"use client";

// Unified pre-account onboarding wizard.
//
// Order:
//   Step 1  Work Roles      (universal, required — ≥1)
//   Step 2  Where            (universal work markets, required — ≥1)
//   Step 3  GigFit Details   (performer/mixed only, all fields optional)
//   Step 4  Preview          (Opportunities for you, powered by gigfit_preview)
//   Step 5  Create Account   (email + password → create draft → signUp)
//
// Crew-only users skip Step 3.
//
// Wizard state lives entirely on the client. A server-side draft is
// created only when the user submits the final Create Account step; the
// signup passes ONLY the opaque draft_id in Supabase auth user_metadata.
// /signup/complete claims the draft with the authenticated session's
// email hash, persists the real profile data, and then clears the draft.
//
// Nothing sensitive (gender/ethnicity/dob/union/height) ever touches auth
// metadata — the demographic bag lives server-side in onboarding_drafts.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { stateLabel } from "@/components/FilterChips";
import type { WorkRoleCatalogRow } from "@/lib/workRoles";
import { hasPerformerRole } from "@/lib/workRoles";
import { ETHNICITY_OPTIONS } from "@/lib/gigfit";
import WorkRolesPicker from "@/components/app/WorkRolesPicker";
import OpportunityPreview, {
  type PreviewOpportunity,
} from "@/components/signup/OpportunityPreview";
import { trackOnboarding } from "@/lib/onboardingEvents";

type Intent = "save" | "applied" | "gigfit" | "manage" | "default";
type Step = "roles" | "where" | "gigfit_details" | "preview" | "account";

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
    sub: "Takes just a minute. Your details help match you with film & TV casting opportunities.",
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

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const UNIONS = [
  { value: "sag-aftra", label: "SAG-AFTRA" },
  { value: "non-union", label: "Non-union" },
  { value: "either", label: "Either / both" },
];

export interface OnboardingWizardProps {
  catalog: WorkRoleCatalogRow[];
  markets: { code: string; name: string }[];
  previewOpportunities: PreviewOpportunity[];
  nextPath: string;
  intent: Intent;
}

export default function OnboardingWizard({
  catalog,
  markets,
  previewOpportunities,
  nextPath,
  intent,
}: OnboardingWizardProps) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowser(), []);

  // Step state.
  const [step, setStep] = useState<Step>("roles");

  // Step 1: Work Roles.
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(() => new Set());
  const [roleOther, setRoleOther] = useState("");

  // Step 2: Work Markets.
  const [selectedMarkets, setSelectedMarkets] = useState<Set<string>>(() => new Set());
  const [showAllMarkets, setShowAllMarkets] = useState(true);

  // Step 3: GigFit details (performer only).
  const [gender, setGender] = useState<string | null>(null);
  const [ethnicity, setEthnicity] = useState<string[]>([]);
  const [dob, setDob] = useState<string | null>(null);
  const [unionStatus, setUnionStatus] = useState<string | null>(null);
  const [heightInches, setHeightInches] = useState<number | null>(null);

  // Step 5: Create account.
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  const roleKeys = useMemo(() => Array.from(selectedRoles).sort(), [selectedRoles]);
  const marketCodes = useMemo(() => Array.from(selectedMarkets).sort(), [selectedMarkets]);
  const anyPerformer = useMemo(
    () => hasPerformerRole(roleKeys, catalog),
    [roleKeys, catalog]
  );

  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    trackOnboarding("onboarding_started", { entry_point: "web_signup" });
  }, []);

  function toggleRole(roleKey: string) {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(roleKey)) next.delete(roleKey);
      else next.add(roleKey);
      return next;
    });
  }
  function toggleMarket(code: string) {
    setSelectedMarkets((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }
  function toggleEthnicity(value: string) {
    setEthnicity((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }
  function setFeet(f: number | null) {
    if (f == null) return setHeightInches(null);
    const i = heightInches != null ? heightInches % 12 : 0;
    setHeightInches(f * 12 + i);
  }
  function setInches(i: number) {
    const f = heightInches != null ? Math.floor(heightInches / 12) : 5;
    setHeightInches(f * 12 + i);
  }

  const totalSteps = anyPerformer ? 5 : 4;
  const stepNumber: Record<Step, number> = anyPerformer
    ? { roles: 1, where: 2, gigfit_details: 3, preview: 4, account: 5 }
    : { roles: 1, where: 2, gigfit_details: 0, preview: 3, account: 4 };
  const stepIndex = stepNumber[step];

  function advance() {
    setError(null);
    if (step === "roles") {
      if (selectedRoles.size === 0) {
        setError("Select at least one to continue.");
        return;
      }
      trackOnboarding("work_roles_selected", {
        role_count: roleKeys.length,
        roles: roleKeys,
        has_performer_role: anyPerformer,
        has_crew_role: catalog.some(
          (r) => selectedRoles.has(r.role_key) && r.category === "crew"
        ),
        entry_point: "web_signup",
      });
      setStep("where");
      return;
    }
    if (step === "where") {
      if (selectedMarkets.size === 0) {
        setError("Choose at least one market to continue.");
        return;
      }
      setStep(anyPerformer ? "gigfit_details" : "preview");
      return;
    }
    if (step === "gigfit_details") {
      // All fields optional.
      setStep("preview");
      return;
    }
    if (step === "preview") {
      setStep("account");
      return;
    }
  }

  function back() {
    setError(null);
    if (step === "where") setStep("roles");
    else if (step === "gigfit_details") setStep("where");
    else if (step === "preview") setStep(anyPerformer ? "gigfit_details" : "where");
    else if (step === "account") setStep("preview");
  }

  async function submitAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    // 1) Create the server-side draft (opaque draft_id).
    const performerPayload = anyPerformer
      ? {
          gender: gender ?? null,
          ethnicity: ethnicity,
          date_of_birth: dob ?? null,
          union_status: unionStatus ?? null,
          height_inches:
            typeof heightInches === "number" && heightInches > 0
              ? heightInches
              : null,
        }
      : null;

    const { data: draftIdData, error: draftErr } = await supabase.rpc(
      "create_onboarding_draft",
      {
        p_data: {
          work_roles: roleKeys,
          work_roles_other: selectedRoles.has("other") ? roleOther.trim().slice(0, 60) : null,
          work_markets: marketCodes,
          performer: performerPayload,
        },
        p_intended_email: email,
      }
    );
    if (draftErr) {
      setBusy(false);
      setError(draftErr.message ?? "Could not save your onboarding draft.");
      return;
    }

    const draftId = draftIdData as string;

    // 2) Sign up with ONLY the opaque draft_id in user_metadata. No
    //    sensitive data touches auth. emailRedirectTo routes through
    //    /auth/callback which then forwards to /signup/complete.
    const emailRedirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            `/signup/complete?next=${encodeURIComponent(nextPath)}`
          )}`
        : undefined;

    const { data: signData, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
        data: {
          pending_draft_id: draftId,
        },
      },
    });
    if (signErr) {
      setBusy(false);
      setError(signErr.message);
      return;
    }

    // 3) Auto-confirm project → we have a session; go finish the handoff.
    if (signData.session) {
      router.push(`/signup/complete?next=${encodeURIComponent(nextPath)}`);
      router.refresh();
      return;
    }

    // Email-confirm project → user must click the link.
    setCheckEmail(true);
    setBusy(false);
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

  return (
    <div className="pt-6 sm:pt-10">
      {/* Progress indicator */}
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
          Step {stepIndex} of {totalSteps} · {stepLabel(step, anyPerformer)}
        </div>
      </div>

      {step === "roles" && (
        <StepRoles
          catalog={catalog}
          selected={selectedRoles}
          onToggle={toggleRole}
          otherDetail={roleOther}
          onOtherDetailChange={setRoleOther}
          error={error}
          onContinue={advance}
          selectedCount={selectedRoles.size}
        />
      )}

      {step === "where" && (
        <StepWhere
          markets={markets}
          selected={selectedMarkets}
          onToggle={toggleMarket}
          showAll={showAllMarkets}
          onToggleShowAll={() => setShowAllMarkets((s) => !s)}
          error={error}
          onBack={back}
          onContinue={advance}
        />
      )}

      {step === "gigfit_details" && (
        <StepGigFitDetails
          gender={gender}
          setGender={setGender}
          ethnicity={ethnicity}
          toggleEthnicity={toggleEthnicity}
          dob={dob}
          setDob={setDob}
          unionStatus={unionStatus}
          setUnionStatus={setUnionStatus}
          heightInches={heightInches}
          setFeet={setFeet}
          setInches={setInches}
          onBack={back}
          onContinue={advance}
        />
      )}

      {step === "preview" && (
        <StepPreview
          workRoles={roleKeys}
          workMarkets={marketCodes}
          performer={anyPerformer ? { gender, ethnicity, date_of_birth: dob, union_status: unionStatus, height_inches: heightInches } : null}
          opportunities={previewOpportunities}
          onBack={back}
          onContinue={advance}
        />
      )}

      {step === "account" && (
        <StepAccount
          copy={copy}
          email={email}
          setEmail={setEmail}
          password={password}
          setPassword={setPassword}
          busy={busy}
          error={error}
          onBack={back}
          onSubmit={submitAccount}
          loginHref={loginHref}
        />
      )}
    </div>
  );
}

function stepLabel(step: Step, anyPerformer: boolean): string {
  switch (step) {
    case "roles":          return "Work Roles";
    case "where":          return "Where";
    case "gigfit_details": return "GigFit Details";
    case "preview":        return anyPerformer ? "Opportunities for you" : "Opportunities in your markets";
    case "account":        return "Create Account";
  }
}

/* ---------- steps ---------- */

function StepRoles({
  catalog, selected, onToggle, otherDetail, onOtherDetailChange, error, onContinue, selectedCount,
}: {
  catalog: WorkRoleCatalogRow[];
  selected: Set<string>;
  onToggle: (k: string) => void;
  otherDetail: string;
  onOtherDetailChange: (v: string) => void;
  error: string | null;
  onContinue: () => void;
  selectedCount: number;
}) {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
          What kind of work do you do?
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Select all that apply. We&rsquo;ll use this to tailor GigDock to the work you actually do.
        </p>
      </div>

      <WorkRolesPicker
        catalog={catalog}
        selected={selected}
        onToggle={onToggle}
        otherDetail={otherDetail}
        onOtherDetailChange={onOtherDetailChange}
      />

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-10 flex items-center justify-between gap-3">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">
          {selectedCount === 0 ? "Choose at least one to continue." : `${selectedCount} selected`}
        </div>
        <button
          type="button"
          onClick={onContinue}
          disabled={selectedCount === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Continue
        </button>
      </div>
    </>
  );
}

function StepWhere({
  markets, selected, onToggle, showAll, onToggleShowAll, error, onBack, onContinue,
}: {
  markets: { code: string; name: string }[];
  selected: Set<string>;
  onToggle: (c: string) => void;
  showAll: boolean;
  onToggleShowAll: () => void;
  error: string | null;
  onBack: () => void;
  onContinue: () => void;
}) {
  const chosen = markets.filter((m) => selected.has(m.code));
  const visible = showAll || chosen.length === 0 ? markets : chosen;
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
          Where do you want to work?
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Select all the markets you can work in. Opportunities outside these are still shown, but ranked lower.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {visible.map((m) => (
          <button
            key={m.code}
            type="button"
            onClick={() => onToggle(m.code)}
            title={stateLabel(m.code)}
            className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
              selected.has(m.code)
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
            }`}
          >
            {m.code} <span className="opacity-70">·</span> {m.name}
          </button>
        ))}
      </div>
      {chosen.length > 0 && (
        <button
          type="button"
          onClick={onToggleShowAll}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2"
        >
          {showAll ? "Show only selected" : "+ Add or edit markets"}
        </button>
      )}

      {error && <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="mt-10 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          disabled={selected.size === 0}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Continue
        </button>
      </div>
    </>
  );
}

function StepGigFitDetails({
  gender, setGender, ethnicity, toggleEthnicity, dob, setDob, unionStatus, setUnionStatus,
  heightInches, setFeet, setInches, onBack, onContinue,
}: {
  gender: string | null;
  setGender: (v: string | null) => void;
  ethnicity: string[];
  toggleEthnicity: (v: string) => void;
  dob: string | null;
  setDob: (v: string | null) => void;
  unionStatus: string | null;
  setUnionStatus: (v: string | null) => void;
  heightInches: number | null;
  setFeet: (f: number | null) => void;
  setInches: (i: number) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
          GigFit details
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Optional — every field helps GigFit compare your profile with each opportunity&rsquo;s casting requirements. You can update or add these later.
        </p>
      </div>

      <div className="space-y-4">
        <Field title="Gender">
          <div className="flex flex-wrap gap-2">
            {GENDERS.map((g) => (
              <Radio
                key={g.value}
                label={g.label}
                checked={gender === g.value}
                onSelect={() => setGender(g.value)}
              />
            ))}
            {gender && (
              <button type="button" onClick={() => setGender(null)} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2">
                Clear
              </button>
            )}
          </div>
        </Field>

        <Field title="Ethnicity" hint="Select all that apply.">
          <div className="flex flex-wrap gap-2">
            {ETHNICITY_OPTIONS.map((e) => (
              <button
                key={e.value}
                type="button"
                onClick={() => toggleEthnicity(e.value)}
                className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                  ethnicity.includes(e.value)
                    ? "bg-blue-600 border-blue-600 text-white"
                    : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
                }`}
              >
                {e.label}
              </button>
            ))}
          </div>
        </Field>

        <Field title="Date of birth" hint="Used to match role age ranges. Never shown publicly.">
          <input
            type="date"
            value={dob ?? ""}
            onChange={(e) => setDob(e.target.value || null)}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </Field>

        <Field title="Union status">
          <div className="flex flex-wrap gap-2">
            {UNIONS.map((u) => (
              <Radio
                key={u.value}
                label={u.label}
                checked={unionStatus === u.value}
                onSelect={() => setUnionStatus(u.value)}
              />
            ))}
            {unionStatus && (
              <button type="button" onClick={() => setUnionStatus(null)} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2">
                Clear
              </button>
            )}
          </div>
        </Field>

        <Field title="Height">
          <div className="flex items-center gap-2">
            <select
              value={heightInches != null ? Math.floor(heightInches / 12) : ""}
              onChange={(e) => setFeet(e.target.value === "" ? null : Number(e.target.value))}
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— ft</option>
              {[4, 5, 6, 7].map((f) => (
                <option key={f} value={f}>{f} ft</option>
              ))}
            </select>
            <select
              value={heightInches != null ? heightInches % 12 : ""}
              onChange={(e) => setInches(Number(e.target.value))}
              disabled={heightInches == null}
              className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">— in</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>{i} in</option>
              ))}
            </select>
            {heightInches != null && (
              <button type="button" onClick={() => setFeet(null)} className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2">
                Clear
              </button>
            )}
          </div>
        </Field>
      </div>

      <div className="mt-10 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Continue
        </button>
      </div>
    </>
  );
}

function StepPreview({
  workRoles, workMarkets, performer, opportunities, onBack, onContinue,
}: {
  workRoles: string[];
  workMarkets: string[];
  performer: {
    gender: string | null;
    ethnicity: string[];
    date_of_birth: string | null;
    union_status: string | null;
    height_inches: number | null;
  } | null;
  opportunities: PreviewOpportunity[];
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <>
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
          Opportunities for you
        </h1>
        <p className="mt-3 text-base text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Here&rsquo;s a preview based on what you&rsquo;ve told us. Create a free account to save these, mark them as applied, and get notified when new matches come in.
        </p>
      </div>

      <OpportunityPreview
        workRoles={workRoles}
        workMarkets={workMarkets}
        performer={performer}
        opportunities={opportunities}
      />

      <div className="mt-10 flex items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Back
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
        >
          Continue
        </button>
      </div>
    </>
  );
}

function StepAccount({
  copy, email, setEmail, password, setPassword, busy, error, onBack, onSubmit, loginHref,
}: {
  copy: { heading: string; sub: string; cta: string };
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  busy: boolean;
  error: string | null;
  onBack: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loginHref: string;
}) {
  return (
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

      <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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
          <label htmlFor="password" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
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

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

        <div className="flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            onClick={onBack}
            className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 px-6 py-2.5 text-sm font-semibold text-white transition-colors"
          >
            {busy ? "Creating account…" : copy.cta}
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
  );
}

/* ---------- tiny form helpers ---------- */

function Field({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        {hint && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

function Radio({
  label, checked, onSelect,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
        checked
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
      }`}
    >
      {label}
    </button>
  );
}
