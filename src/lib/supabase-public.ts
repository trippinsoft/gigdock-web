import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Cookie-less anon client for public/static routes (sitemap, ISR).
 *
 * Keep this module free of `next/headers`. Importing `cookies()` into the
 * sitemap graph makes `/sitemap.xml` dynamic and 500s for crawlers / GSC
 * even when the sitemap function never calls it.
 */
export function createSupabasePublic(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
