import type { Metadata } from "next";
import { getProjects, getSessionUser } from "@/lib/backoffice";
import AssociationManager from "@/components/app/AssociationManager";

// Customer-facing terminology for this section is "Production". The route
// path `/projects`, the `projects` Supabase table, `project_id`, and the
// existing `getProjects()` backoffice reader keep their internal identity
// so RPCs, exports, and mobile stay aligned.

export const metadata: Metadata = {
  title: "Productions",
  robots: { index: false, follow: false },
};

export default async function ProjectsPage() {
  const user = await getSessionUser();
  const projects = await getProjects();
  return (
    <AssociationManager
      title="Productions"
      subtitle="Organize the productions you work on."
      table="projects"
      userId={user!.id}
      initialItems={projects.map((p) => ({ id: p.id, label: p.title }))}
      addPlaceholder="Add a production…"
      emptyText="No productions yet. Add the productions you work on to organize your gigs."
      noun="production"
      back={{ href: "/settings", label: "Settings" }}
    />
  );
}
