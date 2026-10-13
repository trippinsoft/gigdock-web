import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getPreviewStripeKey, stripeRequest } from "@/lib/stripe-preview.server";
import { createBillingPortalSession } from "@/lib/billing-portal.server";

// GET /account/billing — Settings → Plan "Manage subscription" / "Keep
// GigDock Pro" for Stripe (web) subscribers. Opens a Stripe Customer Portal
// session for the signed-in user's own subscription and redirects there;
// the portal returns to /settings. Failures land back on /settings with a
// ?billing=<reason> notice. Cancel/resume happen in the portal and sync back
// through the webhook — this route never writes entitlements.

export const dynamic = "force-dynamic";

function back(origin: string, path: string) {
  const res = NextResponse.redirect(new URL(path, origin), 303);
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;

  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return back(origin, "/login?next=%2Faccount%2Fbilling");

  try {
    getPreviewStripeKey();
  } catch {
    return back(origin, "/settings?billing=portal_unavailable");
  }

  try {
    const result = await createBillingPortalSession({
      supabase,
      userId: user.id,
      returnUrl: `${origin}/settings`,
      stripe: (method, endpoint, body) => stripeRequest(method, endpoint, body),
    });
    if (!result.ok) return back(origin, `/settings?billing=${result.reason}`);
    const res = NextResponse.redirect(result.url, 303);
    res.headers.set("Cache-Control", "no-store");
    return res;
  } catch (e) {
    console.error("[billing] portal handoff failed", e);
    return back(origin, "/settings?billing=portal_unavailable");
  }
}
