// Dynamic Client Registration (RFC 7591). ChatGPT requires this; Claude
// supports it. Public clients only — no secret is issued (PKCE protects the
// code exchange).
import { createSupabaseAnon, oauthJson } from "@/lib/oauth";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    client_name?: unknown;
    redirect_uris?: unknown;
  };
  const name = typeof body.client_name === "string" ? body.client_name : "MCP client";
  const uris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u): u is string => typeof u === "string")
    : [];

  const supabase = createSupabaseAnon();
  const { data, error } = await supabase.rpc("oauth_register_client", {
    p_client_name: name,
    p_redirect_uris: uris,
  });
  if (error) {
    const invalid = error.message.includes("invalid_redirect_uris");
    return oauthJson(400, {
      error: invalid ? "invalid_redirect_uri" : "invalid_client_metadata",
      error_description: invalid
        ? "redirect_uris must be 1-10 https:// (or localhost) URLs"
        : error.message,
    });
  }
  const row = data as { client_id: string; client_name: string; redirect_uris: string[] };
  return oauthJson(201, {
    client_id: row.client_id,
    client_id_issued_at: Math.floor(Date.now() / 1000),
    client_name: row.client_name,
    redirect_uris: row.redirect_uris,
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "refresh_token"],
    response_types: ["code"],
  });
}

export function OPTIONS() {
  return oauthJson(204, null);
}
