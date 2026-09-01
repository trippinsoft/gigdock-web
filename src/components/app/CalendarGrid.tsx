"use client";

// Month calendar with a contextual inspector matched to the mobile day sheet.
// Clicking a day opens the inspector (drawer on desktop, bottom sheet on mobile)
// without leaving the calendar.

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createDraftGig } from "@/lib/backoffice-actions";
import type { CalendarDate, DateFlag } from "@/lib/backoffice-types";
import CalendarDaySheet from "@/components/app/CalendarDaySheet";

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
  const selectedFlag = selected ? flagByDate.get(selected) : undefined;

  return (
    <div className="lg:flex lg:gap-4 lg:items-start">
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

      {selected && (
        <CalendarDaySheet
          date={selected}
          flag={selectedFlag}
          gigs={selectedGigs}
          onClose={() => setSelected(null)}
          onNewGig={newGig}
          creating={creating}
        />
      )}
    </div>
  );
}
