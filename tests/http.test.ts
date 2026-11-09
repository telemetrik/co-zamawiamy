import assert from "node:assert/strict";
import { test } from "node:test";
import { readJson } from "../lib/http";
import { AppError } from "../lib/validation";

function request(origin: string, body = "{}", type = "application/json") {
  return new Request("http://0.0.0.0:3000/api/polls", {
    method: "POST", body, headers: { origin, host: "localhost:3000", "content-type": type },
  });
}

test("przyjmuje ten sam publiczny host mimo wewnętrznego adresu serwera", async () => {
  assert.deepEqual(await readJson(request("http://localhost:3000")), {});
});

test("odrzuca obcy Origin, zły JSON, typ danych i zbyt duże żądanie", async () => {
  for (const value of [request("https://other.example"), request("null"), request("http://localhost:3000", "{"), request("http://localhost:3000", "{}", "text/plain"), request("http://localhost:3000", "a".repeat(8193))]) {
    await assert.rejects(readJson(value), AppError);
  }
});
