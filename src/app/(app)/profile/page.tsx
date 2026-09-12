"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { stateLabel } from "@/components/FilterChips";
import {
  ageFromDob,
  heightLabel,
  ETHNICITY_OPTIONS,
  type PerformerProfile,
  type ProfileFieldKey,
} from "@/lib/gigfit";
import WorkRolesPicker from "@/components/app/WorkRolesPicker";
import { hasPerformerRole, type WorkRoleCatalogRow } from "@/lib/workRoles";
import { updateWorkRoles } from "@/lib/backoffice-actions";
import { trackOnboarding } from "@/lib/onboardingEvents";
import { safeNext } from "@/lib/workRolesLaunch";

// Major production markets first — most users pick one of these.
const TOP_MARKETS = ["GA", "CA", "NY", "NM", "IL", "LA", "TX", "NC", "NV", "FL", "ON", "BC"];
const OTHER_MARKETS = [
  "AL", "AK", "AZ", "AR", "CO", "CT", "DE", "DC", "HI", "ID", "IN", "IA", "KS",
  "KY", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NH", "NJ", "ND",
  "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "UT", "VT", "VA", "WA", "WV",
  "WI", "WY", "AB", "MB", "NB", "NL", "NS", "PE", "QC", "SK",
];
// Full picker list, common markets first.
const ALL_MARKETS = [...TOP_MARKETS, ...OTHER_MARKETS];

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const UNIONS = [
  { value: "sag-aftra", label: "SAG-AFTRA" },
  { value: "non-union", label: "Non-union" },
  { value: "either", label: "Either / both" },
];

type Draft = {
  label: string;
  markets: string[];
  gender: string | null;
  ethnicity: string[];
  date_of_birth: string | null;
  union_status: string | null;
  height_inches: number | null;
  weight_lbs: number | null;
  notify_matches: boolean;
};

const BLANK: Draft = {
  label: "My Profile",
  markets: [],
  gender: null,
  ethnicity: [],
  date_of_birth: null,
  union_status: null,
  height_inches: null,
  weight_lbs: null,
  notify_matches: false,
};

/** How many active gigs specify each criterion — powers the value-framed nudges. */
type Coverage = {
  gender: number;
  ethnicity: number;
  age: number;
  union: number;
  states: number;
  total: number;
};

export default function ProfilePage() {
  // Suspense wrapper — useSearchParams() suspends during initial CSR and
  // Next requires the boundary. Nothing else changes.
  return (
    <Suspense>
      <ProfilePageInner />
    </Suspense>
  );
}

