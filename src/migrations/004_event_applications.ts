import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable("event_applications")
    .addColumn("id", "bigserial", (c) => c.primaryKey())
    .addColumn("event_id", "bigint", (c) => c.notNull().references("events.id").onDelete("cascade"))
    .addColumn("user_id", "bigint", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("status", "text", (c) => c.notNull().defaultTo("PENDING")) // PENDING/APPROVED/REJECTED/CANCELLED
    .addColumn("message", "text")
    .addColumn("decided_by", "bigint", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("decided_at", "timestamptz")
    .addColumn("decision_note", "text")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("uq_event_user", ["event_id", "user_id"])
    .execute();

  await db.schema.createIndex("idx_app_event").on("event_applications").column("event_id").execute();
  await db.schema.createIndex("idx_app_user").on("event_applications").column("user_id").execute();
  await db.schema.createIndex("idx_app_status").on("event_applications").column("status").execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable("event_applications").ifExists().execute();
}
