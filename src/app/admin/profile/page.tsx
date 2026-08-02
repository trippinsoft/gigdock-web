"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { stateLabel } from "@/components/FilterChips";
import {
  ageFromDob,
  fieldsMissing,
  fieldsSet,
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

const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
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
  date_of_birth: string | null;
  union_status: string | null;
  notify_matches: boolean;
};

const BLANK: Draft = {
  label: "My Profile",
  markets: [],
  gender: null,
  date_of_birth: null,
  union_status: null,
  notify_matches: false,
};

/** How many active gigs specify each criterion — powers the value-framed nudges. */
type Coverage = { gender: number; age: number; union: number; states: number; total: number };

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
        date_of_birth: p.date_of_birth,
        union_status: p.union_status,
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
      let gender = 0, age = 0, union = 0;
      for (const row of data as { casting_specs: Record<string, unknown> | null; match_state: string | null }[]) {
        const c = row.casting_specs ?? {};
        if (Array.isArray(c.gender) && c.gender.length > 0) gender++;
        if (c.age_min != null || c.age_max != null) age++;
        if (typeof c.union_status === "string" && c.union_status && c.union_status !== "either") union++;
        if (row.match_state) states.add(row.match_state);
      }
      setCoverage({ gender, age, union, states: states.size, total: data.length });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const asProfile: PerformerProfile = useMemo(
    () => ({
      id: profileId ?? "draft",
      label: draft.label,
      markets: draft.markets,
      gender: draft.gender,
      date_of_birth: draft.date_of_birth,
      union_status: draft.union_status,
      notify_matches: draft.notify_matches,
    }),
    [draft, profileId]
  );

  const setCount = fieldsSet(asProfile).length;
  const missing = fieldsMissing(asProfile);

  function nudgeFor(k: ProfileFieldKey): string | null {
    if (!coverage) return null;
    switch (k) {
      case "markets":
        return coverage.states > 0
          ? `You're seeing gigs across ${coverage.states} state${coverage.states === 1 ? "" : "s"}. Set your markets to narrow this.`
          : null;
      case "gender":
        return coverage.gender > 0
          ? `${coverage.gender} active gig${coverage.gender === 1 ? "" : "s"} specify a gender — add yours to match against them.`
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
      date_of_birth: draft.date_of_birth,
      union_status: draft.union_status,
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
          My Casting Profile
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Used to match you to opportunities. Every field you add sharpens your
          matches — you don&apos;t have to fill it all in at once.
        </p>
      </div>

      {/* Completeness */}
      <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            {setCount} of 4 matching details set
          </span>
          <Link
            href="/admin/active"
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            See my matches →
          </Link>
        </div>
        <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-green-600 transition-all"
            style={{ width: `${(setCount / 4) * 100}%` }}
          />
        </div>
        {missing.length > 0 && nudgeFor(missing[0]) && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
            💡 {nudgeFor(missing[0])}
          </p>
        )}
      </div>

      {/* Markets */}
      <Section
        title="Markets"
        hint="States you'll work in. Gigs outside these are filtered out."
        nudge={!draft.markets.length ? nudgeFor("markets") : null}
      >
        <div className="flex flex-wrap gap-1.5">
          {TOP_MARKETS.map((code) => (
            <MarketChip
              key={code}
              code={code}
              selected={draft.markets.includes(code)}
              onToggle={() => toggleMarket(code)}
            />
          ))}
        </div>
        {showAllMarkets ? (
          <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            {OTHER_MARKETS.map((code) => (
              <MarketChip
                key={code}
                code={code}
                selected={draft.markets.includes(code)}
                onToggle={() => toggleMarket(code)}
              />
            ))}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAllMarkets(true)}
            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 mt-2"
          >
            Show all states / provinces
          </button>
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

      {/* Notifications */}
      <Section title="Alerts" hint="Get notified when a new gig matches this profile.">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={draft.notify_matches}
            onChange={(e) =>
              setDraft((d) => ({ ...d, notify_matches: e.target.checked }))
            }
            className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5"
          />
          <span className="text-sm text-zinc-700 dark:text-zinc-300">
            Notify me of new matches
          </span>
        </label>
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
        <p className="text-xs text-amber-700 dark:text-amber-400 pt-1">💡 {nudge}</p>
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
