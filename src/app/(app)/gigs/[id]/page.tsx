import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getGig,
  getGigBumps,
  getGigDates,
  getGigEarnings,
  getGigPayments,
} from "@/lib/backoffice";
import type { GigDateWithEarnings, GigPayment } from "@/lib/backoffice-types";
import { money, shortDate, dateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Gig",
  robots: { index: false, follow: false },
};

export default async function GigDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gig = await getGig(id);
  if (!gig) notFound();

  const [earnings, dates, payments, bumps] = await Promise.all([
    getGigEarnings(id),
    getGigDates(id),
    getGigPayments(id),
    getGigBumps(id),
  ]);

  const earned = earnings?.gross_earned ?? 0;
  const paid = earnings?.total_paid ?? 0;
  const remaining = earnings?.remaining ?? Math.max(earned - paid, 0);
  const pct =
    earnings?.received_percent != null
      ? Math.round(earnings.received_percent)
      : earned > 0
        ? Math.min(Math.round((paid / earned) * 100), 100)
        : 0;

  const bumpsByDate = new Map<string, number>();
  for (const b of bumps) {
    bumpsByDate.set(b.gig_date_id, (bumpsByDate.get(b.gig_date_id) ?? 0) + Number(b.amount ?? 0));
  }

  const subtitle = [gig.gig_company_name, gig.project_title].filter(Boolean).join(" · ");

  return (
    <div className="max-w-4xl mx-auto">
      <Link
        href="/gigs"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        All gigs
      </Link>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{gig.title}</h1>
        {subtitle && <p className="text-zinc-500 dark:text-zinc-400 mt-1">{subtitle}</p>}
        <p className="text-sm text-zinc-400 dark:text-zinc-500 mt-1">
          {dateRange(gig.start_date, gig.end_date)}
          {gig.location && <> · {gig.location}</>}
        </p>
      </div>

      {/* Money summary */}
      <div className="grid grid-cols-3 gap-3 mb-6">
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
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">{pct}% received</p>
        </div>
      )}

      {/* Worked days */}
      <Section title="Worked days" count={dates.length}>
        {dates.length === 0 ? (
          <EmptyRow>No days recorded yet.</EmptyRow>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {dates.map((d) => (
              <DayRow key={d.gig_date_id} d={d} bumps={bumpsByDate.get(d.gig_date_id) ?? 0} />
            ))}
          </div>
        )}
      </Section>

      {/* Payments */}
      <Section title="Payments" count={payments.length}>
        {payments.length === 0 ? (
          <EmptyRow>No payments recorded yet.</EmptyRow>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {payments.map((p) => (
              <PaymentRow key={p.id} p={p} />
            ))}
          </div>
        )}
      </Section>

      {gig.notes && (
        <Section title="Notes">
          <p className="text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap px-4 py-3">{gig.notes}</p>
        </Section>
      )}

      <p className="mt-8 text-xs text-zinc-400 dark:text-zinc-500">
        Adding and editing gigs from the web is coming soon. For now, use the GigDock app to make changes.
      </p>
    </div>
  );
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

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-baseline gap-2 mb-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
        {count != null && <span className="text-xs text-zinc-400 dark:text-zinc-500">{count}</span>}
      </div>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        {children}
      </div>
    </section>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-zinc-400 dark:text-zinc-500 px-4 py-4">{children}</p>;
}

function DayRow({ d, bumps }: { d: GigDateWithEarnings; bumps: number }) {
  const gross = d.gross_earned_calc ?? 0;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium text-zinc-800 dark:text-zinc-200">{shortDate(d.date)}</div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          {d.hours_total != null && <>{Number(d.hours_total)} hrs</>}
          {bumps > 0 && <> · {money(bumps)} bumps</>}
          {d.status_for_day && <> · {d.status_for_day}</>}
        </div>
      </div>
      <div className="shrink-0 font-medium text-zinc-800 dark:text-zinc-200">{money(gross)}</div>
    </div>
  );
}

function PaymentRow({ p }: { p: GigPayment }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium text-zinc-800 dark:text-zinc-200">{shortDate(p.pay_date)}</div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          {p.payment_method && <>{p.payment_method}</>}
          {p.hours_paid != null && <> · {Number(p.hours_paid)} hrs</>}
          {p.notes && <> · {p.notes}</>}
        </div>
      </div>
      <div className="shrink-0 font-medium text-green-600 dark:text-green-400">{money(p.gross_pay)}</div>
    </div>
  );
}
