import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";

const BASE = "https://www.gigdock.co";
const PATH = "/guides/how-background-actors-get-paid";
const TITLE = "How Do Background Actors Get Paid? Rates, Bumps & When the Check Comes";
const DESCRIPTION =
  "A clear guide to how background actors and extras get paid — day rates, guaranteed hours, bumps for wardrobe and your car, overtime, who cuts the check, and how long payment takes.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: { title: TITLE, description: DESCRIPTION, type: "article", siteName: "GigDock", url: `${BASE}${PATH}` },
};

// One source of truth for the on-page FAQ and the FAQPage schema.
const FAQ: { q: string; a: string }[] = [
  {
    q: "How much do background actors make per day?",
    a: "Non-union background work commonly pays a flat rate of roughly $100–$200 for a guaranteed day (often 8–12 hours), plus overtime past those hours. Union (SAG-AFTRA) background rates are set by contract and are higher, with added protections. Bumps for wardrobe, your car, or special skills are paid on top of the base rate.",
  },
  {
    q: "Do extras get paid the same day?",
    a: "Almost never. Background pay is processed by a payroll company after the shoot and usually arrives by check or direct deposit a few weeks later — sometimes longer on independent or non-union productions. Same-day cash payment is rare and can be a red flag.",
  },
  {
    q: "What is a bump in background acting?",
    a: "A bump is extra pay added to your base rate when the production asks something specific of you — using your own car, wearing multiple wardrobe changes, providing a prop, working in rain/smoke, or using a special skill. Bumps are money you are owed, not a bonus, so confirm them on your voucher before you leave set.",
  },
  {
    q: "Do you get paid more for union (SAG-AFTRA) background work?",
    a: "Generally yes — SAG-AFTRA background rates are set by contract and are higher than typical non-union rates, with clearer rules for overtime and meal penalties. Becoming union is a career decision with tradeoffs, though, not simply a way to earn more per day.",
  },
  {
    q: "How long does it take to get paid as a background actor?",
    a: "Most productions pay within a few weeks of the shoot, but it varies by the payroll company and the production. Non-union and independent jobs can take longer. Keeping your voucher and tracking the expected pay makes it easy to spot a check that is overdue.",
  },
  {
    q: "Do background actors get paid for fittings?",
    a: "Often, yes — a wardrobe fitting on a separate day is usually paid as its own smaller call. Check the details of your booking, and record the fitting like any other paid day so it does not get missed.",
  },
];

