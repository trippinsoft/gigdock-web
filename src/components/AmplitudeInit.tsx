"use client";

import { useEffect } from "react";
import { initAmplitude, identifyUser } from "@/lib/analytics";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Mounted once in the root layout. Boots Amplitude and, when a Supabase session
// exists (admins today, signed-in users later), ties web events to the same user
// id the mobile app reports — so one person's web + app activity unify in Amplitude.
export default function AmplitudeInit() {
  useEffect(() => {
    initAmplitude();

    let unsub: (() => void) | undefined;
    try {
      const supabase = createSupabaseBrowser();
      supabase.auth
        .getUser()
        .then(({ data }) => identifyUser(data?.user?.id))
        .catch(() => {});
      const { data } = supabase.auth.onAuthStateChange((_e, session) =>
        identifyUser(session?.user?.id)
      );
      unsub = () => data?.subscription?.unsubscribe();
    } catch {
      /* no Supabase env in this context — analytics still runs anonymously */
    }
    return () => unsub?.();
  }, []);

  return null;
}
