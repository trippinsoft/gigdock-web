// Run: npx tsx src/lib/beta-pro-grants.test.ts
//
// This test suite verifies that the End Automatic Beta-Pro Grants migration
// (sql/end-beta-pro-grants.sql) is in place and that the checked-in web
// source does not silently depend on new signups being auto-granted Pro.
//
// It does not connect to Supabase — the production-side assertion is the
// VALIDATION block inside the SQL file itself (queries A–F). This suite
// pins the file-level guarantees so a reviewer or future migration cannot
// accidentally reintroduce automatic grants without also updating tests.

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");
const MIGRATION = join(REPO, "sql", "end-beta-pro-grants.sql");

// --- 1. Migration file exists and drops both the trigger and function. ------

const sql = readFileSync(MIGRATION, "utf8");

assert.match(
  sql,
  /drop\s+trigger\s+if\s+exists\s+on_auth_user_created_grant_beta_pro\s+on\s+auth\.users/i,
  "migration must DROP TRIGGER IF EXISTS on_auth_user_created_grant_beta_pro ON auth.users",
);

assert.match(
  sql,
  /drop\s+function\s+if\s+exists\s+public\.handle_new_user_grant_beta_pro/i,
  "migration must DROP FUNCTION IF EXISTS public.handle_new_user_grant_beta_pro",
);

// --- 2. Migration must NOT touch any entitlement row. -----------------------
//
// Guard against a well-meaning edit that starts DELETE-ing or UPDATE-ing
// public.entitlements. Existing beta users' complimentary Pro is preserved
// verbatim; that is a hard product invariant of this phase.

assert.doesNotMatch(
  sql,
  /\b(delete|truncate|update)\s+(from\s+)?public\.entitlements\b/i,
  "migration must not mutate public.entitlements (existing beta rows are preserved)",
);

assert.doesNotMatch(
  sql,
  /alter\s+table\s+public\.entitlements/i,
  "migration must not alter the entitlements table (no schema changes required)",
);

// --- 3. Migration must not reintroduce automatic grant logic. ---------------

assert.doesNotMatch(
  sql,
  /create\s+(or\s+replace\s+)?function\s+public\.handle_new_user_grant_beta_pro/i,
  "migration must not (re)define the grant function",
);

assert.doesNotMatch(
  sql,
  /create\s+trigger\s+on_auth_user_created_grant_beta_pro/i,
  "migration must not (re)create the auto-grant trigger",
);

// --- 4. main tree has no code path that assumes new users are Pro. ----------
//
// If any code on main starts calling getPlan() / useEntitlement() and
// depends on it returning "pro" for a brand-new signup, that code needs
// to be updated alongside this migration. Fail here so the follow-up is
// obvious.

import { spawnSync } from "node:child_process";
const grep = spawnSync(
  "git",
  [
    "grep",
    "-nE",
    "getPlan\\(|useEntitlement\\(|isPro\\b|plan\\s*===\\s*['\\\"]pro['\\\"]",
    "--",
    "src",
  ],
  { cwd: REPO, encoding: "utf8" },
);

if (grep.status === 0) {
  // Any match means the assumption that new users are Pro could bite.
  // Print matches and fail — the reviewer will confirm each usage is
  // safe (e.g. the caller handles the "free" path).
  const lines = grep.stdout
    .split("\n")
    .filter((line) => line.trim().length > 0)
    // The (app) back-office is added by a separate branch and does its
    // own gating via <PartialReveal /> / paywall components; it always
    // handles the "free" case explicitly. That branch is not the target
    // of this migration and its callers are audited there. On main today
    // this grep should return zero matches — assert that.
    .filter((line) => !/\/\(app\)\//.test(line));
  if (lines.length > 0) {
    console.error("Found Pro-gate call sites on main that must be audited:");
    for (const line of lines) console.error("  " + line);
    assert.fail(
      "on main, no code should rely on new users being auto-granted Pro. If a new gate legitimately exists, either audit each site to confirm the free-plan path is safe and update this test's allowlist, or defer the gate until the alerts-entitlement work in a later phase.",
    );
  }
} else if (grep.status !== 1) {
  // status 1 == "no matches", which is the desired outcome.
  // Anything else is a tooling failure.
  assert.fail(`git grep failed unexpectedly (status=${grep.status}): ${grep.stderr}`);
}

console.log("OK — beta-pro grant migration is in place and no main-tree code depends on auto-Pro.");
