import type { Metadata } from "next";
import { getSessionUser } from "@/lib/backoffice";
import { getSubscription } from "@/lib/subscription";
import SettingsPanel from "@/components/app/SettingsPanel";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string }>;
}) {
  const [user, subscription, sp] = await Promise.all([getSessionUser(), getSubscription(), searchParams]);
  return (
    <SettingsPanel
      email={user?.email ?? null}
      subscription={subscription}
      billingNotice={typeof sp.billing === "string" ? sp.billing : null}
    />
  );
}
