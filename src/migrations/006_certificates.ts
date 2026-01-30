import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable("volunteer_certificates")
    .addColumn("id", "bigserial", (c) => c.primaryKey())
    .addColumn("user_id", "bigint", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("title", "text", (c) => c.notNull())
    .addColumn("issuer", "text")
    .addColumn("issue_date", "date")
    .addColumn("expiry_date", "date")
    .addColumn("file_url", "text", (c) => c.notNull())
    .addColumn("note", "text")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("idx_cert_user").on("volunteer_certificates").column("user_id").execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable("volunteer_certificates").ifExists().execute();
}
