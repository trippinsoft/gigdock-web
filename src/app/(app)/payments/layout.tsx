import { getGigs } from "@/lib/backoffice";
import MasterDetailLayout from "@/components/app/MasterDetailLayout";
import PaymentsMasterList from "@/components/app/PaymentsMasterList";

export const dynamic = "force-dynamic";

export default async function PaymentsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gigs = await getGigs({ sort: "recent" });
  return (
    <MasterDetailLayout basePath="/payments" master={<PaymentsMasterList gigs={gigs} />}>
      {children}
    </MasterDetailLayout>
  );
}
