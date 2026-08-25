import Link from "next/link";
import type { Metadata } from "next";
import { getCalendarDates, getDateFlags } from "@/lib/backoffice";
import CalendarGrid from "@/components/app/CalendarGrid";

export const metadata: Metadata = {
  title: "Calendar",
  robots: { index: false, follow: false },
};

const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

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

  const gridStart = new Date(y, m, 1 - new Date(y, m, 1).getDay());
  const monthEnd = new Date(y, m + 1, 1);
  const gridEnd = new Date(monthEnd);
  if (gridEnd.getDay() !== 0) gridEnd.setDate(gridEnd.getDate() + (7 - gridEnd.getDay()));

  const [dates, flags] = await Promise.all([
    getCalendarDates(fmt(gridStart), fmt(gridEnd)),
    getDateFlags(fmt(gridStart), fmt(gridEnd)),
  ]);

  const prev = new Date(y, m - 1, 1);
  const next = new Date(y, m + 1, 1);
  const monthLabel = monthStart.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const monthISO = `${y}-${String(m + 1).padStart(2, "0")}`;

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{monthLabel}</h1>
        <div className="flex items-center gap-1">
          <NavLink href={`/calendar?month=${fmt(prev).slice(0, 7)}`} label="Previous month" dir="prev" />
          <Link href="/calendar" className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">Today</Link>
          <NavLink href={`/calendar?month=${fmt(next).slice(0, 7)}`} label="Next month" dir="next" />
        </div>
      </div>

      <CalendarGrid monthISO={monthISO} dates={dates} flags={flags} />

      <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
        Click a day with work to inspect it, then open the full gig. Editing days from the web is coming soon.
      </p>
    </div>
  );
}

function NavLink({ href, label, dir }: { href: string; label: string; dir: "prev" | "next" }) {
  return (
    <Link href={href} aria-label={label} className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {dir === "prev" ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
      </svg>
    </Link>
  );
}
