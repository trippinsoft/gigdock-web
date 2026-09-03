// Canonical product-event names, mirrored from the mobile app's
// utils/analytics/productEvents.js. Same Amplitude project receives events
// from both surfaces; keeping the names identical (and the properties
// non-sensitive) means one funnel view covers web + iOS + Android.
//
// Two flavors, matching mobile's own dual-emit pattern:
//  • REPORTING  — the human-readable event names funnel dashboards are built on
//                 ("Opportunity Saved"). PascalCase, with spaces.
//  • WEB_COMPAT_ALIAS — the snake_case aliases mobile also emits alongside the
//                       reporting names for a subset of discovery events. Emit
//                       BOTH from web (via trackProduct) so the events unify.
//
// Property rules (from docs/analytics-funnel.md):
//  • Never send PII, casting values, DOB, names, emails, payroll details,
//    document metadata, free text, application URLs, or raw route paths.
//  • Opaque IDs (opportunity_id, gig_id, payment_id) are allowed for journey
//    correlation. Non-sensitive classifications are allowed (surface, market,
//    source, GigFit tier, method, criteria_count, etc.).
//  • `platform` and `environment` are added automatically by track().

import { track } from "@/lib/analytics";

export const REPORTING = {
  qualifiedVisitor: "Qualified Visitor",
  authenticatedSessionStarted: "Authenticated Session Started",
  opportunitiesViewed: "Opportunities Viewed",
  opportunityViewed: "Opportunity Viewed",
  opportunitySaved: "Opportunity Saved",
  opportunityUnsaved: "Opportunity Unsaved",
  opportunityApplyOpened: "Opportunity Apply Opened",
  opportunityMarkedApplied: "Opportunity Marked Applied",
  opportunityUnmarkedApplied: "Opportunity Unmarked Applied",
  opportunityShared: "Opportunity Shared",
  opportunityAddToGigsStarted: "Opportunity Add To My Gigs Started",
  opportunityAddedToGigs: "Opportunity Added To My Gigs",
  opportunityBooked: "Opportunity Booked",
  gigBooked: "Gig Booked",
  bookedGigManagementStarted: "Booked Gig Management Started",
  gigManagementAction: "Gig Management Action",
  accountCreated: "Account Created",
  gigFitPreferencesCompleted: "GigFit Preferences Completed",
} as const;

export type ReportingKey = keyof typeof REPORTING;

// Web-compat aliases: the snake_case names mobile also emits for a subset of
// events, so a single funnel row covers web + app. Keep in lockstep with mobile.
const WEB_COMPAT_ALIAS: Partial<Record<ReportingKey, string>> = {
  opportunityViewed: "opportunity_viewed",
  opportunitySaved: "opportunity_saved",
  opportunityUnsaved: "opportunity_unsaved",
  opportunityMarkedApplied: "opportunity_applied",
  opportunityUnmarkedApplied: "opportunity_unapplied",
  opportunityShared: "opportunity_shared",
};

/** Fire a canonical product event. When the key has a mobile web-compat alias,
 *  emit both — same props, same platform tag — so historical snake_case tracking
 *  and the reporting funnel stay unified. */
export function trackProduct(
  key: ReportingKey,
  props: Record<string, unknown> = {}
): void {
  track(REPORTING[key], props);
  const alias = WEB_COMPAT_ALIAS[key];
  if (alias) track(alias, props);
}

/** Convenience: count how many of the five active GigFit criteria are set on a
 *  performer profile — the property `criteria_count` fires with
 *  "GigFit Preferences Completed". Matches mobile's gigFitCriteriaCount(). */
export function gigFitCriteriaCount(p: {
  markets?: unknown[] | null;
  gender?: string | null;
  ethnicity?: unknown[] | null;
  date_of_birth?: string | null;
  union_status?: string | null;
}): number {
  return [
    (p?.markets?.length ?? 0) > 0,
    !!p?.gender,
    (p?.ethnicity?.length ?? 0) > 0,
    !!p?.date_of_birth,
    !!p?.union_status,
  ].filter(Boolean).length;
}
