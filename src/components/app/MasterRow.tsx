// Shared master-list CARD for the GigDock workspace. Opportunities is the
// baseline look (Indeed-style card); My Gigs and Payments are variants of it, so
// all three share card geometry, selection treatment, typography, padding,
// borders, hover and density — each supplying its own domain content.
//
// Layout (top → bottom):
//   Row 1: title (+ optional corner action, e.g. Save)
//   Row 2: optional thumbnail + subtitle/meta (source or company · location · date)
//   Row 3: value (pay / earned / amount) + badge (fit / status) + trailing note
//
// Thumbnail slot: Opportunities and Gigs reserve it (source/gig imagery + shared
// fallback); Payments omit it — amount/status/aging scan first.

import Link from "next/link";

export default function MasterRow({
  href,
  onClick,
  selected = false,
  showThumb = false,
  image,
  title,
  subtitle,
  meta,
  value,
  badge,
  trailing,
  corner,
  ariaCurrent,
}: {
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  selected?: boolean;
  showThumb?: boolean;
  image?: string | null;
  title: string;
  subtitle?: React.ReactNode;
  meta?: React.ReactNode;
  value?: React.ReactNode;
  badge?: React.ReactNode;
  trailing?: React.ReactNode;
  corner?: React.ReactNode;
  ariaCurrent?: boolean;
}) {
  const cls = `block w-full text-left rounded-lg border p-4 transition-colors ${
    selected
      ? "bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600"
      : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
  }`;

  const inner = (
    <>
      {/* Row 1 — title */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100 line-clamp-2 flex-1 min-w-0">{title}</h3>
        {corner}
      </div>

      {/* Row 2 — thumbnail + source/company · location · date */}
      {(showThumb || subtitle || meta) && (
        <div className="flex items-start gap-2.5 mt-2">
          {showThumb && <Thumb image={image} />}
          <div className="min-w-0 flex-1">
            {subtitle && <p className="text-sm text-zinc-600 dark:text-zinc-400 truncate">{subtitle}</p>}
            {meta && <div className="text-sm text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{meta}</div>}
          </div>
        </div>
      )}

      {/* Row 3 — value + badge + trailing note */}
      {(value || badge || trailing) && (
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2.5">
          {value && <span className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{value}</span>}
          {badge}
          {trailing && <span className="text-[13px] text-zinc-500 dark:text-zinc-400 ml-auto">{trailing}</span>}
        </div>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} onClick={onClick} className={cls} aria-current={ariaCurrent ? "true" : undefined}>
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function Thumb({ image }: { image?: string | null }) {
  return (
    <span className="shrink-0 h-12 w-12 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" className="h-full w-full object-cover" />
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="text-zinc-300 dark:text-zinc-600">
          <rect x="3" y="4" width="18" height="16" rx="2" /><path d="m3 15 5-4 4 3 3-2 6 5" /><circle cx="8.5" cy="9" r="1.5" />
        </svg>
      )}
    </span>
  );
}
