#!/usr/bin/env python3
"""Apply the roles[] extraction patch to a copy of ingest-rss/index.ts."""
from pathlib import Path
import sys

p = Path(sys.argv[1] if len(sys.argv) > 1 else "supabase/functions/ingest-rss/index.ts")
t = p.read_text()

def must_replace(src: str, old: str, new: str, label: str) -> str:
    if old not in src:
        raise SystemExit(f"patch {label}: old string not found")
    return src.replace(old, new, 1)

t = must_replace(
    t,
    'const nn = (v: any) => (v === undefined || v === null || String(v).trim() === "" ? null : v);\n',
    '''const nn = (v: any) => (v === undefined || v === null || String(v).trim() === "" ? null : v);

// One source post can name several roles. Keep role_key as the primary/first
// role for dedup; persist the full list on opportunities.roles.
function normalizeRoles(ex: any, title: string, fallbackCriteria: any) {
  const raw = Array.isArray(ex.roles) ? ex.roles : [];
  const mapped: { label: string; role_key: string | null; casting_specs: any }[] = [];
  for (const r of raw) {
    const label = nn(r?.label) ?? nn(r?.role_key);
    if (!label) continue;
    mapped.push({
      label,
      role_key: nn(r?.role_key) ?? String(label).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
      casting_specs: r?.criteria && typeof r.criteria === "object" ? r.criteria : {},
    });
  }
  if (mapped.length > 0) return mapped;
  return [{
    label: nn(ex.role_key) ?? title,
    role_key: nn(ex.role_key),
    casting_specs: fallbackCriteria ?? {},
  }];
}

''',
    "normalizeRoles",
)

t = must_replace(
    t,
    'Examples: "2xl mover", "stand-in", "featured nurse", "pickup truck driver", "spanish-speaking mom".\n\nPost text:',
    'Examples: "2xl mover", "stand-in", "featured nurse", "pickup truck driver", "spanish-speaking mom".\n- roles: EVERY distinct named role this post is hiring for. One item when it is a single open call. Named lists (BBQ Dad and Baseball Kid; bartender, DJ, and patrons; "multiple roles: Tim; CSI") are multiple items, each with its own label, role_key, and criteria. Do NOT split a single open call on gender or age alone ("men and women looky loos", "all genders", "adults and kids welcome" as one job = ONE role).\n\nPost text:',
    "prompt-roles",
)

t = must_replace(
    t,
    '            role_key: { type: "string", description: "Short lowercase canonical id for the SPECIFIC role, 1-4 words, chosen so the same role posted by a different company yields the same value. Core role/character + its most distinctive requirement (body size, profession, vehicle, skill). No production name, no company, no dates, no pay, no filler. Examples: \'2xl mover\', \'stand-in\', \'featured nurse\', \'pickup truck driver\'." },\n            requirements:',
    '''            role_key: { type: "string", description: "Short lowercase canonical id for the SPECIFIC role, 1-4 words, chosen so the same role posted by a different company yields the same value. Core role/character + its most distinctive requirement (body size, profession, vehicle, skill). No production name, no company, no dates, no pay, no filler. Examples: '2xl mover', 'stand-in', 'featured nurse', 'pickup truck driver'." },
            roles: {
              type: "array",
              description: "Every distinct named role this post is hiring for. One item for a single open call. Do not split 'men and women' / 'all genders' into two roles.",
              items: {
                type: "object",
                properties: {
                  label: { type: "string", description: "Role name as the post states it (e.g. 'BBQ Dad')." },
                  role_key: { type: "string", description: "Short lowercase canonical id for this role, 1-4 words." },
                  criteria: {
                    type: "object",
                    description: "Matching criteria for THIS role only. Same controlled values as the top-level criteria.",
                    properties: {
                      gender: { type: "array", items: { type: "string", enum: ["male", "female", "non-binary"] } },
                      age_min: { type: "integer" },
                      age_max: { type: "integer" },
                      ethnicity: { type: "array", items: { type: "string", enum: ["white", "black", "hispanic", "asian", "middle-eastern", "native-american", "pacific-islander", "mixed"] } },
                      union_status: { type: "string", enum: ["sag-aftra", "non-union", "either"] },
                      work_type: { type: "string", enum: ["background", "featured", "stand-in", "photo-double", "principal", "voice-over", "live-music", "brand-ambassador", "model", "other"] },
                      skills: { type: "array", items: { type: "string" } },
                      vehicle: { type: "array", items: { type: "string" } },
                      height_min_inches: { type: "integer" },
                      height_max_inches: { type: "integer" },
                    },
                  },
                },
              },
            },
            requirements:''',
    "schema-roles",
)

t = must_replace(
    t,
    "      max_tokens: 1000,\n",
    "      max_tokens: 1600,\n",
    "max_tokens",
)

t = must_replace(
    t,
    "    const criteria = ex.criteria ?? {};\n",
    """    const criteria = ex.criteria ?? {};
    const roles = normalizeRoles(ex, title, criteria);
    if (!nn(ex.role_key) && roles[0]?.role_key) ex.role_key = roles[0].role_key;

""",
    "normalize-call",
)

t = must_replace(
    t,
    "      production_name: nn(ex.production_name),\n      role_key: nn(ex.role_key),\n",
    "      production_name: nn(ex.production_name),\n      role_key: nn(ex.role_key),\n      roles,\n",
    "insert-roles",
)

t = must_replace(
    t,
    "    log.push({ title: opp.title, state: match_state, work_date: opp.work_date, work_date_end, expires_at, pay_min, work_type: criteria.work_type ?? null, via: usedVision ? \"vision\" : \"text\" });\n",
    "    log.push({ title: opp.title, state: match_state, work_date: opp.work_date, work_date_end, expires_at, pay_min, work_type: criteria.work_type ?? null, roles: roles.length, via: usedVision ? \"vision\" : \"text\" });\n",
    "log-roles",
)

p.write_text(t)
print(f"patched {p} ({len(t)} bytes)")
