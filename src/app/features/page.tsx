import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";

const TITLE = "Features — GigDock";
const DESCRIPTION =
  "Discover, Manage, Track, Understand. See what GigDock does today across web, iPhone and Android — and what's free vs. Pro.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/features" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "GigDock" },
};

type Pillar = {
  id: "discover" | "manage" | "track" | "understand";
  eyebrow: string;
  title: string;
  hook: string;
  body: string;
  features: { label: string; tier: "free" | "pro"; note?: string }[];
  shot?: { light: string; dark?: string };
};

const PILLARS: Pillar[] = [
  {
    id: "discover",
    eyebrow: "Discover",
    title: "Find your next opportunity.",
    hook: "One feed for opportunities from casting companies, production companies and other industry sources.",
    body:
      "GigDock brings current opportunities together so you're not switching between casting sites, social feeds and email. GigFit compares your profile against each posting so the ones that fit you rise to the top.",
    features: [
      { label: "One feed of current opportunities", tier: "free" },
      { label: "GigFit — your profile matched to each role", tier: "free" },
      { label: "Filter by state, source, work date, pay and more", tier: "free" },
      { label: "Save opportunities for later", tier: "free" },
      { label: "Mark Applied to keep track of where you've applied", tier: "free" },
      { label: "Share an opportunity in a tap", tier: "free" },
      { label: "Advanced alerts by role, market, work type & more", tier: "pro", note: "Available in the mobile app" },
    ],
    shot: { light: "/app/opportunities-feed.png", dark: "/app/opportunities-feed-dark.png" },
  },
  {
    id: "manage",
    eyebrow: "Manage",
    title: "Keep every gig organized.",
    hook: "Turn a booking into a gig. Track everything that goes with it — in one place.",
    body:
      "Gig details, work dates, hours, additional pay and the small things that go with each production — all connected to the gig they belong to. See a booked day, a worked day and an availability check with the same color language on web and in the app.",
    features: [
      { label: "Gigs, work dates, hours and pay structure", tier: "free" },
      { label: "Calendar view — booked, worked, availability check", tier: "free" },
      { label: "Additional Pay: itemize car, wardrobe, gas, props and other bumps", tier: "free" },
      { label: "Additional-pay-only days for fittings and similar", tier: "free" },
      { label: "Mark unavailable days directly from the calendar", tier: "free" },
      { label: "Projects, gig companies and payroll companies", tier: "free" },
      { label: "Notes and documents attached to each gig", tier: "free" },
    ],
    shot: { light: "/app/calendar.png", dark: "/app/calendar-dark.png" },
  },
  {
    id: "track",
    eyebrow: "Track",
    title: "Know where your money stands.",
    hook: "Separate what you earned from what you've received. Never lose track of what a production still owes you.",
    body:
      "Record payments per gig — gross, net, method — and see outstanding balances at a glance. Additional Pay flows into gross earnings automatically. Aggregate views roll everything up across gigs so you know the full picture.",
    features: [
      { label: "Payments per gig — gross, net, method", tier: "free" },
      { label: "Outstanding balances and payment status", tier: "free" },
      { label: "Additional Pay contributes to gross earnings", tier: "free" },
      { label: "Aggregate Payments view across gigs", tier: "free" },
      { label: "\"Needs attention\" list for missing or late payments", tier: "free" },
    ],
  },
  {
    id: "understand",
    eyebrow: "Understand",
    title: "See the bigger picture.",
    hook: "Work history, earnings insights, and organized records to help you get ready for tax time.",
    body:
      "Insights show trends across months, companies and projects. Advanced Reports give you exportable breakdowns for the year. Documents keep your call sheets, vouchers, pay stubs and tax paperwork together — connected to the work they belong to.",
    features: [
      { label: "Insights: earnings trends, work summary, payments received", tier: "free" },
      { label: "Complete history across the current year", tier: "free" },
      { label: "Documents with types (call sheets, vouchers, W-2, 1099, etc.)", tier: "free" },
      { label: "Complete work and payment history", tier: "pro" },
      { label: "Advanced Insights (year-over-year, company patterns)", tier: "pro" },
      { label: "Advanced Reports (PDF / CSV export, sortable)", tier: "pro" },
      { label: "Tax Ready — organized records for tax time", tier: "pro" },
    ],
    shot: { light: "/app/insights.png", dark: "/app/insights-dark.png" },
  },
];

