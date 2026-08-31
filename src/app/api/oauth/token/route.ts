// OAuth 2.1 token endpoint: authorization_code (with PKCE) and rotating
// refresh_token grants. Public clients — the code/verifier or refresh token
// IS the credential; validation happens in the Postgres RPCs.
import { createSupabaseAnon, oauthJson, readOauthBody } from "@/lib/oauth";

export async function POST(req: Request) {
  const body = await readOauthBody(req);
  const grant = body.grant_type ?? "";
  const supabase = createSupabaseAnon();

  if (grant === "authorization_code") {
    const { code, code_verifier, client_id, redirect_uri } = body;
    if (!code || !code_verifier || !client_id || !redirect_uri) {
      return oauthJson(400, { error: "invalid_request", error_description: "code, code_verifier, client_id and redirect_uri are required" });
    }
    const { data, error } = await supabase.rpc("oauth_exchange_code", {
      p_code: code,
      p_code_verifier: code_verifier,
      p_client_id: client_id,
      p_redirect_uri: redirect_uri,
    });
    if (error) return oauthJson(400, { error: "invalid_grant" });
    return oauthJson(200, data);
  }

  if (grant === "refresh_token") {
    const { refresh_token, client_id } = body;
    if (!refresh_token || !client_id) {
      return oauthJson(400, { error: "invalid_request", error_description: "refresh_token and client_id are required" });
    }
    const { data, error } = await supabase.rpc("oauth_refresh_token", {
      p_refresh_token: refresh_token,
      p_client_id: client_id,
    });
    if (error) return oauthJson(400, { error: "invalid_grant" });
    return oauthJson(200, data);
  }

  return oauthJson(400, { error: "unsupported_grant_type" });
}

export function OPTIONS() {
  return oauthJson(204, null);
}
