import { NextResponse } from "next/server";
import { getAnnualProOfferForCheckout, getFoundingOfferEndsAt } from "@/lib/founding-offer.server";

export const dynamic = "force-dynamic";

/**
 * Public display quote only. Checkout must independently re-check the offer
 * deadline on the server and authenticate the purchaser.
 * Never accept a client-supplied founding flag or price.
 */
export async function GET() {
  const offer = getAnnualProOfferForCheckout();
  return NextResponse.json(
    {
      foundingActive: offer.founding,
      foundingEndsAt: getFoundingOfferEndsAt()?.toISOString() ?? null,
      annualProPriceCents: offer.annualPriceCents,
      annualAlertsUpgradeChargeCents: offer.annualAlertsUpgradeChargeCents,
      annualRenewalPriceCents: offer.annualRenewalPriceCents,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
