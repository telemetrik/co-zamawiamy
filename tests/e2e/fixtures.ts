import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { isUuid } from "../../lib/validation";

export { expect };

export const test = base.extend<{
  database: Pool;
  cleanupPolls: void;
  pollFormVariant: "control" | "two-fields" | null;
  oneClickVote: boolean | null;
  mockPostHog: void;
}>({
  pollFormVariant: null,
  oneClickVote: null,
  mockPostHog: [async ({ context, pollFormVariant, oneClickVote }, use) => {
    await context.route("https://posthog.test/**", async (route) => {
      const pathname = new URL(route.request().url()).pathname;
      if (pathname.endsWith(".js")) {
        await route.fulfill({ contentType: "application/javascript", body: "" });
        return;
      }
      const formFlag = "poll-starting-options";
      const voteFlag = "one-click-vote";
      const flags = {
        ...(pollFormVariant && {
          [formFlag]: { key: formFlag, enabled: true, variant: pollFormVariant, metadata: { id: 1, version: 1, has_experiment: true } },
        }),
        ...(oneClickVote !== null && {
          [voteFlag]: { key: voteFlag, enabled: oneClickVote, variant: null, metadata: { id: 2, version: 1 } },
        }),
      };
      await route.fulfill({
        headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" },
        json: pathname === "/flags/" ? { flags, errorsWhileComputingFlags: false }
          : pathname.endsWith("/config") ? {
            analytics: { endpoint: "/i/v0/e/" }, supportedCompression: ["gzip", "gzip-js"],
            defaultIdentifiedOnly: true, hasFeatureFlags: true,
          } : { status: 1 },
      });
    });
    await use();
  }, { auto: true }],
  database: async ({}, use) => {
    const database = new Pool({
      connectionString: process.env.E2E_DATABASE_URL,
      max: 1,
      connectionTimeoutMillis: 10_000,
    });
    try { await use(database); }
    finally { await database.end(); }
  },
  cleanupPolls: [async ({ context, database }, use) => {
    const operations = new Set<string>();
    context.on("request", (request) => {
      if (request.method() !== "POST" || new URL(request.url()).pathname !== "/api/polls") return;
      const operationId = request.postDataJSON()?.operationId;
      if (isUuid(operationId)) operations.add(operationId);
    });
    try { await use(); }
    finally {
      // Usuwamy tylko operacje tego testu, także po utracie odpowiedzi lub nieudanej asercji.
      // Klucze obce usuwają razem z głosowaniem jego propozycje i głosy.
      if (operations.size) {
        await database.query("DELETE FROM polls WHERE creation_token = ANY($1::uuid[])", [[...operations]]);
      }
    }
  }, { auto: true }],
});

export async function fillPoll(page: Page) {
  const question = `Lunch E2E ${randomUUID()}`;
  await page.goto("/");
  await page.getByLabel("O co pytasz ekipę?").fill(question);
  for (const [index, option] of ["Pizza", "Sushi", "Pierogi"].entries()) {
    await page.getByLabel(`Propozycja ${index + 1}`, { exact: true }).fill(option);
  }
  return question;
}

export async function createPoll(page: Page) {
  const question = await fillPoll(page);
  await page.getByRole("button", { name: "Utwórz głosowanie", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: question, exact: true })).toBeVisible();
  return page.url();
}

export async function vote(page: Page, option: string) {
  await page.getByRole("radio", { name: option, exact: true }).check();
  await page.getByRole("button", { name: "Głosuję", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tak głosuje ekipa" })).toBeVisible();
}

export async function expectNoOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
}
