// TYPES ONLY for the work-role system. There is intentionally NO hard-coded
// list of role keys here — the authoritative catalog lives in the
// public.work_roles_catalog table (see sql/work-roles.sql). Any code that
// needs to know "is this a performer role?" derives that from a catalog row
// or from the server-side has_performer_role() RPC.
//
// Distinction reminder: `WORK_ROLES` describes the USER (their occupation).
// `WORK_TYPES` (see FilterChips / roles.ts) describes an OPPORTUNITY's cast
// requirement. Never conflate the two.

export type WorkRoleCategory = "performing" | "crew" | "other";

/** One row of public.work_roles_catalog. */
export interface WorkRoleCatalogRow {
  role_key: string;
  label: string;
  category: WorkRoleCategory;
  is_performer: boolean;
  sort_order: number;
  is_active: boolean;
}

/** The work-role fields on public.profiles. Read alongside the rest of the
 * profile row where the caller needs them. There is no dedicated
 * grandfather column — grandfathering uses the existing verified
 * profiles.created_at against a WORK_ROLES_LAUNCH_DATE constant that will
 * be set at Phase 2 launch, so anyone who signs up between Phase 1a and
 * Phase 2 launch is treated as an existing/grandfathered user by that
 * later logic. */
export interface ProfileWorkRoles {
  work_roles: string[];
  work_roles_other: string | null;
  work_roles_set_at: string | null;
}

/** True iff any of the given role keys refers to a performer role in the
 * provided catalog snapshot. Callers hold both the profile's `work_roles`
 * array and the (fetched) catalog and pass them here — this function never
 * consults a hard-coded key list. */
export function hasPerformerRole(
  roleKeys: readonly string[] | null | undefined,
  catalog: readonly WorkRoleCatalogRow[]
): boolean {
  if (!roleKeys || roleKeys.length === 0) return false;
  const performerSet = new Set(
    catalog.filter((r) => r.is_performer && r.is_active).map((r) => r.role_key)
  );
  return roleKeys.some((k) => performerSet.has(k));
}
