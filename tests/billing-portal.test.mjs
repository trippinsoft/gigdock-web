// Settings → Plan → Manage subscription → /account/billing → Stripe portal.
// Exercises the real helper through the real supabase-js client against a
// fake PostgREST `entitlements` endpoint, with a recording fake Stripe.

import assert from "node:assert/strict";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { createBillingPortalSession } from "../src/lib/billing-portal.server.ts";

const ME = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const OTHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const FUTURE = "2027-10-13T02:13:28+00:00";
const RETURN_URL = "https://preview.example/settings";

const myStripeRow = {
  user_id: ME, product: "pro", provider: "stripe", status: "active",
  current_period_end: FUTURE, updated_at: "2026-10-13T02:13:30Z",
  external_ref: "sub_mine",
  metadata: { stripe_customer_id: "cus_mine", stripe_subscription_id: "sub_mine" },
};

function supabaseOver(rows, { failWith } = {}) {
  const seen = [];
  const fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    seen.push(url);
    assert.equal(url.pathname, "/rest/v1/entitlements");
    if (failWith) {
      return new Response(JSON.stringify(failWith), { status: 500, headers: { "content-type": "application/json" } });
    }
    const p = url.searchParams;
    const inList = (k) => p.get(k)?.replace(/^in\.\(|\)$/g, "").split(",");
    const out = rows
      .filter((r) => r.user_id === p.get("user_id")?.replace(/^eq\./, ""))
      .filter((r) => inList("product").includes(r.product))
      .filter((r) => inList("provider").includes(r.provider))
      .filter((r) => inList("status").includes(r.status))
      .filter((r) => r.current_period_end === null || new Date(r.current_period_end) > new Date())
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, Number(p.get("limit") ?? 1000))
      .map(({ external_ref, metadata }) => ({ external_ref, metadata }));
    return new Response(JSON.stringify(out), { status: 200, headers: { "content-type": "application/json" } });
  };
  const client = createClient("https://example.supabase.co", "anon", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch },
  });
  return { client, seen };
}

function fakeStripe(subscriptions, { portalError, subscriptionError } = {}) {
  const calls = [];
  const stripe = async (method, endpoint, body) => {
    calls.push({ method, endpoint, body: body ? Object.fromEntries(body) : undefined });
    if (method === "GET" && endpoint.startsWith("subscriptions/")) {
      if (subscriptionError) throw new Error(subscriptionError);
      const sub = subscriptions[decodeURIComponent(endpoint.slice("subscriptions/".length))];
      if (!sub) throw new Error("No such subscription");
      return sub;
    }
    if (method === "POST" && endpoint === "billing_portal/sessions") {
      if (portalError) throw new Error(portalError);
      return { url: `https://billing.stripe.com/p/session/test_${body.get("customer")}` };
    }
    throw new Error(`unexpected ${method} ${endpoint}`);
  };
  return { stripe, calls };
}

const mySubscription = { id: "sub_mine", customer: "cus_mine", metadata: { supabase_user_id: ME, product: "pro" } };

test("opens the portal for the signed-in user's own Stripe customer and returns to Settings", async () => {
  const { client, seen } = supabaseOver([myStripeRow]);
  const { stripe, calls } = fakeStripe({ sub_mine: mySubscription });
  const result = await createBillingPortalSession({ supabase: client, userId: ME, returnUrl: RETURN_URL, stripe });
  assert.deepEqual(result, { ok: true, url: "https://billing.stripe.com/p/session/test_cus_mine" });
  assert.deepEqual(calls, [
    { method: "GET", endpoint: "subscriptions/sub_mine", body: undefined },
    { method: "POST", endpoint: "billing_portal/sessions", body: { customer: "cus_mine", return_url: RETURN_URL } },
  ]);
  assert.equal(seen[0].searchParams.get("user_id"), `eq.${ME}`);
});

test("uses the customer Stripe reports (expanded object form too)", async () => {
  const { client } = supabaseOver([{ ...myStripeRow, metadata: {} }]);
  const { stripe, calls } = fakeStripe({ sub_mine: { ...mySubscription, customer: { id: "cus_mine" } } });
  const result = await createBillingPortalSession({ supabase: client, userId: ME, returnUrl: RETURN_URL, stripe });
  assert.equal(result.ok, true);
  assert.equal(calls[1].body.customer, "cus_mine");
});