export default function FeaturesPage() {
  return (
    <PublicShell>
      <section className="pt-8 pb-10 text-center">
        <span className="inline-block text-xs sm:text-sm font-semibold tracking-[0.12em] uppercase text-blue-600 dark:text-blue-400">
          Features
        </span>
        <h1 className="mt-3 text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
          One place for the work behind your work.
        </h1>
        <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Discover the next opportunity. Manage every gig. Track your money. Understand your work over time. Here&rsquo;s what GigDock does today — and what&rsquo;s free vs.&nbsp;Pro.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {PILLARS.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              className="px-4 py-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
            >
              {p.eyebrow}
            </a>
          ))}
        </div>
      </section>

      {PILLARS.map((p, i) => (
        <PillarBlock key={p.id} pillar={p} reverse={i % 2 === 1} />
      ))}

      <section className="my-16 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 sm:p-10 text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Start using GigDock today.
        </h2>
        <p className="mt-2 text-base text-zinc-600 dark:text-zinc-400">
          Free to get started. Everything above is available on web, iPhone and Android.
        </p>
        <div className="mt-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
          <Link href="/signup" className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm text-center">
            Get Started Free
          </Link>
          <Link href="/opportunities" className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold text-sm text-center hover:bg-zinc-50 dark:hover:bg-zinc-900">
            Explore Opportunities
          </Link>
        </div>
      </section>
    </PublicShell>
  );
}

function PillarBlock({ pillar, reverse }: { pillar: Pillar; reverse: boolean }) {
  return (
    <section id={pillar.id} className="py-10 sm:py-14 scroll-mt-24 border-t border-zinc-200 dark:border-zinc-800 first-of-type:border-t-0">
      <div className={`grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 lg:gap-12 items-start ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
        <div>
          <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-blue-600 dark:text-blue-400">
            {pillar.eyebrow}
          </span>
          <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            {pillar.title}
          </h2>
          <p className="mt-3 text-base sm:text-lg font-medium text-zinc-700 dark:text-zinc-200">{pillar.hook}</p>
          <p className="mt-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            {pillar.body}
          </p>
          <ul className="mt-5 space-y-2">
            {pillar.features.map((f) => (
              <li key={f.label} className="flex items-start gap-2.5 text-sm text-zinc-700 dark:text-zinc-200">
                <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7" /></svg>
                </span>
                <span className="min-w-0">
                  <span>{f.label}</span>
                  {f.tier === "pro" && (
                    <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 align-middle">
                      Pro
                    </span>
                  )}
                  {f.note && <span className="ml-2 text-xs text-zinc-500 dark:text-zinc-400">· {f.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {pillar.shot && (
          <div className="mx-auto w-full max-w-[240px] sm:max-w-[260px] rounded-[2rem] border-[6px] border-zinc-900 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-700 shadow-2xl overflow-hidden">
            <Image
              src={pillar.shot.light}
              alt={`GigDock ${pillar.eyebrow}`}
              width={1206}
              height={2622}
              sizes="260px"
              className={`w-full h-auto rounded-[1.5rem] ${pillar.shot.dark ? "dark:hidden" : ""}`}
            />
            {pillar.shot.dark && (
              <Image
                src={pillar.shot.dark}
                alt={`GigDock ${pillar.eyebrow}`}
                width={1206}
                height={2622}
                sizes="260px"
                className="hidden dark:block w-full h-auto rounded-[1.5rem]"
              />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
