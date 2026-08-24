// Small presentation helpers shared by server and client components. No deps,
// no server imports — safe to use anywhere.

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});
const USD0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** "$1,234.50". Returns "—" for null/undefined. `whole` drops the cents. */
export function money(n: number | null | undefined, whole = false): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return (whole ? USD0 : USD).format(n);
}

/** "Aug 24, 2026" from an ISO date/timestamp. Parsed as a plain calendar date
 * (no timezone shift) when given YYYY-MM-DD. */
export function shortDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const ymd = iso.slice(0, 10);
  const [y, m, d] = ymd.split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "Aug 24" (no year) — for tight rows. */
export function shortDateNoYear(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "—";
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/** Compact date range for a gig: "Aug 3 – Aug 12, 2026" or a single date. */
export function dateRange(
  start: string | null | undefined,
  end: string | null | undefined
): string {
  if (!start && !end) return "—";
  if (start && end && start.slice(0, 10) !== end.slice(0, 10)) {
    return `${shortDateNoYear(start)} – ${shortDate(end)}`;
  }
  return shortDate(start ?? end);
}
