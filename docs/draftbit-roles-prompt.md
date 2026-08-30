# Draftbit AI prompt — posts vs named roles

Copy everything below the line into Draftbit AI.

---

You are updating the GigDock mobile app so the Opportunities feed matches the web app’s **posts vs named roles** behavior.

Do **not** change save, apply, share, or the list data model. One source listing is still **one** `opportunities` row and **one** card. You are only changing how we **count**, **filter**, and **label** what’s on that card.

## Why

Casting notices often hire several named jobs in one post (e.g. a sports-retailer commercial with BBQ Dad, Baseball Dad, Red Light Mom, BBQ Friends, Backyard Kids, Baseball Kid). Competitors advertise the bigger number (roles). We now store those named roles on the post so we can say **“98 posts · 110 roles”** instead of pretending there are 110 separate gigs.

A single open call such as “seeking men and women looky loos” is **one** role. Do not split gender language into two roles.

## Backend (already live — do not migrate)

Supabase project: **RolePay** (`thewnhnbbjendvgezmmx`).

Table `public.opportunities` has a jsonb column:

```
roles: Array<{
  label: string,                 // "BBQ Dad"
  role_key?: string | null,      // "bbq dad"
  casting_specs?: {              // same shape as the post-level column
    gender?: string[],           // "male" | "female" | "non-binary"
    age_min?: number,
    age_max?: number,
    ethnicity?: string[],
    union_status?: string,       // "sag-aftra" | "non-union" | "either"
    work_type?: string,          // "background" | "featured" | ...
    ...
  } | null
}>
```

Every active row has at least one role. Most rows have exactly one. A few have 2–6.

**Fetch `roles` everywhere you already fetch opportunities.** If the query is `select *`, you already have it. If it is an explicit column list, add `roles`.

Do not write this column from the app. Do not create new tables. Do not split one post into multiple list rows. Do not change `saved_opportunities` or `applied_opportunities` (they stay keyed by `opportunity_id`).

## Product rules (must match web)

1. **One card per post.** Save / Applied / Apply / open-detail all stay on the post.
2. **Role count** = number of named roles on the visible posts (not a second list).
3. **Count copy** (exact):
   - If `roles === posts`: `"{n} opportunity"` / `"{n} opportunities"`
   - If they differ: `"{posts} post · {roles} roles"` with correct plurals  
   Examples: `98 opportunities` · `1 post · 6 roles` · `20 posts · 27 roles`
4. **Gender / union / work-type filters apply per role:**
   - Keep the **post** visible if **any** role matches.
   - The displayed role count is **only matching roles**, not every role on those posts.
   - Empty / missing `gender` on a role = open (matches any gender chip).
   - Empty / missing `union_status`, or `"either"` = open (matches any union chip).
   - `work_type` is strict: if the role has a work type and it doesn’t equal the chip, that role does not match.
5. Other filters (region, dates, source, pay, search, All/Saved/Applied) stay **post-level**, unchanged.
6. **GigFit / eligible-only** stays post-level for now (`casting_specs` on the row). Do not invent per-role GigFit.
7. **Do not parse `requirements` in the app.** Use the `roles` column. Fallback if `roles` is missing/empty: treat the post as **1 role** using `role_key` or `title`, with the post’s `casting_specs`.

## What to change in the UI

### 1. Feed count line

Wherever the Opportunities screen shows a count (`12 opportunities`, `Showing 12`, etc.), replace it with the copy from rule 3 using:

- `posts` = number of cards currently visible after filters
- `roles` = sum of matching roles on those cards (see Custom Function below)

Same copy on the Filters sheet primary button if it currently says “Show N opportunities”.

### 2. Filter chips (Gender, Union, Work type only)

When any of those three chips is set, a post stays in the list iff `matchingRoles(post, chips).length > 0`.

If the user filters Female on a 6-role sports-retailer post that has 1 female role + 2 any-gender roles, the post **stays**, and it contributes **3** to the role count (not 6).

### 3. List card (small)

If `roles.length > 1`, show a quiet subtitle under the title, e.g. **`6 roles`**. Do not list every name on the card. Single-role posts look as they do today.

### 4. Detail / apply sheet

If `roles.length > 1`, add a **Roles** section listing each `label` (and age/gender from that role’s `casting_specs` if present). Example:

- BBQ Dad · Male · 35–45
- Baseball Dad · Male · 35–45
- Red Light Mom · Female · 35–45
- BBQ Friends
- Backyard Kids · 4–16
- Baseball Kid · Male · 13–16

If `roles.length === 1`, do not add a new section — existing requirements / specs copy is enough.

## Custom Functions (add these; reuse everywhere)

### `rolesOf(item)`

