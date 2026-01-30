import type { Kysely } from "kysely";
import type { DB } from "../../db/types";

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
      "e.created_by",
      "o.status as org_status",
      "o.created_by as org_owner",
    ])
    .where("e.id", "=", eventId as any)
    .executeTakeFirst();
}
