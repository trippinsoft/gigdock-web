// Regression tests for the /signup/complete default performer profile write.
//
// Exercises the real helper through the real supabase-js client, with each
// simulated server render wrapped in Next's own request-scoped fetch dedupe
// (next/dist/server/lib/dedupe-fetch.js). The fake PostgREST below enforces
// the production partial unique index:
//   one_default_performer_profile ON performer_profiles (user_id) WHERE is_default

import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import {
  fillEmptyFields,
  isDefaultProfileConflict,
  saveOnboardingDefaultPerformerProfile,
} from "../src/lib/onboarding-performer-profile.ts";

const USER = "11111111-1111-4111-8111-111111111111";
const DRAFT = {
  gender: "male",
  ethnicity: ["white"],
  date_of_birth: null,
  union_status: null,
  height_inches: null,
};

// ── Next's real request memoization ─────────────────────────────────────────
// dedupe-fetch scopes its memo with React.cache, which only holds inside a
// Server Component request. Stand in a per-call cache so each
// createDedupeFetch() call behaves like one server render.
const require = createRequire(import.meta.url);
const dedupePath = require.resolve("next/dist/server/lib/dedupe-fetch.js");
const reactPath = createRequire(dedupePath).resolve("react");
require.cache[reactPath] = {
  id: reactPath,
  filename: reactPath,
  loaded: true,
  exports: {
    cache(fn) {
      const memo = new Map();
      return (key) => {
        if (!memo.has(key)) memo.set(key, fn(key));
        return memo.get(key);
      };
    },
  },
};
const { createDedupeFetch } = require(dedupePath);

// ── In-memory PostgREST for performer_profiles ──────────────────────────────
function createDb({ rows = [] } = {}) {
  const db = {
    rows: rows.map((r) => ({ ...r })),
    requests: [],
    seq: 0,
    /** Hook run before an INSERT is applied; may return a Response. */
    beforeInsert: null,
    /** Hook run before a GET is answered (to interleave requests). */
    beforeGet: null,
  };

  const json = (status, body) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  const matches = (row, params) => {
    for (const [k, v] of params) {
      if (k === "select") continue;
      const m = /^eq\.(.*)$/.exec(v);
      if (!m) continue;
      if (String(row[k]) !== m[1]) return false;
    }
    return true;
  };

  const project = (row, select) => {
    if (!select || select === "*") return { ...row };
    const out = {};
    for (const c of select.split(",").map((s) => s.trim())) out[c] = row[c] ?? null;
    return out;
  };

  db.insertRow = (values) => {
    if (
      values.is_default === true &&
      db.rows.some((r) => r.user_id === values.user_id && r.is_default === true)
    ) {
      return json(409, {
        code: "23505",
        details: `Key (user_id)=(${values.user_id}) already exists.`,
        hint: null,
        message:
          'duplicate key value violates unique constraint "one_default_performer_profile"',
      });
    }
    const row = {
      id: `pp-${++db.seq}`,
      label: null,
      markets: [],
      gender: null,
      ethnicity: [],
      date_of_birth: null,
      union_status: null,
      height_inches: null,
      weight_lbs: null,
      ...values,
    };
    db.rows.push(row);
    return null;
  };

  db.fetch = async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const method = (init.method ?? "GET").toUpperCase();
    db.requests.push(method);
    // Yield so concurrent requests genuinely interleave.
    await new Promise((r) => setImmediate(r));
    assert.equal(url.pathname, "/rest/v1/performer_profiles");
    const params = [...url.searchParams.entries()];

    if (method === "GET") {
      if (db.beforeGet) await db.beforeGet();
      const found = db.rows
        .filter((r) => matches(r, params))
        .map((r) => project(r, url.searchParams.get("select")));
      return json(200, found);
    }
    if (method === "POST") {
      const body = JSON.parse(init.body);
      if (db.beforeInsert) {
        const res = await db.beforeInsert(body);
        if (res) return res;
      }
      return db.insertRow(body) ?? json(201);
    }
    if (method === "PATCH") {
      const patch = JSON.parse(init.body);
      for (const r of db.rows.filter((r) => matches(r, params))) Object.assign(r, patch);
      return json(204);
    }
    throw new Error(`unexpected ${method}`);
  };

  db.defaults = (userId = USER) =>
    db.rows.filter((r) => r.user_id === userId && r.is_default === true);

  return db;
}

/** One simulated /signup/complete render: real supabase-js over Next's
 * request-scoped dedupe fetch. */
function renderClient(db) {
  return createClient("https://example.supabase.co", "test-anon-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: createDedupeFetch(db.fetch) },
  });
}

