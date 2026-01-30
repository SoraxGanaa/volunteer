import type { Kysely } from "kysely";
import type { DB } from "../../db/types";
import type { AuthUser } from "../common/orgAccess";

export async function createCert(db: Kysely<DB>, user: AuthUser, body: any) {
  return db
    .insertInto("volunteer_certificates")
    .values({
      user_id: user.id as any,
      title: body.title,
      issuer: body.issuer ?? null,
      issue_date: body.issueDate ?? null,
      expiry_date: body.expiryDate ?? null,
      file_url: body.fileUrl,
      note: body.note ?? null,
    })
    .returning(["id", "title", "file_url", "created_at"])
    .executeTakeFirst();
}

export async function listCerts(db: Kysely<DB>, user: AuthUser) {
  return db
    .selectFrom("volunteer_certificates")
    .select(["id", "title", "issuer", "issue_date", "expiry_date", "file_url", "note", "created_at"])
    .where("user_id", "=", user.id as any)
    .orderBy("created_at", "desc")
    .execute();
}

export async function updateCert(db: Kysely<DB>, user: AuthUser, id: string, body: any) {
  return db
    .updateTable("volunteer_certificates")
    .set({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.issuer !== undefined ? { issuer: body.issuer } : {}),
      ...(body.issueDate !== undefined ? { issue_date: body.issueDate } : {}),
      ...(body.expiryDate !== undefined ? { expiry_date: body.expiryDate } : {}),
      ...(body.fileUrl !== undefined ? { file_url: body.fileUrl } : {}),
      ...(body.note !== undefined ? { note: body.note } : {}),
    })
    .where("id", "=", id as any)
    .where("user_id", "=", user.id as any)
    .returning(["id", "title", "file_url", "updated_at"])
    .executeTakeFirst();
}

export async function deleteCert(db: Kysely<DB>, user: AuthUser, id: string) {
  return db
    .deleteFrom("volunteer_certificates")
    .where("id", "=", id as any)
    .where("user_id", "=", user.id as any)
    .returning(["id"])
    .executeTakeFirst();
}

export async function myHistory(db: Kysely<DB>, user: AuthUser) {
  return db
    .selectFrom("event_applications as a")
    .innerJoin("events as e", "e.id", "a.event_id")
    .innerJoin("organizations as o", "o.id", "e.org_id")
    .leftJoin("event_attendance as att", (join: any) =>
      join.onRef("att.event_id", "=", "a.event_id").onRef("att.user_id", "=", "a.user_id")
    )
    .select([
      "e.id as event_id",
      "e.title",
      "e.start_at",
      "o.name as org_name",
      "a.status as application_status",
      "att.status as attendance_status",
      "att.check_in_at",
    ])
    .where("a.user_id", "=", user.id as any)
    .where("a.status", "=", "APPROVED")
    .orderBy("e.start_at", "desc")
    .execute();
}
