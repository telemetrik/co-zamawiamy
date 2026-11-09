import { createPoll, expect, fillPoll, test, vote } from "./fixtures";

test("ponawia tworzenie po utracie odpowiedzi i odświeżeniu bez drugiego głosowania", async ({ page, database }) => {
  const question = await fillPoll(page);
  const attempts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/polls") {
      attempts.push(request.postDataJSON().operationId);
    }
  });
  await page.route("**/api/polls", async (route) => {
    // Zapis naprawdę dochodzi do API i PostgreSQL. Ginie dopiero odpowiedź.
    const response = await route.fetch();
    expect(response.status()).toBe(201);
    await route.abort("failed");
  }, { times: 1 });
  await page.getByRole("button", { name: "Utwórz głosowanie", exact: true }).click();
  await expect(page.getByRole("region", { name: "Nowe głosowanie" }).getByRole("alert")).toContainText("Nie mamy potwierdzenia zapisu.");
  await page.reload();
  await expect(page.getByRole("region", { name: "Nowe głosowanie" }).getByRole("alert")).toContainText("Poprzednia próba nie ma potwierdzenia.");
  await expect(page.getByLabel("O co pytasz ekipę?")).toHaveValue(question);
  await expect(page.getByLabel("O co pytasz ekipę?")).toHaveAttribute("readonly", "");
  await page.getByRole("button", { name: "Ponów zapis", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toBe(attempts[0]);
  const saved = await database.query("SELECT id FROM polls WHERE question = $1", [question]);
  expect(saved.rows).toHaveLength(1);
  expect(new URL(page.url()).pathname).toBe(`/p/${saved.rows[0].id}`);
  const options = await database.query("SELECT id FROM options WHERE poll_id = $1", [saved.rows[0].id]);
  expect(options.rows).toHaveLength(3);
  expect(await page.evaluate(() => sessionStorage.getItem("co-zamawiamy:pending-poll"))).toBeNull();
});

test("ponawia głos po utracie odpowiedzi i odświeżeniu bez podwójnego naliczenia", async ({ page, database }) => {
  await createPoll(page);
  const pollId = new URL(page.url()).pathname.split("/").pop()!;
  const attempts: { operationId: string; optionId: string }[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().endsWith(`/api/polls/${pollId}/votes`)) {
      attempts.push(request.postDataJSON());
    }
  });
  await page.route(`**/api/polls/${pollId}/votes`, async (route) => {
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    await route.abort("failed");
  }, { times: 1 });
  await page.getByRole("radio", { name: "Pizza", exact: true }).check();
  await page.getByRole("button", { name: "Głosuję", exact: true }).click();
  await expect(page.getByRole("region", { name: "Oddaj głos" }).getByRole("alert")).toContainText("Nie mamy potwierdzenia zapisu.");
  await page.reload();
  await expect(page.getByRole("region", { name: "Oddaj głos" }).getByRole("alert")).toContainText("Poprzednia próba nie ma potwierdzenia.");
  await expect(page.getByRole("radio", { name: "Pizza", exact: true })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Sushi", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Ponów zapis głosu", exact: true }).click();
  await expect(page.locator(".total-votes")).toHaveText("1 głos");
  expect(attempts).toHaveLength(2);
  expect(attempts[1]).toEqual(attempts[0]);
  const saved = await database.query(
    "SELECT v.id FROM votes v JOIN options o ON o.id = v.option_id WHERE o.poll_id = $1",
    [pollId],
  );
  expect(saved.rows).toEqual([{ id: attempts[0].operationId }]);
  await page.reload();
  await expect(page.locator(".total-votes")).toHaveText("1 głos");
  await expect(page.getByRole("button", { name: "Głosuję", exact: true })).toHaveCount(0);
});

test("zachowuje wyniki przy błędzie odczytu i sam wraca do aktualizacji", async ({ page, browser }) => {
  const url = await createPoll(page);
  await vote(page, "Pizza");
  await expect(page.getByText("Wyniki na żywo", { exact: true })).toBeVisible();
  const endpoint = `**/api/polls/${new URL(url).pathname.split("/").pop()}`;
  await page.route(endpoint, (route) => route.fulfill({ status: 503, json: { error: "E2E: przerwa w odczycie" } }));
  await expect(page.getByText("Brak aktualizacji. Ponawiam połączenie...", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".total-votes")).toHaveText("1 głos");
  await page.evaluate(() => { document.documentElement.dataset.e2eLive = "same-document"; });

  const participant = await browser.newContext();
  try {
    const otherPage = await participant.newPage();
    await otherPage.goto(url);
    await vote(otherPage, "Sushi");
    await page.bringToFront();
    await expect(page.locator(".total-votes")).toHaveText("1 głos");
    await page.unroute(endpoint);
    await expect(page.getByText("Wyniki na żywo", { exact: true })).toBeVisible({ timeout: 10_000 });
    await expect(page.locator(".total-votes")).toHaveText("2 głosy");
    await expect(page.locator("html")).toHaveAttribute("data-e2e-live", "same-document");
  } finally { await participant.close(); }
});

test("wraca do wyników na żywo po odzyskaniu połączenia", async ({ page, context }) => {
  await createPoll(page);
  await vote(page, "Pizza");
  await expect(page.getByText("Wyniki na żywo", { exact: true })).toBeVisible();
  try {
    await context.setOffline(true);
    await expect(page.getByText("Brak aktualizacji. Ponawiam połączenie...", { exact: true })).toBeVisible();
    await expect(page.locator(".total-votes")).toHaveText("1 głos");
  } finally { await context.setOffline(false); }
  await expect(page.getByText("Wyniki na żywo", { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.locator(".total-votes")).toHaveText("1 głos");
});
