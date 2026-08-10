"use client";

import { useCallback, useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import PublicShell from "@/components/PublicShell";
import { stateLabel } from "@/components/FilterChips";
import {
  ageFromDob,
  heightLabel,
  ETHNICITY_OPTIONS,
  type PerformerProfile,
  type ProfileFieldKey,
} from "@/lib/gigfit";

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
  const supabase = createSupabaseBrowser();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(BLANK);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [showAllMarkets, setShowAllMarkets] = useState(false);
  const [coverage, setCoverage] = useState<Coverage | null>(null);

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
        .or(`work_date.is.null,work_date.gte.${todayStr}`);
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

  async function save() {
    setSaving(true);
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setSaving(false);
      return;
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

    if (profileId) {
      await supabase.from("performer_profiles").update(payload).eq("id", profileId);
    } else {
      const { data } = await supabase
        .from("performer_profiles")
        .insert(payload)
        .select()
        .single();
      if (data) setProfileId((data as PerformerProfile).id);
    }
    setSaving(false);
    setSavedAt(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }));
  }

  if (loading) {
    return (
      <PublicShell>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      </PublicShell>
    );
  }

  const age = ageFromDob(draft.date_of_birth);

  return (
    <PublicShell>
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          My Casting Profile
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Used to match you to opportunities. Every field you add sharpens your
          matches — you don&apos;t have to fill it all in at once.
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
              {ALL_MARKETS.map((code) => (
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

      {/* Save */}
      <div className="flex items-center gap-3 sticky bottom-0 bg-zinc-50 dark:bg-zinc-950 py-3 border-t border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium text-sm"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
        {savedAt && (
          <span className="text-xs text-green-600 dark:text-green-400">
            Saved at {savedAt}
          </span>
        )}
      </div>
    </div>
    </PublicShell>
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
