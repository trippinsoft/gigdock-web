import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getGig,
  getGigBumps,
  getGigDates,
  getGigDocuments,
  getGigEarnings,
  getGigPayments,
} from "@/lib/backoffice";
import type {
  GigDateWithEarnings,
  GigPayment,
  GigWithNames,
  DocumentRow,
} from "@/lib/backoffice-types";
import { paymentStatusOf } from "@/lib/gigBuckets";
import { StatusPill } from "@/components/app/ui";
import SectionAnchorNav from "@/components/app/SectionAnchorNav";
import { money, shortDate, dateRange } from "@/lib/format";

export const metadata: Metadata = {
  title: "Gig",
  robots: { index: false, follow: false },
};

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "work-days", label: "Work Days" },
  { id: "payments", label: "Payments" },
  { id: "documents", label: "Documents" },
];

export default async function GigWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gig = await getGig(id);
  if (!gig) notFound();

  const [earnings, dates, payments, bumps, docs] = await Promise.all([
    getGigEarnings(id),
    getGigDates(id),
    getGigPayments(id),
    getGigBumps(id),
    getGigDocuments(id),
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
  const status = paymentStatusOf({ user_marked_paid: gig.user_marked_paid, earned_total: earned, total_paid: paid });

  const bumpsByDate = new Map<string, { type: string; amount: number }[]>();
  for (const b of bumps) {
    const list = bumpsByDate.get(b.gig_date_id) ?? [];
    list.push({ type: b.bump_type, amount: Number(b.amount ?? 0) });
    bumpsByDate.set(b.gig_date_id, list);
  }

  const company = gig.gig_company_name;
  const headerMeta = [dateRange(gig.start_date, gig.end_date), gig.location].filter((x) => x && x !== "—").join(" · ");

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-5">
      <Link href="/gigs" className="lg:hidden inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 mb-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        All gigs
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{gig.title || "Untitled gig"}</h1>
            <StatusPill status={status} />
          </div>
          {company && <p className="mt-0.5 text-zinc-600 dark:text-zinc-300">{company}</p>}
          {headerMeta && <p className="mt-0.5 text-sm text-zinc-400 dark:text-zinc-500">{headerMeta}</p>}
        </div>
        <Link
          href={`/gigs/${id}/edit`}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3.5 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
          Edit
        </Link>
      </div>

      {/* Financial summary */}
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Money label="Earned" value={money(earned)} />
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

      {/* Sticky section nav */}
      <div className="mt-5">
        <SectionAnchorNav sections={SECTIONS} />
      </div>

      {/* Overview */}
      <section id="overview" className="scroll-mt-24 pt-6">
        <SectionTitle>Overview</SectionTitle>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
          <Row label="Production company" value={gig.gig_company_name} />
          <Row label="Payroll company" value={gig.payroll_company_name} />
          <Row label="Project" value={gig.project_title} />
          <Row label="Location" value={gig.location} />
          <Row label="Status" value={statusLabel(gig.status_overall)} />
          <Row label="Pay structure" value={describePay(gig)} />
          {gig.is_unpaid && <Row label="" value="Marked unpaid (excluded from earnings)" />}
        </div>
        {gig.notes && (
          <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
            <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500 mb-1">Notes</div>
            <p className="text-sm text-zinc-700 dark:text-zinc-200 whitespace-pre-wrap leading-relaxed">{gig.notes}</p>
          </div>
        )}
      </section>

      {/* Work Days */}
      <section id="work-days" className="scroll-mt-24 pt-8">
        <SectionTitle count={dates.length}>Work Days</SectionTitle>
        {dates.length === 0 ? (
          <Empty>No work days recorded. <EditLink id={id}>Add days</EditLink></Empty>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            {dates.map((d) => (
              <DayRow key={d.gig_date_id} d={d} bumps={bumpsByDate.get(d.gig_date_id) ?? []} />
            ))}
          </div>
        )}
      </section>

      {/* Payments */}
      <section id="payments" className="scroll-mt-24 pt-8">
        <SectionTitle count={payments.length}>Payments</SectionTitle>
        <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-zinc-100 dark:divide-zinc-800 border-b border-zinc-100 dark:border-zinc-800">
            <Mini label="Expected" value={money(earned)} />
            <Mini label="Received" value={money(paid)} />
            <Mini label="Outstanding" value={money(remaining)} tone={remaining > 0 ? "amber" : "green"} />
          </div>
          {payments.length === 0 ? (
            <div className="px-4 py-4 text-sm text-zinc-400 dark:text-zinc-500">No payments recorded. <EditLink id={id}>Add a payment</EditLink></div>
          ) : (
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {payments.map((p) => <PaymentRow key={p.id} p={p} />)}
            </div>
          )}
        </div>
      </section>

      {/* Documents */}
      <section id="documents" className="scroll-mt-24 pt-8 pb-10">
        <SectionTitle count={docs.length}>Documents</SectionTitle>
        {docs.length === 0 ? (
          <Empty>No documents for this gig yet.</Empty>
        ) : (
          <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 divide-y divide-zinc-100 dark:divide-zinc-800">
            {docs.map((d) => <DocRow key={d.id} d={d} />)}
          </div>
        )}
      </section>
    </div>
  );
}

