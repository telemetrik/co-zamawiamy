import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Brakuje DATABASE_URL w .env.local lub w środowisku procesu.");
  process.exit(1);
}
const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 15_000 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Migracje zastosowane.");
} catch {
  console.error("Migracja nie powiodła się. Sprawdź połączenie, uprawnienia i branch bazy w Neon.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
