import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalDb = globalThis as unknown as { lunchPool?: Pool };

export function getDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  const pool = globalDb.lunchPool ?? new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    statement_timeout: 15_000,
  });
  if (!globalDb.lunchPool) {
    pool.on("error", () => console.error("DATABASE_IDLE_CONNECTION_ERROR"));
    globalDb.lunchPool = pool;
  }
  return drizzle(pool, { schema });
}
