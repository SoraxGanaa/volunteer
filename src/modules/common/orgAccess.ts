import type { Kysely } from "kysely";
import type { DB } from "../../db/types";

type Role = "SUPERADMIN" | "ORG_ADMIN" | "USER";
export type AuthUser = { id: string; role: Role };

export async function isOrgStaff(db: Kysely<DB>, orgId: string, userId: string) {
  const r = await db
    .selectFrom("org_members")
    .select(["id"])
    .where("org_id", "=", orgId as any)
    .where("user_id", "=", userId as any)
    .where("status", "=", "ACTIVE")
    .executeTakeFirst();
  return !!r;
}

export function isOrgOwnerAdmin(user: AuthUser, orgOwner: any) {
  return user.role === "ORG_ADMIN" && String(orgOwner) === String(user.id);
}

export function isSuper(user: AuthUser) {
  return user.role === "SUPERADMIN";
}

export function canManageOrg(user: AuthUser, orgOwner: any) {
  return isSuper(user) || isOrgOwnerAdmin(user, orgOwner);
}
