import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getPreviewStripeKey } from "@/lib/stripe-preview.server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Subscription = {
  id: string; customer: string; status: string; metadata?: Record<string,string>;
  items: { data: Array<{ price: { id: string; recurring?: { interval: string } }; current_period_end?: number }> };
  cancel_at_period_end: boolean; canceled_at: number | null;
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
  const subscription = event.data.object;
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
  const { error } = await db.from("entitlements").upsert({
    user_id: subscription.metadata.supabase_user_id, product:"pro",provider:"stripe",
    status:subscription.status === 'active' || subscription.status === 'trialing' ? subscription.status : subscription.status === 'canceled' ? 'cancelled' : 'expired', price_id:item.price.id,
    plan_interval:item.price.recurring?.interval === "year" ? "year" : "month",
    current_period_end:item.current_period_end ? new Date(item.current_period_end*1000).toISOString():null,
    cancel_at_period_end:subscription.cancel_at_period_end,
    canceled_at:subscription.canceled_at ? new Date(subscription.canceled_at*1000).toISOString():null,
    metadata:{stripe_subscription_id:subscription.id,stripe_customer_id:subscription.customer,tier:subscription.metadata.tier,
      price_label:subscription.metadata.tier === "founding" ? "$49/year · Founding member" : item.price.recurring?.interval === "year" ? "$99/year" : "$9.99/month"},
    external_ref:subscription.id,
    updated_at:new Date().toISOString(),
  },{onConflict:"external_ref"});
  if(error){console.error("Entitlement sync failed",error);return NextResponse.json({error:"Entitlement sync failed"},{status:500});}
  return NextResponse.json({received:true});
}
