import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable("event_attendance")
    .addColumn("id", "bigserial", (c) => c.primaryKey())
    .addColumn("event_id", "bigint", (c) => c.notNull().references("events.id").onDelete("cascade"))
    .addColumn("user_id", "bigint", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("status", "text", (c) => c.notNull()) // PRESENT/ABSENT/LATE/EXCUSED
    .addColumn("check_in_at", "timestamptz")
    .addColumn("note", "text")
    .addColumn("marked_by", "bigint", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("marked_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("uq_attendance", ["event_id", "user_id"])
    .execute();

  await db.schema.createIndex("idx_att_event").on("event_attendance").column("event_id").execute();
  await db.schema.createIndex("idx_att_user").on("event_attendance").column("user_id").execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable("event_attendance").ifExists().execute();
}
