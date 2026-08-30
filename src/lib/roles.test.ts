// Run: npx tsx src/lib/roles.test.ts

import assert from "node:assert/strict";
import { formatPostRoleCount, inferRolesFromRequirements, rolesOf } from "./roles";

const sportsReq =
  "BBQ Dad (Male, 35-45, grilling experience); Baseball Dad (Male, 35-45, prior baseball experience); Red Light Mom (Female, 35-45, comfortable with red light therapy mask); BBQ Friends (Any gender, 25-45); Backyard Kids (Any gender, 4-16, ride-on toy experience a plus); Baseball Kid (Boy, 13-16, prior baseball experience).";

const inferred = inferRolesFromRequirements(sportsReq);
assert.ok(inferred);
assert.equal(inferred.length, 6);
assert.equal(inferred[0].label, "BBQ Dad");
assert.deepEqual(inferred[0].casting_specs?.gender, ["male"]);
assert.equal(inferred[0].casting_specs?.age_min, 35);
assert.equal(inferred[0].casting_specs?.age_max, 45);
assert.deepEqual(inferred[2].casting_specs?.gender, ["female"]);
assert.equal(inferred[3].casting_specs?.gender, undefined);
assert.deepEqual(inferred[5].casting_specs?.gender, ["male"]);
assert.equal(inferred[5].casting_specs?.age_min, 13);

const single = inferRolesFromRequirements("Seeking males and females, 20s to 60s, for outdoor looky loos.");
assert.equal(single, null);

const rodeo = inferRolesFromRequirements(
  "Seeking background talent. Specific roles: Male bartender (25-45, African American, real bartending experience); Male DJ (25-45, African American, real DJ experience); Male and Female bar patrons (35-65, African American, everyday types)."
);
assert.ok(rodeo);
assert.equal(rodeo.length, 3);
assert.equal(rodeo[0].label, "Male bartender");

const listed = inferRolesFromRequirements(
  "Multiple roles: Tim (White male, 30s, dark hair); Security guard (White male); CSI (Any adult); Pastor/School Teacher (White male)."
);
assert.ok(listed);
assert.equal(listed.length, 4);

assert.equal(
  rolesOf({ title: "Looky Loos", role_key: "looky loos", casting_specs: {} }).length,
  1
);

assert.equal(
  rolesOf({
    title: "Commercial Casting — Popular Sports & Outdoor Retailer",
    role_key: null,
    requirements: sportsReq,
    casting_specs: {},
  }).length,
  6
);

assert.equal(
  rolesOf({
    title: "Already split",
    roles: [
      { label: "A", casting_specs: { gender: ["male"] } },
      { label: "B", casting_specs: { gender: ["female"] } },
    ],
  }).length,
  2
);

assert.equal(
  inferRolesFromRequirements("Seeking Caucasian female, ages 7–9, blonde hair. Must have previous acting or on-set experience (film, television, commercials)."),
  null
);

assert.equal(formatPostRoleCount(98, 98), "98 opportunities");
assert.equal(formatPostRoleCount(1, 6), "1 post · 6 roles");
assert.equal(formatPostRoleCount(20, 27), "20 posts · 27 roles");

console.log("roles.test.ts: ok");
