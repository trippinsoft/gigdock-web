import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getCompanies,
  getGig,
  getGigDatesRaw,
  getGigPayments,
  getProjects,
} from "@/lib/backoffice";
import GigEditor, { type GigEditorInitial } from "@/components/GigEditor";
import GigDatesEditor, { type PayModel, type RawDay } from "@/components/GigDatesEditor";
import PaymentsEditor, { type RawPayment } from "@/components/PaymentsEditor";
import type { PayType } from "@/lib/pay";

export const metadata: Metadata = {
  title: "Edit gig",
  robots: { index: false, follow: false },
};

export default async function EditGigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gig = await getGig(id);
  if (!gig) notFound();

  const [companies, projects, dates, payments] = await Promise.all([
    getCompanies(),
    getProjects(),
    getGigDatesRaw(id),
    getGigPayments(id),
  ]);

  const initial: GigEditorInitial = {
    title: gig.title ?? "",
    location: gig.location,
    notes: gig.notes,
    status_overall: gig.status_overall ?? "booked",
    pay_type: (gig.pay_type as PayType | null) ?? null,
    pay_minimum_amount: gig.pay_minimum_amount,
    pay_minimum_hours: gig.pay_minimum_hours,
    pay_hourly_rate: gig.pay_hourly_rate,
    pay_flat_rate: gig.pay_flat_rate,
    ot_multiplier: gig.ot_multiplier,
    bump_rate: gig.bump_rate,
    is_unpaid: gig.is_unpaid ?? false,
    gig_company_id: gig.gig_company_id,
    payroll_company_id: gig.payroll_company_id,
    project_id: gig.project_id,
    active: gig.active,
  };

  const payModel: PayModel = {
    pay_type: (gig.pay_type as PayType | null) ?? null,
    pay_minimum_amount: gig.pay_minimum_amount,
    pay_minimum_hours: gig.pay_minimum_hours,
    pay_hourly_rate: gig.pay_hourly_rate,
    ot_starts_after_hours: gig.ot_starts_after_hours,
    ot_multiplier: gig.ot_multiplier,
  };

  const isDraft = !gig.active;

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href={isDraft ? "/gigs" : `/gigs/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 mb-4"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
        {isDraft ? "All gigs" : "Back to gig"}
      </Link>

      <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-5">
        {isDraft ? "New gig" : "Edit gig"}
      </h1>

      <GigEditor gigId={id} initial={initial} companies={companies} projects={projects} />

      {/* Days and payments are only meaningful once the gig has been saved. */}
      {!isDraft && (
        <div className="mt-8">
          <GigDatesEditor gigId={id} initial={dates as RawDay[]} payModel={payModel} />
          <PaymentsEditor gigId={id} initial={payments as unknown as RawPayment[]} />
        </div>
      )}
      {isDraft && (
        <p className="mt-6 text-sm text-zinc-400 dark:text-zinc-500">
          Save the gig first, then you can add worked days and payments.
        </p>
      )}
    </div>
  );
}
