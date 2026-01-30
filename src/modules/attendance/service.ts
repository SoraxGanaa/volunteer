import type { Kysely } from "kysely";
import type { DB } from "../../db/types";
import { getEventWithOrg } from "../common/eventRepo";
import { canManageOrg, isOrgStaff, type AuthUser } from "../common/orgAccess";

export async function markAttendance(
  db: Kysely<DB>,
  actor: AuthUser,
  eventId: string,
  userId: string,
  input: { status: any; checkInAt?: string | undefined; note?: string | undefined }
) {
  const e = await getEventWithOrg(db, eventId);
  if (!e) return { kind: "NOT_FOUND" as const };

  const orgId = String(e.org_id);
  const isAdmin = canManageOrg(actor, e.org_owner);
  const staff = await isOrgStaff(db, orgId, actor.id);
  if (!isAdmin && !staff) return { kind: "FORBIDDEN" as const };

  const approved = await db
    .selectFrom("event_applications")
    .select(["id"])
    .where("event_id", "=", eventId as any)
    .where("user_id", "=", userId as any)
    .where("status", "=", "APPROVED")
    .executeTakeFirst();

  if (!approved) return { kind: "NOT_APPROVED" as const };

  const check_in_at = input.checkInAt ? new Date(input.checkInAt) : null;

  await db
    .insertInto("event_attendance")
    .values({
      event_id: eventId as any,
      user_id: userId as any,
      status: input.status,
      check_in_at,
      note: input.note ?? null,
      marked_by: actor.id,
      marked_at: new Date(),
    })
    .onConflict((oc: any) =>
      oc.columns(["event_id", "user_id"]).doUpdateSet({
        status: input.status,
        check_in_at,
        note: input.note ?? null,
        marked_by: actor.id,
        marked_at: new Date(),
      })
    )
    .execute();

  return { kind: "OK" as const };
}

export async function listAttendance(db: Kysely<DB>, actor: AuthUser, eventId: string) {
  const e = await getEventWithOrg(db, eventId);
  if (!e) return { kind: "NOT_FOUND" as const };

  const orgId = String(e.org_id);
  const isAdmin = canManageOrg(actor, e.org_owner);
  const staff = await isOrgStaff(db, orgId, actor.id);
  if (!isAdmin && !staff) return { kind: "FORBIDDEN" as const };

  const rows = await db
    .selectFrom("event_attendance as a")
    .innerJoin("users as u", "u.id", "a.user_id")
    .select([
      "a.user_id",
      "u.first_name",
      "u.last_name",
      "u.email",
      "a.status",
      "a.check_in_at",
      "a.marked_at",
    ])
    .where("a.event_id", "=", eventId as any)
    .orderBy("a.marked_at", "desc")
    .execute();

  return { kind: "OK" as const, rows };
}
