import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { WORK_ROLES_LAUNCH_DATE, safeNext } from "@/lib/workRolesLaunch";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Authenticated back-office surfaces — require a signed-in user, and bounce
  // guests to login with a return path so they land back where they were.
  const APP_PREFIXES = ["/gigs", "/today", "/calendar", "/payments", "/insights", "/documents", "/profile", "/onboarding"];
  const inAppSurface = APP_PREFIXES.some((p) => request.nextUrl.pathname.startsWith(p));
  if (inAppSurface) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }

    // Phase 2 onboarding gate. Users created at/after the launch cutoff who
    // have not answered Work Roles are redirected to /onboarding, preserving
    // their intended destination as ?next=. Grandfathered users (created
    // before the cutoff) are NOT blocked here — they get the soft Today
    // banner. work_roles_set_at IS NOT NULL means done, always.
    if (!request.nextUrl.pathname.startsWith("/onboarding")) {
      const { data: gate } = await supabase
        .from("profiles")
        .select("created_at, work_roles_set_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (gate && !gate.work_roles_set_at) {
        const created = (gate.created_at as string | null) ?? null;
        const isNewUser = !created || created >= WORK_ROLES_LAUNCH_DATE;
        if (isNewUser) {
          const url = request.nextUrl.clone();
          url.pathname = "/onboarding";
          const originalNext = safeNext(
            request.nextUrl.pathname + request.nextUrl.search,
            "/today"
          );
          url.search = "";
          url.searchParams.set("next", originalNext);
          return NextResponse.redirect(url);
        }
      }
    }
  }

  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_curator")
      .eq("user_id", user.id)
      .single();

    if (!profile?.is_curator) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "not_curator");
      return NextResponse.redirect(url);
    }
  }

  if (request.nextUrl.pathname === "/login" && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_curator")
      .eq("user_id", user.id)
      .single();

    if (profile?.is_curator) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/login",
    "/gigs/:path*",
    "/today/:path*",
    "/calendar/:path*",
    "/payments/:path*",
    "/insights/:path*",
    "/documents/:path*",
    "/profile/:path*",
    "/onboarding/:path*",
  ],
};
