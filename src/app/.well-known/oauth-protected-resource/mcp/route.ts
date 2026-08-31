// Path-suffixed variant of the protected-resource metadata (RFC 9728 §3.1):
// for the resource https://www.gigdock.co/mcp some clients request
// /.well-known/oauth-protected-resource/mcp. Same document either way.
export { GET, OPTIONS } from "../route";
