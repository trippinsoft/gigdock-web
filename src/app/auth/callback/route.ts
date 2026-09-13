import { createSupabaseServer } from "@/lib/supabase-server";
import { NextResponse } from "next/server";
import { safeNext } from "@/lib/workRolesLaunch";

// PKCE code-exchange callback. Called by Supabase after:
//   - the user clicks an email-confirmation link on signup, OR
//   - any other flow that uses ?code= (magic link, OAuth).
//
// The exchange plants the session cookies on this response. After that we
// forward to a caller-supplied `?next=` (safeNext-validated) so the same
// callback can serve the signup handoff (/signup/complete?next=...), the
// admin curator flow (default), and any future post-auth destination.

const DEFAULT_DESTINATION = "/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const nextRaw = searchParams.get("next");
  const next = nextRaw ? safeNext(nextRaw, DEFAULT_DESTINATION) : DEFAULT_DESTINATION;

  return NextResponse.redirect(`${origin}${next}`);
}
