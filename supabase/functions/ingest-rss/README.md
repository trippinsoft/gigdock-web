# ingest-rss roles patch

`ingest-rss` still writes one opportunity per source post. It does **not**
need a rewrite for role counts: Haiku already puts named lists in
`requirements`, and `public.ensure_opportunity_roles()` splits those into
`opportunities.roles` on insert.

To have the model emit `roles[]` directly (better per-role `casting_specs`):

1. Download the current function source.
2. Run `python3 scripts/patch-ingest-rss.py path/to/index.ts`
3. Deploy that file as `ingest-rss` (keep `verify_jwt: true`).

The patch only adds `normalizeRoles`, a prompt/schema `roles` field, and
persists `roles` on insert. Dedup still uses `role_key` + `production_name`.
