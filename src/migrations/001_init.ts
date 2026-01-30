import { Kysely, sql } from "kysely";

export async function up(db: Kysely<any>) {
  // USERS
  await db.schema
    .createTable("users")
    .addColumn("id", "bigserial", (c) => c.primaryKey())
    .addColumn("role", "text", (c) => c.notNull().defaultTo("USER"))
    .addColumn("email", "text", (c) => c.unique())
    .addColumn("phone", "text", (c) => c.unique())
    .addColumn("password_hash", "text", (c) => c.notNull())
    .addColumn("first_name", "text")
    .addColumn("last_name", "text")
    .addColumn("status", "text", (c) => c.notNull().defaultTo("ACTIVE"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  // ORGANIZATIONS
  await db.schema
    .createTable("organizations")
    .addColumn("id", "bigserial", (c) => c.primaryKey())
    .addColumn("name", "text", (c) => c.notNull())
    .addColumn("email", "text")
    .addColumn("phone", "text")
    .addColumn("logo_url", "text")
    .addColumn("description", "text")
    .addColumn("status", "text", (c) => c.notNull().defaultTo("PENDING"))
    .addColumn("created_by", "bigint", (c) => c.references("users.id").onDelete("set null"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .execute();

  await db.schema.createIndex("idx_org_status").on("organizations").column("status").execute();

  // ORG_MEMBERS (энд л ORG_STAFF байна)
  await db.schema
    .createTable("org_members")
    .addColumn("id", "bigserial", (c) => c.primaryKey())
    .addColumn("org_id", "bigint", (c) => c.notNull().references("organizations.id").onDelete("cascade"))
    .addColumn("user_id", "bigint", (c) => c.notNull().references("users.id").onDelete("cascade"))
    .addColumn("org_role", "text", (c) => c.notNull().defaultTo("STAFF"))
    .addColumn("status", "text", (c) => c.notNull().defaultTo("ACTIVE"))
    .addColumn("created_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addColumn("updated_at", "timestamptz", (c) => c.notNull().defaultTo(sql`now()`))
    .addUniqueConstraint("uq_org_member", ["org_id", "user_id"])
    .execute();

  await db.schema.createIndex("idx_org_members_org").on("org_members").column("org_id").execute();
  await db.schema.createIndex("idx_org_members_user").on("org_members").column("user_id").execute();
}

export async function down(db: Kysely<any>) {
  await db.schema.dropTable("org_members").ifExists().execute();
  await db.schema.dropTable("organizations").ifExists().execute();
  await db.schema.dropTable("users").ifExists().execute();
}
