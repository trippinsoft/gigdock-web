import Link from "next/link";
import type { Metadata } from "next";
import GigsToolbar from "@/components/GigsToolbar";
import { getGigs, getNeedsAttention } from "@/lib/backoffice";
import type { FilteredGig, GigFilter, GigSort } from "@/lib/backoffice-types";
import { money, dateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Gigs",
  robots: { index: false, follow: false },
};

type SP = { filter?: string; q?: string; sort?: string };

export default async function GigsPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const filter = (["payments_due", "missing_payment", "missing_dates"].includes(sp.filter ?? "")
    ? (sp.filter as GigFilter)
    : null);
  const search = sp.q?.trim() || null;
  const sort: GigSort = sp.sort === "oldest" ? "oldest" : "recent";

  const [gigs, attention] = await Promise.all([
    getGigs({ filter, search, sort }),
    getNeedsAttention(),
  ]);

  const counts: Partial<Record<GigFilter, number>> = {
    payments_due: attention?.payments_due_count ?? 0,
    missing_payment: attention?.missing_payment_count ?? 0,
    missing_dates: attention?.missing_dates_count ?? 0,
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-baseline justify-between mb-5">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Gigs</h1>
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {gigs.length} {gigs.length === 1 ? "gig" : "gigs"}
        </span>
      </div>

      <div className="mb-5">
        <GigsToolbar counts={counts} />
      </div>

      {gigs.length === 0 ? (
        <EmptyState hasFilter={!!filter || !!search} />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {gigs.map((g) => (
            <li key={g.id}>
              <GigRow gig={g} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GigRow({ gig }: { gig: FilteredGig }) {
  const earned = gig.earned_total ?? 0;
  const paid = gig.total_paid ?? 0;
  const remaining = gig.remaining ?? Math.max(earned - paid, 0);
  const pct = earned > 0 ? Math.min(Math.round((paid / earned) * 100), 100) : 0;
  const status = paymentStatus(gig);

  return (
    <Link
      href={`/gigs/${gig.id}`}
      className="block rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">{gig.title}</h2>
            <StatusPill status={status} />
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
            {dateRange(gig.start_date, gig.end_date)}
            {gig.gig_date_count > 0 && (
              <> · {gig.gig_date_count} {gig.gig_date_count === 1 ? "day" : "days"}</>
            )}
            {gig.location && <> · {gig.location}</>}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{money(earned)}</div>
          <div className="text-xs text-zinc-400 dark:text-zinc-500">earned</div>
        </div>
      </div>

      {earned > 0 && (
        <div className="mt-3">
          <div className="h-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">
            <span>{money(paid)} received</span>
            <span>{remaining > 0 ? `${money(remaining)} remaining` : "Fully paid"}</span>
          </div>
        </div>
      )}
    </Link>
  );
}

type PayStatus = "paid" | "partial" | "unpaid";

function paymentStatus(gig: FilteredGig): PayStatus {
  if (gig.user_marked_paid) return "paid";
  const earned = gig.earned_total ?? 0;
  const paid = gig.total_paid ?? 0;
  if (paid <= 0) return "unpaid";
  if (earned > 0 && paid >= earned) return "paid";
  return "partial";
}

function StatusPill({ status }: { status: PayStatus }) {
  const map: Record<PayStatus, { label: string; cls: string }> = {
    paid: {
      label: "Paid",
      cls: "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900",
    },
    partial: {
      label: "Partial",
      cls: "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900",
    },
    unpaid: {
      label: "Unpaid",
      cls: "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
    },
  };
  const s = map[status];
  return (
    <span className={`shrink-0 text-[11px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded border ${s.cls}`}>
      {s.label}
    </span>
  );
}

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-10 text-center">
      <p className="text-zinc-600 dark:text-zinc-300 font-medium">
        {hasFilter ? "No gigs match this view." : "No gigs yet."}
      </p>
      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
        {hasFilter ? (
          "Try clearing the filter or search."
        ) : (
          <>
            Add opportunities to your gigs from the{" "}
            <Link href="/opportunities" className="text-blue-600 dark:text-blue-400 font-medium">
              Opportunities
            </Link>{" "}
            feed, or track a gig in the GigDock app.
          </>
        )}
      </p>
    </div>
  );
}
