import type { Metadata } from "next";
import SignupShell from "@/components/signup/SignupShell";

// Route-group layout for the standalone onboarding surface. Deliberately
// dumb: no `searchParams` interpretation, no step state, no auth handling —
// those live in the individual pages (/signup, /signup/complete) and in
// `SignupWizard`. Its only job is to swap the visual chrome away from
// AppShell / PublicShell so a new user never sees app navigation before
// their Work Roles are persisted.

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return <SignupShell>{children}</SignupShell>;
}
