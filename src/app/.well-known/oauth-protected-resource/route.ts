// Protected-resource metadata (RFC 9728) for the MCP endpoint.
import { MCP_RESOURCE, OAUTH_ISSUER, oauthJson } from "@/lib/oauth";

export function GET() {
  return oauthJson(200, {
    resource: MCP_RESOURCE,
    authorization_servers: [OAUTH_ISSUER],
    scopes_supported: ["read"],
    bearer_methods_supported: ["header"],
  });
}

export function OPTIONS() {
  return oauthJson(204, null);
}
