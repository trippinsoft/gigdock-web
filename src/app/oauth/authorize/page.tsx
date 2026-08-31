// OAuth consent screen. An MCP client (Claude, ChatGPT, …) sends the user
// here; we require a signed-in GigDock session (bouncing through /login?next=
// like every other gated page), validate the client + PKCE parameters, and on
// Approve issue a one-time authorization code back to the client's
// redirect_uri. Read-only scope in this slice.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/supabase-server";
import { createSupabaseAnon } from "@/lib/oauth";

export const metadata: Metadata = {
  title: "Connect to GigDock",
  robots: { index: false, follow: false },
};

type Search = { [key: string]: string | string[] | undefined };

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 text-center">
        <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Can&rsquo;t connect</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{message}</p>
      </div>
    </div>
  );
}

export default async function AuthorizePage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const clientId = first(sp.client_id);
  const redirectUri = first(sp.redirect_uri);
  const responseType = first(sp.response_type) || "code";
  const state = first(sp.state);
  const codeChallenge = first(sp.code_challenge);
  const codeChallengeMethod = first(sp.code_challenge_method) || "S256";
  const scope = first(sp.scope) || "read";

  // Require a signed-in user first — same gate as the rest of the app.
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const here = `/oauth/authorize?${new URLSearchParams(
      Object.entries(sp).map(([k, v]) => [k, first(v)])
    ).toString()}`;
    redirect(`/login?next=${encodeURIComponent(here)}`);
  }

  // Validate the request. Per spec: an invalid client or redirect_uri must
  // render an error, never redirect.
  if (!clientId || !redirectUri) return <ErrorCard message="This connection link is missing its client or redirect address." />;
  const anon = createSupabaseAnon();
  const { data: info } = await anon.rpc("oauth_client_info", { p_client_id: clientId });
  const client = info as { client_name: string; redirect_uris: string[] } | null;
  if (!client) return <ErrorCard message="Unknown app. Ask the app to re-register with GigDock." />;
  if (!client.redirect_uris.includes(redirectUri)) {
    return <ErrorCard message="The app's redirect address doesn't match its registration." />;
  }
  if (responseType !== "code" || codeChallengeMethod !== "S256" || !codeChallenge) {
    const u = new URL(redirectUri);
    u.searchParams.set("error", responseType !== "code" ? "unsupported_response_type" : "invalid_request");
    if (state) u.searchParams.set("state", state);
    redirect(u.toString());
  }

  async function decide(formData: FormData) {
    "use server";
    const approved = formData.get("decision") === "approve";
    const u = new URL(redirectUri);
    if (state) u.searchParams.set("state", state);
    if (!approved) {
      u.searchParams.set("error", "access_denied");
      redirect(u.toString());
    }
    const supabase = await createSupabaseServer();
    const { data, error } = await supabase.rpc("oauth_issue_code", {
      p_client_id: clientId,
      p_redirect_uri: redirectUri,
      p_code_challenge: codeChallenge,
      p_scope: scope,
    });
    if (error || typeof data !== "string") {
      u.searchParams.set("error", "server_error");
      redirect(u.toString());
    }
    u.searchParams.set("code", data as string);
    redirect(u.toString());
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6">
        <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 text-center">
          Connect {client.client_name} to GigDock
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400 text-center">
          Signed in as <span className="font-medium text-zinc-900 dark:text-zinc-100">{user!.email}</span>
        </p>

        <div className="mt-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 p-4">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {client.client_name} will be able to read:
          </p>
          <ul className="mt-2 space-y-1 text-sm text-zinc-600 dark:text-zinc-400 list-disc pl-5">
            <li>Your earnings and payment totals</li>
            <li>Your gigs, work dates and amounts</li>
            <li>What&rsquo;s still outstanding</li>
          </ul>
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Read-only. It can&rsquo;t change anything, and you can disconnect it any time from Settings.
          </p>
        </div>

        <form action={decide} className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="submit"
            name="decision"
            value="deny"
            className="py-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800"
          >
            Deny
          </button>
          <button
            type="submit"
            name="decision"
            value="approve"
            className="py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold"
          >
            Approve
          </button>
        </form>
      </div>
    </div>
  );
}
