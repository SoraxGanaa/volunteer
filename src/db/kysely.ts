import { Kysely, PostgresDialect } from "kysely";
import { Pool } from "pg";
import type { DB } from "./types";
import dotenv from "dotenv";
dotenv.config();
const url = process.env.DATABASE_URL;

if (!url || typeof url !== "string") {
  throw new Error("DATABASE_URL is missing");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = new Kysely<DB>({
  dialect: new PostgresDialect({ pool }),
});
