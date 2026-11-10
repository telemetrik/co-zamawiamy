import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { requireMigrationTarget } from "./migration-target";

let destination: ReturnType<typeof requireMigrationTarget>;
try {
  destination = requireMigrationTarget(
    process.argv.slice(2),
    process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL,
  );
} catch (error) {
  console.error(error instanceof Error ? error.message : "Nie udało się sprawdzić celu migracji.");
  process.exit(1);
}
console.log(`Cel migracji: ${destination.target}`);
const pool = new Pool({ connectionString: destination.connectionString, max: 1, connectionTimeoutMillis: 15_000 });
try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Migracje zastosowane.");
} catch {
  console.error("Migracja nie powiodła się. Sprawdź połączenie, uprawnienia i branch bazy w Neon.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
