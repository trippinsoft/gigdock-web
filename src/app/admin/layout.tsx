import { createSupabaseServer } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import AdminShell from "@/components/AdminShell";

export const metadata = {
  title: "GigDock Admin",
  description: "Curator dashboard for GigDock opportunity pipeline",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_curator, display_name, username")
    .eq("user_id", user.id)
    .single();

  if (!profile?.is_curator) redirect("/login?error=not_curator");

  return (
    <AdminShell
      userEmail={user.email ?? ""}
      displayName={profile.display_name ?? user.email ?? "Curator"}
    >
      {children}
    </AdminShell>
  );
}
