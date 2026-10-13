import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPreviewStripeKey } from "@/lib/stripe-preview.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Subscription = {
  id: string; customer: string; status: string; metadata?: Record<string,string>;
  items: { data: Array<{ price: { id: string; recurring?: { interval: string } }; current_period_end?: number }> };
  cancel_at_period_end: boolean; canceled_at: number | null; start_date?: number;
};

export async function POST(request: NextRequest) {
  try { getPreviewStripeKey(); } catch { return NextResponse.json({ error: "Preview sandbox only" }, { status: 503 }); }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret?.startsWith("whsec_")) return NextResponse.json({ error: "Signing secret missing" }, { status: 503 });
  const signature = request.headers.get("stripe-signature") || "";
  const timestamp = signature.split(",").find(x => x.startsWith("t="))?.slice(2);
  const signatures = signature.split(",").filter(x => x.startsWith("v1=")).map(x => x.slice(3));
  const raw = await request.text();
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(Date.now()/1000 - Number(timestamp)) > 300) {
    return NextResponse.json({ error: "Invalid timestamp" }, { status: 400 });
  }
  const expected = createHmac("sha256", secret).update(timestamp + "." + raw).digest("hex");
  const valid = signatures.some(s => /^[a-f0-9]{64}$/i.test(s) && timingSafeEqual(Buffer.from(s,"hex"),Buffer.from(expected,"hex")));
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  let event: { type: string; data: { object: Subscription } };
  try { event = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"].includes(event.type)) return NextResponse.json({ received: true });
  let subscription = event.data.object;
  // Stripe can deliver older created/updated events after newer ones.
  // Re-fetch current state before writing; deleted events use their final snapshot.
  if (event.type !== "customer.subscription.deleted") {
    try {
      const key = getPreviewStripeKey();
      const response = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(subscription.id)}`, {
        headers: { Authorization: `Bearer ${key}` }, cache: "no-store",
      });
      if (!response.ok) return NextResponse.json({ error: "Subscription refresh failed" }, { status: 502 });
      subscription = await response.json() as Subscription;
    } catch { return NextResponse.json({ error: "Subscription refresh failed" }, { status: 502 }); }
  }
  if (subscription.metadata?.product !== "pro" || !subscription.metadata.supabase_user_id) return NextResponse.json({ received: true });
  const item = subscription.items?.data?.[0];
  if (!item?.price?.id) return NextResponse.json({ error: "Price missing" }, { status: 400 });
  if (![process.env.STRIPE_PRICE_PRO_FOUNDING_ANNUAL,process.env.STRIPE_PRICE_PRO_ANNUAL,process.env.STRIPE_PRICE_PRO_MONTHLY].includes(item.price.id)) {
    return NextResponse.json({ error: "Unrecognized price" }, { status: 400 });
  }
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!key || !url) return NextResponse.json({ error: "Entitlement writer not configured" }, { status: 503 });
  const db = createClient(url,key,{auth:{persistSession:false}});
  const record = {
    user_id: subscription.metadata.supabase_user_id, product:"pro",provider:"stripe",
    status:subscription.status === "active" || subscription.status === "trialing" ? subscription.status : subscription.status === "canceled" ? "cancelled" : "expired", price_id:item.price.id,
    plan_interval:item.price.recurring?.interval === "year" ? "year" : "month",
    current_period_end:item.current_period_end ? new Date(item.current_period_end*1000).toISOString():null,
    cancel_at_period_end:subscription.cancel_at_period_end,
    canceled_at:subscription.canceled_at ? new Date(subscription.canceled_at*1000).toISOString():null,
    metadata:{stripe_subscription_id:subscription.id,stripe_customer_id:subscription.customer,tier:subscription.metadata.tier,
      price_label:subscription.metadata.tier === "founding" ? "$49/year · Founding member" : item.price.recurring?.interval === "year" ? "$99/year" : "$9.99/month"},
    external_ref:subscription.id,
    started_at: subscription.start_date ? new Date(subscription.start_date * 1000).toISOString() : null,
    updated_at:new Date().toISOString(),
  };
  const { data: existing, error: lookupError } = await db.from("entitlements")
    .select("id").eq("external_ref", subscription.id).maybeSingle();
  if (lookupError) return NextResponse.json({ error: "Entitlement lookup failed" }, { status: 500 });
  const result = existing?.id
    ? await db.from("entitlements").update(record).eq("id", existing.id)
    : await db.from("entitlements").insert(record);
  if (result.error) {
    console.error("Entitlement sync failed", result.error);
    return NextResponse.json({ error: "Entitlement sync failed" }, { status: 500 });
  }
  // Once the new Pro subscription is active, end the old annual Alerts
  // subscription. The ExtraJobs webhook remains authoritative for its row.
  const oldAlertsId = subscription.metadata?.alerts_upgrade_subscription_id;
  if (subscription.status === "active" && oldAlertsId?.startsWith("sub_")) {
    const { data: alertsRow, error: alertsError } = await db.from("entitlements")
      .select("id").eq("user_id", subscription.metadata.supabase_user_id)
      .eq("product", "extrajobs_alerts").eq("external_ref", oldAlertsId)
      .eq("status", "active").maybeSingle();
    if (alertsError) return NextResponse.json({ error: "Alerts verification failed" }, { status: 500 });
    if (alertsRow) {
      const key = getPreviewStripeKey();
      const canceled = await fetch(`https://api.stripe.com/v1/subscriptions/${encodeURIComponent(oldAlertsId)}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${key}` }, cache: "no-store",
      });
      if (!canceled.ok) {
        console.error("Alerts cancellation failed", canceled.status);
        return NextResponse.json({ error: "Alerts cancellation failed" }, { status: 500 });
      }
    }
  }
  return NextResponse.json({received:true});
}
