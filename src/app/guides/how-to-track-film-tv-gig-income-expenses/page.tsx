import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";
import AppCta from "@/components/AppCta";

const BASE = "https://www.gigdock.co";
const PATH = "/guides/how-to-track-film-tv-gig-income-expenses";
const TITLE = "How to Track Income and Expenses From Film & TV Gigs";
const DESCRIPTION =
  "Working multiple film and TV gigs? Learn how to track gigs, income, payments, expenses, receipts and tax records without losing track of what you made or what you spent.";

// Canonical IRS references (authoritative, stable pages).
const IRS = {
  deduct: "https://www.irs.gov/businesses/small-businesses-self-employed/deducting-business-expenses",
  records: "https://www.irs.gov/businesses/small-businesses-self-employed/recordkeeping",
  p463: "https://www.irs.gov/publications/p463",
  gig: "https://www.irs.gov/businesses/gig-economy-tax-center",
};

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: `${TITLE} · GigDock`, description: DESCRIPTION, type: "article", siteName: "GigDock", url: `${BASE}${PATH}`,
    images: [{ url: "/guides/track-income-hero.png", width: 1200, height: 675, alt: "How to Track Income and Expenses From Film & TV Gigs — a GigDock guide" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/guides/track-income-hero.png"] },
};

const FAQ: { q: string; a: string }[] = [
  { q: "How should I keep track of income from multiple film and TV gigs?", a: "Create a separate record for each gig that includes the project, work dates, rate, hours, expected earnings and payment status. When the payment arrives, add the actual gross and net amounts and connect the payment to the corresponding work." },
  { q: "Should I track gross or net pay?", a: "Ideally, both. Gross pay shows what you earned before deductions, while net pay shows what actually reached you after withholding and other deductions." },
  { q: "What expenses should production workers track?", a: "Keep records of expenses that may relate to your production work, along with receipts and the business reason for each expense. Whether an expense qualifies for a tax deduction depends on your employment status, the type of expense and your individual circumstances." },
  { q: "Can I deduct mileage to a film set?", a: "Not automatically. Transportation and commuting rules can be complicated and depend on circumstances such as work locations and tax home. Keep accurate mileage records and consult current IRS guidance or a qualified tax professional to determine how the rules apply to you." },
  { q: "What records should I keep for taxes?", a: "Depending on your work, useful records may include W-2s, 1099s, pay stubs, income records, expense receipts, mileage documentation and records of estimated tax payments. The IRS recommends maintaining supporting records that clearly document income and expenses." },
  { q: "Is GigDock tax software?", a: "No. GigDock helps people working production gigs keep their work, earnings and payments organized. Tax treatment and filing depend on your individual circumstances and applicable tax law." },
];

function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-10 text-2xl font-bold text-zinc-900 dark:text-zinc-100">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 text-lg font-bold text-zinc-900 dark:text-zinc-100">{children}</h3>;
}
function P({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={`mt-3 leading-relaxed ${className ?? ""}`}>{children}</p>;
}
function UL({ items }: { items: React.ReactNode[] }) {
  return <ul className="mt-3 list-disc space-y-1.5 pl-5">{items.map((t, i) => <li key={i}>{t}</li>)}</ul>;
}
const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{children}</Link>
);
const Cite = ({ href }: { href: string }) => (
  <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline text-sm"> (IRS)</a>
);
function Figure({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="mt-6">
      <Image src={src} alt={alt} width={1200} height={675} sizes="(max-width: 672px) 100vw, 672px"
        className="w-full h-auto rounded-xl border border-zinc-200 dark:border-zinc-800" />
    </figure>
  );
}
function Screenshot({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="mt-6 flex flex-col items-center">
      <Image src={src} alt={alt} width={603} height={1311} sizes="(max-width: 320px) 100vw, 320px"
        className="w-full max-w-[300px] h-auto rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm" />
      {caption && <figcaption className="mt-2 text-xs text-zinc-400 dark:text-zinc-500 text-center">{caption}</figcaption>}
    </figure>
  );
}

