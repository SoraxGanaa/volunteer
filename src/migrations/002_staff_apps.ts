import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>) {
  await db.schema
    .createTable("org_staff_applications")
    .addColumn("id", "bigserial", (c) => c.primaryKey())
    .addColumn("org_id", "bigint", (c) =>
      c.notNull().references("organizations.id").onDelete("cascade")
    )
    .addColumn("user_id", "bigint", (c) =>
      c.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("status", "text", (c) => c.notNull().defaultTo("PENDING"))
    .addColumn("message", "text")
    .addColumn("decided_by", "bigint", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("decided_at", "timestamptz")
    .addColumn("decision_note", "text")
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("uq_staff_app", ["org_id", "user_id"])
    .execute();

  await db.schema
    .createIndex("idx_staff_app_org")
    .on("org_staff_applications")
    .column("org_id")
    .execute();

  await db.schema
    .createIndex("idx_staff_app_user")
    .on("org_staff_applications")
    .column("user_id")
    .execute();

  await db.schema
    .createIndex("idx_staff_app_status")
    .on("org_staff_applications")
    .column("status")
    .execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable("org_staff_applications").ifExists().execute();
}
