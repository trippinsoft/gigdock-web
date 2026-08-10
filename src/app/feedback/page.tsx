"use client";

import Link from "next/link";
import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import PublicShell from "@/components/PublicShell";

// Beta feedback form. Writes to the `feedback` table (anon inserts allowed via RLS)
// so nothing gets lost and every note is reviewable — no mail client required.
export default function FeedbackPage() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [gigUrl, setGigUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setStatus("sending");
    setError("");

    const supabase = createSupabaseBrowser();
    const { data: { user } } = await supabase.auth.getUser();
    const { error: insertError } = await supabase.from("feedback").insert({
      message: message.trim(),
      email: email.trim() || null,
      gig_url: gigUrl.trim() || null,
      user_id: user?.id ?? null,
      page: "web",
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });

    if (insertError) {
      setError(insertError.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <PublicShell>
      <div className="max-w-lg mx-auto">
        <Link href="/opportunities" className="text-sm text-blue-600 dark:text-blue-400">← Back to opportunities</Link>

        {status === "sent" ? (
          <div className="mt-6 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50 dark:bg-blue-950/30 p-8 text-center">
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Thanks — we got it.</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2">
              We read every note. It helps us cover more of the gigs that matter to you.
            </p>
            <Link
              href="/opportunities"
              className="inline-block mt-5 px-6 py-2.5 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm"
            >
              Browse opportunities
            </Link>
          </div>
        ) : (
          <>
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Tell us what we&apos;re missing
            </h1>
            <p className="text-zinc-600 dark:text-zinc-400 mt-2 text-sm">
              GigDock is in open beta. Spotted a gig we don&apos;t cover, a source we should add, or
              something that&apos;s off? Let us know — it goes straight to the team.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Your feedback
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="A gig we missed, a source to add, a bug, an idea…"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="gigUrl" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Link to the gig <span className="font-normal text-zinc-400">(optional)</span>
                </label>
                <input
                  id="gigUrl"
                  type="url"
                  value={gigUrl}
                  onChange={(e) => setGigUrl(e.target.value)}
                  placeholder="https://…"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Your email <span className="font-normal text-zinc-400">(optional, if you&apos;d like a reply)</span>
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {status === "error" && (
                <div className="text-sm text-red-600 dark:text-red-400">
                  Something went wrong — {error || "please try again"}. You can also email{" "}
                  <a href="mailto:gigdocksupport@gmail.com" className="underline">gigdocksupport@gmail.com</a>.
                </div>
              )}

              <button
                type="submit"
                disabled={status === "sending" || !message.trim()}
                className="w-full px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm"
              >
                {status === "sending" ? "Sending…" : "Send feedback"}
              </button>
            </form>
          </>
        )}
      </div>
    </PublicShell>
  );
}
