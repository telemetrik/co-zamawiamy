import { createPoll, expect, fillPoll, test, vote } from "./fixtures";

test("wyniki pięciu propozycji działają po zapisie głosu i odświeżeniu", async ({ page, database }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  // Kontrola: zwykłe głosowanie nadal działa.
  await createPoll(page);
  await vote(page, "Pizza");

  await fillPoll(page);
  for (const [index, label] of [[4, "Żurek"], [5, "Sałatka"]] as const) {
    await page.getByRole("button", { name: "Dodaj propozycję" }).click();
    await page.getByLabel(`Propozycja ${index}`, { exact: true }).fill(label);
  }
  await page.getByRole("button", { name: "Utwórz głosowanie", exact: true }).click();
  await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
  const pollId = new URL(page.url()).pathname.split("/").at(-1)!;
  await page.getByRole("radio", { name: "Sałatka", exact: true }).check();
  await page.getByRole("button", { name: "Głosuję", exact: true }).click();

  await expect(page.getByRole("heading", { name: "Tak głosuje ekipa", exact: true })).toBeVisible();
  await expect(page.locator(".result-row")).toHaveCount(5);
  await expect(page.locator(".result-row").filter({ hasText: "Sałatka" })).toContainText("100%");

  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), `co-zamawiamy:vote:${pollId}`);
  expect(saved.status).toBe("saved");
  const result = await database.query(
    "SELECT v.id, o.label FROM votes v JOIN options o ON o.id = v.option_id WHERE o.poll_id = $1",
    [pollId],
  );
  expect(result.rows).toEqual([{ id: saved.operationId, label: "Sałatka" }]);

  // Odświeżenie pokazuje wyniki z zachowanym głosem i nie ponawia zapisu.
  let voteRequests = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === `/api/polls/${pollId}/votes`) voteRequests++;
  });
  await page.reload();
  await expect(page.getByRole("heading", { name: "Tak głosuje ekipa", exact: true })).toBeVisible();
  await expect(page.locator(".result-row")).toHaveCount(5);
  await expect(page.locator(".result-row").filter({ hasText: "Sałatka" })).toContainText("Twój wybór");
  await expect(page.locator(".result-row").filter({ hasText: "Sałatka" })).toContainText("100%");
  expect(voteRequests).toBe(0);
  expect(pageErrors).toEqual([]);
});
