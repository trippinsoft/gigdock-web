"use client";

// Amplitude for the web, pointed at the SAME Amplitude project as the mobile app
// so events from both surfaces land together. Event names are snake_case to match
// the app (gig_created, payment_added, …), and every event carries a `platform`
// property ("web" here, "ios"/"android" in the app) so you can split by surface.
//
// The ingestion key is read from NEXT_PUBLIC_AMPLITUDE_API_KEY. Amplitude browser
// keys are write-only and safe to ship in client code, but keeping it in an env
// var lets us point staging/preview at a different project. If the var is unset,
// every function here is a no-op, so the site works without analytics configured.

import * as amplitude from "@amplitude/analytics-browser";

const KEY = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
let started = false;

export function initAmplitude(): void {
  if (started || !KEY || typeof window === "undefined") return;
  started = true;
  amplitude.init(KEY, {
    // Page views + sessions + marketing attribution give us baseline web traffic
    // analytics for free; we fire the product events (below) explicitly.
    autocapture: {
      attribution: true,
      pageViews: true,
      sessions: true,
      formInteractions: false,
      fileDownloads: false,
      elementInteractions: false,
    },
  });
}

/** Fire a product event. Always tagged platform:"web" for cross-surface splits;
 *  `environment` (production/preview/development) is added to match the mobile
 *  app's schema so Amplitude reports can slice both surfaces consistently. */
export function track(event: string, props: Record<string, unknown> = {}): void {
  if (!KEY || typeof window === "undefined") return;
  const environment =
    process.env.NEXT_PUBLIC_VERCEL_ENV || process.env.NODE_ENV || "UNKNOWN";
  // Drop null/undefined so Amplitude property lists stay clean.
  const clean = Object.fromEntries(
    Object.entries(props).filter(([, v]) => v !== null && v !== undefined && v !== "")
  );
  amplitude.track(event, { environment, platform: "web", ...clean });
}

/** Tie web events to the same Supabase user id the app uses, when signed in. */
export function identifyUser(userId: string | null | undefined): void {
  if (!KEY || typeof window === "undefined") return;
  amplitude.setUserId(userId ?? undefined);
}
