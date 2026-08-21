import Link from "next/link";
import { APP_LIVE, IOS_STORE_URL, ANDROID_STORE_URL, APP_PATH, BETA_HREF } from "@/lib/appPromo";

// Reusable "get the app" call-to-action used across the site (homepage, guides,
// opportunities pages, and the /app hero). One switch — APP_LIVE in appPromo.ts —
// turns every instance from a beta invite into store-download buttons at launch.
//
//   variant="card"    a bordered promo block with heading + copy (in content flows)
//   variant="buttons" just the action button(s) (for the /app hero, next to the form)

type Variant = "card" | "buttons";

function StoreButtons({ center = false }: { center?: boolean }) {
  // Plain styled buttons for now; swap in the official App Store / Google Play
  // badge images here when you have them. Each button hides itself until its URL
  // is filled in appPromo.ts.
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white";
  return (
    <div className={`flex flex-wrap gap-3 ${center ? "justify-center" : ""}`}>
      {IOS_STORE_URL && (
        <a href={IOS_STORE_URL} target="_blank" rel="noopener noreferrer" className={base}>
          Download on the App Store
        </a>
      )}
      {ANDROID_STORE_URL && (
        <a href={ANDROID_STORE_URL} target="_blank" rel="noopener noreferrer" className={base}>
          Get it on Google Play
        </a>
      )}
    </div>
  );
}

export default function AppCta({
  variant = "card",
  center = false,
  heading = "Get the GigDock app",
  ctaLabel,
  children,
}: {
  variant?: Variant;
  center?: boolean;
  heading?: string;
  /** Contextual link text for the card CTA (e.g. "See how GigDock works"). The
   *  card always routes to /app — the page itself does the selling and hosts the
   *  beta form — so keep this problem-matched to where it appears. */
  ctaLabel?: string;
  /** Optional supporting copy for the card variant. */
  children?: React.ReactNode;
}) {
  if (variant === "buttons") {
    if (APP_LIVE) return <StoreButtons center={center} />;
    return (
      <Link
        href={BETA_HREF}
        className="inline-flex items-center justify-center rounded-full bg-blue-600 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-blue-700"
      >
        Get early access
      </Link>
    );
  }

  // card variant
  const label = ctaLabel ?? "See how GigDock works";
  return (
    <div className={`mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-6 ${center ? "text-center" : ""}`}>
      <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{heading}</h3>
      <p className="mt-1.5 text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
        {children ??
          (APP_LIVE
            ? "Track your gigs, hours and pay — gross and net — in one place, on your phone."
            : "GigDock is almost here. Track your gigs, hours and pay — gross and net — in one place. Join the beta and be among the first to try it.")}
      </p>
      <div className={`mt-4 ${center ? "flex justify-center" : ""}`}>
        {APP_LIVE ? (
          <StoreButtons center={center} />
        ) : (
          <Link
            href={APP_PATH}
            className="inline-flex items-center rounded-full bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {label} →
          </Link>
        )}
      </div>
    </div>
  );
}
