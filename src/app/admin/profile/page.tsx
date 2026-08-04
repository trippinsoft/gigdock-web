import { redirect } from "next/navigation";

// The profile editor now lives at a single place: /profile (full field set,
// including ethnicity/height/weight). The old admin-only form is retired to
// avoid two diverging editors — this route just forwards there.
export default function AdminProfileRedirect() {
  redirect("/profile");
}
