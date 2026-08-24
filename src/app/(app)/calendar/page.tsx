import Link from "next/link";
import type { Metadata } from "next";
import { getCalendarDates, getDateFlags } from "@/lib/backoffice";
import type { CalendarDate } from "@/lib/backoffice-types";

export const metadata: Metadata = {
  title: "Calendar",
  robots: { index: false, follow: false },
};

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Parse ?month=YYYY-MM into a first-of-month Date; default = current month.
function parseMonth(raw?: string): Date {
  if (raw && /^\d{4}-\d{2}$/.test(raw)) {
    const [y, m] = raw.split("-").map(Number);
    return new Date(y, m - 1, 1);
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const sp = await searchParams;
  const monthStart = parseMonth(sp.month);
  const y = monthStart.getFullYear();
  const m = monthStart.getMonth();

  // Grid spans the weeks that contain the month (Sun–Sat).
  const gridStart = new Date(y, m, 1 - new Date(y, m, 1).getDay());
  const monthEnd = new Date(y, m + 1, 1);
  const gridEnd = new Date(monthEnd);
  if (gridEnd.getDay() !== 0) gridEnd.setDate(gridEnd.getDate() + (7 - gridEnd.getDay()));

  const [dates, flags] = await Promise.all([
    getCalendarDates(fmt(gridStart), fmt(gridEnd)),
    getDateFlags(fmt(gridStart), fmt(gridEnd)),
  ]);

  const byDate = new Map<string, CalendarDate[]>();
  for (const d of dates) {
    const key = d.date.slice(0, 10);
    if (!byDate.has(key)) byDate.set(key, []);
    byDate.get(key)!.push(d);
  }
  const flagByDate = new Map<string, string>();
  for (const f of flags) flagByDate.set(f.date.slice(0, 10), f.flag);

  // Build week rows.
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

  const prev = new Date(y, m - 1, 1);
  const next = new Date(y, m + 1, 1);
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const todayKey = fmt(new Date());
  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{monthLabel}</h1>
        <div className="flex items-center gap-1">
          <MonthNavLink href={`/calendar?month=${fmt(prev).slice(0, 7)}`} label="Previous month" dir="prev" />
          <Link
            href="/calendar"
            className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Today
          </Link>
          <MonthNavLink href={`/calendar?month=${fmt(next).slice(0, 7)}`} label="Next month" dir="next" />
        </div>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {/* Day-of-week header */}
        <div className="grid grid-cols-7 border-b border-zinc-200 dark:border-zinc-800">
          {DOW.map((d) => (
            <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
              <span className="hidden sm:inline">{d}</span>
              <span className="sm:hidden">{d[0]}</span>
            </div>
          ))}
        </div>
        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 border-b border-zinc-100 dark:border-zinc-800 last:border-b-0">
            {week.map((day) => {
              const key = fmt(day);
              const inMonth = day.getMonth() === m;
              const gigs = byDate.get(key) ?? [];
              const flag = flagByDate.get(key);
              const isToday = key === todayKey;
              return (
                <div
                  key={key}
                  className={`min-h-[68px] sm:min-h-[92px] p-1.5 border-r border-zinc-100 dark:border-zinc-800 last:border-r-0 ${
                    inMonth ? "" : "bg-zinc-50/60 dark:bg-zinc-950/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center h-5 min-w-5 px-1 text-xs rounded-full ${
                        isToday
                          ? "bg-blue-600 text-white font-semibold"
                          : inMonth
                            ? "text-zinc-600 dark:text-zinc-300"
                            : "text-zinc-300 dark:text-zinc-600"
                      }`}
                    >
                      {day.getDate()}
                    </span>
                    {flag && (
                      <span
                        title={flag}
                        className="text-[9px] uppercase tracking-wide font-semibold text-amber-600 dark:text-amber-400"
                      >
                        {flag.slice(0, 4)}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-col gap-0.5">
                    {gigs.slice(0, 3).map((g) =>
                      g.gig_id ? (
                        <Link
                          key={g.id}
                          href={`/gigs/${g.gig_id}`}
                          className="block truncate text-[11px] leading-tight px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60"
                          title={g.gig?.title ?? "Gig"}
                        >
                          {g.gig?.title ?? "Gig"}
                        </Link>
                      ) : (
                        <span key={g.id} className="block truncate text-[11px] leading-tight px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {g.gig?.title ?? "Gig"}
                        </span>
                      )
                    )}
                    {gigs.length > 3 && (
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 px-1">+{gigs.length - 3} more</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        Worked and scheduled days come from your gigs. Editing days from the web is coming soon.
      </p>
    </div>
  );
}

function MonthNavLink({ href, label, dir }: { href: string; label: string; dir: "prev" | "next" }) {
  return (
    <Link
      href={href}
      aria-label={label}
      className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir === "prev" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </Link>
  );
}
