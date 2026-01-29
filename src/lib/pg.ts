import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";

if (!connectionString) {
  throw new Error("Missing DATABASE_URL (or DATABASE_URL_UNPOOLED)");
}

export const pgPool = new Pool({
  connectionString,
  max: 5,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 5_000,
});

