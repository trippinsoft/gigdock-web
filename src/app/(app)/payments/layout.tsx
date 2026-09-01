import { getGigs, getCompanies } from "@/lib/backoffice";
import MasterDetailLayout from "@/components/app/MasterDetailLayout";
import PaymentsMasterList from "@/components/app/PaymentsMasterList";

export const dynamic = "force-dynamic";

export default async function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gigs, companies] = await Promise.all([getGigs({ sort: "recent" }), getCompanies()]);
  const nameById = new Map(companies.map((c) => [c.id, c.name]));
  const enriched = gigs.map((g) => ({ ...g, company_name: g.gig_company_id ? nameById.get(g.gig_company_id) ?? null : null }));
  return (
    <MasterDetailLayout basePath="/payments" master={<PaymentsMasterList gigs={enriched} />}>
      {children}
    </MasterDetailLayout>
  );
}
