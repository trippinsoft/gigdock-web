import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getBusinessMileageRates,
  getGig,
  getGigEarnings,
  getPlan,
  getUserGigsForPicker,
  getWorkExpenses,
  getWorkMileage,
} from "@/lib/backoffice";
import { createSupabaseServer } from "@/lib/supabase-server";
import ExpensesMileageBoard from "@/components/app/ExpensesMileageBoard";
import { ProBadge } from "@/components/app/pro";
import ExplorePro from "@/components/app/ExplorePro";
import type { DocumentRow } from "@/lib/backoffice-types";

export const metadata: Metadata = {
  title: "Expenses & Mileage",
  robots: { index: false, follow: false },
};

function currentYear(): string {
  return String(new Date().getFullYear());
}

function rangeForYear(year: string): { start: string; end: string; label: string } {
  const y = Number(year);
  return {
    start: `${y}-01-01`,
    end: `${y + 1}-01-01`,
    label: `${y}`,
  };
}

async function getEligibleReceipts(): Promise<
  { id: string; display_name: string; gig_id: string | null }[]
> {
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase
    .from("documents")
    .select("id,display_name,gig_id")
    .eq("document_type", "receipt")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as Pick<DocumentRow, "id" | "display_name" | "gig_id">[]).map(
    (r) => ({ id: r.id, display_name: r.display_name, gig_id: r.gig_id }),
  );
}

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; gig_id?: string }>;
}) {
  const sp = await searchParams;
  const plan = await getPlan();
  if (plan !== "pro") {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
          Expenses &amp; Mileage <ProBadge />
        </h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-300 leading-relaxed">
          Track the actual cost of your work and record business mileage so you
          have complete records at tax time. Net earnings = gross earnings −
          actual expenses; business mileage and its potential tax deduction stay
          separate.
        </p>
        <div className="mt-6">
          <ExplorePro
            href="/pro?from=expense_tracking"
            event="paywall_open"
            props={{ context: "expense_tracking" }}
          >
            Explore Pro
          </ExplorePro>
        </div>
      </div>
    );
  }

  const scopedGigId = sp.gig_id && /^[0-9a-f-]{16,}$/i.test(sp.gig_id) ? sp.gig_id : null;
  if (scopedGigId) {
    // Verify the gig belongs to the user; otherwise 404 so we never leak
    // records across accounts (RLS already scopes, but this fails cleanly).
    const gig = await getGig(scopedGigId);
    if (!gig) notFound();
  }

  const year = sp.year && /^\d{4}$/.test(sp.year) ? sp.year : currentYear();
  const { start, end, label } = rangeForYear(year);

  const gigFilter = scopedGigId ? scopedGigId : undefined;
  const [expenses, mileage, rates, gigs, receipts, scopedGig, scopedEarnings] =
    await Promise.all([
      getWorkExpenses({ start, end, gigId: gigFilter }),
      getWorkMileage({ start, end, gigId: gigFilter }),
      getBusinessMileageRates(),
      getUserGigsForPicker(),
      getEligibleReceipts(),
      scopedGigId ? getGig(scopedGigId) : Promise.resolve(null),
      scopedGigId ? getGigEarnings(scopedGigId) : Promise.resolve(null),
    ]);

  const scopedGross = scopedEarnings?.gross_earned ?? null;
  const gigOptions = gigs.map((g) => ({
    id: g.id,
    title: g.title ?? "Untitled gig",
  }));
  const receiptOptions = receipts;
  const thisYear = Number(currentYear());
  const yearNum = Number(year);
  const prev = `/expenses?year=${yearNum - 1}${scopedGigId ? `&gig_id=${scopedGigId}` : ""}`;
  const next = `/expenses?year=${yearNum + 1}${scopedGigId ? `&gig_id=${scopedGigId}` : ""}`;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {scopedGigId && (
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <Link
            href={`/gigs/${scopedGigId}`}
            className="inline-flex items-center gap-1.5 text-sm text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to gig
          </Link>
        </div>
      )}

      <div className="mb-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Period
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={prev}
            className="h-7 w-7 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Previous year"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Link>
          <span className="min-w-[3.5rem] text-center text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {label}
          </span>
          {yearNum >= thisYear ? (
            <span className="h-7 w-7 grid place-items-center rounded-md text-zinc-300 dark:text-zinc-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </span>
          ) : (
            <Link
              href={next}
              className="h-7 w-7 grid place-items-center rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              aria-label="Next year"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </Link>
          )}
        </div>
      </div>

      <ExpensesMileageBoard
        expenses={expenses}
        mileage={mileage}
        rates={rates}
        gigs={gigOptions}
        receipts={receiptOptions}
        scopedGigId={scopedGigId}
        scopedGigTitle={scopedGig?.title ?? null}
        scopedGross={scopedGross}
        periodLabel={label}
      />
    </div>
  );
}

export const revalidate = 0;
