import { randomUUID } from "node:crypto";
import { test as base, expect, type Page } from "@playwright/test";
import { Pool } from "pg";
import { isUuid } from "../../lib/validation";

export { expect };

export const test = base.extend<{ database: Pool; cleanupPolls: void }>({
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
  await expect(page.getByRole("button", { name: "Głosuję", exact: true })).toBeEnabled();
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
