import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

async function createPoll(page: Page) {
  const question = `Lunch E2E ${randomUUID()}`;
  await page.goto("/");
  await page.getByLabel("O co pytasz ekipę?").fill(question);
  await page.getByLabel("Propozycja 1", { exact: true }).fill("Pizza");
  await page.getByLabel("Propozycja 2", { exact: true }).fill("Sushi");
  await page.getByLabel("Propozycja 3", { exact: true }).fill("Pierogi");
  await page.getByRole("button", { name: "Utwórz głosowanie", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: question, exact: true })).toBeVisible();
  return page.url();
}

test("formularz odrzuca powtarzające się propozycje", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Propozycja 1", { exact: true }).fill("Pizza");
  await page.getByLabel("Propozycja 2", { exact: true }).fill("pizza");
  await page.getByLabel("Propozycja 3", { exact: true }).fill("Sushi");
  await page.getByRole("button", { name: "Utwórz głosowanie", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Sprawdź zaznaczone pola.");
  await expect(page.getByLabel("Propozycja 2", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL("/");
});

test("tworzy głosowanie, udostępnia QR i pamięta oddany głos po odświeżeniu", async ({ page }) => {
  const url = await createPoll(page);
  await expect(page.getByRole("img", { name: "Kod QR z linkiem do głosowania" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Otwórz głosowanie", exact: true })).toHaveAttribute("href", url);

  await page.getByRole("button", { name: "Głosuję", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Wybierz jedną propozycję, zanim oddasz głos.");
  await page.getByRole("radio", { name: "Pizza", exact: true }).check();
  await page.getByRole("button", { name: "Głosuję", exact: true }).click();
  const results = page.getByRole("region", { name: "Wyniki głosowania" });
  await expect(results.getByText("Twój głos został zapisany", { exact: true })).toBeVisible();
  await expect(results.locator(".total-votes")).toHaveText("1 głos");
  await expect(results.getByRole("listitem").filter({ hasText: "Pizza" })).toContainText("100%");

  await page.reload();
  await expect(results.locator(".total-votes")).toHaveText("1 głos");
  await expect(page.getByRole("button", { name: "Głosuję", exact: true })).toHaveCount(0);
});

test("aktualizuje wyniki po głosie drugiego uczestnika bez odświeżania", async ({ page, browser }) => {
  const url = await createPoll(page);
  await page.getByRole("radio", { name: "Pizza", exact: true }).check();
  await page.getByRole("button", { name: "Głosuję", exact: true }).click();
  const results = page.getByRole("region", { name: "Wyniki głosowania" });
  await expect(results.locator(".total-votes")).toHaveText("1 głos");

  const participant = await browser.newContext();
  try {
    const otherPage = await participant.newPage();
    await otherPage.goto(url);
    await otherPage.getByRole("radio", { name: "Sushi", exact: true }).check();
    await otherPage.getByRole("button", { name: "Głosuję", exact: true }).click();
    await expect(otherPage.locator(".total-votes")).toHaveText("2 głosy");

    await page.bringToFront();
    await expect(results.locator(".total-votes")).toHaveText("2 głosy", { timeout: 10_000 });
    for (const option of ["Pizza", "Sushi"]) {
      await expect(results.getByRole("listitem").filter({ hasText: option })).toContainText("50%");
    }
  } finally {
    await participant.close();
  }
});
