import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import PublicShell from "@/components/PublicShell";
import AppCta from "@/components/AppCta";
import { getSeoMarket } from "@/lib/marketContent";
import { getMarketPulse } from "@/lib/marketPulse";

export const revalidate = 3600; // cache the live Atlanta data box hourly

const BASE = "https://www.gigdock.co";
const PATH = "/guides/how-to-get-background-acting-work-in-atlanta";
const TITLE = "How to Get Background Acting Work in Atlanta";
const DESCRIPTION =
  "Learn how to get background acting work in Atlanta with no prior experience — how to prepare, where casting calls appear, how to submit, what pay looks like, and where to find current opportunities.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: PATH },
  openGraph: {
    title: `${TITLE} · GigDock`, description: DESCRIPTION, type: "article", siteName: "GigDock", url: `${BASE}${PATH}`,
    images: [{ url: "/guides/atlanta-hero.png", width: 1448, height: 1086, alt: "How to Get Background Acting Work in Atlanta — a GigDock beginner's guide" }],
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION, images: ["/guides/atlanta-hero.png"] },
};

const ATL = "/opportunities/atlanta-ga";

const FAQ: { q: string; a: string }[] = [
  { q: "How do I get background acting work in Atlanta with no experience?", a: "Prior acting experience often isn't required for general background roles. Start by taking accurate current photos, preparing your basic measurements and contact information, registering with reputable casting companies and watching for casting calls that match you. Follow each submission's instructions carefully." },
  { q: "Do I need an agent to be a background actor in Atlanta?", a: "Generally, no. Background performers commonly submit directly to casting companies or through casting platforms rather than relying on a talent agent." },
  { q: "Do I need professional headshots?", a: "Usually not for general background work. Casting companies often want clear, recent photos that accurately show what you currently look like. Always follow the requirements of the individual casting company or casting notice." },
  { q: "How much do background actors make in Atlanta?", a: "There is no single Atlanta background rate. Pay varies by production, role, union status, guaranteed hours and special requirements. Casting notices usually state the offered rate and terms. Some bookings may also include additional compensation for things such as a personal vehicle, wardrobe or other specific requirements." },
  { q: "Where are Atlanta casting calls posted?", a: "Casting calls are fragmented across casting-company websites, email lists, Facebook, Instagram, casting platforms and other entertainment-industry sources. GigDock brings opportunities from multiple sources together into one feed." },
  { q: "Do I have to live in Atlanta?", a: "Not necessarily. Film and television work occurs throughout metro Atlanta and surrounding Georgia production areas. However, many casting notices require performers to work as local hires, meaning you are responsible for getting yourself to the reporting location without travel or lodging being provided. Always check the location and travel requirements before submitting." },
  { q: "How quickly should I respond to an Atlanta casting call?", a: "As soon as reasonably possible if you meet the requirements and are genuinely available. Some background roles are filled quickly, but you should still read the entire notice and submit the requested information accurately rather than rushing an incomplete submission." },
  { q: "Is background acting a good way to get started in film and television?", a: "It can be an accessible way to experience a professional set and learn how productions operate. Background work does not guarantee a path to principal acting roles, but it can give newcomers firsthand exposure to film and television production while earning money for the work they perform." },
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
function Figure({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="mt-6">
      <Image src={src} alt={alt} width={1448} height={1086} sizes="(max-width: 672px) 100vw, 672px"
        className="w-full h-auto rounded-xl border border-zinc-200 dark:border-zinc-800" />
    </figure>
  );
}

function Guide({ pulse }: { pulse: { callsTracked: number; castingSources: number; topCities: string[] } }) {
  return (
    <article className="mx-auto max-w-2xl py-4 text-zinc-800 dark:text-zinc-200">
      <nav className="text-sm text-zinc-500 dark:text-zinc-400 mb-3" aria-label="Breadcrumb">
        <Link href="/guides" className="hover:text-zinc-800 dark:hover:text-zinc-200">Guides</Link>
        <span className="mx-1.5">›</span>
        <span className="text-zinc-700 dark:text-zinc-300">Background acting work in Atlanta</span>
      </nav>

      <Image src="/guides/atlanta-hero.png" alt="How to Get Background Acting Work in Atlanta — a background actor on a film set at dusk with the Atlanta skyline, from GigDock."
        width={1448} height={1086} priority sizes="(max-width: 672px) 100vw, 672px" className="w-full h-auto rounded-2xl" />

      <h1 className="mt-6 text-3xl sm:text-4xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
        How to Get Background Acting Work in Atlanta: A Beginner&rsquo;s Guide
      </h1>

      <P>Georgia is one of the country&rsquo;s major film and television production centers, and much of that activity happens in and around metro Atlanta.</P>
      <P>For beginners, background acting is one of the most accessible ways to get onto a professional film or television set. Prior acting experience often isn&rsquo;t required, and you generally don&rsquo;t need an agent to pursue background work.</P>
      <P>But getting started can still be confusing. Where do legitimate casting calls appear? What kind of photos do you need? Do you have to register with casting companies? How quickly do you need to respond? And how do you keep track of everything once you start booking work?</P>
      <P>This guide walks through the process step by step.</P>
      <P>Already looking for work? <A href={ATL}>Browse current Atlanta casting calls →</A></P>

      <H2>What does a background actor do?</H2>
      <P>Background actors — often called extras — help create the world around the principal actors in a scene. You might be:</P>
      <UL items={[
        "eating in the background of a restaurant scene",
        "walking through an airport",
        "sitting in a courtroom",
        "attending a fictional wedding",
        "working in an office",
        "cheering at a sporting event",
        "driving your own vehicle through a scene",
      ]} />
      <P>Background roles are generally non-speaking, but they are paid work on professional productions. You may also see casting calls for related roles:</P>
      <H3>Stand-ins</H3>
      <P>Stand-ins take the place of principal actors while the production crew adjusts lighting, camera placement and other technical elements. These roles often require you to closely match an actor&rsquo;s height, build, hair or complexion, and they can sometimes involve multiple days of work.</P>
      <H3>Photo doubles</H3>
      <P>Photo doubles substitute for principal actors in shots where the actor&rsquo;s face is not clearly visible. Matching characteristics such as height, body type, hair, clothing sizes or specific physical features can matter.</P>
      <P className="text-sm text-zinc-500 dark:text-zinc-400"><em>Related guide coming soon: Stand-In vs. Photo Double vs. Background Actor.</em></P>

      <H2>How to start getting background acting work in Atlanta</H2>
      <Figure src="/guides/atlanta-7-steps-infographic.png" alt="7 steps to start background acting in Atlanta: get current photos, prepare your sizes and details, register with reputable casting companies, watch current Atlanta casting calls, apply only when you fit the call, follow the submission instructions exactly, and track your gigs and pay." />

      <H3>Step 1: Get your photos and basic information ready</H3>
      <P>You usually do not need expensive professional headshots to begin pursuing general background work. What casting teams typically need first is an accurate picture of what you look like right now. Have at least:</P>
      <UL items={[
        "a recent, well-lit photo of your face",
        "a recent full-body photo",
        "natural lighting when possible",
        "minimal editing or filters",
        "a simple background",
        "clothing that lets casting clearly see your general appearance",
      ]} />
      <P>Your photos are not the place to make yourself look dramatically different. Casting is often trying to fill very specific visual needs, so accurate photos can actually help you get booked. You should also keep your basic information readily available, including:</P>
      <UL items={[
        "full name", "age or age range, if requested", "city or general area", "height",
        "clothing sizes", "shoe size", "relevant measurements", "phone number", "email address",
        "vehicle information, when applicable", "special skills that you can genuinely perform",
        "union status, when requested",
      ]} />
      <P>Casting notices vary, so always provide exactly what a particular call asks for rather than sending unnecessary information.</P>

      <H3>Step 2: Register with reputable Atlanta casting companies</H3>
      <P>There is no single company responsible for all background casting in Atlanta. Different productions hire different casting companies, and those companies use different systems. Some allow you to submit directly to individual casting calls. Others maintain their own talent databases and may ask you to create a profile before you can be considered for work.</P>
      <P>It can be worthwhile to register with reputable casting companies whose projects interest you and keep your information current — things like:</P>
      <UL items={[
        "photos", "hair style or color", "facial hair", "measurements", "clothing sizes",
        "vehicle information", "availability", "special skills",
      ]} />
      <P>If your appearance changes significantly, your casting profile should usually change too. Casting decisions often happen quickly, and outdated information can work against you.</P>

      <H3>Step 3: Watch for current Atlanta casting opportunities</H3>
      <P>This is where background acting gets surprisingly fragmented. Atlanta casting calls may appear on:</P>
      <UL items={[
        "casting company websites", "company mailing lists", "Facebook pages and groups",
        "Instagram and other social accounts", "casting platforms", "production-related websites",
        "entertainment job sites",
      ]} />
      <Figure src="/guides/atlanta-where-calls-appear-infographic.png" alt="Where Atlanta casting calls appear — casting company websites, email lists, Facebook groups and pages, Instagram and social, casting platforms, and entertainment job sites are hard to track manually; GigDock brings opportunities from multiple sources into one feed." />
      <P>A person trying to find as much work as possible can end up checking the same collection of sources over and over. That fragmentation is one of the reasons GigDock exists — it brings film and television opportunities from multiple sources together into one feed, making it easier to see what is currently casting without having to remember every place where an opportunity might appear.</P>

      {pulse.callsTracked > 0 && (
        <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">What GigDock is seeing in Atlanta right now</h3>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-blue-600 dark:text-blue-400">GigDock data · last 30 days</p>
          <p className="mt-2 text-zinc-700 dark:text-zinc-200 leading-relaxed">
            In the last 30 days, GigDock tracked <strong>{pulse.callsTracked.toLocaleString()}</strong> Atlanta-area casting {pulse.callsTracked === 1 ? "opportunity" : "opportunities"} across <strong>{pulse.castingSources}</strong> casting {pulse.castingSources === 1 ? "source" : "sources"}.
            {pulse.topCities.length > 0 && <> Some of the most active filming areas included <strong>{pulse.topCities.join(", ")}</strong>.</>}
          </p>
          <div className="mt-4">
            <Link href={ATL} className="inline-flex items-center rounded-full bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">See today&rsquo;s Atlanta opportunities →</Link>
          </div>
        </div>
      )}
      <P>The Atlanta feed changes as new opportunities are discovered, so it is worth checking regularly if you are actively looking for work.</P>

      <H3>Step 4: Apply only when you fit the casting call</H3>
      <P>More submissions do not automatically mean more bookings. A better strategy is to make qualified submissions. Read the entire casting notice before responding, and look carefully at requirements such as:</P>
      <UL items={[
        "age range", "gender presentation", "height or measurements", "wardrobe", "hairstyle",
        "tattoos", "facial hair", "ethnicity or appearance when relevant to the role", "location",
        "transportation", "vehicle requirements", "special skills", "union status", "fitting dates",
        "filming dates", "availability for multiple days",
      ]} />
      <P>If the notice requires something specific and you do not meet that requirement, submitting anyway usually does not help. Casting teams may review a large number of submissions — making it easy for them to see that you fit the role can work in your favor.</P>

      <H3>Step 5: Follow the submission instructions exactly</H3>
      <P>Casting notices often tell you precisely how to respond — that may mean submitting through a form or sending an email containing particular information. If a casting company asks for a subject line like <strong>&ldquo;BLUE CAR — JOHN SMITH&rdquo;</strong>, don&rsquo;t send &ldquo;Background acting job.&rdquo; Small instructions matter when casting teams are sorting through large numbers of responses. A typical submission might ask for:</P>
      <UL items={[
        "your name", "current photos", "age or age range", "city", "phone number", "email",
        "measurements or sizes", "vehicle information", "availability",
        "confirmation that you meet a specific requirement",
      ]} />
      <P>Keep your response concise and professional. And never claim you have a skill, wardrobe item, vehicle or physical characteristic that you don&rsquo;t actually have — if you are booked because of something stated in your submission, production may expect you to arrive prepared to provide it.</P>

      <H3>Step 6: Respond quickly — but know the difference between submitting and being booked</H3>
      <P>Atlanta background casting can move quickly. A production may be trying to fill dozens or even hundreds of positions for a shoot only a few days away. That makes it useful to monitor your email, text messages, casting profiles and voicemail after submitting.</P>
      <P>But an important distinction for beginners is: <strong>applying is not the same as being booked.</strong> Even a preliminary availability check does not always mean you have the job. Do not assume you are officially working until the casting company has confirmed the booking and provided instructions. Once booked, carefully review the details you receive, which may include:</P>
      <UL items={[
        "work date", "call time", "report location", "parking instructions", "wardrobe",
        "hair or makeup instructions", "identification requirements", "rate", "guaranteed hours",
        "vehicle requirements", "special items you need to bring",
      ]} />
      <P>Save that information — you may need it later.</P>

      <H3>Step 7: Understand the rate before you accept the work</H3>
      <P>Background acting rates are often written in shorthand. For example, <strong>$150/12</strong> typically means a base rate of $150 for up to 12 guaranteed hours, subject to the terms of that booking. You may also see rates structured around eight or ten hours. Background rates vary by production, role, union status, guaranteed hours and special requirements.</P>
      <P>Some bookings may also include additional compensation commonly referred to as <strong>bumps</strong> or adjustments — for things such as:</P>
      <UL items={[
        "providing your own vehicle", "supplying specific wardrobe", "special hair or makeup requirements",
        "particular work conditions", "certain props or skills",
      ]} />
      <P>The exact rules depend on the production and, when applicable, the governing agreement. SAG-AFTRA-covered work follows the applicable union contract minimums and adjustment rules; non-union productions establish their own rates and terms. Always read the actual casting notice before submitting.</P>
      <P>Want to understand the numbers? <A href="/guides/how-background-actors-get-paid">Read How Do Background Actors Get Paid? →</A></P>

      <H2>Keep track of what you apply for</H2>
      <P>Once you begin submitting regularly, another problem appears: you forget what you applied to. That may not sound important until a casting company contacts you three days later and you are trying to remember which production it was, which role you submitted for, what date it shoots, what rate was listed, and whether you already committed to something else.</P>
      <P>Keeping some record of your applications makes the process easier. GigDock lets you save opportunities and keep track of the ones you&rsquo;ve applied to. <strong>GigFit</strong> also compares information in a casting call with information in your profile so you can quickly see which opportunities appear to be a stronger match.</P>
      <P><A href={ATL}>Browse current Atlanta opportunities →</A></P>

      <H2>Once you book the job, start tracking the gig</H2>
      <Figure src="/guides/gigdock-opportunity-to-pay-infographic.png" alt="From opportunity to pay with GigDock: find opportunities, save or apply, track the gig (dates, hours, rates, bumps), and record the payment — keeping your gig life organized." />
      <P>The casting call is only the beginning. Once you actually work, you may need to remember the production, casting company, payroll company, work date, advertised rate, guaranteed hours, call and wrap times, hours worked, bumps, and the gross and net payment — plus whether the gig has been paid.</P>
      <P>The problem is that payment may arrive well after the workday. By then, reconstructing everything from old emails, texts and screenshots can be difficult. GigDock gives people working gigs in TV &amp; film one place to keep this organized: record your gigs, rates, hours and bumps, then record gross and net payment when it arrives, and see which gigs you haven&rsquo;t yet marked paid.</P>
      <P><A href="/guides/how-to-track-background-acting-gigs-and-payments">Learn how to track your background acting gigs and pay →</A></P>

      <H2>What should you expect on your first background acting job?</H2>
      <P>A first day on set can be exciting, but it can also involve a lot more waiting than new background actors expect. Depending on the production, you may:</P>
      <OL items={[
        "check in",
        "complete paperwork or verify onboarding information",
        "visit wardrobe",
        "receive hair or makeup instructions",
        "wait in a background holding area",
        "rehearse blocking",
        "shoot a scene",
        "reset and shoot it again",
        "wait while production changes camera setups",
        "eventually wrap and check out",
      ]} />
      <P>Background days can be long. Bring what the casting company specifically tells you to bring, follow instructions, stay nearby when required, and be prepared for the schedule to change throughout the day. Reliability matters — showing up on time, following directions and behaving professionally may make casting teams more comfortable considering you again.</P>

      <H2>Do you need to join SAG-AFTRA?</H2>
      <P>You do not need to join SAG-AFTRA simply to begin pursuing background work in Atlanta. You may encounter both union-covered and non-union productions. Working qualifying SAG-AFTRA-covered jobs can eventually affect your eligibility to join the union, but joining is a larger career decision with rules, costs and implications for the work you may accept afterward. Don&rsquo;t treat union membership simply as a shortcut to making more money — learn about the current eligibility and membership rules directly from SAG-AFTRA before making that decision.</P>

      <H2>Watch out for casting scams</H2>
      <P>Background actors are attractive targets for scammers because legitimate casting can happen quickly and often involves communication with people you&rsquo;ve never met. A major warning sign is someone asking you to send money in exchange for getting the job. Be cautious if someone asks you to:</P>
      <UL items={[
        "pay to secure your role",
        "send money toward production expenses",
        "cash a check and forward part of the money elsewhere",
        "buy something from a specific person before you have verified the production",
        "provide sensitive financial or identity information before you have confirmed who you are dealing with",
      ]} />
      <P>Legitimate payroll onboarding after you have actually been hired is different — productions and payroll providers may need employment, tax or direct-deposit information as part of normal onboarding. The key is to verify the company and the booking first. If something feels unusual, find the casting company through its official website or social accounts rather than relying only on the contact information in the suspicious message.</P>
      <P className="text-sm text-zinc-500 dark:text-zinc-400"><em>A full GigDock guide to identifying fake casting calls is coming soon.</em></P>

      <H2>The simplest way to start</H2>
      <P>You do not need to solve your entire acting career before submitting for your first background role. Start with the basics:</P>
      <OL items={[
        "Take accurate current photos.",
        "Prepare your measurements and contact information.",
        "Register with reputable casting companies.",
        "Watch current Atlanta casting calls.",
        "Submit when you genuinely fit the requirements.",
        "Respond quickly when casting contacts you.",
        "Keep track of the opportunities, gigs and payments as you go.",
      ]} />
      <P>Then repeat. Background acting is unpredictable — you will not get every role you submit for, and there may be stretches when opportunities that fit you are limited. But the barrier to getting started is relatively low. You can begin by seeing what is casting right now.</P>

      <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">See what&rsquo;s casting in Atlanta today</h3>
        <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">GigDock brings current film and television opportunities from multiple sources together in one place.</p>
        <div className="mt-4">
          <Link href={ATL} className="inline-flex items-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">Browse Atlanta casting calls →</Link>
        </div>
      </div>

      <AppCta heading="Already working gigs?" ctaLabel="See how GigDock works">
        See how GigDock helps keep your gig life organized — find opportunities, track the gigs you book, and record what you were paid, all in one place.
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
        General information for background actors and extras, not legal, payroll or tax advice. Pay, overtime and
        adjustment rules vary by production, market and applicable union agreement. Always confirm the terms that apply to
        your particular booking.
      </p>
    </article>
  );
}

export default async function Page() {
  const spec = getSeoMarket("atlanta-ga");
  const pulse = spec ? await getMarketPulse(spec) : { callsTracked: 0, castingSources: 0, topCities: [] };

  const articleLd = {
    "@context": "https://schema.org", "@type": "Article",
    headline: "How to Get Background Acting Work in Atlanta",
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
