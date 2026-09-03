"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";
import { trackProduct, type ReportingKey } from "@/lib/productEvents";

// Fire-once tracker for server-rendered pages. Drop it into a server component
// with either:
//   • `reporting` — a canonical mobile-mirrored event key (fires the reporting
//                   name plus any web-compat alias via trackProduct).
//   • `event`     — a bare event name for legacy/free-form web-only events.
export default function TrackEvent({
  event,
  reporting,
  props,
}: {
  event?: string;
  reporting?: ReportingKey;
  props?: Record<string, unknown>;
}) {
  useEffect(() => {
    if (reporting) trackProduct(reporting, props ?? {});
    else if (event) track(event, props ?? {});
    // Fire exactly once per page view; props are captured at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
