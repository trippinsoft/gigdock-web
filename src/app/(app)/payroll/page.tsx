import type { Metadata } from "next";
import { getCompanies, getSessionUser } from "@/lib/backoffice";
import AssociationManager from "@/components/app/AssociationManager";

export const metadata: Metadata = {
  title: "Payroll companies",
  robots: { index: false, follow: false },
};

export default async function PayrollPage() {
  const user = await getSessionUser();
  const companies = await getCompanies();
  const payroll = companies.filter((c) => c.kind === "payroll");
  return (
    <AssociationManager
      title="Payroll companies"
      subtitle="Companies that process your payments."
      table="companies"
      kind="payroll"
      userId={user!.id}
      initialItems={payroll.map((c) => ({ id: c.id, label: c.name }))}
      addPlaceholder="Add a payroll company…"
      emptyText="No payroll companies yet. Add the companies that process your payments."
      noun="payroll company"
    />
  );
}
