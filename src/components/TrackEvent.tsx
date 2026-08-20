"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

// Fire-once tracker for server-rendered pages: drop this into a server component
// with the event name + properties and it emits the event on mount, client-side.
export default function TrackEvent({
  event,
  props,
}: {
  event: string;
  props?: Record<string, unknown>;
}) {
  useEffect(() => {
    track(event, props ?? {});
    // Fire exactly once per page view; props are captured at mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
