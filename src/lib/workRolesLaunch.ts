// Phase 2/3 grandfather semantics for the work-role system. The three-state
// model is expressed directly on the profile row — no runtime env var, no
// launch-date comparison:
//
//   work_roles_set_at IS NOT NULL                                → roles answered
//   work_roles_set_at IS NULL AND work_roles_grandfathered_at IS NOT NULL
//                                                                → grandfathered
//   work_roles_set_at IS NULL AND work_roles_grandfathered_at IS NULL
//                                                                → new / incomplete
//                                                                  onboarding
//
// `work_roles_grandfathered_at` is populated ONCE by a one-time migration
// backfill (see sql/work-roles.sql). New profiles created after the rollout
// leave it NULL, which is exactly how we identify a genuine new user later.
// The value is defended by the enforce_work_roles_via_rpc trigger so clients
// cannot self-grandfather.

export interface RoleGateProfile {
  work_roles_set_at: string | null;
  work_roles_grandfathered_at: string | null;
}

/** True when the user predates the rollout and has not answered Work
 * Roles. These users see a soft banner but are not blocked. */
export function isGrandfathered(p: RoleGateProfile): boolean {
  return !p.work_roles_set_at && !!p.work_roles_grandfathered_at;
}

/** True when the user is a "new user" who must complete Work Roles before
 * being allowed into the authenticated product. Users who signed up after
 * the rollout land here; so do users whose onboarding was interrupted
 * before roles were persisted. */
export function needsOnboarding(p: RoleGateProfile): boolean {
  return !p.work_roles_set_at && !p.work_roles_grandfathered_at;
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
  if (/^\/[^\/]*javascript:/i.test(raw)) return fallback;
  return raw;
}
