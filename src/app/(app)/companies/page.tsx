import type { Metadata } from "next";
import { getCompanies, getSessionUser } from "@/lib/backoffice";
import AssociationManager from "@/components/app/AssociationManager";

export const metadata: Metadata = {
  title: "Gig companies",
  robots: { index: false, follow: false },
};

export default async function CompaniesPage() {
  const user = await getSessionUser();
  const companies = await getCompanies();
  const gig = companies.filter((c) => c.kind === "gig");
  return (
    <AssociationManager
      title="Gig companies"
      subtitle="Companies you’ve worked with."
      table="companies"
      kind="gig"
      userId={user!.id}
      initialItems={gig.map((c) => ({ id: c.id, label: c.name }))}
      addPlaceholder="Add a gig company…"
      emptyText="No gig companies yet. Add the companies you’ve worked with."
      noun="gig company"
    />
  );
}