export default function Page() {
  const articleLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: TITLE, description: DESCRIPTION,
    author: { "@type": "Organization", name: "GigDock" },
    publisher: { "@type": "Organization", name: "GigDock", logo: { "@type": "ImageObject", url: `${BASE}/gigdock-logo.png` } },
    mainEntityOfPage: `${BASE}${PATH}`,
  };
  const faqLd = {
    "@context": "https://schema.org", "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org", "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "GigDock", item: BASE },
      { "@type": "ListItem", position: 2, name: "Guides", item: `${BASE}/guides` },
      { "@type": "ListItem", position: 3, name: TITLE, item: `${BASE}${PATH}` },
    ],
  };

  return (
    <PublicShell>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />

      <article className="mx-auto max-w-2xl py-4 text-zinc-800 dark:text-zinc-200">
        <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
          <Link href="/guides" className="hover:text-zinc-800 dark:hover:text-zinc-200">Guides</Link>
          <span className="mx-1.5">›</span>
          <span className="text-zinc-700 dark:text-zinc-300">Tracking gig income &amp; expenses</span>
        </nav>

        <Image src="/guides/track-income-hero.png" alt="How to Track Income and Expenses From Film & TV Gigs — a production worker keeping their gigs, payments and receipts organized, from GigDock."
          width={1200} height={675} priority sizes="(max-width: 672px) 100vw, 672px" className="w-full h-auto rounded-2xl" />

        <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
          How to Track Income and Expenses From Film &amp; TV Gigs
        </h1>

        <P>Working in film and television can mean working for <strong>a lot of different productions, casting companies, payroll companies and clients over the course of a year</strong>.</P>
        <P>One week you may work two days on a television series. The next week, a commercial. Later that month, another production entirely.</P>
        <P>And months later, when you are trying to answer a simple question — <em>how much did I actually make?</em> — you may discover that the answer is scattered across pay stubs, emails, bank deposits, calendars, screenshots and tax forms.</P>
        <P>Add expenses, mileage, receipts and unpaid gigs, and it becomes even harder. The solution is not complicated: <strong>keep a reliable record of the work as it happens.</strong></P>
        <P>This guide explains what to track, how to organize it, and what records may become important later — especially at tax time.</P>

        <H2>Why production income gets difficult to track</H2>
        <P>A traditional employee may receive roughly the same paycheck from the same employer every two weeks. Production work often looks very different. You might work for:</P>
        <UL items={["multiple productions", "different production companies", "several payroll companies", "casting companies", "agencies or staffing companies", "direct clients", "different types of projects"]} />
        <P>You may also receive different kinds of compensation — hourly wages, day rates, guaranteed rates, overtime, bumps or adjustments, kit or equipment fees, mileage reimbursements, per diem, and other production-specific compensation.</P>
        <P>And payments do not necessarily arrive in the same order the gigs happened. That&rsquo;s why simply watching your bank account is a poor system for understanding your production income.</P>
        <Figure src="/guides/track-income-money-problem.png" alt="The production money problem: different projects and work dates, different production/casting/clients, different payroll companies, and payments arriving on different schedules — leaving one worker trying to answer what they earned, what's been paid and what's still outstanding. The fix: keep the gig record first, then connect the money to it." />

        <H2>Start with the gig, not the payment</H2>
        <P>One of the best organizational habits is to create a record <strong>when the work is booked or performed</strong>, rather than waiting until the money arrives. For each production gig, record at least:</P>
        <UL items={["production or project name", "your role", "production company", "casting or hiring company, when applicable", "payroll company, when known", "work date or dates", "agreed rate", "guaranteed hours, if applicable", "actual hours worked", "additional compensation", "expected or estimated gross earnings", "payment status", "actual gross payment", "actual net payment", "payment date"]} />
        <P>Why? Because a bank deposit alone may tell you almost nothing. A deposit for <strong>$237.48</strong> doesn&rsquo;t necessarily tell you which production it belongs to, which work date it covers, what the gross amount was, whether overtime or a bump was included, what taxes were withheld, or whether another workday is still unpaid.</P>
        <P>The gig provides the context. The payment completes the record.</P>

        <H2>Track gross income separately from net income</H2>
        <P><strong>Gross pay</strong> is what you earned before applicable taxes, withholding and other deductions. <strong>Net pay</strong> is what actually reaches you after those deductions.</P>
        <P>If you worked a gig with gross earnings of $250 and $207 reaches your bank account, that does not necessarily mean you were shorted $43 — that difference may represent withholding or other legitimate payroll deductions. For understanding what you <strong>earned</strong>, gross income is usually the more useful starting point; for actual <strong>cash flow</strong>, net income matters too. So ideally, keep both:</P>
        <P className="font-medium text-zinc-900 dark:text-zinc-100">Expected gross → Actual gross → Net payment</P>

        <H2>Don&rsquo;t confuse income with deposits</H2>
        <P>Suppose you work three gigs:</P>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm border border-zinc-200 dark:border-zinc-800 rounded-lg">
            <thead className="bg-zinc-50 dark:bg-zinc-900 text-left">
              <tr>
                <th className="px-3 py-2 font-semibold">Gig</th>
                <th className="px-3 py-2 font-semibold text-right">Gross earned</th>
                <th className="px-3 py-2 font-semibold">Payment status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              <tr><td className="px-3 py-2">Production A</td><td className="px-3 py-2 text-right">$225</td><td className="px-3 py-2">Paid</td></tr>
              <tr><td className="px-3 py-2">Production B</td><td className="px-3 py-2 text-right">$350</td><td className="px-3 py-2">Outstanding</td></tr>
              <tr><td className="px-3 py-2">Production C</td><td className="px-3 py-2 text-right">$180</td><td className="px-3 py-2">Paid</td></tr>
            </tbody>
          </table>
        </div>
        <P>You <strong>earned</strong> $755, but you have only <strong>received</strong> $405. Those are two different numbers. If you only look at deposits, you may think you made $405. If you only look at earnings, you may forget that $350 hasn&rsquo;t arrived. For people working frequent production gigs, always track three numbers:</P>
        <UL items={[
          <><strong>Earned</strong> — what the work generated.</>,
          <><strong>Received</strong> — what has actually been paid.</>,
          <><strong>Outstanding</strong> — work you&rsquo;ve completed that has not yet been recorded as paid.</>,
        ]} />

        <Figure src="/guides/track-income-earned-received-outstanding.png" alt="Earned vs. Received vs. Outstanding are three different numbers: Earned ($7,550) is what the work generated; Received ($5,100) is money actually paid to you; Outstanding ($2,450) is completed work you haven't marked paid yet. Don't use your bank balance as your only record of what you made." />

        <H2>Keep your pay stubs and payment records</H2>
        <P>When a payment arrives, don&rsquo;t just record the bank deposit — save the supporting documentation when available: a pay stub, payroll statement, direct-deposit notice, check or check stub, payment-platform record, invoice or remittance statement.</P>
        <P>The pay stub can help explain the difference between gross and net. It may show gross wages, federal and state withholding, Social Security, Medicare, other deductions, work dates, production and payroll company. Those records can become especially important when you are reconciling income at the end of the year.</P>

        <H2>Now track your expenses separately</H2>
        <P>Production work can also create expenses — supplies, equipment, professional services, software, certain travel or transportation costs, business-related subscriptions, equipment rental and other industry-related expenses. But there is an extremely important distinction:</P>
        <P className="font-semibold text-zinc-900 dark:text-zinc-100">An expense you track is not automatically a tax deduction.</P>
        <P>Whether an expense is deductible depends on factors including whether you are an employee or self-employed, what the expense was for, whether it was business or personal, whether it was reimbursed, current tax law and your individual circumstances. For self-employed taxpayers, the IRS generally says deductible business expenses must be <strong>ordinary and necessary</strong> for the trade or business, and expenses that are partly personal generally require separating the business portion.<Cite href={IRS.deduct} /></P>
        <P>The safest organizational approach is: <strong>keep good records first, determine tax treatment second.</strong></P>

        <H2>What information should you record for an expense?</H2>
        <P>For each potentially business-related expense, keep the date, amount, merchant/vendor, category, reason for the expense, related project or gig (when applicable), payment method, whether you were reimbursed, and a receipt or supporting documentation. For example:</P>
        <div className="mt-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 text-sm">
          <div className="font-medium text-zinc-900 dark:text-zinc-100">Aug 12 · Parking · $18</div>
          <div className="text-zinc-500 dark:text-zinc-400">Production XYZ · Parking near production location · Receipt saved · Not reimbursed</div>
        </div>
        <P>That is much more useful six months later than a credit-card charge that simply says &ldquo;PARKMOBILE — $18.00&rdquo;.</P>

        <H2>Save the receipt while you still have it</H2>
        <P>Receipts have a remarkable ability to disappear. Paper receipts fade, emails get buried, and screenshots vanish into thousands of photos. A good habit is to capture supporting documentation when the expense occurs.</P>
        <P>The IRS says good records can help taxpayers identify sources of income, keep track of potentially deductible expenses, prepare returns and support amounts reported on a return, and generally allows any recordkeeping system that clearly shows income and expenses, subject to specific rules for certain items.<Cite href={IRS.records} /> The exact system matters less than consistently using one.</P>

        <H2>What about mileage?</H2>
        <P>Mileage deserves special treatment because the tax rules around vehicle and transportation costs can be more complicated than simply &ldquo;I drove to a gig, so I can deduct the mileage.&rdquo; Whether transportation qualifies depends on the circumstances — for example, IRS Publication 463 distinguishes deductible business transportation from ordinary commuting and discusses rules involving travel between workplaces, temporary work locations and a taxpayer&rsquo;s tax home.<Cite href={IRS.p463} /></P>
        <P>So if vehicle expenses may matter to your work, keep a <strong>contemporaneous mileage record</strong> — date, starting location, destination, business purpose, miles traveled and the related production — and let your tax professional or applicable tax guidance determine how much qualifies. Do not wait until April and try to reconstruct an entire year&rsquo;s driving from memory.</P>

        <H2>W-2 and 1099 income should not be treated as the same thing</H2>
        <P>Production workers can encounter different employment arrangements. If you are an <strong>employee</strong>, your employer generally reports wages on Form W-2 and usually withholds applicable employment taxes. If you are an <strong>independent contractor</strong>, compensation may instead be reported on forms such as Form 1099-NEC, and you may be responsible for self-employment and estimated tax obligations. The IRS specifically notes that gig workers can perform work either as employees or independent contractors and that the tax responsibilities differ.<Cite href={IRS.gig} /></P>
        <P>This is why keeping your records organized by <strong>payer and gig</strong> matters. At year-end, you want to connect <strong>Gig → Payment → Payer → Tax document</strong> rather than receiving a form from a payroll company and wondering what work it relates to.</P>
        <P className="text-sm text-zinc-500 dark:text-zinc-400"><em>Coming next in this series: W-2 vs. 1099 for Film &amp; TV Production Work.</em></P>

        <H2>What if you don&rsquo;t receive a tax form?</H2>
        <P>Do not assume income disappears simply because no tax document arrives. The IRS says gig income generally must be reported even if it is temporary or part-time work and even when it isn&rsquo;t reported to you on an information form such as a W-2 or 1099.<Cite href={IRS.gig} /> That&rsquo;s another reason your own records matter — your annual income record should not depend entirely on the forms other companies remember to send you.</P>

        <H2>A simple production-gig recordkeeping system</H2>
        <P>At a minimum, maintain four sets of records:</P>
        <Figure src="/guides/track-income-four-records.png" alt="The four records that keep you organized: 1) Gig record — project/role, work dates, rate & hours; 2) Payment record — gross & net, payment date, payroll/payer; 3) Expense record — date & amount, category, receipt/reason; 4) Tax documents — W-2s/1099s, pay stubs, year-end records. Good records today mean much less detective work later." />
        <UL items={[
          <><strong>Gig record</strong> — project, company, dates, role, rate, hours, other compensation.</>,
          <><strong>Payment record</strong> — gross, net, payment date, payer, and the work it corresponds to.</>,
          <><strong>Expense record</strong> — date, amount, category, business purpose, receipt, reimbursement status.</>,
          <><strong>Tax-document record</strong> — W-2s, 1099-NECs, other income forms, estimated-tax-payment records, and supporting income/expense documentation.</>,
        ]} />
        <P>The IRS specifically recommends that gig workers collect and retain records and receipts throughout the year instead of waiting until tax filing.<Cite href={IRS.gig} /></P>

        <H2>The biggest mistake: trying to reconstruct everything later</H2>
        <P>Imagine it&rsquo;s February. You worked 63 gigs last year, received payments through five payroll companies, and some payments arrived weeks after the work. You&rsquo;ve got 4 W-2s, 2 1099s, dozens of bank deposits, hundreds of emails, screenshots of casting notices, receipts in your glove compartment and transactions across three cards — and now you&rsquo;re trying to figure out what happened. That&rsquo;s the hard way.</P>
        <P>The better system: <strong>when booked</strong>, record the gig; <strong>when you work</strong>, update hours and compensation; <strong>when you spend</strong>, record the expense and keep the receipt; <strong>when you&rsquo;re paid</strong>, record gross, net and payment date; <strong>at year-end</strong>, reconcile your records against the tax forms you receive. A few minutes throughout the year can save hours of detective work later.</P>

        <H2>How GigDock fits into the process</H2>
        <P>GigDock is designed around the reality that production work happens <strong>gig by gig</strong>. Instead of treating the individual job as something you forget after the workday, GigDock gives you a place to keep the gig itself organized. You can keep records of things such as production, work dates, rates, hours, bumps or additional compensation, gross payments, net payments and payment status.</P>
        <P>That makes it easier to answer questions like: How much have I earned? What has actually been paid? Which gigs haven&rsquo;t I marked paid yet? What did I work three months ago? What rate was I booked at?</P>
        <Screenshot src="/guides/track-income-gigdock-payments.png" alt="The GigDock payments summary for a month: received and outstanding totals with a percent-received ring, a payments-received-over-time chart, and a list of recorded payments by gig." caption="GigDock keeps earnings, payments received and outstanding balances organized by gig." />
        <P>GigDock should <strong>not</strong> be described as tax-preparation software, and recording something in GigDock does not determine its tax treatment. The goal is simpler: <strong>keep the work organized before tax season arrives.</strong></P>
        <P><A href="/app">See how GigDock helps manage your gig life →</A></P>

        <H2>A monthly 15-minute money check</H2>
        <P>Once a month, review your production records and ask: Did I record every gig? Are the hours and rates correct? Did every payment that arrived get connected to the right work? Are there gigs still unpaid? Did I save receipts for relevant expenses? Are there transactions I no longer recognize? Do I know which companies paid me? Doing this monthly is far easier than doing it once a year.</P>

        <H2>Production work is complicated enough. Your records don&rsquo;t have to be.</H2>
        <P>Working gig to gig creates freedom and variety — but also fragmentation: different productions, payers, rates, dates, expenses and payments. You may not be able to simplify the production industry, but you can simplify the way you keep track of your own work. Record the gig. Record what you earned. Record what you received. Keep the documentation.</P>
        <P>New to tracking gigs? <A href="/guides/how-to-track-background-acting-gigs-and-payments">See the exact fields to record for every gig</A>, and <A href="/guides/how-background-actors-get-paid">how background actors get paid</A>.</P>

        <AppCta heading="Your gig life, simplified" ctaLabel="See how GigDock works">
          GigDock gives people working film &amp; TV gigs one place to keep their gigs, hours and pay — gross and net — organized before tax season arrives.
        </AppCta>

        <H2>Frequently asked questions</H2>
        <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
          {FAQ.map((f) => (
            <div key={f.q} className="py-4">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{f.q}</h3>
              <p className="mt-1.5 text-zinc-700 dark:text-zinc-300 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>

        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
          General information for people working film &amp; TV gigs, not legal, tax or accounting advice. Whether income or
          an expense is taxable or deductible depends on your individual circumstances and current tax law. Consult a
          qualified tax professional or current IRS guidance for your situation.
        </p>
      </article>
    </PublicShell>
  );
}