```javascript
function rolesOf(item) {
  const stored = Array.isArray(item && item.roles) ? item.roles : [];
  const cleaned = stored
    .filter((r) => r && (r.label || r.role_key))
    .map((r) => ({
      label: (r.label || r.role_key || "Role").trim(),
      role_key: r.role_key || null,
      casting_specs: r.casting_specs || null,
    }));
  if (cleaned.length > 0) return cleaned;
  const label = ((item && (item.role_key || item.title)) || "Role").trim();
  return [
    {
      label,
      role_key: (item && item.role_key) || null,
      casting_specs: (item && item.casting_specs) || null,
    },
  ];
}
```

### `canonGender(g)` / `canonUnion(u)`

```javascript
function canonGender(g) {
  const s = String(g || "").toLowerCase().trim();
  if (["male", "males", "man", "men", "m", "boy", "boys"].includes(s)) return "male";
  if (["female", "females", "woman", "women", "f", "girl", "girls"].includes(s)) return "female";
  if (["non-binary", "nonbinary", "non binary", "nb", "enby"].includes(s)) return "non-binary";
  return s;
}

function canonUnion(u) {
  const s = String(u || "").toLowerCase().trim();
  if (!s) return "";
  if (s.includes("non")) return "non-union";
  if (s.includes("sag") || s.includes("aftra")) return "sag-aftra";
  if (s.includes("either") || s.includes("both") || s.includes("any")) return "either";
  return s;
}
```

### `roleMatchesChips(specs, filters)`

`filters` is `{ gender, union, workType }` — use whatever variable names the existing filter chips already use, mapped to those keys. Unset chip = ignore that dimension.

```javascript
function roleMatchesChips(specs, filters) {
  const s = specs || {};
  if (filters.gender) {
    const arr = Array.isArray(s.gender) ? s.gender : [];
    const open = arr.length === 0;
    if (!open && !arr.map(canonGender).includes(filters.gender)) return false;
  }
  if (filters.union) {
    const u = typeof s.union_status === "string" ? canonUnion(s.union_status) : "";
    const open = u === "" || u === "either";
    if (!open && u !== filters.union) return false;
  }
  if (filters.workType) {
    const wt = typeof s.work_type === "string" ? String(s.work_type).toLowerCase() : "";
    if (wt !== filters.workType) return false;
  }
  return true;
}
```

### `matchingRoles(item, filters)`

```javascript
function matchingRoles(item, filters) {
  return rolesOf(item).filter((role) => roleMatchesChips(role.casting_specs, filters));
}
```

### `formatPostRoleCount(posts, roles)`

```javascript
function formatPostRoleCount(posts, roles) {
  const postWord = posts === 1 ? "post" : "posts";
  const roleWord = roles === 1 ? "role" : "roles";
  if (roles === posts) return `${posts} ${posts === 1 ? "opportunity" : "opportunities"}`;
  return `${posts} ${postWord} · ${roles} ${roleWord}`;
}
```

After the existing post-level filters (and search / saved / applied), compute:

```javascript
const visiblePosts = /* current filtered list, one row per opportunity */;
const visibleRoleCount = visiblePosts.reduce(
  (n, item) => n + matchingRoles(item, { gender, union, workType }).length,
  0
);
const countLabel = formatPostRoleCount(visiblePosts.length, visibleRoleCount);
```

Wire `countLabel` into the feed subtitle and the Filters “Show …” button.

## Acceptance checks

Use live data. You should see something like **98 posts · 110 roles** (counts move day to day). Confirm these known multi-role posts still appear as **one card**:

- Sports / outdoor retailer commercial → **6 roles** (BBQ Dad, Baseball Dad, Red Light Mom, BBQ Friends, Backyard Kids, Baseball Kid)
- Tim / Security / CSI / Pastor → **4 roles**
- Rodeo bartender / DJ / patrons → **3 roles**
- Homicide Ep 605 neighbor / officer / bar employee → **3 roles**

And this must stay **1 role / 1 card**:

- “Seeking males and females … looky loos” (do not split men vs women)

Filter Female: sports-retailer post remains; its contribution to the role count drops (female + any-gender roles only).

Save and Apply still attach to the **post**, not to a role name.

Empty feed / loading / error states stay as they are; only the count string changes when there are results.

## Do not

- Do not add a Roles tab or a second infinite list of roles.
- Do not create one list item per role.
- Do not change Today, Calendar, Documents, Payments, Insights, Reports, Tax Ready, Settings, or Pro.
- Do not rewrite ingest or write `opportunities.roles`.
- Do not treat “men and women” / “males and females” as two roles.
- Do not change production `main` web behavior from this app.

Match existing GigDock mobile visual language (same type sizes, muted secondary text, existing filter sheet). No new color system.
