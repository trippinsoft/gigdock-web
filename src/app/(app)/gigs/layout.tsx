import { getGigs } from "@/lib/backoffice";
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
  const gigs = await getGigs({ sort: "recent" });
  return (
    <MasterDetailLayout basePath="/gigs" master={<GigMasterList gigs={gigs} />}>
      {children}
    </MasterDetailLayout>
  );
}
