// Onboarding gating for the work-role system is derived directly from
// `public.profiles.work_roles_set_at`:
//
//   work_roles_set_at IS NULL      → roles not yet answered. Users in this
//                                    state see an optional "Tell GigDock
//                                    what kind of work you do" banner and
//                                    retain legacy GigFit behavior. They
//                                    are NOT blocked from any surface.
//   work_roles_set_at IS NOT NULL  → roles answered. Role-aware behavior:
//                                    performer/mixed keeps GigFit,
//                                    crew-only suppresses it.
//
// The normal signup path still routes new accounts through /onboarding to
// answer roles up front — middleware no longer forces that redirect.
//
// This file name is legacy (there is no launch-date logic anymore); left
// as-is to keep the diff focused.

/** Same-site path validator for ?next=. Rejects anything that could smuggle
 * an open redirect: protocol-relative URLs (//evil.com), backslash tricks,
 * URLs with a scheme (http:// / javascript:), and pathologically long
 * strings. Never returns null — callers get either the validated path or
 * the caller-provided fallback. */
export function safeNext(raw: string | null | undefined, fallback: string = "/today"): string {
  if (!raw) return fallback;
  if (typeof raw !== "string") return fallback;
  if (raw.length > 512) return fallback;
  if (!raw.startsWith("/")) return fallback;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  if (raw.includes("://")) return fallback;
  if (/^\/[^\/]*javascript:/i.test(raw)) return fallback;
  return raw;
}
