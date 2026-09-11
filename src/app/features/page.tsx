import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";

// The Features page is intentionally the deepest public product page. Where
// /features previously ran four "pillar" cards, it now walks through the eight
// shipped product systems as a scannable product tour: real GigDock UI in
// every plate (nothing fabricated), honest Free vs Pro delineation, and no
// forward-looking promises the app cannot back up. Every screenshot is a real
// capture from the shipping product; mobile screenshots render inside a phone
// frame so they read as mobile, not as cropped/decorative web fragments.

const TITLE = "Features — GigDock";
const DESCRIPTION =
  "The complete GigDock product tour: opportunities, gigs, money, insights, documents, tax-time readiness, and read-only AI connections — on web, iPhone and Android.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/features" },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "GigDock" },
};

const SECTIONS = [
  { id: "opportunities", label: "Opportunities" },
  { id: "gig-management", label: "Gig Management" },
  { id: "money", label: "Money & Payments" },
  { id: "insights", label: "Insights" },
  { id: "documents", label: "Documents & Records" },
  { id: "tax-ready", label: "Tax Ready" },
  { id: "everyday", label: "Everyday Conveniences" },
  { id: "ai", label: "AI Connections" },
];

export default function FeaturesPage() {
  return (
    <PublicShell>
      <Hero />
      <Framework />
      <Opportunities />
      <GigManagement />
      <MoneyAndPayments />
      <Insights />
      <DocumentsRecords />
      <TaxReady />
      <Everyday />
      <AIConnections />
      <FreeVsPro />
      <PlatformAvailability />
      <FinalCta />
    </PublicShell>
  );
}

/* ================================================================
   Hero
   ================================================================ */

function Hero() {
  return (
    <section className="pt-8 pb-10 sm:pt-10 sm:pb-12">
      <div className="max-w-4xl">
        <Eyebrow>Everything Behind the Gig</Eyebrow>
        <h1 className="mt-3 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-[1.05] text-balance">
          One place for the work behind your work.
        </h1>
        <p className="mt-5 text-lg sm:text-xl text-zinc-600 dark:text-zinc-300 leading-relaxed max-w-2xl">
          Find opportunities. Manage your gigs. Track your money. Keep your records organized. Understand what your work is adding up to.
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link
            href="/signup"
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/opportunities"
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-3 text-base font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
          >
            Explore Opportunities
          </Link>
        </div>

        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          GigDock is available on <span className="font-semibold text-zinc-700 dark:text-zinc-200">web, iPhone and Android</span>.
        </p>
      </div>

      <nav aria-label="Section navigation" className="mt-10 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="inline-flex items-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
          >
            {s.label}
          </a>
        ))}
      </nav>
    </section>
  );
}

/* ================================================================
   Framework — the Discover / Manage / Track / Understand overview
   is a lightweight scene-setter, not a substitute for the sections.
   ================================================================ */

