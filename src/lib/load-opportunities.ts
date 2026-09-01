import { createSupabaseServer } from "@/lib/supabase-server";
import type { Opportunity } from "@/lib/types";

/** Active, unexpired listings for the public feed and shared gig links. */
export async function loadActiveOpportunities(): Promise<Opportunity[]> {
  const today = new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServer();
  const { data } = await supabase
    .from("opportunities")
    .select("*")
    .eq("status", "active")
    .is("deleted_at", null)
    .or(`expires_at.is.null,expires_at.gte.${today}`)
    .order("posted_at", { ascending: false });
  return (data ?? []) as Opportunity[];
}
