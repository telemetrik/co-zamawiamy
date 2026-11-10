import { defineConfig, devices } from "@playwright/test";
import { databaseTarget } from "./scripts/migration-target";

const databaseUrl = process.env.E2E_DATABASE_URL;
if (!databaseUrl) {
  throw new Error("Ustaw E2E_DATABASE_URL na osobną bazę testową PostgreSQL. Zobacz README.");
}

function identity(value: string) {
  const url = new URL(value);
  return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`;
}

for (const appUrl of [process.env.DATABASE_URL, process.env.DATABASE_URL_UNPOOLED]) {
  if (appUrl && identity(appUrl) === identity(databaseUrl)) {
    throw new Error("E2E_DATABASE_URL musi wskazywać inną bazę lub branch niż baza aplikacji.");
  }
}

// Cel pochodzi z już sprawdzonej bazy E2E. Cytowanie chroni polecenie powłoki.
const migrationTarget = "'" + databaseTarget(databaseUrl).replaceAll("'", "'\\''") + "'";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run db:migrate -- --target ${migrationTarget} && npm run build && npm run start -- --port 3100`,
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 180_000,
    env: {
      PLAYWRIGHT_TEST: "1",
      DATABASE_URL: databaseUrl,
      DATABASE_URL_UNPOOLED: databaseUrl,
      NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN: "",
      NEXT_PUBLIC_POSTHOG_HOST: "",
    },
  },
});
