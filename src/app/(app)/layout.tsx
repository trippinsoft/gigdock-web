import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AppShell from "@/components/AppShell";
import { getSessionUser, getPlan } from "@/lib/backoffice";

// The authenticated back-office is per-user and never cached or indexed.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  // Middleware already gates these routes; this is a defense-in-depth check and
  // also gives the shell the user's email.
  if (!user) redirect("/login");
  const plan = await getPlan();
  return <AppShell userEmail={user.email} plan={plan}>{children}</AppShell>;
}