function Framework() {
  const items = [
    { title: "Discover", body: "Opportunities from across the industry, ranked and filtered by what actually fits." },
    { title: "Manage", body: "The work behind the gig — dates, hours, additional pay, notes, projects, companies." },
    { title: "Track", body: "Earned versus received. Outstanding versus paid. Gross versus net. Never guessing." },
    { title: "Understand", body: "What your gig year is adding up to, month over month, company over company." },
  ];
  return (
    <section className="py-10 sm:py-12 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {items.map((it) => (
            <div key={it.title} className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950 px-5 py-5">
              <div className="text-xs font-bold uppercase tracking-[0.12em] text-blue-600 dark:text-blue-400">{it.title}</div>
              <p className="mt-2 text-sm sm:text-[15px] text-zinc-600 dark:text-zinc-300 leading-relaxed">{it.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ================================================================
   1. Opportunities
   ================================================================ */

function Opportunities() {
  return (
    <Section id="opportunities">
      <SectionHeader
        eyebrow="1 · Opportunities"
        title="Find gigs worth your time — then keep them moving."
        lead="Browse opportunities from casting, production and other providers in one feed. Search, filter, save, share and mark applied. When work becomes real, add it straight to My Gigs so nothing gets re-typed."
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8 lg:gap-12 items-start">
        <div className="space-y-4">
          <FeatureRow title="One feed, many sources" body="Opportunities are gathered from across the industry so you don't tab-hop between listings sites." />
          <FeatureRow title="Real filters, real sorting" body="Search text, U.S. state, sources, date posted, work-date range, work type, gender, union status and minimum pay. Sort by most recent, shoot date, or apply deadline." />
          <FeatureRow title="Location browsing" body="Jump into a specific state or market and see everything currently active there." />
          <FeatureRow title="Save / Applied / Share" body="Bookmark listings you're considering. Mark ones you've applied to. Share a listing to anyone with the URL." />
          <FeatureRow title="GigFit — profile-aware fit" body="GigFit compares an opportunity's casting requirements with information in your profile — markets, gender, ethnicity, age and union — to help you assess whether it's worth pursuing. GigFit does not decide who casts." />
          <FeatureRow title="Add to My Gigs" body="Pick the relevant date(s) as Availability Check or Booked, and GigDock creates a connected Gig on the spot — advertised rate mapped to the right pay structure, dates set, ready to manage." />
        </div>
        <div className="mx-auto lg:mx-0 lg:sticky lg:top-20 w-full max-w-[260px]">
          <PhonePlate
            light="/app/opportunities-feed.png"
            dark="/app/opportunities-feed-dark.png"
            alt="GigDock Opportunities feed on iPhone, showing GigFit turned on, a search box, All/Filters chips, a Matching on line, an opportunities count, and cards with Good match and New badges."
            caption="Opportunities feed · GigFit on, filters, matching line, real listings."
            priority
          />
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <Callout title="Advanced Alerts" pro mobileOnly>
          Get notified when a listing matches specific criteria you&rsquo;ve saved — region, work type, minimum pay, casting company, GigFit tier, and more. <em className="not-italic text-zinc-500 dark:text-zinc-400">Currently available in the GigDock mobile app.</em>
        </Callout>
        <Callout title="Providers keep their application flow">
          Apply through the same channel the listing points to. GigDock helps you find and track the opportunity — it doesn&rsquo;t replace the provider&rsquo;s system.
        </Callout>
      </div>

      <Lifecycle />
    </Section>
  );
}

function Lifecycle() {
  const steps = ["Opportunity", "Application", "Booking", "Gig", "Pay"];
  return (
    <div className="mt-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-5 sm:px-7 sm:py-6">
      <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400 mb-3">
        The lifecycle stays connected
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <span className="inline-flex items-center rounded-full border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 px-3 py-1 text-sm font-semibold text-blue-700 dark:text-blue-300">
              {s}
            </span>
            {i < steps.length - 1 && (
              <span className="text-zinc-400 dark:text-zinc-500" aria-hidden>
                →
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================================================================
   2. Gig Management
   ================================================================ */

function GigManagement() {
  return (
    <Section id="gig-management" tone="alt">
      <SectionHeader
        eyebrow="2 · Gig Management"
        title="The moving pieces of gig work, organized around the actual Gig."
        lead="After you get the work, GigDock keeps every practical detail — dates, hours, pay, notes, location, project, companies, documents — attached to the Gig it belongs to."
      />

      <div className="mt-8">
        <WebPlate
          light="/app/my-gigs-web.png"
          alt="GigDock My Gigs on the web: sidebar with Today, Opportunities, My Gigs, Calendar, Documents, Payments, Insights, Advanced Reports and Tax Ready; center list of gigs with Paid, Partial and Unpaid status pills; right pane Gig Detail showing Earned $300, Received $175, Outstanding $125, a Work Summary with Worked and Additional Pay Only rows, and an Additional Pay list with dated bumps."
          caption="One workspace — list, detail, tabs and the Additional Pay that stays with the workday."
          priority
        />
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8 lg:gap-12 items-start">
        <div className="space-y-4">
          <FeatureRow title="Day statuses that reflect real life" body="Availability Check → Booked → Worked. Change a date's status right where you're already working." />
          <FeatureRow title="Additional Pay stays with the work" body='Mileage, per diem, wardrobe, night premium, MPV — track "Additional Pay" against the specific worked day it belongs to.' />
          <FeatureRow title="Quick hour entry" body="Update hours from the calendar day view without reopening and re-editing the whole Gig." />
          <FeatureRow title="Projects, gig companies, payroll companies" body="Keep track of who's producing, who's casting, and who's paying — across gigs and across seasons." />
          <FeatureRow title="Calendar you'll actually use" body="A monthly calendar shows every gig date at a glance — with statuses, links right into the day, and quick actions from the day sheet." />
        </div>
        <div className="mx-auto lg:mx-0 w-full max-w-[260px]">
          <PhonePlate
            light="/app/calendar.png"
            dark="/app/calendar-dark.png"
            alt="GigDock monthly calendar on iPhone showing gig days with status colors."
            caption="Calendar · every gig date at a glance."
          />
        </div>
      </div>
    </Section>
  );
}

/* ================================================================
   3. Money & Payments
   ================================================================ */

function MoneyAndPayments() {
  return (
    <Section id="money">
      <SectionHeader
        eyebrow="3 · Money & Payments"
        title="Earned is not the same as received."
        lead="GigDock separates the money you've earned from the money you've actually been paid — so partial payments, missing payments and slow payments are visible, not hidden."
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8 lg:gap-12 items-start">
        <div className="mx-auto lg:mx-0 lg:sticky lg:top-20 w-full max-w-[260px]">
          <PhonePlate
            light="/guides/gigdock-app-gig-detail-earnings.png"
            alt="A single Gig Detail on iPhone showing Earnings Summary for a Hardee's Commercial: Gross Earned $500.00, Received $450.00, 90% received ring, and Outstanding $50.00."
            caption="A real gig · Earned $500 · Received $450 · Outstanding $50."
          />
        </div>
        <div className="space-y-4">
          <FeatureRow title="Expected · Received · Outstanding" body="Every Gig shows what you earned, what has come in and what's still open — with a received percentage ring." />
          <FeatureRow title="Payments belong to the Gig" body="Record any number of payments against a Gig with pay date, gross, and — when known — net. Partial payments are first-class." />
          <FeatureRow title="Payment status per date" body="See which worked days are still outstanding and which are paid." />
          <FeatureRow title="Needs Attention on Today" body="Missing payments, missing hours and other loose ends bubble up automatically on the Today home." />
          <FeatureRow title="Gross vs Net where recorded" body="Insights and reports separate gross received from net received — nothing is estimated for you." />
        </div>
      </div>

      <div className="mt-10">
        <WebPlate
          light="/app/today-web.png"
          alt="GigDock Today on the web: Next Up card, a Needs Attention card showing 5 payments due at $2,106.37 and 2 with missing pay info, Today's Insight, a Your Money card ($100 earned, $150 received, $1,116.37 outstanding), Recent Activity of received payments, and Opportunities for You with Strong match badges."
          caption="Today, at a glance — Needs Attention, the money picture, and what to look at next."
        />
      </div>

      <Fineprint>GigDock&rsquo;s calculations are authoritative. Numbers on the page reflect what you&rsquo;ve entered — not a guessed rate-times-days.</Fineprint>
    </Section>
  );
}

/* ================================================================
   4. Insights
   ================================================================ */

function Insights() {
  return (
    <Section id="insights" tone="alt">
      <SectionHeader
        eyebrow="4 · Insights"
        title="See what your gig year is adding up to."
        lead="Money & Payments answers &quot;where does my money stand?&quot; — Insights answers &quot;what does all this work look like over time?&quot;"
      />

      <div className="mt-8">
        <WebPlate
          light="/app/insights-web.png"
          alt="GigDock Insights on the web: Earnings $2,844, Work Activity 17 days worked / 6 gigs worked, an Earnings trend monthly bar chart with a Pro badge, a Payments received card showing Gross $1,878 and Net $1,126 with net recorded for 5 of 8 payments, a Gig payment status donut ($738 Paid, $2,106 Outstanding, 26%), and Career patterns with average per workday, top company and top project — Pro-badged."
          caption="Insights web dashboard · Earnings, activity, trend, payments, aging and career patterns."
          priority
        />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
        <FeatureRow title="Earnings for the period" body="Gross earned for the current window, with weekly or monthly buckets that reflect worked-date attribution." />
        <FeatureRow title="Work activity" body="Days worked and gigs worked over the same window, so you can see the shape of the period at a glance." />
        <FeatureRow title="Payments received" body="Gross and, when recorded, net. Filtered by pay date so a receipt-only month is visible even without new worked days." />
        <FeatureRow title="Gig payment status" body="A donut of Paid vs Outstanding across the gigs in the window — with drill-throughs to the underlying gigs." />
        <FeatureRow title="Career patterns" pro body="Top company, top project, and average per workday over a wider window." />
        <FeatureRow title='"Where is my unpaid money?"' pro body="Aging buckets (current, 15–30, 31–60, 60+ days) so slow payers surface as a group." />
        <FeatureRow title="Complete history" pro body="Look beyond the current period into any window your work history covers." />
      </div>
    </Section>
  );
}

/* ================================================================
   5. Documents & Records
   ================================================================ */

function DocumentsRecords() {
  return (
    <Section id="documents">
      <SectionHeader
        eyebrow="5 · Documents & Records"
        title="Keep the records with the work they belong to."
        lead="A voucher is not just a file. A pay stub is not just a file. A call sheet is not just a file. When applicable, those records belong to a specific Gig."
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-8 lg:gap-12 items-start">
        <div className="space-y-4">
          <FeatureRow title="Add Document, right from the browser" body="Upload a PDF or image, name it, classify it, set a document date — the file lives in a private, per-user location." />
          <FeatureRow title="Document types you'll recognize" body="Pay Stub, Voucher, Call Sheet, Receipt, Contract, W-2, 1099, Other Tax Document, Other." />
          <FeatureRow title="Preview, open, download" body="Preview PDFs and images in-page. Downloads use short-lived, signed links." />
          <FeatureRow title="Search & filter" body="Search across documents and their gigs. Filter by type or year." />
          <FeatureRow title="Connect a document to a Gig" pro body="Attach the record to the work it belongs to — from the upload sheet or the document inspector. Change or remove the connection any time." />
        </div>
        <div className="mx-auto lg:mx-0 lg:sticky lg:top-20 w-full max-w-[260px]">
          <PhonePlate
            light="/app/documents.png"
            dark="/app/documents-dark.png"
            alt="GigDock Documents on iPhone: type filter chips for All, Pay Stubs, Vouchers, Receipts, Contracts; a list of records including Paystub 1 (PDF, 9.1 MB), Gig contract (Photo), Travel expense (PDF), Paystub 2 (Photo) and a Voucher connected to a Feature Film Iron Jane gig."
            caption="Records with their type · Voucher connected to its gig."
          />
        </div>
      </div>

      <Fineprint>Basic uploading, viewing, renaming, classifying and downloading are free for everyone. Connecting a document to a specific Gig is a GigDock Pro feature.</Fineprint>
    </Section>
  );
}

/* ================================================================
   6. Tax Ready
   ================================================================ */

function TaxReady() {
  return (
    <Section id="tax-ready" tone="alt">
      <SectionHeader
        eyebrow="6 · Tax Ready"
        title="Your gig records, organized for tax time."
        lead="The work you record throughout the year becomes the organized information you need later. Tax Ready doesn't file anything — it makes the file-ready."
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1.15fr_1fr] gap-8 lg:gap-12 items-start">
        <div>
          <WebPlate
            light="/app/insights-web.png"
            alt="A yearly view of GigDock Insights — the same records that feed Tax Ready — showing a monthly gross-earnings bar chart across the year, payments received (gross and net), and gig payment status."
            caption="The year in one view · monthly earnings, payments received, and payment status."
          />
          <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
            The same worked-day and payment records that power Insights power Tax Ready.
          </p>
        </div>
        <div className="space-y-4">
          <FeatureRow title="Yearly work record" pro body="Gross earnings and payments received for the selected tax year, at a glance." />
          <FeatureRow title="Tax-document organization" pro body="W-2, 1099 and Other Tax Document records surface together — with a Review workflow for classification gaps." />
          <FeatureRow title="Advanced Reports catalog" pro body="A grouped catalog of reports for earnings, payments received, gross & net, companies, projects and documents." />
          <FeatureRow title="PDF & CSV exports" pro body="Export the exact underlying rows to a spreadsheet — or hand a partner a clean PDF." />
          <FeatureRow title="Company & project history" pro body="Historical breakdowns you can point a bookkeeper at without spelunking through screenshots." />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20 px-5 py-4">
        <p className="text-sm text-zinc-700 dark:text-zinc-200">
          <span className="font-semibold">GigDock is not tax-preparation software.</span> It doesn&rsquo;t file returns, determine deductions, or give tax advice. It helps organize your records so tax time is less painful.
        </p>
      </div>
    </Section>
  );
}

/* ================================================================
   7. Everyday Conveniences
   ================================================================ */

function Everyday() {
  const items = [
    { title: "One-tap directions", body: "Jump from the gig or workday to maps without hunting through messages for the address." },
    { title: "Copy address", body: "Grab the address to your clipboard when you need to paste it into another app." },
    { title: "Quick hour entry", body: "Record hours from the day you're already viewing on the calendar." },
    { title: "Add to My Gigs", body: "Turn an Opportunity into a real GigDock Gig without rebuilding it manually." },
    { title: "Needs Attention", body: "Missing payments, missing hours and other loose ends surface on Today." },
    { title: "Mark Unavailable", body: "Keep personal availability alongside your work dates on the calendar." },
    { title: "Save & track opportunities", body: "Save listings, mark ones you've applied to — a real intent trail." },
    { title: "Share opportunities", body: "Send a listing to anyone with a link — nothing behind an app wall." },
    { title: "Additional Pay stays with the work", body: "Extra compensation ties to the specific worked day it came from." },
    { title: "Connected documents", body: "Paperwork lives with the Gig it belongs to instead of a generic pile." },
  ];
  return (
    <Section id="everyday">
      <SectionHeader
        eyebrow="7 · Everyday Conveniences"
        title="The small things that make GigDock useful every day."
        lead="Little workflows designed around the annoying tasks gig work keeps generating."
      />
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {items.map((it) => (
          <div key={it.title} className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-4">
            <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{it.title}</div>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{it.body}</p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ================================================================
   8. AI Connections
   ================================================================ */

function AIConnections() {
  const examples = [
    "How much did I earn last month?",
    "How much did I make with [company] this year?",
    "Which gigs still owe me money?",
    "Show me my recent gigs.",
    "Why did I earn this amount on this gig?",
  ];
  return (
    <Section id="ai" tone="alt">
      <SectionHeader
        eyebrow="8 · AI Connections"
        title="Ask AI about your GigDock data."
        lead="Connect GigDock to supported AI assistants and ask questions about your work in plain English. Financial answers come from GigDock&rsquo;s own calculations, not AI guesswork."
      />

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 lg:gap-10">
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-5 sm:px-6 sm:py-6">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">Example questions</div>
          <ul className="mt-3 space-y-2">
            {examples.map((q) => (
              <li key={q} className="flex items-start gap-2 text-sm sm:text-[15px] text-zinc-700 dark:text-zinc-200">
                <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500 dark:bg-blue-400" />
                <span>&ldquo;{q}&rdquo;</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-4">
          <FeatureRow title="Your data. Your AI assistant." body="Connect GigDock to Claude, ChatGPT or Cursor — tools you already use — and let them see your GigDock records." />
          <FeatureRow title="Answers grounded in GigDock." body="Financial answers come from GigDock&rsquo;s calculations rather than the AI reconstructing rate-times-days on its own." />
          <FeatureRow title="You stay in control." body="Connections are read-only today. You can revoke access from Settings any time." />
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Chip>Claude</Chip>
        <Chip>ChatGPT (Developer Mode)</Chip>
        <Chip>Cursor</Chip>
      </div>

      <Fineprint>
        Powered by Model Context Protocol (MCP). Custom-connector / OAuth is supported, plus manual bearer tokens for compatible clients. Today&rsquo;s tools are read-only — AI cannot create or edit GigDock records through the connection.
      </Fineprint>
    </Section>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 py-3 text-center">
      <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100">{children}</span>
    </div>
  );
}

/* ================================================================
   Free vs Pro
   ================================================================ */

function FreeVsPro() {
  const free = [
    "Browse and search opportunities",
    "Save, share and mark applied",
    "GigFit tiers on opportunities",
    "Add to My Gigs from an opportunity",
    "Full Gig Management: dates, hours, Additional Pay, notes",
    "Payments per Gig: expected, received, outstanding",
    "Basic Insights for the current period",
    "Basic Alerts (mobile)",
    "Basic Documents: upload, classify, view, download, rename",
    "Read-only AI connection setup (MCP)",
  ];
  const pro = [
    "Complete history — look beyond the current period",
    "Advanced Insights (career patterns, aging)",
    "Advanced Reports & PDF / CSV exports",
    "Tax Ready organizer",
    "Connect documents to specific gigs",
    "Advanced Alerts (mobile)",
  ];
  return (
    <Section id="free-vs-pro">
      <SectionHeader
        eyebrow="Free vs Pro"
        title="What can I do for free, and what gets deeper with Pro?"
        lead="Most of GigDock is free. Pro deepens the parts of the product where history, analysis, organization and reporting benefit from more room."
      />

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        <PlanColumn tone="free" title="GigDock" subtitle="Free" bullets={free} />
        <PlanColumn tone="pro" title="GigDock Pro" subtitle="Everything in GigDock, plus" bullets={pro} />
      </div>
    </Section>
  );
}

function PlanColumn({ tone, title, subtitle, bullets }: { tone: "free" | "pro"; title: string; subtitle: string; bullets: string[] }) {
  const isPro = tone === "pro";
  return (
    <div
      className={`rounded-2xl border px-5 py-5 sm:px-7 sm:py-6 ${
        isPro
          ? "border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <div className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{title}</div>
          <div className={`text-xs font-semibold uppercase tracking-wide mt-0.5 ${isPro ? "text-blue-700 dark:text-blue-300" : "text-zinc-500 dark:text-zinc-400"}`}>
            {subtitle}
          </div>
        </div>
        {isPro && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Pro</span>
        )}
      </div>
      <ul className="mt-4 space-y-2">
        {bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200">
            <span aria-hidden className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${isPro ? "bg-blue-500 dark:bg-blue-400" : "bg-zinc-400 dark:bg-zinc-500"}`} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ================================================================
   Platform availability
   ================================================================ */

function PlatformAvailability() {
  return (
    <Section id="platforms" tone="alt">
      <div className="max-w-4xl">
        <Eyebrow>Where GigDock lives</Eyebrow>
        <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          Use GigDock on web, iPhone and Android.
        </h2>
        <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">
          GigDock is the product. The web, iPhone and Android apps are different ways to use it. Your gigs, payments, documents and insights follow you across all three.
        </p>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <PlatformCard title="Web" body="Deep views on a larger screen. The best place for Insights, Advanced Reports and Documents." />
          <PlatformCard title="iPhone" body="On-set workflows: quick hour entry, statuses, calendar and Add to My Gigs." />
          <PlatformCard title="Android" body="Same core app on Android, with the same on-set workflows." />
        </div>

        <p className="mt-6 text-sm text-zinc-500 dark:text-zinc-400">
          Some capabilities — including <span className="font-semibold text-zinc-700 dark:text-zinc-200">Advanced Alerts</span> — are currently available only in the mobile app.
        </p>
      </div>
    </Section>
  );
}

function PlatformCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-5 py-4">
      <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</div>
      <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{body}</p>
    </div>
  );
}

/* ================================================================
   Final CTA
   ================================================================ */

function FinalCta() {
  return (
    <section className="py-14 sm:py-16 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-blue-50 dark:bg-blue-950/30 border-y border-blue-200 dark:border-blue-900/40 text-center">
      <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
        Bring your gig work together.
      </h2>
      <p className="mt-3 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl mx-auto">
        Free to start. Web, iPhone and Android.
      </p>
      <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
        <Link
          href="/signup"
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-blue-600 hover:bg-blue-700 px-6 py-3 text-base font-semibold text-white shadow-sm transition-colors"
        >
          Get Started Free
        </Link>
        <Link
          href="/opportunities"
          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-6 py-3 text-base font-semibold text-zinc-800 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
        >
          Explore Opportunities
        </Link>
      </div>
    </section>
  );
}

/* ================================================================
   Layout primitives
   ================================================================ */

function Section({
  id,
  tone = "default",
  children,
}: {
  id: string;
  tone?: "default" | "alt";
  children: React.ReactNode;
}) {
  const alt =
    tone === "alt"
      ? "-mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800"
      : "";
  return (
    <section id={id} className={`scroll-mt-16 py-14 sm:py-16 ${alt}`}>
      <div className="max-w-5xl mx-auto">{children}</div>
    </section>
  );
}

function SectionHeader({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <div className="max-w-3xl">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight text-balance">
        {title}
      </h2>
      <p className="mt-4 text-base sm:text-lg text-zinc-600 dark:text-zinc-300 leading-relaxed">{lead}</p>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block text-xs sm:text-sm font-semibold tracking-[0.14em] uppercase text-blue-600 dark:text-blue-400">
      {children}
    </span>
  );
}

function FeatureRow({ title, body, pro }: { title: string; body: string; pro?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <span aria-hidden className="mt-1.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </span>
      <div className="min-w-0">
        <div className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100">
          {title}
          {pro && (
            <span className="ml-2 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              Pro
            </span>
          )}
        </div>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function Callout({ title, children, pro = false, mobileOnly = false }: { title: string; children: React.ReactNode; pro?: boolean; mobileOnly?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-5 py-5 ${
        pro
          ? "border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/20"
          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
      }`}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{title}</div>
        {pro && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
            Pro
          </span>
        )}
        {mobileOnly && (
          <span className="inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
            Mobile
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">{children}</p>
    </div>
  );
}

function Fineprint({ children }: { children: React.ReactNode }) {
  return <p className="mt-6 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{children}</p>;
}

/* ================================================================
   Media primitives
   Real screenshots only. WebPlate is used for actual web-shaped
   captures (1435×926). PhonePlate is used for actual iPhone
   captures (1206×2622) and shows the full phone frame — no
   16:9 crop that would hide everything below the header.
   ================================================================ */

function WebPlate({
  light,
  dark,
  alt,
  caption,
  priority = false,
  sizes = "(min-width: 1024px) 900px, 100vw",
}: {
  light: string;
  dark?: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <figure>
      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl overflow-hidden">
        <div className="relative w-full aspect-[1435/926] bg-white dark:bg-zinc-900">
          <Image
            src={light}
            alt={alt}
            fill
            sizes={sizes}
            priority={priority}
            className={`object-cover object-top ${dark ? "dark:hidden" : ""}`}
          />
          {dark && (
            <Image
              src={dark}
              alt={alt}
              fill
              sizes={sizes}
              priority={priority}
              className="hidden dark:block object-cover object-top"
            />
          )}
        </div>
      </div>
      {caption && (
        <figcaption className="mt-3 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed">{caption}</figcaption>
      )}
    </figure>
  );
}

function PhonePlate({
  light,
  dark,
  alt,
  caption,
  priority = false,
  sizes = "260px",
}: {
  light: string;
  dark?: string;
  alt: string;
  caption?: string;
  priority?: boolean;
  sizes?: string;
}) {
  return (
    <figure>
      <div className="rounded-[2rem] border-[6px] border-zinc-900 dark:border-zinc-700 bg-zinc-900 dark:bg-zinc-700 shadow-2xl overflow-hidden">
        <Image
          src={light}
          alt={alt}
          width={1206}
          height={2622}
          sizes={sizes}
          priority={priority}
          className={`w-full h-auto rounded-[1.5rem] ${dark ? "dark:hidden" : ""}`}
        />
        {dark && (
          <Image
            src={dark}
            alt={alt}
            width={1206}
            height={2622}
            sizes={sizes}
            priority={priority}
            className="hidden dark:block w-full h-auto rounded-[1.5rem]"
          />
        )}
      </div>
      {caption && (
        <figcaption className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed text-center">{caption}</figcaption>
      )}
    </figure>
  );
}
