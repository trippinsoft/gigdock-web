import type { Metadata } from "next";
import { getSessionUser } from "@/lib/backoffice";
import { getSubscription } from "@/lib/subscription";
import SettingsPanel from "@/components/app/SettingsPanel";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const [user, subscription] = await Promise.all([getSessionUser(), getSubscription()]);
  return <SettingsPanel email={user?.email ?? null} subscription={subscription} />;
}
