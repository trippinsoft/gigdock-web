import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getGig, getGigEarnings, getGigPayments } from "@/lib/backoffice";
import type { GigPayment } from "@/lib/backoffice-types";
import { paymentStatusOf } from "@/lib/gigBuckets";
import { StatusPill } from "@/components/app/ui";
import { money, shortDate, dateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Payment",
  robots: { index: false, follow: false },
};

export default async function PaymentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gig = await getGig(id);
  if (!gig) notFound();

  const [earnings, payments] = await Promise.all([getGigEarnings(id), getGigPayments(id)]);
  const earned = earnings?.gross_earned ?? 0;
  const paid = earnings?.total_paid ?? 0;
  const remaining = earnings?.remaining ?? Math.max(earned - paid, 0);
  const pct = earnings?.received_percent != null ? Math.round(earnings.received_percent) : earned > 0 ? Math.min(Math.round((paid / earned) * 100), 100) : 0;
  const status = paymentStatusOf({ user_marked_paid: gig.user_marked_paid, earned_total: earned, total_paid: paid });
  const meta = [gig.gig_company_name, dateRange(gig.start_date, gig.end_date)].filter((x) => x && x !== "—").join(" · ");

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5 max-w-3xl">
      <Link href="/payments" className="lg:hidden inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        Payments
      </Link>

      {/* Gig context header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{gig.title || "Untitled gig"}</h1>
            <StatusPill status={status} />
          </div>
          {meta && <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{meta}</p>}
        </div>
        <Link href={`/gigs/${id}`} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800">
          Open full gig →
        </Link>
      </div>

      {/* Money summary */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Money label="Expected" value={money(earned)} />
        <Money label="Received" value={money(paid)} tone="green" />
        <Money label="Outstanding" value={money(remaining)} tone={remaining > 0 ? "amber" : "default"} />
      </div>
      {earned > 0 && (
        <div className="mt-3">
          <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div className={`h-full rounded-full ${pct >= 100 ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-zinc-500 dark:text-zinc-400">{pct}% received</p>
        </div>
      )}

      {/* Payment history */}
      <h2 className="mt-6 mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Payment history</h2>
      {payments.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-6 text-sm text-zinc-400 dark:text-zinc-500">
          No payments recorded yet. <Link href={`/gigs/${id}/edit`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">Add a payment</Link>
        </p>
      ) : (
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {payments.map((p) => <PaymentRow key={p.id} p={p} />)}
        </div>
      )}
    </div>
  );
}

function Money({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "green" | "amber" }) {
  const cls = tone === "green" ? "text-green-600 dark:text-green-400" : tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-zinc-900 dark:text-zinc-100";
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</div>
      <div className={`mt-1 text-xl font-bold ${cls}`}>{value}</div>
    </div>
  );
}

function PaymentRow({ p }: { p: GigPayment }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium text-zinc-800 dark:text-zinc-200">{shortDate(p.pay_date)}</div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          {p.payment_method ?? "Payment"}
          {p.hours_paid != null && <> · {Number(p.hours_paid)} hrs</>}
          {p.notes && <> · {p.notes}</>}
        </div>
      </div>
      <div className="shrink-0 font-medium text-green-600 dark:text-green-400">+{money(p.gross_pay)}</div>
    </div>
  );
}
