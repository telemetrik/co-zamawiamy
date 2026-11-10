import { randomUUID } from "node:crypto";
import { createPoll, expect, expectNoOverflow, fillPoll, test, vote } from "./fixtures";

test("waliduje puste pytanie i propozycje", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("O co pytasz ekipę?").fill("");
  await page.getByRole("button", { name: "Utwórz głosowanie", exact: true }).click();
  await expect(page.getByRole("region", { name: "Nowe głosowanie" }).getByRole("alert")).toHaveText("Sprawdź zaznaczone pola.");
  await expect(page.getByRole("region", { name: "Nowe głosowanie" }).getByRole("alert")).toBeFocused();
  await expect(page.getByLabel("O co pytasz ekipę?")).toHaveAttribute("aria-invalid", "true");
  for (let index = 1; index <= 3; index++) {
    await expect(page.getByLabel(`Propozycja ${index}`, { exact: true })).toHaveAttribute("aria-invalid", "true");
  }
  await expect(page).toHaveURL("/");
});

test("odrzuca duplikaty niezależnie od wielkości liter i spacji", async ({ page }) => {
  await fillPoll(page);
  await page.getByLabel("Propozycja 2", { exact: true }).fill("  pizza  ");
  await page.getByRole("button", { name: "Utwórz głosowanie", exact: true }).click();
  await expect(page.getByRole("region", { name: "Nowe głosowanie" }).getByRole("alert")).toHaveText("Sprawdź zaznaczone pola.");
  for (const index of [1, 2]) {
    await expect(page.getByLabel(`Propozycja ${index}`, { exact: true })).toHaveAttribute("aria-invalid", "true");
  }
  await expect(page).toHaveURL("/");
});

test("pozwala dodać najwyżej 5 i zostawić co najmniej 2 propozycje", async ({ page }) => {
  await page.goto("/");
  for (const index of [4, 5]) {
    await page.getByRole("button", { name: "Dodaj propozycję" }).click();
    await expect(page.getByLabel(`Propozycja ${index}`, { exact: true })).toBeFocused();
  }
  await expect(page.getByRole("button", { name: "Maksymalnie 5 propozycji" })).toBeDisabled();
  for (const index of [5, 4, 3]) {
    await page.getByRole("button", { name: `Usuń propozycję ${index}`, exact: true }).click();
  }
  await expect(page.getByRole("textbox")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Usuń propozycję 1" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Usuń propozycję 2" })).toBeDisabled();
  await expectNoOverflow(page);
});

test("tworzy głosowanie, udostępnia link i QR, zapisuje głos i pamięta go po odświeżeniu", async ({ page, context }) => {
  const url = await createPoll(page);
  const shareUrl = new URL(new URL(url).pathname, "https://co-zamawiamy.vercel.app/").href;
  await expect(page.getByRole("img", { name: "Kod QR z linkiem do głosowania" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Otwórz głosowanie", exact: true })).toHaveAttribute("href", shareUrl);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Kopiuj link", exact: true }).click();
  await expect(page.getByRole("button", { name: "Link skopiowany", exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(shareUrl);

  await page.getByRole("button", { name: "Głosuję", exact: true }).click();
  await expect(page.getByRole("region", { name: "Oddaj głos" }).getByRole("alert")).toHaveText("Wybierz jedną propozycję, zanim oddasz głos.");
  await vote(page, "Pizza");
  await expect(page.getByText("Twój głos został zapisany", { exact: true })).toBeVisible();
  await expect(page.locator(".total-votes")).toHaveText("1 głos");
  await expect(page.getByRole("listitem").filter({ hasText: "Pizza" })).toContainText("100%");
  await expect(page.getByRole("listitem").filter({ hasText: "Sushi" })).toContainText("0%");
  await expectNoOverflow(page);

  await page.reload();
  await expect(page.locator(".total-votes")).toHaveText("1 głos");
  await expect(page.getByRole("button", { name: "Głosuję", exact: true })).toHaveCount(0);
  await expect(page.getByText("Twój wybór", { exact: true })).toBeVisible();
  await page.getByRole("link", { name: "Utwórz własne głosowanie" }).click();
  await expect(page.getByRole("heading", { name: "Nowe głosowanie" })).toBeVisible();
});

test("udostępnia ręczne kopiowanie, gdy schowek odmawia dostępu", async ({ page }) => {
  const url = await createPoll(page);
  const shareUrl = new URL(new URL(url).pathname, "https://co-zamawiamy.vercel.app/").href;
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => { throw new DOMException("Denied", "NotAllowedError"); };
  });
  await page.getByRole("button", { name: "Kopiuj link", exact: true }).click();
  const link = page.getByLabel("Nie udało się skopiować. Zaznacz i skopiuj link:");
  await expect(link).toHaveValue(shareUrl);
  await expect(link).toHaveAttribute("readonly", "");
});

test("liczy głosy dwóch uczestników i aktualizuje otwartą stronę bez przeładowania", async ({ page, browser }) => {
  const url = await createPoll(page);
  await vote(page, "Pizza");
  await expect(page.locator(".total-votes")).toHaveText("1 głos");
  // Znacznik znika przy nawigacji - samo osiągnięcie 2 głosów nie dowodzi aktualizacji na żywo.
  await page.evaluate(() => { document.documentElement.dataset.e2eLive = "same-document"; });
  const participant = await browser.newContext();
  try {
    const otherPage = await participant.newPage();
    await otherPage.goto(url);
    await vote(otherPage, "Sushi");
    await expect(otherPage.locator(".total-votes")).toHaveText("2 głosy");
    await page.bringToFront();
    await expect(page.locator(".total-votes")).toHaveText("2 głosy", { timeout: 10_000 });
    for (const option of ["Pizza", "Sushi"]) {
      await expect(page.getByRole("listitem").filter({ hasText: option })).toContainText("50%");
    }
    await expect(page.getByRole("listitem").filter({ hasText: "Pierogi" })).toContainText("0%");
    await expect(page.locator("html")).toHaveAttribute("data-e2e-live", "same-document");
  } finally { await participant.close(); }
});

for (const pollId of ["nieprawidlowy-link", randomUUID()]) {
  test(`pokazuje brak głosowania dla ${pollId === "nieprawidlowy-link" ? "błędnego" : "nieistniejącego"} identyfikatora`, async ({ page }) => {
    await page.goto(`/p/${pollId}`);
    await expect(page.getByRole("heading", { name: "Tu nie ma głosowania" })).toBeVisible();
    await page.getByRole("link", { name: "Wróć na stronę główną" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: "Nowe głosowanie" })).toBeVisible();
  });
}