function ProfilePageInner() {
  const supabase = createSupabaseBrowser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromOnboarding = searchParams.get("from") === "onboarding";
  const nextPath = safeNext(searchParams.get("next"), "/today");
  // Guards double-fire of onboarding_completed if the user saves twice
  // before router.replace unmounts the page.
  const onboardingFiredRef = useRef(false);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showAllMarkets, setShowAllMarkets] = useState(false);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  // Served markets come from the admin-managed `markets` table so the list can
  // change without a redeploy; the hardcoded ALL_MARKETS is a safe fallback.
  const [marketOptions, setMarketOptions] = useState<string[]>(ALL_MARKETS);
  // Work roles — top-of-page editor. The casting section below only renders
  // when the current selection contains a performer role.
  const [catalog, setCatalog] = useState<WorkRoleCatalogRow[]>([]);
  const [roleSelection, setRoleSelection] = useState<Set<string>>(() => new Set());
  const [roleOther, setRoleOther] = useState("");
  const [rolesDirty, setRolesDirty] = useState(false);
  const [rolesSaving, setRolesSaving] = useState(false);
  const [rolesSavedAt, setRolesSavedAt] = useState<string | null>(null);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const rolesLoadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("markets")
        .select("code")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (data && data.length) setMarketOptions(data.map((m) => m.code as string));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the work-roles catalog + current selection once.
  useEffect(() => {
    if (rolesLoadedRef.current) return;
    rolesLoadedRef.current = true;
    (async () => {
      const [catalogRes, profileRes] = await Promise.all([
        supabase
          .from("work_roles_catalog")
          .select("role_key, label, category, is_performer, sort_order, is_active")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }),
        supabase.auth.getUser().then(async ({ data }) => {
          if (!data.user) return null;
          const { data: p } = await supabase
            .from("profiles")
            .select("work_roles, work_roles_other")
            .eq("user_id", data.user.id)
            .maybeSingle();
          return p;
        }),
      ]);
      if (catalogRes.data) setCatalog(catalogRes.data as WorkRoleCatalogRow[]);
      if (profileRes) {
        setRoleSelection(new Set((profileRes.work_roles as string[] | null) ?? []));
        setRoleOther((profileRes.work_roles_other as string | null) ?? "");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roleSelectionKeys = useMemo(
    () => Array.from(roleSelection).sort(),
    [roleSelection]
  );
  const isPerformer = useMemo(
    () => hasPerformerRole(roleSelectionKeys, catalog),
    [roleSelectionKeys, catalog]
  );

  function toggleRole(roleKey: string) {
    setRolesDirty(true);
    setRolesSavedAt(null);
    setRolesError(null);
    setRoleSelection((prev) => {
      const next = new Set(prev);
      if (next.has(roleKey)) next.delete(roleKey);
      else next.add(roleKey);
      return next;
    });
  }

  async function saveRoles() {
    setRolesError(null);
    if (roleSelection.size === 0) {
      setRolesError("Select at least one to save.");
      return;
    }
    setRolesSaving(true);
    const res = await updateWorkRoles(
      roleSelectionKeys,
      roleSelection.has("other") ? roleOther : null
    );
    setRolesSaving(false);
    if (!res.ok) {
      setRolesError(res.error);
      return;
    }
    trackOnboarding("work_roles_updated", {
      role_count: roleSelectionKeys.length,
      roles: roleSelectionKeys,
      has_performer_role: isPerformer,
    });
    setRolesDirty(false);
    setRolesSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }

  const load = useCallback(async () => {
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("performer_profiles")
      .select("*")
      .eq("user_id", auth.user.id)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      const p = data as PerformerProfile;
      setProfileId(p.id);
      setDraft({
        label: p.label ?? "My Profile",
        markets: p.markets ?? [],
        gender: p.gender,
        ethnicity: p.ethnicity ?? [],
        date_of_birth: p.date_of_birth,
        union_status: p.union_status,
        height_inches: p.height_inches ?? null,
        weight_lbs: p.weight_lbs ?? null,
        notify_matches: p.notify_matches ?? false,
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Load coverage stats so nudges can say what each field would unlock.
  useEffect(() => {
    (async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const { data } = await supabase
        .from("opportunities")
        .select("casting_specs, match_state")
        .eq("status", "active")
        .is("deleted_at", null)
        .or(`expires_at.is.null,expires_at.gte.${todayStr}`);
      if (!data) return;
      const states = new Set<string>();
      let gender = 0, ethnicity = 0, age = 0, union = 0;
      for (const row of data as { casting_specs: Record<string, unknown> | null; match_state: string | null }[]) {
        const c = row.casting_specs ?? {};
        if (Array.isArray(c.gender) && c.gender.length > 0) gender++;
        if (Array.isArray(c.ethnicity) && c.ethnicity.length > 0) ethnicity++;
        if (c.age_min != null || c.age_max != null) age++;
        if (typeof c.union_status === "string" && c.union_status && c.union_status !== "either") union++;
        if (row.match_state) states.add(row.match_state);
      }
      setCoverage({ gender, ethnicity, age, union, states: states.size, total: data.length });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function nudgeFor(k: ProfileFieldKey): string | null {
    if (!coverage) return null;
    switch (k) {
      case "markets":
        return coverage.states > 0
          ? `You're seeing gigs across ${coverage.states} state${coverage.states === 1 ? "" : "s"}. Set your regions to narrow this.`
          : null;
      case "gender":
        return coverage.gender > 0
          ? `${coverage.gender} active gig${coverage.gender === 1 ? "" : "s"} specify a gender — add yours to match against them.`
          : null;
      case "ethnicity":
        return coverage.ethnicity > 0
          ? `${coverage.ethnicity} active gig${coverage.ethnicity === 1 ? "" : "s"} specify ethnicity — add yours to match against them.`
          : null;
      case "date_of_birth":
        return coverage.age > 0
          ? `${coverage.age} active gig${coverage.age === 1 ? "" : "s"} specify an age range — add your date of birth to match against them.`
          : null;
      case "union_status":
        return coverage.union > 0
          ? `${coverage.union} active gig${coverage.union === 1 ? "" : "s"} specify union status — add yours to match against them.`
          : null;
    }
  }

  function toggleMarket(code: string) {
    setDraft((d) => {
      const set = new Set(d.markets);
      if (set.has(code)) set.delete(code);
      else set.add(code);
      return { ...d, markets: Array.from(set).sort() };
    });
  }

  function toggleEthnicity(value: string) {
    setDraft((d) => {
      const set = new Set(d.ethnicity);
      if (set.has(value)) set.delete(value);
      else set.add(value);
      return { ...d, ethnicity: Array.from(set) };
    });
  }

  function setFeet(f: number | null) {
    setDraft((d) => {
      if (f == null) return { ...d, height_inches: null };
      const i = d.height_inches != null ? d.height_inches % 12 : 0;
      return { ...d, height_inches: f * 12 + i };
    });
  }
  function setInches(i: number) {
    setDraft((d) => {
      const f = d.height_inches != null ? Math.floor(d.height_inches / 12) : 5;
      return { ...d, height_inches: f * 12 + i };
    });
  }

  async function save(): Promise<boolean> {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      return false;
    }
    const payload = {
      user_id: auth.user.id,
      label: draft.label || "My Profile",
      markets: draft.markets,
      gender: draft.gender,
      ethnicity: draft.ethnicity,
      date_of_birth: draft.date_of_birth,
      union_status: draft.union_status,
      height_inches: draft.height_inches,
      weight_lbs: draft.weight_lbs,
      notify_matches: draft.notify_matches,
      is_default: true,
    };

    let ok = true;
    if (profileId) {
      const { error } = await supabase
        .from("performer_profiles")
        .update(payload)
        .eq("id", profileId);
      if (error) ok = false;
    } else {
      const { data, error } = await supabase
        .from("performer_profiles")
        .insert(payload)
        .select()
        .single();
      if (error) ok = false;
      if (data) setProfileId((data as PerformerProfile).id);
    }
    setSaving(false);
    if (ok) {
      setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
    }
    return ok;
  }

  /** Save + treat this as completing onboarding when we entered from
   * /onboarding. Fires onboarding_completed and navigates to the validated
   * next path. Idempotent — the ref guard prevents double-fire. */
  async function saveAndFinish() {
    const ok = await save();
    if (!ok) return;
    if (fromOnboarding && !onboardingFiredRef.current) {
      onboardingFiredRef.current = true;
      trackOnboarding("onboarding_completed", {
        flow: "performer_full",
        has_performer_role: true,
      });
      router.replace(nextPath);
    }
  }

  /** Skip the casting profile from the onboarding return path. Fires the
   * skipped + completed events and navigates. Idempotent. */
  function skipAndFinish() {
    if (onboardingFiredRef.current) return;
    onboardingFiredRef.current = true;
    trackOnboarding("performer_profile_skipped", {
      steps_skipped: "casting_basics",
    });
    trackOnboarding("onboarding_completed", {
      flow: "performer_skipped",
      has_performer_role: true,
    });
    router.replace(nextPath);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const age = ageFromDob(draft.date_of_birth);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Profile
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Your work roles tailor GigDock to the kind of work you do. Casting
          profile fields help GigFit match you to relevant opportunities.
        </p>
      </div>

      {fromOnboarding && (
        <div className="rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20 px-5 py-4 sm:px-6">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Optional — set up your casting profile
          </div>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            GigFit uses these details to compare your profile with each opportunity&rsquo;s casting requirements. Fill in as much or as little as you want, or skip for now and come back later.
          </p>
          <div className="mt-3 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <button
              type="button"
              onClick={skipAndFinish}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-60"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={saveAndFinish}
              disabled={saving}
              className="inline-flex items-center justify-center rounded-full bg-blue-600 hover:bg-blue-700 px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save & continue"}
            </button>
          </div>
        </div>
      )}

      {/* Work roles — always visible */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="mb-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Work roles
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            What kind of work do you do? Select all that apply.
          </p>
        </div>
        {catalog.length === 0 ? (
          <div className="text-xs text-zinc-500 dark:text-zinc-400">Loading…</div>
        ) : (
          <>
            <WorkRolesPicker
              catalog={catalog}
              selected={roleSelection}
              onToggle={toggleRole}
              otherDetail={roleOther}
              onOtherDetailChange={(v) => {
                setRolesDirty(true);
                setRolesSavedAt(null);
                setRoleOther(v);
              }}
            />
            {rolesError && (
              <p className="mt-3 text-xs text-red-600 dark:text-red-400">{rolesError}</p>
            )}
            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                onClick={saveRoles}
                disabled={rolesSaving || !rolesDirty || roleSelection.size === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium"
              >
                {rolesSaving ? "Saving…" : "Save work roles"}
              </button>
              {rolesSavedAt && (
                <span className="text-xs text-green-600 dark:text-green-400">
                  Saved at {rolesSavedAt}
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {isPerformer ? (
        <>
          <div className="pt-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
              Casting profile
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
              Used only to match you with relevant film &amp; TV casting opportunities. Every detail you add helps GigFit compare your profile with casting requirements — you don&apos;t have to fill it all in at once.
            </p>
          </div>

      {/* Profile name */}
      <Section
        title="Profile name"
        hint="What to call this profile — usually your name. This is the label shown when choosing which profile to match (GigFit)."
      >
        <input
          type="text"
          value={draft.label}
          onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
          placeholder="e.g. Alan"
          className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Section>

      {/* Markets — collapsed shows only your selected states; expand to add.
          With nothing selected the full picker opens automatically. */}
      <Section
        title="Regions"
        hint="States you'll work in. Gigs outside these are filtered out."
        nudge={!draft.markets.length ? nudgeFor("markets") : null}
      >
        {showAllMarkets || draft.markets.length === 0 ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {marketOptions.map((code) => (
                <MarketChip
                  key={code}
                  code={code}
                  selected={draft.markets.includes(code)}
                  onToggle={() => toggleMarket(code)}
                />
              ))}
            </div>
            {draft.markets.length > 0 && (
              <button
                type="button"
                onClick={() => setShowAllMarkets(false)}
                className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2"
              >
                Done
              </button>
            )}
          </>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {draft.markets.map((code) => (
                <MarketChip
                  key={code}
                  code={code}
                  selected
                  onToggle={() => toggleMarket(code)}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => setShowAllMarkets(true)}
              className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2"
            >
              + Add or edit states
            </button>
          </>
        )}
      </Section>

      {/* Gender */}
      <Section
        title="Gender"
        hint="Matched against roles that specify a gender."
        nudge={!draft.gender ? nudgeFor("gender") : null}
      >
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((g) => (
            <Radio
              key={g.value}
              label={g.label}
              checked={draft.gender === g.value}
              onSelect={() => setDraft((d) => ({ ...d, gender: g.value }))}
            />
          ))}
          {draft.gender && (
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, gender: null }))}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2"
            >
              Clear
            </button>
          )}
        </div>
      </Section>

      {/* Ethnicity */}
      <Section
        title="Ethnicity"
        hint="Matched against roles that specify ethnicity. Select all that apply."
        nudge={!draft.ethnicity.length ? nudgeFor("ethnicity") : null}
      >
        <div className="flex flex-wrap gap-2">
          {ETHNICITY_OPTIONS.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => toggleEthnicity(e.value)}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                draft.ethnicity.includes(e.value)
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      </Section>

      {/* Date of birth */}
      <Section
        title="Date of birth"
        hint={age != null ? `Age ${age} — matched against role age ranges.` : "Used to match role age ranges. Never shown publicly."}
        nudge={!draft.date_of_birth ? nudgeFor("date_of_birth") : null}
      >
        <input
          type="date"
          value={draft.date_of_birth ?? ""}
          onChange={(e) =>
            setDraft((d) => ({ ...d, date_of_birth: e.target.value || null }))
          }
          className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </Section>

      {/* Union */}
      <Section
        title="Union status"
        hint="Matched against roles that require a specific status."
        nudge={!draft.union_status ? nudgeFor("union_status") : null}
      >
        <div className="flex flex-wrap gap-2">
          {UNIONS.map((u) => (
            <Radio
              key={u.value}
              label={u.label}
              checked={draft.union_status === u.value}
              onSelect={() => setDraft((d) => ({ ...d, union_status: u.value }))}
            />
          ))}
          {draft.union_status && (
            <button
              type="button"
              onClick={() => setDraft((d) => ({ ...d, union_status: null }))}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2"
            >
              Clear
            </button>
          )}
        </div>
      </Section>

      {/* Height */}
      <Section
        title="Height"
        hint={
          heightLabel(draft.height_inches)
            ? `${heightLabel(draft.height_inches)} — saved to your profile. Height matching comes later.`
            : "Saved to your profile. Not yet used for matching."
        }
      >
        <div className="flex items-center gap-2">
          <select
            value={draft.height_inches != null ? Math.floor(draft.height_inches / 12) : ""}
            onChange={(e) => setFeet(e.target.value === "" ? null : Number(e.target.value))}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— ft</option>
            {[4, 5, 6, 7].map((f) => (
              <option key={f} value={f}>{f} ft</option>
            ))}
          </select>
          <select
            value={draft.height_inches != null ? draft.height_inches % 12 : ""}
            onChange={(e) => setInches(Number(e.target.value))}
            disabled={draft.height_inches == null}
            className="px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">— in</option>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i} value={i}>{i} in</option>
            ))}
          </select>
          {draft.height_inches != null && (
            <button
              type="button"
              onClick={() => setFeet(null)}
              className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 px-2"
            >
              Clear
            </button>
          )}
        </div>
      </Section>

      {/* Weight */}
      <Section
        title="Weight"
        hint="Saved to your profile. Not yet used for matching."
      >
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            min={50}
            max={500}
            value={draft.weight_lbs ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                weight_lbs: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
            placeholder="—"
            className="w-24 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-sm text-zinc-500 dark:text-zinc-400">lbs</span>
        </div>
      </Section>

      {/* Save. Regular /profile visit: normal Save. Onboarding return path:
          save also completes onboarding and navigates so the user isn't
          stranded on the page. */}
      <div className="flex items-center gap-3 sticky bottom-0 bg-zinc-50 dark:bg-zinc-950 py-3 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={fromOnboarding ? saveAndFinish : save}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium text-sm"
        >
          {saving ? "Saving…" : fromOnboarding ? "Save & continue" : "Save profile"}
        </button>
        {savedAt && !fromOnboarding && (
          <span className="text-xs text-green-600 dark:text-green-400">
            Saved at {savedAt}
          </span>
        )}
      </div>
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-4 text-sm text-zinc-500 dark:text-zinc-400">
          Casting profile is available when your work roles include a performing role (Background Actor, Stand-In / Photo Double, Actor, Voice Actor, or Model). Add one above and it will appear here — your existing casting data (if any) is preserved and will reappear when a performer role is selected again.
        </div>
      )}
    </div>
  );
}

/* ---------- small building blocks ---------- */

function Section({
  title,
  hint,
  nudge,
  children,
}: {
  title: string;
  hint?: string;
  nudge?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 space-y-2">
      <div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        {hint && <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{hint}</p>}
      </div>
      {children}
      {nudge && (
        <p className="text-xs text-amber-700 dark:text-amber-400 pt-1">{nudge}</p>
      )}
    </div>
  );
}

function MarketChip({
  code,
  selected,
  onToggle,
}: {
  code: string;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={stateLabel(code)}
      className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${
        selected
          ? "bg-blue-600 border-blue-600 text-white"
          : "bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-400"
      }`}
    >
      {code}
    </button>
  );
}

function Radio({
  label,
  checked,
  onSelect,
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
