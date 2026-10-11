import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";
import { getPreviewStripe } from "@/lib/stripe-preview.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  let stripe: Stripe;
  try { stripe = getPreviewStripe(); }
  catch { return NextResponse.json({ error: "Sandbox only" }, { status: 503 }); }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) return NextResponse.json({ error: "Webhook secret missing" }, { status: 503 });
  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Signature missing" }, { status: 400 });
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, secret); }
  catch { return NextResponse.json({ error: "Invalid signature" }, { status: 400 }); }

  // Never acknowledge subscription mutations unless the entitlement writer is configured.
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey || !process.env.NEXT_PUBLIC_SUPABASE_URL) return NextResponse.json({ error: "Entitlement writer unavailable" }, { status: 503 });
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, serviceKey, { auth: { persistSession: false } });

  if (!["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
    return NextResponse.json({ received: true });
  }
  const subscription = event.data.object as Stripe.Subscription;
  if (subscription.metadata?.product !== "pro" || !subscription.metadata.supabase_user_id) {
    return NextResponse.json({ received: true });
  }
  const item = subscription.items.data[0];
  const priceId = item?.price?.id;
  if (!priceId) return NextResponse.json({ error: "Missing subscription price" }, { status: 400 });
  const allowed = [process.env.STRIPE_PRICE_PRO_FOUNDING_ANNUAL, process.env.STRIPE_PRICE_PRO_ANNUAL, process.env.STRIPE_PRICE_PRO_MONTHLY];
  if (!allowed.includes(priceId)) return NextResponse.json({ error: "Unknown Pro price" }, { status: 400 });
  const periodEnd = item.current_period_end ? new Date(item.current_period_end * 1000).toISOString() : null;
  const { error } = await db.from("entitlements").upsert({
    user_id: subscription.metadata.supabase_user_id,
    product: "pro",
    provider: "stripe",
    status: subscription.status,
    price_id: priceId,
    plan_interval: item.price.recurring?.interval === "year" ? "annual" : "monthly",
    current_period_end: periodEnd,
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    metadata: {
      stripe_subscription_id: subscription.id,
      stripe_customer_id: String(subscription.customer),
      tier: subscription.metadata.tier,
      price_label: subscription.metadata.tier === "founding" ? "$49/year · Founding member" : item.price.recurring?.interval === "year" ? "$99/year" : "$9.99/month",
    },
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,product" });
  if (error) {
    console.error("Stripe entitlement upsert failed", error);
    return NextResponse.json({ error: "Entitlement sync failed" }, { status: 500 });
  }
  return NextResponse.json({ received: true });
}
