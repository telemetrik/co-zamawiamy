import { createPoll, expect, expectNoOverflow, test, vote } from "./fixtures";

test.describe("włączona flaga one-click-vote", () => {
  test.use({ oneClickVote: true });

  test("jeden przycisk zapisuje wybraną opcję i otwiera wyniki", async ({ page }) => {
    await createPoll(page);
    for (const option of ["Pizza", "Sushi", "Pierogi"]) {
      await expect(page.getByRole("button", { name: `Głosuję na "${option}"`, exact: true })).toBeEnabled();
    }
    await expect(page.getByRole("radio")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Głosuję", exact: true })).toHaveCount(0);
    await expectNoOverflow(page);

    await page.getByRole("button", { name: 'Głosuję na "Sushi"', exact: true }).click();
    await expect(page.getByRole("heading", { name: "Tak głosuje ekipa" })).toBeVisible();
    await expect(page.locator(".total-votes")).toHaveText("1 głos");
    await expect(page.getByRole("listitem").filter({ hasText: "Sushi" })).toContainText("Twój wybór");
    await page.reload();
    await expect(page.locator(".total-votes")).toHaveText("1 głos");
  });

  test("po utracie odpowiedzi ponawia ten sam głos także po odświeżeniu", async ({ page }) => {
    const url = await createPoll(page);
    const pollId = new URL(url).pathname.split("/").pop();
    const endpoint = `/api/polls/${pollId}/votes`;
    const attempts: unknown[] = [];
    page.on("request", (request) => {
      if (request.method() === "POST" && new URL(request.url()).pathname === endpoint) {
        attempts.push(request.postDataJSON());
      }
    });
    await page.route(`**${endpoint}`, async (route) => {
      const response = await route.fetch();
      expect(response.status()).toBe(200);
      await route.abort("failed");
    }, { times: 1 });

    await page.getByRole("button", { name: 'Głosuję na "Pizza"', exact: true }).click();
    const voteAlert = page.getByRole("region", { name: "Oddaj głos" }).getByRole("alert");
    await expect(voteAlert).toContainText("Nie mamy potwierdzenia zapisu.");
    await expect(page.getByRole("button", { name: 'Głosuję na "Sushi"', exact: true })).toBeDisabled();
    await page.reload();
    await expect(voteAlert).toContainText("Poprzednia próba nie ma potwierdzenia.");
    await page.getByRole("button", { name: 'Ponów zapis głosu na "Pizza"', exact: true }).click();
    await expect(page.locator(".total-votes")).toHaveText("1 głos");
    expect(attempts).toHaveLength(2);
    expect(attempts[1]).toEqual(attempts[0]);
  });

  test("wraca do głosowania dwuetapowego, gdy PostHog przestaje odpowiadać", async ({ page }) => {
    await createPoll(page);
    await expect(page.getByRole("button", { name: 'Głosuję na "Pizza"', exact: true })).toBeEnabled();
    await page.route("https://posthog.test/flags/**", (route) => route.abort("failed"));
    await page.reload();
    await expect(page.getByRole("radio", { name: "Pizza", exact: true })).toBeVisible();
    await vote(page, "Pizza");
    await expect(page.locator(".total-votes")).toHaveText("1 głos");
  });
});

test.describe("wyłączona flaga one-click-vote", () => {
  test.use({ oneClickVote: false });

  test("najpierw wybiera opcję, potem zapisuje głos", async ({ page }) => {
    await createPoll(page);
    await vote(page, "Pizza");
    await expect(page.locator(".total-votes")).toHaveText("1 głos");
  });
});