function Guide() {
  return (
    <article className="mx-auto max-w-2xl py-4 text-zinc-800 dark:text-zinc-200">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
        <Link href="/opportunities" className="hover:text-zinc-800 dark:hover:text-zinc-200">GigDock</Link>
        <span className="mx-1.5">›</span>
        <span className="text-zinc-700 dark:text-zinc-300">Guides</span>
      </nav>

      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 text-balance">
        How do background actors get paid?
      </h1>

      <p className="mt-4 text-lg text-zinc-700 dark:text-zinc-300 leading-relaxed">
        Background actors are paid a flat <strong>rate</strong> for a set number of <strong>guaranteed hours</strong> —
        commonly around <strong>$100–$200 for a non-union day</strong>, and more on union (SAG-AFTRA) productions. On top
        of that base rate you can earn <strong>&ldquo;bumps&rdquo;</strong> for things like wardrobe, using your own car,
        or a special skill, plus <strong>overtime</strong> past the guaranteed hours. The money is processed by a{" "}
        <strong>payroll company</strong> and usually arrives by check or direct deposit a few weeks after the shoot —
        not from the casting company, and not the same day.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">The basics: rate + guaranteed hours</h2>
      <p className="mt-3 leading-relaxed">
        Most background jobs are quoted as something like <strong>&ldquo;$150/10&rdquo;</strong>. That means{" "}
        <strong>$150 for a guaranteed 10 hours</strong>. You earn the full flat rate even if you wrap early — the
        guarantee is yours. If the day runs past those hours, you move into <strong>overtime</strong> (paid at a higher,
        hourly-equivalent rate). So the base rate isn&rsquo;t an hourly wage; it&rsquo;s a floor for the day.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Non-union vs. union (SAG-AFTRA)</h2>
      <p className="mt-3 leading-relaxed">
        Most background work open to newcomers is <strong>non-union</strong>, with day rates commonly in the ~$100–$150+
        range depending on the market and production. <strong>Union (SAG-AFTRA)</strong> background rates are set by
        contract and are higher, with clearer rules for overtime, meal penalties, and adjustments. Working enough union
        jobs can put you on the path to joining SAG-AFTRA — but that&rsquo;s a career decision with tradeoffs (it changes
        what work you can accept), not just a way to earn a bigger day rate.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Bumps: the extra pay you&rsquo;re owed</h2>
      <p className="mt-3 leading-relaxed">
        A <strong>bump</strong> is additional pay added when the production asks something specific of you. Common bumps
        include:
      </p>
      <ul className="mt-3 list-disc space-y-1.5 pl-5">
        <li><strong>Wardrobe</strong> — for providing your own clothing, and often extra for multiple changes.</li>
        <li><strong>Personal vehicle</strong> — a &ldquo;car bump&rdquo; when your car is used on camera, sometimes plus mileage.</li>
        <li><strong>Special skills</strong> — driving, an instrument, a language, athletic ability, etc.</li>
        <li><strong>Conditions</strong> — smoke, rain/wet work, or other hazard adjustments.</li>
        <li><strong>Props / luggage / pets</strong>, and sometimes a <strong>haircut</strong> the production requests.</li>
      </ul>
      <p className="mt-3 leading-relaxed">
        Bumps are <strong>money you&rsquo;re owed, not a bonus</strong>. The key is knowing what qualifies for additional
        pay so you don&rsquo;t leave money on the table — and <strong>confirming every adjustment on your voucher before
        you leave set</strong>, while it can still be corrected. (SAG-AFTRA specifically advises background actors to
        verify their adjustments before wrapping.)
      </p>

      <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Overtime, meal penalties &amp; premiums</h2>
      <p className="mt-3 leading-relaxed">
        Past your guaranteed hours you earn <strong>overtime</strong>, typically at a higher hourly-equivalent rate. On
        union sets you may also see <strong>meal penalties</strong> (if you&rsquo;re not fed on schedule) and{" "}
        <strong>night premiums</strong>. These add up on long days, which is exactly why your actual call-to-wrap time
        matters as much as the base rate when you check your pay.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Who actually pays you — and the voucher</h2>
      <p className="mt-3 leading-relaxed">
        Here&rsquo;s the part that surprises new background actors: <strong>the casting company books you, but a payroll
        company issues the check</strong>. On set you&rsquo;ll sign a <strong>voucher</strong> (a timecard) that records
        your hours and every bump. That voucher <em>is</em> your pay record — the payroll company pays from it, so
        keeping a photo of your completed voucher is the single best thing you can do to make sure you&rsquo;re paid
        correctly.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">When does the check arrive?</h2>
      <p className="mt-3 leading-relaxed">
        Usually <strong>a few weeks after the shoot</strong>, by mailed check or direct deposit. It varies by the payroll
        company and the production, and non-union or independent jobs can take longer. Same-day cash is rare — and a
        request to pay a fee to get work is a scam, never a real casting call.
      </p>

      <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">How to make sure you&rsquo;re paid correctly and on time</h2>
      <p className="mt-3 leading-relaxed">
        Pay problems rarely come from one big mistake — they come from small things slipping through the cracks across
        many gigs: a forgotten car bump, a check that never arrived, a rate you can&rsquo;t remember three weeks later.
        For each job, keep a simple record of the <strong>production, casting company, rate, guaranteed vs. actual hours,
        bumps, your expected gross, and whether you&rsquo;ve been paid</strong> — then compare that to the check when it
        lands.
      </p>

      <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Keep every gig and paycheck in one place</h3>
        <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
          GigDock is built for working background actors: log each gig with its rate, hours, and bumps, record your
          gross and net pay, and mark when you&rsquo;ve been paid — so you can see at a glance which gigs are still
          unpaid. It also gathers current casting calls from across the web into one feed, so you can find more work in
          the first place.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/opportunities/atlanta-ga" className="px-5 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm">Browse Atlanta casting calls</Link>
          <Link href="/gigfit" className="px-5 py-2.5 rounded-full border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-semibold text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800">See which calls fit you</Link>
        </div>
      </div>

      <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Frequently asked questions</h2>
      <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
        {FAQ.map((f) => (
          <div key={f.q} className="py-4">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{f.q}</h3>
            <p className="mt-1.5 text-zinc-700 dark:text-zinc-300 leading-relaxed">{f.a}</p>
          </div>
        ))}
      </div>

      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
        This guide is general information for background actors and extras, not legal or tax advice. Rates and rules vary
        by market, production, and union contract.
      </p>
    </article>
  );
}

export default function Page() {
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How Do Background Actors Get Paid?",
    description: DESCRIPTION,
    author: { "@type": "Organization", name: "GigDock" },
    publisher: { "@type": "Organization", name: "GigDock", logo: { "@type": "ImageObject", url: `${BASE}/gigdock-logo.png` } },
    mainEntityOfPage: `${BASE}${PATH}`,
  };
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <Guide />
    </PublicShell>
  );
}
