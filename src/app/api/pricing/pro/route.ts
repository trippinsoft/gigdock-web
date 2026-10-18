import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAnnualProOfferForCheckout, getFoundingOfferEndsAt } from "@/lib/founding-offer.server";

export const dynamic = "force-dynamic";

/**
 * Public display quote only. Checkout must independently re-check the offer
 * deadline on the server and authenticate the purchaser.
 * Never accept a client-supplied founding flag or price.
 */
export async function GET() {
  let alertsUpgradeEligible = false;
  try {
    const supabase = await createSupabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const { data, error } = await supabase.from("entitlements")
        .select("id").eq("user_id", user.id)
        .eq("product", "extrajobs_alerts").eq("status", "active")
        .eq("plan_interval", "year")
        .gt("current_period_end", new Date().toISOString()).limit(1);
      if (error) throw error;
      alertsUpgradeEligible = (data?.length ?? 0) > 0;
    }
  } catch (error) {
    console.error("Unable to load Alerts upgrade eligibility", error);
  }
  const offer = getAnnualProOfferForCheckout();
  return NextResponse.json(
    {
      foundingActive: offer.founding,
      alertsUpgradeEligible,
      foundingEndsAt: getFoundingOfferEndsAt()?.toISOString() ?? null,
      annualProPriceCents: offer.annualPriceCents,
      annualAlertsUpgradeChargeCents: offer.annualAlertsUpgradeChargeCents,
      annualRenewalPriceCents: offer.annualRenewalPriceCents,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
