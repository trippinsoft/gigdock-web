"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import { BETA_ANCHOR } from "@/lib/appPromo";

type Platform = "ios" | "android";
type Status = "idle" | "submitting" | "done" | "error";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function BetaSignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [company, setCompany] = useState(""); // honeypot — humans never see/fill this
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  // Low friction: only email + platform are required. Name and city are optional.
  const valid = EMAIL_RE.test(email) && platform !== null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (company) return; // bot filled the honeypot — silently drop
    if (!valid || status === "submitting") return;

    setStatus("submitting");
    setError(null);
    try {
      const supabase = createSupabaseBrowser();
      const { error: insErr } = await supabase.from("beta_signups").insert({
        email: email.trim().toLowerCase(),
        platform,
        name: name.trim() || null,
        city: city.trim() || null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        referrer: typeof document !== "undefined" ? document.referrer || null : null,
      });

      // 23505 = already on the list. That's a success from the visitor's view.
      if (insErr && insErr.code !== "23505") throw insErr;

      track("beta_signup", { platform, already_signed_up: insErr?.code === "23505" });
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Something went wrong — please try again in a moment.");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-2xl border border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30 p-6 text-center">
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-green-600 text-white">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">You&rsquo;re on the list</h3>
        <p className="mt-1.5 text-sm text-zinc-600 dark:text-zinc-300">
          Thanks! We&rsquo;ll email you at <span className="font-medium">{email.trim().toLowerCase()}</span> with your{" "}
          {platform === "ios" ? "TestFlight" : "Google Play"} invite as spots open up.
        </p>
      </div>
    );
  }

  const field =
    "w-full rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-3 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30";

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <label htmlFor="beta-email" className="sr-only">Email</label>
        <input id="beta-email" type="email" autoComplete="email" placeholder="Email"
          value={email} onChange={(e) => setEmail(e.target.value)} className={field} required />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="beta-name" className="sr-only">Name (optional)</label>
          <input id="beta-name" type="text" autoComplete="name" placeholder="Name (optional)"
            value={name} onChange={(e) => setName(e.target.value)} className={field} />
        </div>
        <div>
          <label htmlFor="beta-city" className="sr-only">City (optional)</label>
          <input id="beta-city" type="text" autoComplete="address-level2" placeholder="City (optional)"
            value={city} onChange={(e) => setCity(e.target.value)} className={field} />
        </div>
      </div>

      {/* Honeypot: off-screen, not announced to real users. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-0 h-0 w-0 overflow-hidden">
        <label htmlFor="beta-company">Company</label>
        <input id="beta-company" type="text" tabIndex={-1} autoComplete="off"
          value={company} onChange={(e) => setCompany(e.target.value)} />
      </div>

      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-zinc-600 dark:text-zinc-400">Which phone do you use?</legend>
        <div className="grid grid-cols-2 gap-3">
          {(["ios", "android"] as Platform[]).map((p) => {
            const on = platform === p;
            return (
              <button key={p} type="button" onClick={() => setPlatform(p)}
                aria-pressed={on}
                className={`rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                  on
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 hover:border-zinc-400 dark:hover:border-zinc-600"
                }`}>
                {p === "ios" ? "iPhone (iOS)" : "Android"}
              </button>
            );
          })}
        </div>
      </fieldset>

      <button type="submit" disabled={!valid || status === "submitting"}
        className="w-full rounded-full bg-blue-600 px-6 py-3.5 text-center font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        {status === "submitting" ? "Sending…" : "Request beta access"}
      </button>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <p className="text-center text-xs text-zinc-500 dark:text-zinc-400">
        No spam. We&rsquo;ll only email you about GigDock beta access.
      </p>
      <span id={BETA_ANCHOR} className="sr-only" />
    </form>
  );
}
