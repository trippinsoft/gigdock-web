<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Subscriptions & entitlements

Web reads the production Supabase `entitlements` table directly under RLS with the same rules mobile uses (`utils/useEntitlement.js`). Do not add a web-specific RPC or a second entitlement contract — see `docs/entitlements-schema.md` for the shared schema, current-entitlement rules, provider normalization, and where `/account/billing` and the Apple/Google portals slot in.