// The pre-fix algorithm (2842a66), kept verbatim in shape to prove the
// original failure reproduces under the same harness.
async function legacySave(supabase, userId, marketCodes, perf) {
  const payload = {
    user_id: userId,
    is_default: true,
    label: "My Profile",
    markets: marketCodes,
    gender: perf.gender ?? null,
    ethnicity: perf.ethnicity ?? [],
    date_of_birth: perf.date_of_birth ?? null,
    union_status: perf.union_status ?? null,
    height_inches: perf.height_inches ?? null,
  };
  const q = () =>
    supabase
      .from("performer_profiles")
      .select("id")
      .eq("user_id", userId)
      .eq("is_default", true)
      .maybeSingle();
  const { data: existing } = await q();
  if (existing?.id) {
    const { error } = await supabase.from("performer_profiles").update(payload).eq("id", existing.id);
    if (error) throw error;
    return;
  }
  const { error: insErr } = await supabase.from("performer_profiles").insert(payload);
  if (insErr) {
    const conflict =
      insErr.code === "23505" && insErr.message?.includes("one_default_performer_profile");
    if (!conflict) throw insErr;
    const { data: winner } = await q();
    if (!winner?.id) throw insErr;
    const { error } = await supabase.from("performer_profiles").update(payload).eq("id", winner.id);
    if (error) throw error;
  }
}

/** Competing completion lands between this render's read and insert. */
function raceOnFirstInsert(db, competitor) {
  let fired = false;
  db.beforeInsert = async () => {
    if (fired) return null;
    fired = true;
    db.insertRow({ user_id: USER, is_default: true, label: "My Profile", ...competitor });
    return null;
  };
}

// ── Root cause ──────────────────────────────────────────────────────────────

test("root cause: within one render, an identical re-read is served from Next's memo", async () => {
  const db = createDb();
  const supabase = renderClient(db);
  const read = () =>
    supabase.from("performer_profiles").select("id").eq("user_id", USER).eq("is_default", true).maybeSingle();

  assert.equal((await read()).data, null);
  db.insertRow({ user_id: USER, is_default: true });
  assert.equal((await read()).data, null, "memoized: the committed row is invisible");
  assert.equal(db.requests.filter((m) => m === "GET").length, 1, "second GET never reached the database");

  const fresh = await supabase
    .from("performer_profiles")
    .select("id")
    .eq("user_id", USER)
    .eq("is_default", true)
    .abortSignal(new AbortController().signal)
    .maybeSingle();
  assert.equal(fresh.data?.id, "pp-1", "an AbortSignal opts out of the memo");
});

test("reproduces the original failure: pre-fix recovery throws one_default_performer_profile", async () => {
  const db = createDb();
  raceOnFirstInsert(db, DRAFT);
  await assert.rejects(legacySave(renderClient(db), USER, ["GA", "TN"], DRAFT), (e) => {
    assert.equal(e.code, "23505");
    assert.match(e.message, /one_default_performer_profile/);
    return true;
  });
  assert.equal(db.defaults().length, 1);
});

test("reproduces the trigger: two concurrent renders with the pre-fix code fail one of them", async () => {
  const db = createDb();
  const results = await Promise.allSettled([
    legacySave(renderClient(db), USER, ["GA"], DRAFT),
    legacySave(renderClient(db), USER, ["GA"], DRAFT),
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), ["fulfilled", "rejected"]);
  assert.match(results.find((r) => r.status === "rejected").reason.message, /one_default_performer_profile/);
});

// ── Fixed behavior ──────────────────────────────────────────────────────────

test("fresh signup creates exactly one default profile with the draft values", async () => {
  const db = createDb();
  await saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA", "TN"], DRAFT);
  const rows = db.defaults();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, "My Profile");
  assert.deepEqual(rows[0].markets, ["GA", "TN"]);
  assert.equal(rows[0].gender, "male");
  assert.deepEqual(rows[0].ethnicity, ["white"]);
  assert.equal(rows[0].height_inches, null);
});

test("a competing default row created after the read is recovered, not reported as failure", async () => {
  const db = createDb();
  raceOnFirstInsert(db, { gender: null, ethnicity: [] });
  await saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], DRAFT);
  const rows = db.defaults();
  assert.equal(rows.length, 1);
  assert.equal(rows[0].gender, "male", "draft fills the winner's empty fields");
  assert.deepEqual(rows[0].ethnicity, ["white"]);
});

test("concurrent completions (push + refresh double render) both succeed with one default row", async () => {
  const db = createDb();
  // Hold reads until both renders have issued theirs, so both see "no row".
  let waiting = [];
  db.beforeGet = () =>
    new Promise((resolve) => {
      waiting.push(resolve);
      if (waiting.length === 2) {
        waiting.forEach((r) => r());
        waiting = [];
        db.beforeGet = null;
      }
    });
  await Promise.all([
    saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], DRAFT),
    saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], DRAFT),
  ]);
  assert.equal(db.defaults().length, 1);
  assert.equal(db.rows.length, 1);
  assert.equal(db.defaults()[0].gender, "male");
});

