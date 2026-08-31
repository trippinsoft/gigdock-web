// OAuth 2.1 authorization-server metadata (RFC 8414). MCP clients fetch this
// after a 401 from /mcp to learn how to register and where to send the user.
import { OAUTH_ISSUER, oauthJson } from "@/lib/oauth";

export function GET() {
  return oauthJson(200, {
    issuer: OAUTH_ISSUER,
    authorization_endpoint: `${OAUTH_ISSUER}/oauth/authorize`,
    token_endpoint: `${OAUTH_ISSUER}/api/oauth/token`,
    registration_endpoint: `${OAUTH_ISSUER}/api/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
    scopes_supported: ["read"],
  });
}

export function OPTIONS() {
  return oauthJson(204, null);
}
