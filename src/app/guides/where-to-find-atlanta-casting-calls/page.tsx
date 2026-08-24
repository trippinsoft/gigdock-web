import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/components/PublicShell";
import AppCta from "@/components/AppCta";
import { getSeoMarket } from "@/lib/marketContent";
import { getMarketPulse } from "@/lib/marketPulse";

export const revalidate = 3600; // cache the live Atlanta data box hourly

const BASE = "https://www.gigdock.co";
const PATH = "/guides/where-to-find-atlanta-casting-calls";
const TITLE = "Where to Find Atlanta Casting Calls";
const DESCRIPTION =
  "Where are Atlanta casting calls actually posted? Learn the casting companies, websites, Facebook pages, social accounts, email lists and platforms to watch for background acting opportunities.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: `${TITLE} · GigDock`,
    description: DESCRIPTION,
    type: "article",
    siteName: "GigDock",
    url: `${BASE}${PATH}`,
  },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const ATL = "/opportunities/atlanta-ga";

const FAQ: { q: string; a: string }[] = [
  {
    q: "Where can I find Atlanta casting calls?",
    a: "Atlanta casting calls appear across casting-company websites, Facebook pages and groups, Instagram, email lists, casting platforms, entertainment websites and other industry sources. Because no single source contains every opportunity, active background actors often monitor multiple sources.",
  },
  {
    q: "What are some Atlanta background casting companies?",
    a: "Current Georgia industry resources list companies including Central Casting Georgia, Casting TaylorMade, CL Casting, Extras Casting Atlanta, Hylton Casting, On Location Casting, Rose Locke Casting, Set Life Casting and others. Which companies are actively casting changes with current productions.",
  },
  {
    q: "Are Atlanta casting calls posted on Facebook?",
    a: "Yes. Some Atlanta casting companies use official Facebook pages or groups as part of their casting process. Set Life Casting, for example, currently encourages performers to follow its Facebook page for casting updates.",
  },
  {
    q: "Are Atlanta casting calls posted on Instagram?",
    a: "Yes. Some casting companies use Instagram alongside their websites, Facebook communities and application forms. Casting TaylorMade currently maintains official Instagram and other social channels connected to its casting operation.",
  },
  {
    q: "Do I have to pay to access legitimate casting calls?",
    a: "You should not have to pay someone in order to be hired for a job. Be particularly cautious when an individual claims you must send money to secure a role, pay production costs or send money before you can be booked. SAG-AFTRA and the FTC both identify requests for upfront money as casting-scam warning signs.",
  },
  {
    q: "Is GigDock a casting company?",
    a: "No. GigDock brings opportunities from multiple sources together so people working gigs can discover opportunities and keep their work organized. The actual casting company or production behind an opportunity determines who is selected and how the submission process works.",
  },
  {
    q: "Does GigDock have every Atlanta casting call?",
    a: "No source should be assumed to contain every opportunity. GigDock brings opportunities from multiple sources together to reduce the number of places you have to search, but performers should still follow the original casting company's instructions and use other legitimate sources when appropriate.",
  },
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
function UL({ items }: { items: string[] }) {
  return <ul className="mt-3 list-disc space-y-1.5 pl-5">{items.map((t) => <li key={t}>{t}</li>)}</ul>;
}
function OL({ items }: { items: string[] }) {
  return <ol className="mt-3 list-decimal space-y-1.5 pl-5">{items.map((t) => <li key={t}>{t}</li>)}</ol>;
}
const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-medium text-blue-600 hover:underline dark:text-blue-400">{children}</Link>
);

