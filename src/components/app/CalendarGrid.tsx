"use client";

// Month calendar with a contextual inspector. Clicking a day with work opens a
// side drawer (desktop) / bottom sheet (mobile) listing that day's gigs — you
// inspect without losing the calendar, then open the full gig workspace.

import Link from "next/link";
import { useState } from "react";
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
  const [y, mo] = monthISO.split("-").map(Number);
  const m = mo - 1;
  const [selected, setSelected] = useState<string | null>(null);

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
              const clickable = gigs.length > 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => clickable && setSelected(key)}
                  className={`min-h-[68px] sm:min-h-[92px] text-left p-1.5 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0 align-top ${
                    inMonth ? "" : "bg-zinc-50/60 dark:bg-zinc-950/40"
                  } ${isSel ? "ring-2 ring-inset ring-blue-500" : ""} ${clickable ? "cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/40" : "cursor-default"}`}
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
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100">{shortDate(selected)}</h3>
              <button onClick={() => setSelected(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-xl leading-none" aria-label="Close">×</button>
            </div>
            {selectedGigs.length === 0 ? (
              <p className="text-sm text-zinc-400 dark:text-zinc-500">Nothing scheduled.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {selectedGigs.map((g) => (
                  <div key={g.id} className="rounded-xl border border-zinc-200 dark:border-zinc-800 p-3">
                    <div className="font-medium text-zinc-900 dark:text-zinc-100">{g.gig?.title ?? "Gig"}</div>
                    <div className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                      {g.status_for_day ?? "worked"}{g.hours_total != null && <> · {Number(g.hours_total)} hrs</>}
                    </div>
                    {g.gig_id && (
                      <Link href={`/gigs/${g.gig_id}`} className="mt-2 inline-block text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Open gig →</Link>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