test("existing default profile is preserved; only empty fields are filled", async () => {
  const existing = {
    id: "pp-existing",
    user_id: USER,
    is_default: true,
    label: "Stage name profile",
    markets: ["CA"],
    gender: "female",
    ethnicity: [],
    date_of_birth: "1990-05-01",
    union_status: "sag-aftra",
    height_inches: 66,
    weight_lbs: 130,
  };
  const db = createDb({ rows: [existing] });
  await saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], {
    gender: "male",
    ethnicity: ["white"],
    date_of_birth: null,
    union_status: "non-union",
    height_inches: 70,
  });
  const [row] = db.defaults();
  assert.equal(db.rows.length, 1);
  assert.equal(row.id, "pp-existing");
  assert.equal(row.label, "Stage name profile");
  assert.deepEqual(row.markets, ["CA"], "markets are owned by set_work_markets, not this write");
  assert.equal(row.gender, "female");
  assert.equal(row.date_of_birth, "1990-05-01");
  assert.equal(row.union_status, "sag-aftra");
  assert.equal(row.height_inches, 66);
  assert.equal(row.weight_lbs, 130);
  assert.deepEqual(row.ethnicity, ["white"], "empty field filled from the draft");
});

test("non-default profiles are never touched or promoted", async () => {
  const other = { id: "pp-alt", user_id: USER, is_default: false, label: "Alt", gender: "female" };
  const db = createDb({ rows: [other] });
  await saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], DRAFT);
  assert.equal(db.defaults().length, 1);
  assert.notEqual(db.defaults()[0].id, "pp-alt");
  assert.deepEqual(db.rows.find((r) => r.id === "pp-alt"), { ...other });
});

test("repeating a successful onboarding is a read-only no-op", async () => {
  const db = createDb();
  await saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], DRAFT);
  const before = structuredClone(db.rows);
  db.requests = [];
  await saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], DRAFT);
  assert.deepEqual(db.rows, before);
  assert.deepEqual(db.requests, ["GET"]);
});

test("retry after a partial failure completes the profile without duplicates", async () => {
  const db = createDb();
  let failOnce = true;
  db.beforeInsert = async () => {
    if (!failOnce) return null;
    failOnce = false;
    return new Response(
      JSON.stringify({ code: "08006", message: "connection failure", details: null, hint: null }),
      { status: 503, headers: { "content-type": "application/json" } }
    );
  };
  await assert.rejects(
    saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], DRAFT),
    (e) => e.code === "08006"
  );
  assert.equal(db.rows.length, 0);

  await saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], DRAFT);
  assert.equal(db.defaults().length, 1);
  assert.equal(db.defaults()[0].gender, "male");
});

test("real database errors surface unchanged", async () => {
  const db = createDb();
  db.beforeInsert = async () =>
    new Response(
      JSON.stringify({
        code: "42501",
        message: 'new row violates row-level security policy for table "performer_profiles"',
        details: null,
        hint: null,
      }),
      { status: 403, headers: { "content-type": "application/json" } }
    );
  await assert.rejects(
    saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], DRAFT),
    (e) => e.code === "42501"
  );
});

test("a default-profile conflict with no visible winner is still reported", async () => {
  const db = createDb();
  db.beforeInsert = async () =>
    new Response(
      JSON.stringify({
        code: "23505",
        message: 'duplicate key value violates unique constraint "one_default_performer_profile"',
        details: null,
        hint: null,
      }),
      { status: 409, headers: { "content-type": "application/json" } }
    );
  await assert.rejects(
    saveOnboardingDefaultPerformerProfile(renderClient(db), USER, ["GA"], DRAFT),
    (e) => e.code === "23505"
  );
});

test("conflict detection is specific to the default-profile index", () => {
  assert.equal(
    isDefaultProfileConflict({
      code: "23505",
      message: 'duplicate key value violates unique constraint "one_default_performer_profile"',
    }),
    true
  );
  assert.equal(
    isDefaultProfileConflict({ code: "23505", message: 'violates unique constraint "performer_profiles_pkey"' }),
    false
  );
  assert.equal(isDefaultProfileConflict({ code: "42501", message: "one_default_performer_profile" }), false);
  assert.equal(isDefaultProfileConflict(null), false);
});

test("fillEmptyFields never overwrites values and ignores empty draft values", () => {
  assert.equal(fillEmptyFields({ gender: "female", ethnicity: ["asian"] }, { gender: "male", ethnicity: ["white"] }), null);
  assert.deepEqual(fillEmptyFields({ gender: null, height_inches: null }, { gender: null, height_inches: 0 }), null);
  assert.deepEqual(
    fillEmptyFields({ gender: null, ethnicity: [], union_status: "" }, { gender: "male", ethnicity: ["white"], union_status: "either" }),
    { gender: "male", ethnicity: ["white"], union_status: "either" }
  );
});
