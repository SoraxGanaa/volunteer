import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable("events")
    .addColumn("id", "bigserial", (c) => c.primaryKey())
    .addColumn("org_id", "bigint", (c) => c.notNull().references("organizations.id").onDelete("cascade"))
    .addColumn("created_by", "bigint", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("title", "text", (c) => c.notNull())
    .addColumn("description", "text")
    .addColumn("category", "text")
    .addColumn("city", "text")
    .addColumn("address", "text")
    .addColumn("lat", "numeric")
    .addColumn("lng", "numeric")
    .addColumn("start_at", "timestamptz", (c) => c.notNull())
    .addColumn("end_at", "timestamptz")
    .addColumn("capacity", "int4", (c) => c.notNull().defaultTo(0)) // 0 => unlimited
    .addColumn("status", "text", (c) => c.notNull().defaultTo("DRAFT")) // DRAFT/PUBLISHED/CANCELLED/COMPLETED
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("idx_events_org").on("events").column("org_id").execute();
  await db.schema.createIndex("idx_events_status").on("events").column("status").execute();
  await db.schema.createIndex("idx_events_start").on("events").column("start_at").execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable("events").ifExists().execute();
}
