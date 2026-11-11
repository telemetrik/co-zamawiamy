import { gunzipSync } from "node:zlib";
import type { Request } from "@playwright/test";
import { expect, test } from "./fixtures";

const flagKey = "poll-starting-options";
const proposal = /^Propozycja \d+$/;

function postHogPayload(request: Request) {
  const body = request.postDataBuffer();
  if (!body) return null;
  if (body[0] === 0x1f && body[1] === 0x8b) return JSON.parse(gunzipSync(body).toString());
  return request.postDataJSON();
}

for (const [variant, count] of [["control", 3], ["two-fields", 2]] as const) {
  test.describe(`eksperyment: ${variant}`, () => {
    test.use({ pollFormVariant: variant });

    test(`zaczyna od ${count} pól i zachowuje przydział po odświeżeniu`, async ({ page }) => {
      const flagRequest = () => page.waitForRequest((request) =>
        request.method() === "POST" && request.url().startsWith("https://posthog.test/flags/"));

      const firstRequest = flagRequest();
      await page.goto("/");
      await expect(page.getByRole("textbox", { name: proposal })).toHaveCount(count);
      const firstDevice = postHogPayload(await firstRequest)?.$device_id;
      expect(firstDevice).toBeTruthy();

      const nextRequest = flagRequest();
      await page.reload();
      await expect(page.getByRole("textbox", { name: proposal })).toHaveCount(count);
      expect(postHogPayload(await nextRequest)?.$device_id).toBe(firstDevice);

      for (let index = count; index < 5; index++) {
        await page.getByRole("button", { name: "Dodaj propozycję" }).click();
      }
      await expect(page.getByRole("textbox", { name: proposal })).toHaveCount(5);
      await expect(page.getByRole("button", { name: "Maksymalnie 5 propozycji" })).toBeDisabled();
    });
  });
}

test.describe("zapis w wariancie z dwoma polami", () => {
  test.use({ pollFormVariant: "two-fields" });

  test("raportuje ekspozycję i zapis pod tym samym identyfikatorem", async ({ page, context }) => {
    // PostHog pomija zdarzenia od automatyzacji. Tutaj wysyłamy je wyłącznie do atrapy.
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => false });
      Object.defineProperty(navigator, "userAgentData", { get: () => undefined });
    });
    const events: Array<{ event: string; properties: Record<string, unknown> }> = [];
    context.on("request", (request) => {
      if (!request.url().startsWith("https://posthog.test/") || request.method() !== "POST") return;
      if (new URL(request.url()).pathname === "/flags/") return;
      const data = postHogPayload(request);
      if (data?.event) events.push(data);
      else if (Array.isArray(data?.batch)) events.push(...data.batch);
    });
    await page.goto("/");
    await expect(page.getByRole("textbox", { name: proposal })).toHaveCount(2);

    const exposure = () => events.find(({ event, properties }) =>
      event === "$feature_flag_called" && properties.$feature_flag === flagKey);
    // SDK wysyła ekspozycje w paczkach. Poczekaj na żądanie przed opuszczeniem formularza.
    await expect.poll(() => exposure()?.properties.$feature_flag_response).toBe("two-fields");
    expect(exposure()?.properties.$feature_flag_has_experiment).toBe(true);
    expect(exposure()?.properties.distinct_id).toEqual(expect.any(String));

    await page.getByRole("textbox", { name: "Propozycja 1", exact: true }).fill("Pizza");
    await page.getByRole("textbox", { name: "Propozycja 2", exact: true }).fill("Sushi");
    await page.getByRole("button", { name: "Utwórz głosowanie", exact: true }).click();
    await expect(page).toHaveURL(/\/p\/[0-9a-f-]{36}$/);
    await expect.poll(() => events.find(({ event }) => event === "poll_created")?.properties.option_count).toBe(2);

    expect(exposure()?.properties.distinct_id).toBe(events.find(({ event }) => event === "poll_created")?.properties.distinct_id);
  });
});
