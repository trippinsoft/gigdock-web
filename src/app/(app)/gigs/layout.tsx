import { getGigs, getCompanies } from "@/lib/backoffice";
import MasterDetailLayout from "@/components/app/MasterDetailLayout";
import GigMasterList from "@/components/app/GigMasterList";

// The master list lives in the layout so it persists (and keeps its scroll
// position + in-memory filters) as the user selects different gigs on the right.
export const dynamic = "force-dynamic";

export default async function GigsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gigs, companies] = await Promise.all([getGigs({ sort: "recent" }), getCompanies()]);
  const nameById = new Map(companies.map((c) => [c.id, c.name]));
  const enriched = gigs.map((g) => ({ ...g, company_name: g.gig_company_id ? nameById.get(g.gig_company_id) ?? null : null }));
  return (
    <MasterDetailLayout basePath="/gigs" master={<GigMasterList gigs={enriched} />}>
      {children}
    </MasterDetailLayout>
  );
}
