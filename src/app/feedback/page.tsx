import type { Metadata } from "next";
import PublicShell from "@/components/PublicShell";
import AppShell from "@/components/AppShell";
import { getSessionUser, getPlan } from "@/lib/backoffice";
import FeedbackForm from "@/components/app/FeedbackForm";

export const metadata: Metadata = {
  title: "Help & feedback",
  description: "Send the GigDock team feedback, report a bug, or tell us about a gig or source we should add.",
  robots: { index: false, follow: false },
};

// Public feedback form. Signed-in users keep the app shell (so the left rail
// stays put when they open it from the rail); logged-out visitors get the
// public chrome. Same dual-chrome pattern as /delete-account.
export default async function FeedbackPage() {
  const user = await getSessionUser();
  if (user) {
    const plan = await getPlan();
    return (
      <AppShell userEmail={user.email} plan={plan}>
        <div className="max-w-lg">
          <FeedbackForm />
        </div>
      </AppShell>
    );
  }
  return (
    <PublicShell>
      <div className="max-w-lg mx-auto">
        <FeedbackForm />
      </div>
    </PublicShell>
  );
}
