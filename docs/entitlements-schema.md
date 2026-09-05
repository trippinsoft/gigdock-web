# Entitlements & subscription state (shared with mobile)

The web app and the Draftbit mobile app read the same production Supabase
`entitlements` table with the same current-entitlement rules. This file is
the reference for both — keep it in lockstep with mobile's
`utils/useEntitlement.js`.

## Schema (production)

Migration: `20260905033219_entitlements_subscription_management_fields`

```
entitlements (
  id                    uuid primary key,
  user_id               uuid,
  product               text,        -- 'pro' (live) or legacy 'premium'
  provider              text,        -- billing source (see below)
  status                text,        -- 'active' | 'trialing' | 'canceled' | …
  current_period_end    timestamptz, -- paid-through / access expiry (null = evergreen)
  external_ref          text,
  metadata              jsonb,
  created_at            timestamptz,
  updated_at            timestamptz,
  cancel_at_period_end  boolean,     -- true = renewal off, Pro through period_end
  canceled_at           timestamptz,
  price_id              text,
  plan_interval         text,        -- 'monthly' | 'annual' | 'founding' | …
  started_at            timestamptz
)
```

RLS: authenticated users may `select` only their own rows (`user_id = auth.uid()`).
No web-specific RPC — both apps read the table directly.

The web app must select this exact column set so both surfaces stay aligned:

```
id, user_id, product, provider, status, current_period_end,
cancel_at_period_end, canceled_at, price_id, plan_interval, started_at,
metadata, updated_at
```

## Current-entitlement rules (mobile parity)

An entitlement is "current" — grants Pro — when all of these hold:

- `product ∈ ('pro', 'premium')` (legacy `premium` = same product)
- `status ∈ ('active', 'trialing')`
- `current_period_end IS NULL` OR `current_period_end > now()`

Cancel-pending stays `status='active'`; the renewal-off signal is
`cancel_at_period_end = true`, not a `canceled` status. **Never revoke
access merely because renewal was canceled** — the billing webhook is
authoritative and updates `status` / `current_period_end` when access
actually lapses.

## Render states (Settings → Plan)

| State                | Trigger                                                                             |
| -------------------- | ----------------------------------------------------------------------------------- |
| `free`               | No current entitlement.                                                             |
| `active_renewing`    | Current + user-managed provider + `cancel_at_period_end != true`.                    |
| `active_canceling`   | Current + user-managed provider + `cancel_at_period_end = true`.                     |
| `complimentary`      | Provider ∈ {`beta`, `admin`, `partner`, `promo`} (non-recurring, not user-managed). |
| `unmanaged`          | Current, but provider isn't one we recognize; feature access stands, no controls.   |

## Billing sources (provider normalization)

| Canonical | Aliases (case-insensitive)                                                     | User-managed |
| --------- | ------------------------------------------------------------------------------ | ------------ |
| `web`     | `web`, `stripe`                                                                | Yes → `/account/billing` |
| `apple`   | `apple`, `ios`, `app_store`, `appstore`, `itunes`                              | Yes → Apple subscriptions |
| `google`  | `google`, `play`, `play_store`, `playstore`, `google_play`, `android`          | Yes → Google Play subscriptions |
| `partner` | `partner`                                                                      | No |
| `promo`   | `promo`, `promotion`                                                           | No |
| `admin`   | `admin`                                                                        | No |
| `beta`    | `beta`                                                                         | No (complimentary during beta) |
| `unknown` | anything else                                                                  | No (show support fallback) |

Provider portals — not client-side entitlement updates — perform cancel and
resume actions. The web app never mutates `entitlements`.

## Web files

- `src/lib/subscription-types.ts` — client-safe types + provider
  normalization. Import from client components.
- `src/lib/subscription.ts` — server-side `getSubscription()`; reads the
  table via the authenticated Supabase client under RLS.
- `src/components/app/PlanPanel.tsx` — read-only Settings → Plan panel.
- `src/app/(app)/settings/page.tsx` — mounts the panel.

## Notes for future changes

- `beta` provider currently indicates the complimentary beta grant created
  by `sql/beta-pro-entitlements.sql`. Both apps recognize it as
  complimentary. Longer term, migrating those rows to `provider='promo'`
  with `metadata.note='Complimentary during beta'` would consolidate on a
  single canonical value; either provider is treated as complimentary
  today, so the migration can happen without a UI change.
- When a real web billing provider is wired (Stripe expected), build
  `/account/billing` to render / redirect to its customer portal. The
  Plan panel already sends web-managed subscribers there.
