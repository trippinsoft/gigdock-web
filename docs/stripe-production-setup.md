# GigDock Pro — Stripe production configuration

This branch makes checkout, Customer Portal and subscription webhooks work with separate Stripe environments. **Do not insert API keys or webhook secrets in GitHub files.**

## Production Vercel environment

Configure these as **Production-only** variables in Vercel. Do not copy the preview values.

| Variable | Required value |
|---|---|
| `STRIPE_SECRET_KEY` | Stripe **live** secret key, starts `sk_live_` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the **live** production webhook endpoint, starts `whsec_` |
| `STRIPE_PRICE_PRO_FOUNDING_ANNUAL` | ID of live **$49/year** price |
| `STRIPE_PRICE_PRO_ANNUAL` | ID of live **$99/year** price |
| `STRIPE_PRICE_PRO_MONTHLY` | ID of live **$9.99/month** price |
| `GIGDOCK_FOUNDING_OFFER_ENDS_AT` | Explicit ISO-8601 launch deadline; missing/invalid value closes founding pricing |
| `STRIPE_BILLING_ENABLED` | Initially **unset or false**. Set exactly `true` only once all production configuration and rollout checks are approved |
| `NEXT_PUBLIC_SUPABASE_URL` | Correct production RolePay Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Correct production RolePay service role key (server secret) |

Do not set live Stripe credentials in Preview. Do not set test keys in Production. This code rejects cross-environment keys.

## Preview Vercel environment

Keep the already configured `sk_test_` Stripe credentials, test Price IDs, and sandbox webhook secret as Preview-only variables. Preview does **not** require `STRIPE_BILLING_ENABLED`.

## Stripe dashboard live-mode setup

1. Create/verify the three recurring prices above. Confirm that the **$49 founding price renews at $49**, rather than escalating automatically.
2. Configure the live Customer Portal to permit cancel-at-period-end and cancellation reversal.
3. Add a **live** webhook destination for `https://<production-host>/api/stripe/webhook`, subscribing to `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Paste its unique signing secret into Production Vercel variables.
4. Confirm retry/dunning settings are consistent with the app's three-day grace period and required customer notifications.
5. Verify that production RolePay/Supabase entitlements and RLS checks are configured and that any existing ExtraJobs Alerts subscriptions belong to the **same Stripe live account**. An Alerts sandbox subscription cannot be migrated by treating its ID as live.
6. Redeploy production with the live variables and `STRIPE_BILLING_ENABLED` unset. Verify billing requests remain disabled.
7. After final review and approval, set `STRIPE_BILLING_ENABLED=true` and redeploy. Make a controlled real-money purchase; check Stripe invoice, RolePay entitlement, web Settings and Customer Portal before broad rollout.

## Code behavior

- `getStripeKey()` fails closed on local/non-Vercel environments, mismatched test/live key prefixes, or production without the explicit enable flag.
- Checkout, portal and webhook use the same Stripe environment selector.
- The production webhook verifies the live destination signature and refetches the subscription using the same account's live credentials.
- The annual ExtraJobs upgrade discount is minted as a Stripe one-use $30 coupon for an eligible annual subscription.
- The three-day payment grace computation lives in `src/lib/stripe-payment-grace.ts`. Its live renewal and term-end transitions still require integration-level verification before opening access to all customers.

## Deployment limitations

PR #11 is a draft stacked on another preview branch. Resolve mergeability and review its parent branch before merging; a successful preview build is not a production release. Never paste secret values into PR comments or logs.
