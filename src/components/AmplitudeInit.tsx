"use client";

import { useEffect, useRef } from "react";
import { initAmplitude, identifyUser } from "@/lib/analytics";
import { trackProduct } from "@/lib/productEvents";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Mounted once in the root layout. Boots Amplitude and, when a Supabase session
// exists, ties web events to the same user id the mobile app reports — so one
// person's web + app activity unify in Amplitude. Also fires the two
// per-session lifecycle events the funnel is built on:
//   • Qualified Visitor            — once, when the product runtime loads
//   • Authenticated Session Started — once per app boot when a session exists
export default function AmplitudeInit() {
  const qualifiedFired = useRef(false);
  const authFired = useRef(false);

  useEffect(() => {
    initAmplitude();

    if (!qualifiedFired.current) {
      qualifiedFired.current = true;
      trackProduct("qualifiedVisitor", { qualification_basis: "product_loaded" });
    }

    let unsub: (() => void) | undefined;
    try {
      const supabase = createSupabaseBrowser();
      supabase.auth
        .getUser()
        .then(({ data }) => {
          const uid = data?.user?.id;
          identifyUser(uid);
          if (uid && !authFired.current) {
            authFired.current = true;
            trackProduct("authenticatedSessionStarted");
          }
        })
        .catch(() => {});
      const { data } = supabase.auth.onAuthStateChange((_event, session) => {
        const uid = session?.user?.id;
        identifyUser(uid);
        if (uid && !authFired.current) {
          authFired.current = true;
          trackProduct("authenticatedSessionStarted");
        }
      });
      unsub = () => data?.subscription?.unsubscribe();
    } catch {
      /* no Supabase env in this context — analytics still runs anonymously */
    }
    return () => unsub?.();
  }, []);

  return null;
}