function Guide({ pulse }: { pulse: { callsTracked: number; castingSources: number; topCities: string[] } }) {
  return (
    <article className="mx-auto max-w-2xl py-4 text-zinc-800 dark:text-zinc-200">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
        <Link href="/guides" className="hover:text-zinc-800 dark:hover:text-zinc-200">Guides</Link>
        <span className="mx-1.5">›</span>
        <span className="text-zinc-700 dark:text-zinc-300">Where to find Atlanta casting calls</span>
      </nav>

      <h1 className="mt-2 text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
        Where Atlanta Casting Calls Actually Appear
      </h1>

      <P>If you&rsquo;re looking for background acting work in Atlanta, one of the first things you discover is that there is no single place where every casting call appears.</P>
      <P>One production may post through a casting company&rsquo;s website. Another may appear first on Facebook. Another may use Instagram, an email list or a dedicated submission form. And some casting calls are reposted by entertainment websites or community pages after the original casting company publishes them.</P>
      <P>That fragmentation is one of the hardest parts of finding background work consistently.</P>
      <P>This guide explains where Atlanta casting calls actually appear, which types of sources are worth watching, how to verify what you find, and how to make the process easier.</P>
      <P>Looking for work right now? <A href={ATL}>Browse current Atlanta casting opportunities →</A></P>

      <H2>The short answer: where Atlanta casting calls are posted</H2>
      <P>Atlanta background casting opportunities commonly appear through:</P>
      <OL items={[
        "Casting company websites and submission portals",
        "Official Facebook pages and groups",
        "Instagram and other social accounts",
        "Casting company email lists",
        "Casting platforms and submission systems",
        "Entertainment and community casting sites",
        "Direct messages or availability checks after you register",
        "Aggregators such as GigDock that bring opportunities from multiple sources together",
      ]} />
      <P>The important point is that different casting companies use different combinations of these channels. There is no universal Atlanta casting board used by every production.</P>

      <H2>1. Casting company websites and submission portals</H2>
      <P>The most important sources are usually the casting companies themselves. Atlanta productions frequently hire specialized background casting companies to find:</P>
      <UL items={[
        "general background actors",
        "featured background",
        "stand-ins",
        "photo doubles",
        "specialty performers",
        "people with specific vehicles",
        "performers with particular skills or physical characteristics",
      ]} />
      <P>Some casting companies publish opportunities directly on their websites. Others use their websites primarily for talent registration and then send performers to individual application forms when a role becomes available.</P>
      <P>For example, Central Casting allows performers to sign up for its casting database and says its casting teams use that database for background actors, stand-ins and doubles. Central Casting also maintains tools for performers to find and respond to work opportunities.</P>
      <P>Casting TaylorMade publishes individual Atlanta casting notices and application forms through its own website. Destination Casting maintains a &ldquo;Now Casting&rdquo; section on its website with current background, featured, real-person and principal castings. Set Life Casting maintains a current casting-call page for background opportunities in Atlanta and the Southeast.</P>
      <H3>The practical lesson</H3>
      <P>Once you identify an Atlanta casting company that regularly handles the kind of work you want, visit its official website first and learn how that company prefers performers to register and submit. The process is not identical from company to company.</P>

      <H2>2. Facebook is still an important part of Atlanta background casting</H2>
      <P>You might expect the film industry to have moved completely away from Facebook. It hasn&rsquo;t. For Atlanta background work, Facebook remains an important distribution channel for some casting companies. Some companies publish opportunities to:</P>
      <UL items={[
        "their official Facebook business page",
        "a company-run Facebook group",
        "broader Atlanta casting groups",
        "production-specific communities",
      ]} />
      <P>Set Life Casting, for example, specifically encourages performers to follow its Facebook page for immediate casting-call updates. Casting TaylorMade also maintains an Atlanta Facebook community alongside its website and other social channels.</P>
      <P>The challenge is that Facebook can become noisy very quickly. A group may contain:</P>
      <UL items={[
        "legitimate casting-company posts",
        "reposts of legitimate calls",
        "outdated notices",
        "unrelated acting opportunities",
        "self-promotional posts",
        "questionable or fraudulent listings",
      ]} />
      <P>So Facebook is useful — but the source matters more than the fact that something was posted on Facebook. When possible, identify who originally published the casting call.</P>

      <H2>3. Instagram and other social media</H2>
      <P>Casting companies also use Instagram and other social platforms to announce roles. That can include:</P>
      <UL items={[
        "full casting notices",
        "short “now casting” graphics",
        "links to submission forms",
        "reminders about open roles",
        "urgent or rush casting needs",
      ]} />
      <P>Casting TaylorMade&rsquo;s official social directory, for example, points performers to its Instagram, Facebook, TikTok and website in addition to individual open submissions. Social media can be especially useful for keeping a casting company on your radar.</P>
      <P>But there is a drawback: social feeds were not designed to be job-search databases. A casting call can disappear beneath dozens of newer posts. You may also need to follow many different companies just to know what is currently available. That is one reason people looking for background work often find themselves checking the same group of social accounts repeatedly.</P>

      <H2>4. Casting company email lists</H2>
      <P>Don&rsquo;t overlook email. Some casting companies maintain mailing lists where performers can receive:</P>
      <UL items={[
        "casting announcements",
        "company news",
        "registration information",
        "urgent needs",
        "performer resources",
      ]} />
      <P>Set Life Casting, for example, currently offers a mailing list in addition to its website and Facebook presence. Email can be useful because you aren&rsquo;t relying entirely on a social platform&rsquo;s algorithm to show you a post.</P>
      <P>But it creates another place to check. If you subscribe to several casting companies, casting opportunities can quickly become mixed in with the rest of your inbox. Consider using a dedicated email address or inbox folder for casting work so important messages are easier to find.</P>

      <H2>5. Casting platforms and submission systems</H2>
      <P>Sometimes the casting notice itself appears on one website or social account, but the actual application happens somewhere else. A casting company may direct you to:</P>
      <UL items={[
        "its own application form",
        "a talent database",
        "a third-party casting platform",
        "a production-specific submission system",
      ]} />
      <P>For example, recent Destination Casting notices have directed performers to a separate submission platform for certain projects while other notices use email submissions. That illustrates an important point: don&rsquo;t assume every opportunity from the same casting company will use the same submission method.</P>
      <P>Read each casting notice completely. The company may tell you to:</P>
      <UL items={[
        "submit through a form",
        "email specific information",
        "update your talent profile",
        "respond to an availability request",
        "use a particular subject line",
      ]} />
      <P>Following the instructions exactly is part of the submission.</P>

      <H2>6. Entertainment sites and casting-call roundups</H2>
      <P>Atlanta casting notices are also frequently republished by entertainment websites and casting-call communities. Examples include sites that collect casting notices from multiple companies and publish them in one place.</P>
      <P>The Southern Casting Call, for example, currently republishes casting notices from Atlanta-area companies including Rose Locke Casting/CL Casting and Destination Casting. Atlanta radio outlet V-103 has also published weekly Atlanta casting-call roundups containing opportunities from companies such as Central Casting Georgia, Rose Locke Casting and On Location Casting.</P>
      <P>These sources can be genuinely useful because they expose you to opportunities you might otherwise miss. But there is an important distinction:</P>
      <P><strong>Original source</strong> — the casting company or authorized party that is actually handling the role.</P>
      <P><strong>Repost or aggregation source</strong> — a site, group or service that helps you discover the opportunity.</P>
      <P>When possible, follow the original casting company&rsquo;s submission instructions. A repost can help you discover the role, but the company doing the casting is ultimately the source that determines how to apply.</P>

      <H2>7. Casting companies may contact you directly</H2>
      <P>Not every opportunity starts with you finding a public casting call. Once you create profiles with casting companies, they may already have enough information to identify you as a potential fit for a role. You may receive:</P>
      <UL items={[
        "an availability request",
        "a text",
        "an email",
        "a message through a casting platform",
        "a request to update information",
        "a booking inquiry",
      ]} />
      <P>Central Casting, for example, specifically teaches registered background actors how to respond to casting messages and availability requests. This is one reason keeping your profiles current matters. If your appearance, photos, hair, facial hair, measurements, clothing sizes, vehicle, location or special skills change, update the information where appropriate. A casting company cannot match you accurately using information that is several years out of date.</P>

      <H2>Atlanta casting companies worth knowing</H2>
      <P>There are many casting companies working in Georgia, and the mix changes as productions come and go. An official film-industry resource maintained by Explore Gwinnett currently lists numerous companies serving the Georgia production market, including:</P>
      <UL items={[
        "Central Casting Georgia",
        "Casting TaylorMade",
        "CL Casting",
        "Extras Casting Atlanta",
        "Hylton Casting",
        "On Location Casting",
        "Rose Locke Casting",
        "Set Life Casting",
        "Destination Casting",
        "Southern BG Casting",
        "The Southern Casting Call",
        "and others",
      ]} />
      <P>This should not be treated as a promise that every company has an open project today. Think of it as a starting point for understanding the Atlanta casting ecosystem. Here are several sources especially worth knowing when you&rsquo;re getting started.</P>

      <H3>Central Casting Georgia</H3>
      <P>Central Casting specializes in background actors, stand-ins and doubles and operates a large national casting database. Performers register through Central Casting and create a profile containing current appearance and sizing information. Central Casting says both union and non-union performers can register and that prior experience is not required.</P>
      <P className="text-sm text-zinc-500 dark:text-zinc-400"><strong>Best use:</strong> Register, maintain an accurate profile and monitor opportunities and messages through its official system.</P>

      <H3>Casting TaylorMade</H3>
      <P>Casting TaylorMade handles Atlanta-area background casting and publishes individual production notices and application forms through its website. Its online presence also includes Facebook, Instagram and other social channels.</P>
      <P className="text-sm text-zinc-500 dark:text-zinc-400"><strong>Best use:</strong> Monitor its current casting pages and official social channels, then follow the application link for the specific role.</P>

      <H3>Set Life Casting</H3>
      <P>Set Life Casting is based in Atlanta and casts background actors, photo doubles, stand-ins and specialty performers for film, television, streaming, commercials and other productions. It currently publishes casting calls on its website and encourages performers to follow its Facebook page and mailing list for updates.</P>
      <P className="text-sm text-zinc-500 dark:text-zinc-400"><strong>Best use:</strong> Monitor the current-casting page and the company&rsquo;s official Facebook presence.</P>

      <H3>Destination Casting</H3>
      <P>Destination Casting is an Atlanta-based casting company handling multiple kinds of casting, including background and featured roles. Its website contains a dedicated Now Casting section, and individual productions may use different submission methods.</P>
      <P className="text-sm text-zinc-500 dark:text-zinc-400"><strong>Best use:</strong> Check current casting notices and carefully follow the submission method specified for each project.</P>

      <H3>Rose Locke Casting / CL Casting</H3>
      <P>Rose Locke Casting and CL Casting continue to appear on current Atlanta production notices, although the Rose Locke website itself currently has limited content. Recent notices have been distributed through other Atlanta casting resources and publications with direct email submission instructions.</P>
      <P className="text-sm text-zinc-500 dark:text-zinc-400"><strong>Best use:</strong> Follow current verified casting notices and make sure the submission address and instructions trace back to the legitimate casting company.</P>

      <H2>So which Atlanta casting source is the best?</H2>
      <P>There isn&rsquo;t one. And that&rsquo;s really the problem.</P>
      <P>One company may be casting a major streaming series while another has a feature film and another needs performers for a commercial. If you monitor only one company, you&rsquo;re only seeing that company&rsquo;s current needs. If you monitor only Facebook, you may miss opportunities published elsewhere. If you monitor only a traditional casting platform, you may miss company-specific posts.</P>
      <P>For someone actively trying to book background work, the strongest approach is to monitor multiple legitimate sources.</P>

      <H2>The manual way to monitor Atlanta casting calls</H2>
      <P>If you want to build your own system, your routine might look something like this. Every day or two, check:</P>
      <UL items={[
        "casting company websites",
        "casting-company Facebook pages",
        "Instagram accounts",
        "casting platforms",
        "casting email",
        "trusted Atlanta casting communities",
      ]} />
      <P>When you find an opportunity, record the:</P>
      <UL items={[
        "production or project",
        "casting company",
        "role",
        "work date",
        "location",
        "rate",
        "requirements",
        "submission deadline",
        "application method",
      ]} />
      <P>Then mark whether you saved it, submitted, received an availability request, or were booked. It works. But you can see why finding the work becomes a job in itself.</P>

      <H2>The easier approach: bring multiple sources together</H2>
      <P>The fragmentation of casting opportunities is one of the problems GigDock is designed to reduce. Instead of requiring you to remember every site, page and social account, GigDock brings opportunities from multiple sources together into one feed.</P>
      <P>That does not mean GigDock is the original casting company. The individual opportunity still comes from its underlying source, and the casting company determines the submission requirements. GigDock makes it easier to discover and organize the opportunities. You can:</P>
      <UL items={[
        "browse opportunities",
        "search and filter the feed",
        "save opportunities",
        "keep track of opportunities you’ve applied to",
        "use GigFit to compare opportunity requirements with information in your profile",
      ]} />
      <P>And when an opportunity becomes actual work, you can continue managing the gig in the GigDock app. <A href={ATL}>Browse current Atlanta opportunities →</A></P>

      {pulse.callsTracked > 0 && (
        <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">What GigDock is seeing in Atlanta right now</h3>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">GigDock data · last 30 days</p>
          <p className="mt-2 text-zinc-700 dark:text-zinc-200 leading-relaxed">
            In the last 30 days, GigDock tracked <strong>{pulse.callsTracked.toLocaleString()}</strong> Atlanta-area {pulse.callsTracked === 1 ? "opportunity" : "opportunities"} across <strong>{pulse.castingSources}</strong> {pulse.castingSources === 1 ? "source" : "sources"}.
            {pulse.topCities.length > 0 && <> Some of the most active filming locations included <strong>{pulse.topCities.join(", ")}</strong>.</>}
          </p>
          <div className="mt-4">
            <Link href={ATL} className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">See what&rsquo;s casting in Atlanta today →</Link>
          </div>
        </div>
      )}

      <H2>How to tell whether a casting call is legitimate</H2>
      <P>The fact that casting calls appear across so many websites and social platforms creates an opportunity for scammers too. SAG-AFTRA warned performers in 2026 about scammers impersonating legitimate casting professionals and productions in order to obtain money or personal information. The FTC has issued similar warnings about fake casting outreach.</P>
      <P>Watch for major red flags such as someone asking you to:</P>
      <UL items={[
        "pay money to secure the job",
        "contribute money toward travel or production costs",
        "cash a check and send part of the money elsewhere",
        "provide banking information before you’ve verified the company",
        "respond to unexpected outreach without any way to confirm the sender",
        "use unusual payment methods to obtain the role",
      ]} />
      <P>One of the simplest protections is to trace the casting call back to the company that is actually casting it. If you see something in a Facebook group or on a reposting site:</P>
      <OL items={[
        "Identify the casting company.",
        "Find its official website or official social presence yourself.",
        "Verify that the company and contact information are legitimate.",
        "Follow the submission instructions from the actual casting source.",
      ]} />
      <P>You should never have to send someone money in order to get paid for a legitimate job. Both SAG-AFTRA and the FTC identify upfront payment requests as a major scam warning.</P>
      <P className="text-sm text-zinc-500 dark:text-zinc-400"><em>Related guide coming soon: How to Spot a Fake Casting Call or Casting Scam.</em></P>

      <H2>Don&rsquo;t confuse background casting with principal acting</H2>
      <P>Another reason online searches can become confusing is that the phrase &ldquo;casting calls&rdquo; covers very different kinds of work. You may encounter listings for:</P>
      <UL items={[
        "background actors",
        "stand-ins",
        "photo doubles",
        "featured background",
        "specialty performers",
        "speaking actors",
        "models",
        "reality participants",
        "commercial talent",
      ]} />
      <P>GigDock&rsquo;s current background-focused resources primarily help people pursuing background and adjacent production roles such as stand-ins and photo doubles. Traditional principal acting often involves a different ecosystem of agents, managers, auditions, self-tapes and professional casting systems.</P>
      <P>So when you&rsquo;re evaluating a source, ask: what kind of casting does this company actually handle? A great source for principal auditions may not be where most Atlanta background work appears — and vice versa.</P>

      <H2>A practical Atlanta casting routine</H2>
      <P>If you&rsquo;re actively trying to book background work, I would use a simple routine.</P>
      <OL items={[
        "Register with reputable casting companies. Create accurate profiles where appropriate.",
        "Keep your information current — especially photos, measurements, location and appearance.",
        "Monitor multiple sources. Don’t rely on a single casting company or social network.",
        "Read the entire casting call. Before submitting, confirm that you actually fit the requirements.",
        "Apply exactly as instructed — correct form, correct subject line, correct photos, correct information.",
        "Keep track of what you’ve applied to, so you know what a casting company is referring to when it contacts you.",
        "Verify anything that looks suspicious, especially unexpected messages or requests involving money.",
      ]} />
      <P>Then keep doing it. Background casting changes quickly because the needs of productions change quickly. The goal isn&rsquo;t to find one magical website. It&rsquo;s to build a reliable way to see legitimate opportunities while they&rsquo;re still relevant.</P>

      <div className="mt-8 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Find current Atlanta casting opportunities</h3>
        <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">You can manually follow every company, website, Facebook page, Instagram account and email list — or you can use those sources while also using GigDock to make the search easier. GigDock brings film and television opportunities from multiple sources together in one place.</p>
        <div className="mt-4">
          <Link href={ATL} className="inline-flex items-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Browse Atlanta casting calls →</Link>
        </div>
      </div>

      <P className="mt-6">New to background work? <A href="/guides/how-to-get-background-acting-work-in-atlanta">Read How to Get Background Acting Work in Atlanta →</A></P>
      <P>Want to understand the money? <A href="/guides/how-background-actors-get-paid">Read How Do Background Actors Get Paid? →</A> Already booking gigs? <A href="/guides/how-to-track-background-acting-gigs-and-payments">See how to track your gigs and payments →</A></P>

      <AppCta heading="Already booking gigs?" ctaLabel="See how GigDock works">
        See how GigDock helps organize your gig life — find opportunities from multiple sources, track the gigs you book, and record what you were paid, all in one place.
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
        General information for background actors and extras, not legal, payroll or tax advice. Casting companies,
        their channels and their submission methods change over time; always verify a casting call with the original
        casting company and follow the instructions in the actual notice.
      </p>
    </article>
  );
}

export default async function Page() {
  const spec = getSeoMarket("atlanta-ga");
  const pulse = spec ? await getMarketPulse(spec) : { callsTracked: 0, castingSources: 0, topCities: [] };

  const articleLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: "Where Atlanta Casting Calls Actually Appear",
    description: DESCRIPTION,
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
      <Guide pulse={pulse} />
    </PublicShell>
  );
}
