import type { CastingCriteria, Opportunity } from "@/lib/types";

/** Subset of feed chips that apply per role. */
export type RoleFilterChips = {
  gender?: string | null;
  union?: string | null;
  workType?: string | null;
};

/** One named role on a source post. Empty / omitted specs mean the role is open. */
export type OppRole = {
  label: string;
  role_key?: string | null;
  casting_specs?: CastingCriteria | null;
};

export type RoleBearing = {
  title?: string | null;
  role_key?: string | null;
  requirements?: string | null;
  casting_specs?: CastingCriteria | null;
  roles?: OppRole[] | null;
};

function slugRole(label: string): string {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function specsFromDetail(detail: string): CastingCriteria {
  const specs: CastingCriteria = {};
  const anyGender = /\bany gender\b/i.test(detail) || (/\bmale\b/i.test(detail) && /\bfemale\b/i.test(detail));
  if (!anyGender) {
    if (/\bfemale\b|\bwomen\b|\bgirl\b/i.test(detail)) specs.gender = ["female"];
    else if (/\bmale\b|\bmen\b|\bboy\b/i.test(detail)) specs.gender = ["male"];
  }
  const age = detail.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})/);
  if (age) {
    specs.age_min = Number(age[1]);
    specs.age_max = Number(age[2]);
  }
  return specs;
}

/** Split "Role (details); Role (details)" lists ingest already stored in requirements. */
function looksLikeRoleLabel(label: string): boolean {
  if (label.length < 2 || label.length > 60) return false;
  if (label.split(/\s+/).length > 8) return false;
  if (/^(seeking|including|various roles|roles|must|have|with|for)\b/i.test(label)) return false;
  if (/\b(must|seeking|experience|available|comfortable|submit)\b/i.test(label)) return false;
  return true;
}

function pushRole(parsed: OppRole[], rawLabel: string, detail: string) {
  const label = rawLabel.trim().replace(/^[-–,:.\s]+/, "").replace(/^(and|or)\s+/i, "");
  if (!looksLikeRoleLabel(label)) return;
  parsed.push({
    label,
    role_key: slugRole(label),
    casting_specs: specsFromDetail(detail),
  });
}

export function inferRolesFromRequirements(requirements: string | null | undefined): OppRole[] | null {
  if (!requirements?.trim()) return null;
  const parsed: OppRole[] = [];
  const marker = requirements.search(/(multiple roles|specific roles|\d+\s+roles)\s*:/i);
  if (marker >= 0) {
    const text = requirements.slice(requirements.indexOf(":", marker) + 1);
    const re = /([A-Za-z][A-Za-z0-9 /&+',.-]{0,50}?)\s*\(([^)]{2,160})\)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) pushRole(parsed, m[1], m[2]);
  } else {
    for (const raw of requirements.split(";")) {
      const part = raw.trim().replace(/\.$/, "");
      const m = part.match(/^([A-Za-z][A-Za-z0-9 /&+',.-]{0,50})\s*\((.+)\)$/);
      if (m) pushRole(parsed, m[1], m[2]);
    }
  }
  return parsed.length >= 2 ? parsed : null;
}

function asRoleArray(value: unknown): OppRole[] | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  const roles: OppRole[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const rec = item as Record<string, unknown>;
    const label = typeof rec.label === "string" ? rec.label.trim() : "";
    const role_key = typeof rec.role_key === "string" ? rec.role_key : null;
    if (!label && !role_key) continue;
    roles.push({
      label: label || role_key || "Role",
      role_key,
      casting_specs: (rec.casting_specs as CastingCriteria | null) ?? null,
    });
  }
  return roles.length > 0 ? roles : null;
}

/** Roles for counting / filtering. Stored array wins; else infer; else one role. */
export function rolesOf(item: RoleBearing): OppRole[] {
  const stored = asRoleArray(item.roles);
  const inferred = inferRolesFromRequirements(item.requirements);
  if (inferred && (!stored || inferred.length > stored.length)) return inferred;
  if (stored && stored.length >= 2) return stored;
  if (inferred) return inferred;
  if (stored) return stored;
  const label = (item.role_key || item.title || "Role").trim();
  return [{ label, role_key: item.role_key ?? null, casting_specs: item.casting_specs ?? null }];
}

export function formatPostRoleCount(posts: number, roles: number): string {
  const postWord = posts === 1 ? "post" : "posts";
  const roleWord = roles === 1 ? "role" : "roles";
  if (roles === posts) return `${posts} ${posts === 1 ? "opportunity" : "opportunities"}`;
  return `${posts} ${postWord} · ${roles} ${roleWord}`;
}

export function roleCount(items: RoleBearing[]): number {
  return items.reduce((n, item) => n + rolesOf(item).length, 0);
}

export function formatOpportunityCount(items: Array<RoleBearing>): string {
  return formatPostRoleCount(items.length, roleCount(items));
}

/** Used by tests and LocationListing; Opportunity satisfies RoleBearing. */
export function opportunityRoleCount(opps: Opportunity[]): { posts: number; roles: number } {
  return { posts: opps.length, roles: roleCount(opps) };
}

function canonGender(g: string): string {
  const s = g.toLowerCase().trim();
  if (["male", "males", "man", "men", "m", "boy", "boys"].includes(s)) return "male";
  if (["female", "females", "woman", "women", "f", "girl", "girls"].includes(s)) return "female";
  if (["non-binary", "nonbinary", "non binary", "nb", "enby"].includes(s)) return "non-binary";
  return s;
}

function canonUnion(u: string): string {
  const s = u.toLowerCase().trim();
  if (!s) return "";
  if (s.includes("non")) return "non-union";
  if (s.includes("sag") || s.includes("aftra")) return "sag-aftra";
  if (s.includes("either") || s.includes("both") || s.includes("any")) return "either";
  return s;
}

function roleMatchesChipFilters(specs: CastingCriteria | null | undefined, filters: RoleFilterChips): boolean {
  const s = specs ?? {};
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
    const wt = typeof s.work_type === "string" ? s.work_type.toLowerCase() : "";
    if (wt !== filters.workType) return false;
  }
  return true;
}

/** Roles on a post that survive gender / union / work-type chips. */
export function matchingRolesForFilters(item: RoleBearing, filters: RoleFilterChips): OppRole[] {
  return rolesOf(item).filter((role) => roleMatchesChipFilters(role.casting_specs, filters));
}
