"use client";

// Month calendar with a contextual inspector. Clicking a day with work opens a
// side drawer (desktop) / bottom sheet (mobile) listing that day's gigs — you
// inspect without losing the calendar, then open the full gig workspace.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDraftGig } from "@/lib/backoffice-actions";
import type { CalendarDate, DateFlag } from "@/lib/backoffice-types";
import { shortDate } from "@/lib/format";

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function CalendarGrid({
  monthISO,
  dates,
  flags,
}: {
  monthISO: string; // YYYY-MM
  dates: CalendarDate[];
  flags: DateFlag[];
}) {
  const router = useRouter();
  const [y, mo] = monthISO.split("-").map(Number);
  const m = mo - 1;
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function newGig() {
    setCreating(true);
    const res = await createDraftGig();
    if (!res.ok || !res.data) {
      setCreating(false);
      alert(res.ok ? "Could not create gig." : res.error);
      return;
    }
    router.push(`/gigs/${res.data.id}/edit`);
  }

  const gridStart = new Date(y, m, 1 - new Date(y, m, 1).getDay());
  const monthEnd = new Date(y, m + 1, 1);
  const gridEnd = new Date(monthEnd);
  if (gridEnd.getDay() !== 0) gridEnd.setDate(gridEnd.getDate() + (7 - gridEnd.getDay()));

  const byDate = new Map<string, CalendarDate[]>();
  for (const d of dates) {
    const key = d.date.slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(d);
  }
  const flagByDate = new Map<string, string>();
  for (const f of flags) flagByDate.set(f.date.slice(0, 10), f.flag);

  const weeks: Date[][] = [];
  const cursor = new Date(gridStart);
  while (cursor < gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const todayKey = fmt(new Date());
  const selectedGigs = selected ? byDate.get(selected) ?? [] : [];

  return (
    <div className="lg:flex lg:gap-4">
      <div className="flex-1 min-w-0 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {DOW.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              <span className="hidden sm:inline">{d}</span><span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
            {week.map((day) => {
              const key = fmt(day);
              const inMonth = day.getMonth() === m;
              const gigs = byDate.get(key) ?? [];
              const flag = flagByDate.get(key);
              const isToday = key === todayKey;
              const isSel = key === selected;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  className={`min-h-[68px] sm:min-h-[92px] text-left p-1.5 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0 align-top cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40 ${
                    inMonth ? "" : "bg-zinc-50/60 dark:bg-zinc-950/40"
                  } ${isSel ? "ring-2 ring-inset ring-blue-500" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${isToday ? "bg-blue-600 text-white font-semibold" : inMonth ? "text-zinc-600 dark:text-zinc-300" : "text-zinc-300 dark:text-zinc-600"}`}>{day.getDate()}</span>
                    {flag && <span title={flag} className="text-[9px] uppercase tracking-wide font-semibold text-amber-600 dark:text-amber-400">{flag.slice(0, 4)}</span>}
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {gigs.slice(0, 3).map((g) => (
                      <span key={g.id} className="block truncate text-[11px] leading-tight px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300">{g.gig?.title ?? "Gig"}</span>
                    ))}
                    {gigs.length > 3 && <span className="text-[10px] text-zinc-400 dark:text-zinc-500 px-1">+{gigs.length - 3} more</span>}
                  </div>
                </button>
              );
            })}
          </div>
        ))}
      </div>

      {/* Inspector */}
      {selected && (
        <>
          {/* Mobile backdrop */}
          <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setSelected(null)} />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 lg:static lg:z-auto lg:mt-0 lg:w-80 lg:shrink-0 lg:max-h-none lg:rounded-2xl lg:border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{shortDate(selected)}</h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500">Day actions</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-2xl leading-none" aria-label="Close">×</button>
            </div>

            {/* Gigs on this day (context) */}
            {selectedGigs.length > 0 && (
              <div className="mb-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1.5">On this day</div>
                <div className="flex flex-col gap-1.5">
                  {selectedGigs.map((g) => (
                    <div key={g.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{g.gig?.title ?? "Gig"}</div>
                      <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                        {g.status_for_day ?? "worked"}{g.hours_total != null && <> · {Number(g.hours_total)} hrs</>}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        {g.gig_id && <Link href={`/gigs/${g.gig_id}`} className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Open gig →</Link>}
                        {g.gig_id && <Link href={`/gigs/${g.gig_id}/edit`} className="text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:underline">Edit</Link>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Day actions (mirrors the mobile day sheet) */}
            <div className="flex flex-col divide-y divide-zinc-100 dark:divide-zinc-800 border-t border-zinc-100 dark:border-zinc-800">
              <ActionRow icon={<IconPlus />} label="New gig" onClick={newGig} busy={creating} />
              {selectedGigs.length > 0 && selectedGigs[0].gig_id ? (
                <ActionRow icon={<IconDollar />} label="Add payment" href={`/gigs/${selectedGigs[0].gig_id}/edit`} />
              ) : (
                <ActionRow icon={<IconDollar />} label="Add payment" hint="Add a gig first" disabled />
              )}
              <ActionRow icon={<IconDoc />} label="Add document" hint="Soon on web" disabled />
              <ActionRow icon={<IconReceipt />} label="Add expense" hint="Soon on web" disabled />
            </div>

            {selectedGigs.length === 0 && (
              <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">Nothing scheduled this day.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function ActionRow({
  icon,
  label,
  href,
  onClick,
  busy,
  disabled,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  href?: string;
  onClick?: () => void;
  busy?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 py-3">
      <span className={`shrink-0 ${disabled ? "text-zinc-300 dark:text-zinc-700" : "text-blue-600 dark:text-blue-400"}`}>{icon}</span>
      <span className={`flex-1 text-sm font-medium ${disabled ? "text-zinc-400 dark:text-zinc-600" : "text-zinc-800 dark:text-zinc-200"}`}>{busy ? "Working…" : label}</span>
      {hint && <span className="text-[11px] uppercase tracking-wide text-zinc-300 dark:text-zinc-700 border border-zinc-200 dark:border-zinc-800 rounded px-1 py-0.5">{hint}</span>}
    </div>
  );
  if (disabled) return <div aria-disabled className="cursor-default">{inner}</div>;
  if (href) return <Link href={href} className="block hover:opacity-80">{inner}</Link>;
  return <button type="button" onClick={onClick} disabled={busy} className="block w-full text-left hover:opacity-80 disabled:opacity-50">{inner}</button>;
}

function IconPlus() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>; }
function IconDollar() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20" /><path d="M17 6.5C17 4.6 14.8 3.5 12 3.5S7 4.6 7 6.5s2.2 3 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3" /></svg>; }
function IconDoc() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>; }
function IconReceipt() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v18l3-2 3 2 3-2 3 2 3-2V3l-3 2-3-2-3 2-3-2-3 2Z" /><path d="M8 8h8M8 12h6" /></svg>; }
