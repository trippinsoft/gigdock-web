// GigDock as OAuth 2.1 authorization server for the MCP endpoint.
// Server-side helpers shared by the /.well-known, /api/oauth and
// /oauth/authorize surfaces. The heavy lifting (client registry, PKCE
// verification, token issue/rotation) lives in Postgres RPCs — see
// sql/mcp-oauth.sql. Route handlers call them with the anon key: the code,
// verifier or refresh token in the request body is the credential.

import { createClient } from "@supabase/supabase-js";

export const OAUTH_ISSUER = "https://www.gigdock.co";
export const MCP_RESOURCE = "https://www.gigdock.co/mcp";

/** Stateless anon client for OAuth RPCs (no cookies, no session). */
export function createSupabaseAnon() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export const OAUTH_CORS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, GET, OPTIONS",
  "access-control-allow-headers": "content-type, authorization, mcp-protocol-version",
};

export function oauthJson(
  status: number,
  payload: unknown,
  extra: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json",
      "cache-control": "no-store",
      ...OAUTH_CORS,
      ...extra,
    },
  });
}

/** Accepts JSON or application/x-www-form-urlencoded bodies (RFC 6749 uses the latter). */
export async function readOauthBody(req: Request): Promise<Record<string, string>> {
  const type = req.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(body).map(([k, v]) => [k, typeof v === "string" ? v : String(v ?? "")])
    );
  }
  const text = await req.text().catch(() => "");
  return Object.fromEntries(new URLSearchParams(text));
}
