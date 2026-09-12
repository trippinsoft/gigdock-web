// Phase 2 launch cutoff. A single ISO timestamp — anyone whose profile
// created_at is strictly before this moment is grandfathered (Today shows a
// modest banner; onboarding is not enforced). Anyone at/after this moment is
// a "new user" and must complete Work Roles before entering the authenticated
// product. work_roles_set_at IS NOT NULL always means done, regardless of
// created_at.
//
// The value is a plain code constant so it can be reviewed in diff and does
// not depend on runtime configuration. Set to 2026-09-13T00:00:00Z — one
// day's safety margin past the moment this file lands so any signups that
// slip in during the window between Phase 2 commit and actual production
// deploy still count as grandfathered users (per the intent-preserving
// grandfather policy).
export const WORK_ROLES_LAUNCH_DATE = "2026-09-13T00:00:00.000Z";

export interface RoleGateProfile {
  created_at: string | null;
  work_roles_set_at: string | null;
}

/** True when the user predates the launch cutoff and has not answered Work
 * Roles. These users see a soft banner but are not blocked. */
export function isGrandfathered(p: RoleGateProfile): boolean {
  if (p.work_roles_set_at) return false;
  if (!p.created_at) return false;
  return p.created_at < WORK_ROLES_LAUNCH_DATE;
}

/** True when the user is a "new user" who must complete Work Roles before
 * being allowed into the authenticated product. Missing created_at is
 * treated as a new user (safer default — happens only in edge cases). */
export function needsOnboarding(p: RoleGateProfile): boolean {
  if (p.work_roles_set_at) return false;
  if (!p.created_at) return true;
  return p.created_at >= WORK_ROLES_LAUNCH_DATE;
}

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
  // "javascript:" would already fail the "/" prefix test — belt-and-braces.
  if (/^\/[^\/]*javascript:/i.test(raw)) return fallback;
  return raw;
}
