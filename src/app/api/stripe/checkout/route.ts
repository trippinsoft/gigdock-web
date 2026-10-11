import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAnnualProOfferForCheckout } from "@/lib/founding-offer.server";
import { getPreviewStripe, proPriceId } from "@/lib/stripe-preview.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const stripe = getPreviewStripe();
    const supabase = await createSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.id || !user.email) return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });

    const body: unknown = await request.json();
    const tier = typeof body === "object" && body !== null && "tier" in body ? (body as { tier?: unknown }).tier : null;
    if (tier !== "monthly" && tier !== "annual") return NextResponse.json({ error: "Invalid plan." }, { status: 400 });

    // Never create a second Pro subscription for an already entitled account.
    const { data: entitlement, error: entitlementError } = await supabase
      .from("entitlements").select("id")
      .in("product", ["pro", "premium"]).in("status", ["active", "trialing"])
      .or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`)
      .limit(1);
    if (entitlementError) throw entitlementError;
    if (entitlement?.length) return NextResponse.json({ error: "Pro is already active on this account." }, { status: 409 });

    const founding = tier === "annual" && getAnnualProOfferForCheckout().founding;
    const price = proPriceId(tier, founding);
    const origin = new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price, quantity: 1 }],
      customer_email: user.email,
      client_reference_id: user.id,
      metadata: { supabase_user_id: user.id, product: "pro", tier: founding ? "founding" : tier },
      subscription_data: { metadata: { supabase_user_id: user.id, product: "pro", tier: founding ? "founding" : tier } },
      success_url: origin + "/pro?checkout=success",
      cancel_url: origin + "/pro?checkout=cancel",
    }, { idempotencyKey: `pro-checkout-${user.id}-${tier}-${Math.floor(Date.now() / 60000)}` });
    if (!session.url) throw new Error("Checkout URL unavailable");
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Preview checkout error", error);
    return NextResponse.json({ error: "Checkout is unavailable. Verify preview Stripe configuration." }, { status: 503 });
  }
}
