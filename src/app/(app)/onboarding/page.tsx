import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  getProfileWithWorkRoles,
  getWorkRolesCatalog,
} from "@/lib/backoffice";
import { safeNext } from "@/lib/workRolesLaunch";
import OnboardingClient from "./OnboardingClient";

export const metadata: Metadata = {
  title: "Welcome — GigDock",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const nextPath = safeNext(sp.next, "/today");

  // Only pull what we need — the parent (app)/layout.tsx already gated on auth.
  const [profile, catalog] = await Promise.all([
    getProfileWithWorkRoles(),
    getWorkRolesCatalog(),
  ]);

  // Someone who has already completed Work Roles hitting /onboarding
  // directly (e.g. bookmark) shouldn't have to answer it again — just send
  // them where they intended to go.
  if (profile?.work_roles_set_at) {
    redirect(nextPath);
  }

  return <OnboardingClient catalog={catalog} nextPath={nextPath} />;
}
