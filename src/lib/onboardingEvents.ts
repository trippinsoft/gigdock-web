// Analytics wrapper for the Phase 2 work-role onboarding flow. Uses the same
// snake_case + platform:web convention as the rest of GigDock's Amplitude
// events. NEVER include work_roles_other (free text), demographic values,
// or any casting field — role_key strings are non-sensitive occupation
// labels only.

import { track } from "@/lib/analytics";

type OnboardingEvent =
  | "onboarding_started"
  | "work_roles_selected"
  | "performer_profile_started"
  | "performer_profile_skipped"
  | "onboarding_completed"
  | "work_roles_updated";

export function trackOnboarding(event: OnboardingEvent, props: Record<string, unknown> = {}) {
  track(event, props);
}
