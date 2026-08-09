import { redirect } from "next/navigation";

// Saved is now a filter on the Opportunities feed (All / Saved / Applied).
export default function SavedRedirect() {
  redirect("/opportunities?scope=saved");
}