/* ── section pieces ────────────────────────────────────────────────────────── */

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-baseline gap-2 mb-2">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{children}</h2>
      {count != null && <span className="text-xs text-zinc-400 dark:text-zinc-500">{count}</span>}
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

function Mini({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "green" | "amber" }) {
  const cls = tone === "green" ? "text-green-600 dark:text-green-400" : tone === "amber" ? "text-amber-600 dark:text-amber-400" : "text-zinc-800 dark:text-zinc-200";
  return (
    <div className="px-4 py-3">
      <div className="text-[11px] uppercase tracking-wide text-zinc-400 dark:text-zinc-500">{label}</div>
      <div className={`mt-0.5 font-semibold ${cls}`}>{value}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-2.5">
      {label ? <span className="text-sm text-zinc-500 dark:text-zinc-400">{label}</span> : <span />}
      <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200 text-right">{value}</span>
    </div>
  );
}

function DayRow({ d, bumps }: { d: GigDateWithEarnings; bumps: { type: string; amount: number }[] }) {
  const gross = d.gross_earned_calc ?? 0;
  const bumpLabel = bumps.length ? "Base + " + bumps.map((b) => b.type).join(", ") : null;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0">
        <div className="font-medium text-zinc-800 dark:text-zinc-200">{shortDate(d.date)}</div>
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          {d.hours_total != null && <>{Number(d.hours_total)} hrs</>}
          {d.status_for_day && <> · {d.status_for_day}</>}
          {bumpLabel && <> · {bumpLabel}</>}
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
          {p.payment_method ?? "Payment"}
          {p.hours_paid != null && <> · {Number(p.hours_paid)} hrs</>}
          {p.notes && <> · {p.notes}</>}
        </div>
      </div>
      <div className="shrink-0 font-medium text-green-600 dark:text-green-400">+{money(p.gross_pay)}</div>
    </div>
  );
}

function DocRow({ d }: { d: DocumentRow & { url?: string } }) {
  const meta = [typeLabel(d.document_type), shortDate(d.document_date ?? d.created_at)].filter(Boolean).join(" · ");
  const inner = (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v5h5" /><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /></svg>
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-zinc-800 dark:text-zinc-200">{d.display_name}</div>
        <div className="truncate text-xs text-zinc-400 dark:text-zinc-500">{meta}</div>
      </div>
    </div>
  );
  return d.url ? (
    <a href={d.url} target="_blank" rel="noopener noreferrer" className="block hover:bg-zinc-50 dark:hover:bg-zinc-800/40">{inner}</a>
  ) : (
    <div className="opacity-60">{inner}</div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 px-4 py-6 text-sm text-zinc-400 dark:text-zinc-500">{children}</p>;
}

function EditLink({ id, children }: { id: string; children: React.ReactNode }) {
  return <Link href={`/gigs/${id}/edit`} className="font-medium text-blue-600 dark:text-blue-400 hover:underline">{children}</Link>;
}

/* ── helpers ───────────────────────────────────────────────────────────────── */

function statusLabel(code: string | null | undefined): string | null {
  if (!code) return null;
  const map: Record<string, string> = { availability_checked: "Availability check", booked: "Booked", worked: "Worked", paid: "Paid" };
  return map[code] ?? code;
}

function typeLabel(t: string): string {
  return t.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function describePay(g: GigWithNames): string | null {
  const n = (v: number | null | undefined) => (v == null ? null : money(Number(v)));
  switch (g.pay_type) {
    case "guaranteedMin": {
      const amt = n(g.pay_minimum_amount);
      const hrs = g.pay_minimum_hours;
      if (amt && hrs) return `Guaranteed ${amt} / ${Number(hrs)} hrs${g.ot_multiplier ? ` · ${g.ot_multiplier}× OT` : ""}`;
      return "Guaranteed minimum";
    }
    case "hourly":
      return g.pay_hourly_rate ? `${money(Number(g.pay_hourly_rate))}/hr${g.ot_multiplier ? ` · ${g.ot_multiplier}× OT` : ""}` : "Hourly";
    case "flatRate":
      return g.pay_flat_rate ? `${money(Number(g.pay_flat_rate))} flat` : "Flat rate";
    case "dayRate":
      return g.pay_flat_rate ? `${money(Number(g.pay_flat_rate))}/day` : "Day rate";
    default:
      return null;
  }
}
