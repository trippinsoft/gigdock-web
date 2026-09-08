import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";
import PublicShell from "@/components/PublicShell";
import { APP_LIVE, IOS_STORE_URL, ANDROID_STORE_URL, BETA_HREF } from "@/lib/appPromo";

export const metadata: Metadata = {
  title: "GigDock — Find Opportunities, Manage Gigs & Track Pay",
  description:
    "GigDock helps production gig professionals find opportunities, organize gigs and work dates, track earnings and payments, keep records together, and understand their work history.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "GigDock — Find Opportunities, Manage Gigs & Track Pay",
    description:
      "One place for the work behind your work — opportunities, gigs, hours, earnings, payments, documents.",
    type: "website",
    siteName: "GigDock",
  },
};

/* ---------- data ---------- */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function shortDate(input: string | null): string | null {
  if (!input) return null;
  const [y, m, d] = input.split("T")[0].split("-").map(Number);
  if (!y || !m || !d) return null;
  return `${MONTHS[m - 1]} ${d}`;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function specChips(specs: Opportunity["casting_specs"]): string[] {
  const s = (specs ?? {}) as Record<string, unknown>;
  const out: string[] = [];
  const gender = s.gender;
  if (Array.isArray(gender) && gender.length) out.push(gender.map((g) => cap(String(g))).join(", "));
  const amin = s.age_min as number | undefined;
  const amax = s.age_max as number | undefined;
  if (amin != null && amax != null) out.push(`Ages ${amin}–${amax}`);
  else if (amin != null) out.push(`Ages ${amin}+`);
  const eth = s.ethnicity;
  if (Array.isArray(eth) && eth.length) out.push(eth.length > 1 ? "Multiple ethnicities" : cap(String(eth[0])));
  else out.push("All ethnicities");
  const union = s.union_status as string | undefined;
  if (union === "sag-aftra") out.push("Union");
  else if (union === "non-union") out.push("Non-Union");
  return out.slice(0, 3);
}

async function getPreviewOpps(): Promise<Opportunity[]> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order("posted_at", { ascending: false })
    .limit(24);
  const all = (data ?? []) as Opportunity[];
  const withImg = all.filter((o) => o.image_url);
  const withoutImg = all.filter((o) => !o.image_url);
  return [...withImg, ...withoutImg].slice(0, 3);
}

/* ---------- page ---------- */

export default async function Home() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/today");

  const preview = await getPreviewOpps();

  return (
    <PublicShell>
      <Hero />
      <ScatteredProblem />
      <FourPillars />
      <OpportunitiesRail preview={preview} />
      <ProductShowcase />
      <AudienceExpansion />
      <PartnerBand />
      <FinalCta />
    </PublicShell>
  );
}

/* ============================================================
   SECTION 1 — Hero
   Names the audience up front (eyebrow + secondary line) so the
   who-this-is-for question is answered before anything else.
   Real mobile UI only in the phone frame — no faux desktop chrome.
   ============================================================ */

function Hero() {
  return (
    <section className="pt-8 pb-12 sm:pt-10 sm:pb-14">
      <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-10 items-center">
        <div className="text-center lg:text-left">
          <span className="inline-block text-xs sm:text-sm font-semibold tracking-[0.12em] uppercase text-blue-600 dark:text-blue-400">
            For People Who Work in Film &amp; TV
          </span>
          <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance leading-[1.05]">
            Your gig life. <span className="text-blue-600 dark:text-blue-400">Simplified.</span>
          </h1>
          <p className="mt-4 text-lg sm:text-xl font-medium text-zinc-700 dark:text-zinc-200 max-w-xl mx-auto lg:mx-0">
            Find opportunities. Manage your gigs. Track your money. All in one place.
          </p>
          <p className="mt-3 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            GigDock brings the work around your production gig life together — from finding the next opportunity to keeping gigs organized and knowing what you&rsquo;ve earned and what&rsquo;s still owed.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center lg:justify-start gap-3">
            <Link
              href="/signup"
              className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm text-center transition-colors"
            >
              Get Started Free
            </Link>
            <Link
              href="/opportunities"
              className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm text-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              Explore Opportunities
            </Link>
          </div>
          <p className="mt-4 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0">
            Built for background performers, stand-ins, production assistants, crew and other production gig workers.
          </p>
        </div>

        <HeroProductProof />
      </div>
    </section>
  );
}

