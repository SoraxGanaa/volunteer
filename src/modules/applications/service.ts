import type { Kysely } from "kysely";
import type { DB } from "../../db/types";
import { AppError } from "./errors";

type Role = "SUPERADMIN" | "ORG_ADMIN" | "USER";
type AuthUser = { id: string; role: Role };

export async function getEventWithOrg(db: Kysely<DB>, eventId: string) {
  return db
    .selectFrom("events as e")
    .innerJoin("organizations as o", "o.id", "e.org_id")
    .select([
      "e.id",
      "e.org_id",
      "e.status",
      "e.capacity",
      "e.start_at",
      "o.status as org_status",
      "o.created_by as org_owner",
    ])
    .where("e.id", "=", eventId as any)
    .executeTakeFirst();
}

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

export function canReadOrgStuff(user: AuthUser, orgOwner: any) {
  return (
    user.role === "SUPERADMIN" ||
    (user.role === "ORG_ADMIN" && String(orgOwner) === String(user.id))
  );
}

export async function countApproved(db: Kysely<DB>, eventId: string) {
  const r = await db
    .selectFrom("event_applications")
    .select(db.fn.countAll().as("cnt"))
    .where("event_id", "=", eventId as any)
    .where("status", "=", "APPROVED")
    .executeTakeFirst();

  return Number(r?.cnt ?? 0);
}

export async function applyToEvent(
  db: Kysely<DB>,
  user: AuthUser,
  eventId: string,
  message?: string
) {
  const e = await getEventWithOrg(db, eventId);
  if (!e) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found");
  if (e.org_status !== "ACTIVE") throw new AppError("EVENT_NOT_FOUND", 404, "Event not found");
  if (e.status !== "PUBLISHED") throw new AppError("EVENT_NOT_OPEN", 400, "Event not open");
  if (new Date(e.start_at) <= new Date()) throw new AppError("EVENT_STARTED", 400, "Event already started");

  if (e.capacity > 0) {
    const approved = await countApproved(db, eventId);
    if (approved >= e.capacity) throw new AppError("CAPACITY_FULL", 400, "Capacity full");
  }

  try {
    const created = await db
      .insertInto("event_applications")
      .values({
        event_id: eventId as any,
        user_id: user.id as any,
        status: "PENDING",
        message: message ?? null,
        decided_by: null,
        decided_at: undefined,
        decision_note: null,
      })
      .returning(["id", "status", "created_at"])
      .executeTakeFirst();

    return created;
  } catch {
    throw new AppError("ALREADY_APPLIED", 409, "Already applied");
  }
}

export async function cancelMyApplication(
  db: Kysely<DB>,
  user: AuthUser,
  eventId: string
) {
  const updated = await db
    .updateTable("event_applications")
    .set({ status: "CANCELLED" })
    .where("event_id", "=", eventId as any)
    .where("user_id", "=", user.id as any)
    .where("status", "=", "PENDING")
    .returning(["id", "status"])
    .executeTakeFirst();

  if (!updated) throw new AppError("NO_PENDING_APPLICATION", 404, "No pending application");
  return updated;
}

export async function listEventApplications(
  db: Kysely<DB>,
  user: AuthUser,
  eventId: string,
  status?: string
) {
  const e = await getEventWithOrg(db, eventId);
  if (!e) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found");

  const orgId = String(e.org_id);
  const isAdmin = canReadOrgStuff(user, e.org_owner);
  const staff = await isOrgStaff(db, orgId, user.id);

  if (!isAdmin && !staff) throw new AppError("FORBIDDEN", 403, "Forbidden");

  let q = db
    .selectFrom("event_applications as a")
    .innerJoin("users as u", "u.id", "a.user_id")
    .select([
      "a.id as application_id",
      "a.status",
      "a.message",
      "a.created_at",
      "u.id as user_id",
      "u.email",
      "u.phone",
      "u.first_name",
      "u.last_name",
    ])
    .where("a.event_id", "=", eventId as any)
    .orderBy("a.created_at", "desc");

  if (status) q = q.where("a.status", "=", status as any);

  const applications = await q.execute();
  return { applications, readOnly: staff && !isAdmin };
}

export async function decideApplication(
  db: Kysely<DB>,
  user: AuthUser,
  eventId: string,
  appId: string,
  decision: "APPROVED" | "REJECTED",
  note?: string
) {
  const e = await getEventWithOrg(db, eventId);
  if (!e) throw new AppError("EVENT_NOT_FOUND", 404, "Event not found");

  const isSuper = user.role === "SUPERADMIN";
  if (!isSuper && String(e.org_owner) !== String(user.id)) throw new AppError("FORBIDDEN", 403, "Forbidden");

  const result = await db.transaction().execute(async (trx) => {
    const row = await trx
      .selectFrom("event_applications")
      .select(["id", "status", "user_id"])
      .where("id", "=", appId as any)
      .where("event_id", "=", eventId as any)
      .executeTakeFirst();

    if (!row) return { kind: "APPLICATION_NOT_FOUND" as const };
    if (row.status !== "PENDING") return { kind: "APPLICATION_NOT_PENDING" as const };

    if (decision === "APPROVED" && e.capacity > 0) {
      const c = await trx
        .selectFrom("event_applications")
        .select(trx.fn.countAll().as("cnt"))
        .where("event_id", "=", eventId as any)
        .where("status", "=", "APPROVED")
        .executeTakeFirst();

      const approved = Number(c?.cnt ?? 0);
      if (approved >= e.capacity) return { kind: "CAPACITY_FULL" as const };
    }

    const updated = await trx
      .updateTable("event_applications")
      .set({
        status: decision,
        decided_by: user.id,
        decided_at: new Date(),
        decision_note: note ?? null,
      })
      .where("id", "=", appId as any)
      .returning(["id", "status", "user_id"])
      .executeTakeFirst();

    return { kind: "OK" as const, updated };
  });

  if (result.kind === "APPLICATION_NOT_FOUND") throw new AppError("APPLICATION_NOT_FOUND", 404, "Application not found");
  if (result.kind === "APPLICATION_NOT_PENDING") throw new AppError("APPLICATION_NOT_PENDING", 400, "Not pending");
  if (result.kind === "CAPACITY_FULL") throw new AppError("CAPACITY_FULL", 400, "Capacity full");

  return result.updated;
}

export async function listMyApplications(db: Kysely<DB>, user: AuthUser) {
  return db
    .selectFrom("event_applications as a")
    .innerJoin("events as e", "e.id", "a.event_id")
    .innerJoin("organizations as o", "o.id", "e.org_id")
    .select([
      "a.id as application_id",
      "a.status",
      "a.created_at",
      "e.id as event_id",
      "e.title",
      "e.start_at",
      "o.name as org_name",
    ])
    .where("a.user_id", "=", user.id as any)
    .orderBy("a.created_at", "desc")
    .execute();
}
