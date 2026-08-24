import Link from "next/link";
import type { Metadata } from "next";
import { getAllPayments, getEarningsSummary } from "@/lib/backoffice";
import type { PaymentWithGig } from "@/lib/backoffice-types";
import { money, shortDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Payments",
  robots: { index: false, follow: false },
};

export default async function PaymentsPage() {
  const [summary, payments] = await Promise.all([
    getEarningsSummary(),
    getAllPayments(),
  ]);

  const earned = summary?.gross_earned ?? 0;
  const paid = summary?.total_paid ?? 0;
  const remaining = summary?.remaining ?? Math.max(earned - paid, 0);
  const pct =
    summary?.received_percent != null
      ? Math.round(summary.received_percent)
      : earned > 0
        ? Math.min(Math.round((paid / earned) * 100), 100)
        : 0;

  // Group payments by year for a scannable ledger.
  const groups = groupByYear(payments);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-5">Payments</h1>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3 mb-3">
        <Stat label="Earned" value={money(earned)} />
        <Stat label="Received" value={money(paid)} />
        <Stat label="Remaining" value={money(remaining)} accent={remaining > 0 ? "amber" : "green"} />
      </div>
      {earned > 0 && (
        <div className="mb-8">
          <div className="h-2 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">
            {pct}% received across {summary?.gig_count ?? 0} {(summary?.gig_count ?? 0) === 1 ? "gig" : "gigs"}
          </p>
        </div>
      )}

      {/* Ledger */}
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-2">
        Payment history
      </h2>
      {payments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
          No payments recorded yet.
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {groups.map(([year, rows]) => (
            <div key={year}>
              <div className="flex items-baseline justify-between mb-1.5">
                <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">{year}</h3>
                <span className="text-xs text-zinc-400 dark:text-zinc-500">
                  {money(rows.reduce((s, r) => s + Number(r.gross_pay ?? 0), 0))}
                </span>
              </div>
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
                {rows.map((p) => (
                  <PaymentRow key={p.id} p={p} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByYear(payments: PaymentWithGig[]): [string, PaymentWithGig[]][] {
  const map = new Map<string, PaymentWithGig[]>();
  for (const p of payments) {
    const year = (p.pay_date ?? "").slice(0, 4) || "—";
    if (!map.has(year)) map.set(year, []);
    map.get(year)!.push(p);
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "amber" | "green";
}) {
  const valueCls =
    accent === "amber"
      ? "text-amber-600 dark:text-amber-400"
      : accent === "green"
        ? "text-green-600 dark:text-green-400"
        : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="text-xs text-zinc-400 dark:text-zinc-500 uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${valueCls}`}>{value}</div>
    </div>
  );
}

function PaymentRow({ p }: { p: PaymentWithGig }) {
  const title = p.gig?.title ?? "Gig";
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        {p.gig_id ? (
          <Link
            href={`/gigs/${p.gig_id}`}
            className="font-medium text-zinc-900 dark:text-zinc-100 truncate hover:text-blue-600 dark:hover:text-blue-400"
          >
            {title}
          </Link>
        ) : (
          <span className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{title}</span>
        )}
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          {shortDate(p.pay_date)}
          {p.payment_method && <> · {p.payment_method}</>}
          {p.hours_paid != null && <> · {Number(p.hours_paid)} hrs</>}
        </div>
      </div>
      <div className="shrink-0 font-medium text-green-600 dark:text-green-400">{money(p.gross_pay)}</div>
    </div>
  );
}