// Real mobile UI only — no faux browser chrome until we have a real /today
// desktop capture.
function HeroProductProof() {
  return (
    <div className="mx-auto w-full max-w-[240px] sm:max-w-[280px] rounded-[2rem] border-[6px] border-zinc-900 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-700 shadow-2xl overflow-hidden">
      <Image
        src="/app/today.png"
        alt="GigDock Today on iPhone"
        width={1206}
        height={2622}
        sizes="(min-width: 1024px) 280px, 240px"
        className="dark:hidden w-full h-auto rounded-[1.5rem]"
        priority
      />
      <Image
        src="/app/today-dark.png"
        alt="GigDock Today on iPhone"
        width={1206}
        height={2622}
        sizes="(min-width: 1024px) 280px, 240px"
        className="hidden dark:block w-full h-auto rounded-[1.5rem]"
        priority
      />
    </div>
  );
}

/* ============================================================
   SECTION 2 — Scattered problem  (tighter vertical rhythm)
   ============================================================ */

function ScatteredProblem() {
  const scattered = [
    { label: "Opportunities", icon: <IconSearch /> },
    { label: "Dates", icon: <IconCalendar /> },
    { label: "Hours", icon: <IconClock /> },
    { label: "Payments", icon: <IconDollar /> },
    { label: "Documents", icon: <IconDoc /> },
  ];
  return (
    <section className="relative py-10 sm:py-12 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Your work shouldn&rsquo;t be scattered everywhere.
        </h2>
        <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
          Opportunities in one place. Dates somewhere else. Hours in notes. Payments in a spreadsheet. Documents buried in email.
        </p>

        <div className="hidden sm:flex mt-8 items-center justify-center gap-6 lg:gap-8">
          <div className="grid grid-cols-3 gap-3 max-w-md">
            {scattered.map((s, i) => (
              <div
                key={s.label}
                className={`flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-3 py-3 text-xs text-zinc-500 dark:text-zinc-400 ${
                  i === 1 ? "rotate-[-3deg]" : i === 3 ? "rotate-[2deg]" : i === 4 ? "rotate-[-1deg]" : ""
                }`}
              >
                <span className="text-zinc-400 dark:text-zinc-500">{s.icon}</span>
                {s.label}
              </div>
            ))}
          </div>
          <svg className="text-zinc-400 dark:text-zinc-500 shrink-0" width="28" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14" /><path d="m13 6 6 6-6 6" />
          </svg>
          <div className="shrink-0 flex flex-col items-center gap-2 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 px-6 py-5 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gigdock-logo.png" alt="GigDock" className="h-10 w-10" />
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">GigDock</span>
          </div>
        </div>

        <div className="sm:hidden mt-6 flex flex-col gap-2 max-w-xs mx-auto">
          {scattered.map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 px-4 py-2.5 text-sm text-zinc-600 dark:text-zinc-300">
              <span className="text-zinc-400 dark:text-zinc-500">{s.icon}</span>
              {s.label}
            </div>
          ))}
          <div className="mt-2 mx-auto text-zinc-400 dark:text-zinc-500">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14" /><path d="m6 13 6 6 6-6" /></svg>
          </div>
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 px-5 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/gigdock-logo.png" alt="GigDock" className="h-8 w-8" />
            <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">GigDock</span>
          </div>
        </div>

        <p className="mt-6 text-base font-semibold text-zinc-900 dark:text-zinc-100">
          GigDock gives it all a home.
        </p>
      </div>
    </section>
  );
}

/* ============================================================
   SECTION 3 — Four pillars (short cards + single shared CTA)
   Cards explain the breadth of GigDock; deeper explanations live
   on /features.
   ============================================================ */

