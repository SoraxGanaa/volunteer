import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "../db/kysely";

async function upsertUser(email: string, password: string, role: "SUPERADMIN" | "ORG_ADMIN") {
  const existing = await db
    .selectFrom("users")
    .select(["id"])
    .where("email", "=", email)
    .executeTakeFirst();

  if (existing) return;

  const password_hash = await bcrypt.hash(password, 10);

  await db
    .insertInto("users")
    .values({
      role,
      email,
      phone: null,
      password_hash,
      first_name: role,
      last_name: "Seed",
      status: "ACTIVE",
    })
    .execute();
}

async function main() {
  const saEmail = process.env.SEED_SUPERADMIN_EMAIL!;
  const saPass = process.env.SEED_SUPERADMIN_PASS!;
  const oaEmail = process.env.SEED_ORGADMIN_EMAIL!;
  const oaPass = process.env.SEED_ORGADMIN_PASS!;

  if (!saEmail || !saPass || !oaEmail || !oaPass) {
    console.error("Missing seed env vars");
    process.exit(1);
  }

  await upsertUser(saEmail, saPass, "SUPERADMIN");
  await upsertUser(oaEmail, oaPass, "ORG_ADMIN");

  console.log("✅ Seed done");
  await db.destroy();
}

main().catch(async (e) => {
  console.error(e);
  await db.destroy();
  process.exit(1);
});
