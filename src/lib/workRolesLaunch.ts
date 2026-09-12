// Phase 2 launch cutoff. Read from the WORK_ROLES_LAUNCH_DATE environment
// variable at build/runtime, so ops can set the real production-deploy
// timestamp on Vercel immediately before releasing — no code change, no
// guessing.
//
// The variable is server-only. Every code path that uses it
// (src/middleware.ts, src/app/(app)/today/page.tsx,
// src/app/opportunities/page.tsx) is server-side, so we do NOT need the
// NEXT_PUBLIC_ prefix and never leak the cutoff to the client bundle.
//
// SAFE FALLBACK: if the env var is missing or malformed, we default to a
// far-future ISO date. That means "created_at >= WORK_ROLES_LAUNCH_DATE"
// is false for every real user — nobody is forced through onboarding —
// and the soft grandfather banner path (created_at < cutoff, work_roles
// not set) is used everywhere. This fails safe rather than failing open.
//
// TO DEPLOY: set the Vercel env var immediately before publishing Phase 2:
//   WORK_ROLES_LAUNCH_DATE=2026-09-15T22:00:00Z    # example
// (Use the real UTC moment you promoted the deploy. String comparisons on
// ISO 8601 with a Z suffix are lexicographically correct, so we compare
// created_at directly.)

const FAR_FUTURE = "9999-01-01T00:00:00.000Z";

function resolveLaunchDate(): string {
  const raw = process.env.WORK_ROLES_LAUNCH_DATE;
  if (!raw) {
    if (typeof console !== "undefined") {
      console.warn(
        "[work-roles] WORK_ROLES_LAUNCH_DATE not set — grandfathering everyone (safe fallback)."
      );
    }
    return FAR_FUTURE;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    if (typeof console !== "undefined") {
      console.warn(
        `[work-roles] WORK_ROLES_LAUNCH_DATE=${raw} is not a valid ISO date — grandfathering everyone (safe fallback).`
      );
    }
    return FAR_FUTURE;
  }
  return parsed.toISOString();
}

export const WORK_ROLES_LAUNCH_DATE = resolveLaunchDate();

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
  if (/^\/[^\/]*javascript:/i.test(raw)) return fallback;
  return raw;
}
