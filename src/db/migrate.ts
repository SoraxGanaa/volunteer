import dotenv from "dotenv";
dotenv.config();

import path from "node:path";
import { promises as fs } from "node:fs";
import { Migrator, FileMigrationProvider } from "kysely";
import { db } from "./kysely";

async function main() {
  // build үед dist/migrations болж хувирна
  const migrationFolder = path.join(process.cwd(), "dist", "migrations");

  const migrator = new Migrator({
    db,
    provider: new FileMigrationProvider({
      fs,
      path,
      migrationFolder,
    }),
  });

  const { error, results } = await migrator.migrateToLatest();

  results?.forEach((it) => {
    if (it.status === "Success") console.log(`✅ ${it.migrationName}`);
    else if (it.status === "Error") console.log(`❌ ${it.migrationName}`);
  });

  if (error) {
    console.error(error);
    process.exit(1);
  }

  await db.destroy();
}

main();