test("another user's subscription is refused before any portal session is created", async () => {
  // Row says sub_theirs, but Stripe says that subscription belongs to OTHER.
  const { client } = supabaseOver([{ ...myStripeRow, external_ref: "sub_theirs", metadata: {} }]);
  const { stripe, calls } = fakeStripe({
    sub_theirs: { id: "sub_theirs", customer: "cus_theirs", metadata: { supabase_user_id: OTHER, product: "pro" } },
  });
  const result = await createBillingPortalSession({ supabase: client, userId: ME, returnUrl: RETURN_URL, stripe });
  assert.deepEqual(result, { ok: false, reason: "not_owner" });
  assert.equal(calls.some((c) => c.endpoint === "billing_portal/sessions"), false);
});

test("a recorded customer that disagrees with Stripe is refused", async () => {
  const { client } = supabaseOver([{ ...myStripeRow, metadata: { stripe_customer_id: "cus_someone_else" } }]);
  const { stripe, calls } = fakeStripe({ sub_mine: mySubscription });
  const result = await createBillingPortalSession({ supabase: client, userId: ME, returnUrl: RETURN_URL, stripe });
  assert.deepEqual(result, { ok: false, reason: "not_owner" });
  assert.equal(calls.length, 1);
});

test("other users' rows are never considered", async () => {
  const { client } = supabaseOver([{ ...myStripeRow, user_id: OTHER }]);
  const { stripe, calls } = fakeStripe({ sub_mine: mySubscription });
  const result = await createBillingPortalSession({ supabase: client, userId: ME, returnUrl: RETURN_URL, stripe });
  assert.deepEqual(result, { ok: false, reason: "no_subscription" });
  assert.equal(calls.length, 0);
});

test("missing Stripe subscription/customer records: no Stripe calls, clear reason", async () => {
  for (const rows of [
    [],
    [{ ...myStripeRow, external_ref: null }],
    [{ ...myStripeRow, external_ref: "cs_test_checkout_session" }],
    [{ ...myStripeRow, provider: "beta", external_ref: "sub_mine" }],
    [{ ...myStripeRow, status: "cancelled" }],
    [{ ...myStripeRow, current_period_end: "2020-01-01T00:00:00Z" }],
  ]) {
    const { client } = supabaseOver(rows);
    const { stripe, calls } = fakeStripe({ sub_mine: mySubscription });
    const result = await createBillingPortalSession({ supabase: client, userId: ME, returnUrl: RETURN_URL, stripe });
    assert.deepEqual(result, { ok: false, reason: "no_subscription" }, JSON.stringify(rows));
    assert.equal(calls.length, 0);
  }
});

test("a canceling (still active) subscription can reopen the portal to resume", async () => {
  const { client } = supabaseOver([{ ...myStripeRow }]);
  const { stripe } = fakeStripe({ sub_mine: mySubscription });
  const result = await createBillingPortalSession({ supabase: client, userId: ME, returnUrl: RETURN_URL, stripe });
  assert.equal(result.ok, true);
});

test("Stripe subscription lookup failure → portal_unavailable", async () => {
  const { client } = supabaseOver([myStripeRow]);
  const { stripe } = fakeStripe({}, { subscriptionError: "No such subscription: 'sub_mine'" });
  const result = await createBillingPortalSession({ supabase: client, userId: ME, returnUrl: RETURN_URL, stripe });
  assert.deepEqual(result, { ok: false, reason: "portal_unavailable" });
});

test("unconfigured Customer Portal → portal_unavailable", async () => {
  const { client } = supabaseOver([myStripeRow]);
  const { stripe } = fakeStripe(
    { sub_mine: mySubscription },
    { portalError: "No configuration provided and your test mode default configuration has not been created." }
  );
  const result = await createBillingPortalSession({ supabase: client, userId: ME, returnUrl: RETURN_URL, stripe });
  assert.deepEqual(result, { ok: false, reason: "portal_unavailable" });
});

test("database errors propagate to the route's error handler", async () => {
  const { client } = supabaseOver([], { failWith: { code: "XX000", message: "boom" } });
  const { stripe } = fakeStripe({});
  await assert.rejects(
    createBillingPortalSession({ supabase: client, userId: ME, returnUrl: RETURN_URL, stripe }),
    (e) => e.code === "XX000"
  );
});
