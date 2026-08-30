# Draftbit AI prompt — posts vs named roles (count only)

Copy everything below the line into Draftbit AI.

---

You are making one small copy change on GigDock’s Opportunities screen.

The app already reads the **same live Supabase database** as the web app (RolePay / `thewnhnbbjendvgezmmx`). Nothing new to fetch, migrate, or write. Each list row is still one `opportunities` post. A new jsonb column `roles` is already on those rows. Use it only to change the **count label at the top of the feed**.

## What to change

Replace the upper count that currently looks like **“98 opportunities”** with:

- If the number of visible posts equals the number of named roles: keep **“{n} opportunity”** / **“{n} opportunities”**
- If they differ: **“{posts} posts · {roles} roles”** (singular when 1: `1 post · 6 roles`)

Examples: `98 opportunities` · `1 post · 6 roles` · `20 posts · 27 roles`

If the Filters sheet button says “Show N opportunities”, use the same string there.

## How to count

After the existing filters (do not change filter logic):

- `posts` = length of the current visible list (same as today)
- `roles` = sum of `roles.length` on those rows  
  If `roles` is missing or empty on a row, count **1** for that row

```javascript
function roleCountOnPost(item) {
  const roles = item && item.roles;
  if (Array.isArray(roles) && roles.length > 0) return roles.length;
  return 1;
}

function formatPostRoleCount(posts, roles) {
  if (roles === posts) return `${posts} ${posts === 1 ? "opportunity" : "opportunities"}`;
  const postWord = posts === 1 ? "post" : "posts";
  const roleWord = roles === 1 ? "role" : "roles";
  return `${posts} ${postWord} · ${roles} ${roleWord}`;
}

const posts = visibleList.length;
const roles = visibleList.reduce((n, item) => n + roleCountOnPost(item), 0);
const countLabel = formatPostRoleCount(posts, roles);
```

If the opportunities query uses an explicit column list (not `select *`), add `roles`.

## Do not

- Do not split one post into multiple cards
- Do not change Save, Apply, search, filters, GigFit, or any other screen
- Do not parse `requirements`
- Do not write to the database
- Do not add a Roles section or extra list UI

That’s the whole change.
