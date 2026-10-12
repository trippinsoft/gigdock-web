import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAnnualProOfferForCheckout } from "@/lib/founding-offer.server";
import { getPreviewStripeKey, proPriceId, stripeRequest } from "@/lib/stripe-preview.server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    getPreviewStripeKey();
    const supabase = await createSupabaseServer();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user?.id || !user.email) return NextResponse.json({ error: "Sign in to subscribe." }, { status: 401 });
    const body: unknown = await request.json();
    const tier = typeof body === "object" && body !== null && "tier" in body ? (body as { tier?: unknown }).tier : null;
    if (tier !== "monthly" && tier !== "annual") return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
    const { data: entitlement, error: entitlementError } = await supabase.from("entitlements")
      .select("id,provider").in("product", ["pro", "premium"]).in("status", ["active", "trialing"])
      .or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`).limit(1);
    if (entitlementError) throw entitlementError;
    if (entitlement?.some(row => !["beta", "admin", "promo", "partner"].includes(row.provider ?? ""))) return NextResponse.json({ error: "Pro is already active." }, { status: 409 });
    // Beta grants do not block sandbox checkout; paid subscriptions do.
    const founding = tier === "annual" && getAnnualProOfferForCheckout().founding;
    const price = proPriceId(tier, founding);
    const origin = new URL(request.url).origin;
    const params = new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": price,
      "line_items[0][quantity]": "1",
      customer_email: user.email,
      client_reference_id: user.id,
      "metadata[supabase_user_id]": user.id,
      "metadata[product]": "pro",
      "subscription_data[metadata][supabase_user_id]": user.id,
      "subscription_data[metadata][product]": "pro",
      "subscription_data[metadata][tier]": founding ? "founding" : tier,
      success_url: origin + "/pro?checkout=success",
      cancel_url: origin + "/pro?checkout=cancel",
    });
    const session = await stripeRequest<{ url: string }>("POST", "checkout/sessions", params, `gigdock-pro-${user.id}-${tier}-${Math.floor(Date.now()/60000)}`);
    if (!session.url) throw new Error("Missing checkout URL");
    return NextResponse.json({ url: session.url }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Sandbox checkout unavailable", error);
    return NextResponse.json({ error: "Checkout unavailable. Check sandbox configuration." }, { status: 503 });
  }
}
