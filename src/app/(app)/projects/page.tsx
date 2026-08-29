import type { Metadata } from "next";
import { getProjects, getSessionUser } from "@/lib/backoffice";
import AssociationManager from "@/components/app/AssociationManager";

export const metadata: Metadata = {
  title: "Projects",
  robots: { index: false, follow: false },
};

export default async function ProjectsPage() {
  const user = await getSessionUser();
  const projects = await getProjects();
  return (
    <AssociationManager
      title="Projects"
      subtitle="Organize the productions you work on."
      table="projects"
      userId={user!.id}
      initialItems={projects.map((p) => ({ id: p.id, label: p.title }))}
      addPlaceholder="Add a project…"
      emptyText="No projects yet. Add the productions you work on to organize your gigs."
      noun="project"
      back={{ href: "/settings", label: "Settings" }}
    />
  );
}