function FourPillars() {
  const pillars = [
    {
      key: "discover",
      title: "Discover",
      body: "Find relevant production opportunities and use GigFit to compare requirements with your profile.",
      icon: <IconSearch />,
    },
    {
      key: "manage",
      title: "Manage",
      body: "Keep gigs, dates, hours and work details together.",
      icon: <IconGig />,
    },
    {
      key: "track",
      title: "Track",
      body: "Know what you&rsquo;ve earned, received and are still owed.",
      icon: <IconDollar />,
    },
    {
      key: "understand",
      title: "Understand",
      body: "See patterns across your work, money and history.",
      icon: <IconChart />,
    },
  ];

  return (
    <section className="py-12 sm:py-14">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          One place for the work behind your work.
        </h2>
        <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
          From finding the next opportunity to understanding where your money stands, GigDock keeps the pieces connected.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {pillars.map((p) => (
          <div
            key={p.key}
            className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 flex flex-col"
          >
            <span className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
              {p.icon}
            </span>
            <h3 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">{p.title}</h3>
            <p
              className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed flex-1"
              dangerouslySetInnerHTML={{ __html: p.body }}
            />
            {p.key === "discover" && (
              <Link
                href="/opportunities"
                className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Explore Opportunities →
              </Link>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 text-center">
        <Link
          href="/features"
          className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Explore all features →
        </Link>
      </div>
    </section>
  );
}

/* ============================================================
   SECTION 4 — Live Opportunities  (moved up)
   Reuses the existing preview cards + real active data.
   ============================================================ */

function OpportunitiesRail({ preview }: { preview: Opportunity[] }) {
  if (preview.length === 0) return null;
  return (
    <section className="py-12 sm:py-14 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
      <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-10 items-start">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
            Find the next gig. Then keep everything that follows organized.
          </h2>
          <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed">
            Browse current opportunities from casting companies, production companies and other industry sources. When you get booked, GigDock helps you keep the work, dates, earnings and payments connected.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href="/opportunities"
              className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
            >
              Explore Opportunities
            </Link>
            <Link
              href="/opportunities/locations"
              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              Browse by location →
            </Link>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {preview.map((o) => <OppPreviewCard key={o.id} o={o} />)}
        </div>
      </div>
    </section>
  );
}

function OppPreviewCard({ o }: { o: Opportunity }) {
  const meta = [o.location, o.pay_rate, shortDate(o.work_date)].filter(Boolean).join(" · ");
  const chips = specChips(o.casting_specs);
  return (
    <Link
      href={`/opportunities/${o.id}`}
      className="group flex flex-col rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all"
    >
      <div className="flex gap-4 p-4">
        <span className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
          {o.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-zinc-400">
              <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 8h18M8 5v3M16 5v3" />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 leading-snug line-clamp-2">{o.title}</h3>
          {o.source && <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">{o.source}</p>}
          {meta && <p className="mt-1 text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 truncate">{meta}</p>}
        </div>
      </div>
      {chips.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {chips.map((c) => (
            <span key={c} className="text-[11px] px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400">{c}</span>
          ))}
        </div>
      )}
    </Link>
  );
}

/* ============================================================
   SECTION 5 — Three product-proof modules
   Only real screens that don't visibly carry outdated "Bumps"
   labels. Calendar, Insights, Documents all have current
   light + dark pairs shipped in public/app.
   ============================================================ */

type ShowcaseRow = {
  eyebrow: string;
  title: string;
  body: string;
  light: string;
  dark: string;
};

function ProductShowcase() {
  const rows: ShowcaseRow[] = [
    {
      eyebrow: "Manage the work",
      title: "Keep the work organized.",
      body: "Gigs, work dates, hours and details stay connected to the production they belong to.",
      light: "/app/calendar.png",
      dark: "/app/calendar-dark.png",
    },
    {
      eyebrow: "Know where your money stands",
      title: "Know what you&rsquo;ve earned — and what&rsquo;s still owed.",
      body: "Separate earned, received and outstanding money, then see the bigger picture over time.",
      light: "/app/insights.png",
      dark: "/app/insights-dark.png",
    },
    {
      eyebrow: "Keep your records together",
      title: "Keep the records around the work together.",
      body: "Store the paperwork and records that go with each gig so they’re there when you need them.",
      light: "/app/documents.png",
      dark: "/app/documents-dark.png",
    },
  ];

  return (
    <section className="py-10 sm:py-12">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          See how GigDock keeps your work connected.
        </h2>
        <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
          Gigs, schedules, earnings, payments and records — organized around the work they belong to.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-10 lg:gap-14">
        {rows.map((r, i) => (
          <ShowcaseRowBlock key={r.title} row={r} reverse={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

function ShowcaseRowBlock({ row, reverse }: { row: ShowcaseRow; reverse: boolean }) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-14 items-center ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}>
      <div className="text-center lg:text-left">
        <span className="inline-block text-xs font-semibold tracking-[0.12em] uppercase text-blue-600 dark:text-blue-400">
          {row.eyebrow}
        </span>
        <h3
          className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100"
          dangerouslySetInnerHTML={{ __html: row.title }}
        />
        <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-xl mx-auto lg:mx-0">
          {row.body}
        </p>
      </div>
      <div>
        <PhoneFrame light={row.light} dark={row.dark} alt={row.title} />
      </div>
    </div>
  );
}

function PhoneFrame({ light, dark, alt }: { light: string; dark: string; alt: string }) {
  return (
    <div className="mx-auto w-full max-w-[240px] sm:max-w-[260px] rounded-[2rem] border-[6px] border-zinc-900 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-700 shadow-2xl overflow-hidden">
      <Image
        src={light}
        alt={alt}
        width={1206}
        height={2622}
        sizes="260px"
        className="dark:hidden w-full h-auto rounded-[1.5rem]"
      />
      <Image
        src={dark}
        alt={alt}
        width={1206}
        height={2622}
        sizes="260px"
        className="hidden dark:block w-full h-auto rounded-[1.5rem]"
      />
    </div>
  );
}

/* ============================================================
   SECTION 6 — Broader production community
   Reinforces the hero's audience naming. Role list unchanged.
   ============================================================ */

function AudienceExpansion() {
  const roles = [
    { label: "Background & performing talent", icon: <IconPerformer /> },
    { label: "Stand-ins & photo doubles", icon: <IconStandIn /> },
    { label: "Production assistants", icon: <IconClipboard /> },
    { label: "Camera & production crew", icon: <IconCamera /> },
    { label: "Hair, makeup & wardrobe", icon: <IconWardrobe /> },
    { label: "Other production roles", icon: <IconPeople /> },
  ];
  return (
    <section className="py-12 sm:py-14 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Built for the people who make production happen.
        </h2>
        <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400">
          From performers and background talent to production and crew, GigDock is being built around people whose work moves from gig to gig.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-4xl mx-auto">
        {roles.map((r) => (
          <div
            key={r.label}
            className="flex items-center gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-4 py-4"
          >
            <span className="h-10 w-10 shrink-0 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-blue-600 dark:text-blue-400">
              {r.icon}
            </span>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-100 leading-snug">{r.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ============================================================
   SECTION 7 — Compact partner band
   The full ecosystem illustration lives on /partners — the
   homepage just gets a tight cross-link.
   ============================================================ */

function PartnerBand() {
  return (
    <section className="py-10 sm:py-12">
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-6 sm:px-8 sm:py-7 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-5 md:gap-8 items-center">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-zinc-100">
            Have opportunities to share?
          </h2>
          <p className="mt-2 text-sm sm:text-base text-zinc-600 dark:text-zinc-400 leading-relaxed">
            GigDock helps casting and production partners extend the reach of their opportunities while keeping control of their application workflow.
          </p>
        </div>
        <Link
          href="/partners"
          className="justify-self-start md:justify-self-end inline-flex items-center gap-1 px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Partner with GigDock →
        </Link>
      </div>
    </section>
  );
}

/* ============================================================
   SECTION 8 — Combined final / platform CTA
   Merges the previous "GigDock wherever you work" + "Your gig
   life. Simplified." into one ending.
   ============================================================ */

function FinalCta() {
  const storesLive = APP_LIVE && (IOS_STORE_URL || ANDROID_STORE_URL);
  return (
    <section className="py-14 sm:py-16 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-blue-50 dark:bg-blue-950/30 border-y border-blue-200 dark:border-blue-900/40 text-center">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
        Your gig life. <span className="text-blue-600 dark:text-blue-400">Simplified.</span>
      </h2>
      <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
        GigDock is available on web, iPhone and Android.
      </p>

      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <Link
          href="/signup"
          className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm text-center transition-colors"
        >
          Get Started Free
        </Link>
        {storesLive ? (
          <>
            {IOS_STORE_URL && (
              <a
                href={IOS_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm text-center hover:bg-zinc-800 dark:hover:bg-white transition-colors"
              >
                Download for iPhone
              </a>
            )}
            {ANDROID_STORE_URL && (
              <a
                href={ANDROID_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm text-center hover:bg-zinc-800 dark:hover:bg-white transition-colors"
              >
                Download for Android
              </a>
            )}
          </>
        ) : (
          <Link
            href={BETA_HREF}
            className="px-6 py-3 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 font-semibold text-sm text-center hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Join the iPhone &amp; Android beta
          </Link>
        )}
      </div>

      <div className="mt-4">
        <Link
          href="/opportunities"
          className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
        >
          Explore Opportunities →
        </Link>
      </div>

      <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">Free to get started. No credit card required.</p>
    </section>
  );
}

/* ============================================================
   Icons — inline SVG
   ============================================================ */

function IconSearch() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}
function IconDollar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20" /><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" />
    </svg>
  );
}
function IconGig() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" /><path d="M7 15l3-4 3 3 5-6" />
    </svg>
  );
}
function IconPerformer() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 6-6 8-6s6.5 2 8 6" />
    </svg>
  );
}
function IconStandIn() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3.2" /><circle cx="16" cy="8" r="3.2" /><path d="M2 20c1.2-3 3.8-4.5 6-4.5s4.8 1.5 6 4.5" /><path d="M10 20c1.2-3 3.8-4.5 6-4.5s4.8 1.5 6 4.5" />
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" /><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 11h6M9 15h4" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h4l2-2h6l2 2h4v11H3z" /><circle cx="12" cy="13" r="3.5" />
    </svg>
  );
}
function IconWardrobe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v3" /><path d="M9 5a3 3 0 1 1 6 0" /><path d="M12 6 4 20h16Z" />
    </svg>
  );
}
function IconPeople() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.2" /><path d="M2 20c1-3 4-4.5 7-4.5s6 1.5 7 4.5" /><circle cx="17" cy="9" r="2.6" /><path d="M15 20c.6-2 2.5-3 4-3s3.4 1 4 3" />
    </svg>
  );
}
