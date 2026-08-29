import type { Metadata } from "next";
import { getSessionUser, getPlan } from "@/lib/backoffice";
import SettingsPanel from "@/components/app/SettingsPanel";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export default async function SettingsPage() {
  const user = await getSessionUser();
  const plan = await getPlan();
  return <SettingsPanel email={user?.email ?? null} plan={plan} />;
}
