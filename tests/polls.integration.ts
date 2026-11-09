import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import * as schema from "../db/schema";
import { PollService } from "../lib/polls";
import { AppError, validateCreatePoll } from "../lib/validation";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("Ustaw TEST_DATABASE_URL na osobną bazę/branch testowy PostgreSQL. Testy nie używają DATABASE_URL.");
function identity(value: string) { const url = new URL(value); return `${url.hostname.replace(/-pooler(?=\.)/, "")}:${url.port || "5432"}${url.pathname}`; }
if (process.env.DATABASE_URL && identity(process.env.DATABASE_URL) === identity(connectionString)) {
  throw new Error("TEST_DATABASE_URL musi wskazywać inną bazę lub branch niż DATABASE_URL.");
}
const pool = new Pool({ connectionString, max: 5, connectionTimeoutMillis: 15_000 });
const db = drizzle(pool, { schema });
const service = new PollService(db);
const owned: string[] = [];
const input = () => validateCreatePoll({ operationId: randomUUID(), question: "Test: co jemy?", options: ["Pizza", "Żurek", "Pierogi"] });
async function create() { const id = await service.create(input()); owned.push(id); return (await service.get(id))!; }

describe("PostgreSQL: zapis i spójność danych", () => {
  before(async () => { await migrate(db, { migrationsFolder: "./drizzle" }); });
  after(async () => {
    try { if (owned.length) await db.delete(schema.polls).where(inArray(schema.polls.id, owned)); }
    finally { await pool.end(); }
  });

  test("tworzy kompletne głosowanie z zerowymi wynikami i kolejnością", async () => {
    const poll = await create();
    assert.equal(poll.totalVotes, 0);
    assert.deepEqual(poll.options.map((option) => [option.label, option.position, option.votes]), [["Pizza", 0, 0], ["Żurek", 1, 0], ["Pierogi", 2, 0]]);
    assert.equal(await service.get(randomUUID()), null);
  });

  test("równoczesne ponowienia tworzenia dają jeden rekord", async () => {
    const data = input();
    const ids = await Promise.all(Array.from({ length: 5 }, () => service.create(data)));
    owned.push(ids[0]);
    assert.equal(new Set(ids).size, 1);
    assert.equal((await service.get(ids[0]))?.options.length, 3);
    await assert.rejects(service.create({ ...data, question: "Inne pytanie" }), (e: unknown) => e instanceof AppError && e.status === 409);
  });

  test("równoczesne ponowienia głosu liczą się dokładnie raz", async () => {
    const poll = await create();
    const vote = { operationId: randomUUID(), optionId: poll.options[0].id };
    await Promise.all(Array.from({ length: 8 }, () => service.vote(poll.id, vote)));
    const result = (await service.get(poll.id))!;
    assert.equal(result.totalVotes, 1);
    assert.equal(result.options[0].votes, 1);
    await assert.rejects(service.vote(poll.id, { ...vote, optionId: poll.options[1].id }), (e: unknown) => e instanceof AppError && e.status === 409);
    assert.equal((await service.get(poll.id))?.totalVotes, 1);
  });

  test("odrzuca propozycję z innego głosowania i brakującą propozycję", async () => {
    const first = await create(); const second = await create();
    for (const optionId of [second.options[0].id, randomUUID()]) {
      await assert.rejects(service.vote(first.id, { operationId: randomUUID(), optionId }), (e: unknown) => e instanceof AppError && e.status === 404);
    }
    assert.equal((await service.get(first.id))?.totalVotes, 0);
    assert.equal((await service.get(second.id))?.totalVotes, 0);
  });

  test("sumuje głosy wielu uczestników i zachowuje zera pozostałych opcji", async () => {
    const poll = await create();
    await Promise.all([0, 0, 1].map((index) => service.vote(poll.id, { operationId: randomUUID(), optionId: poll.options[index].id })));
    assert.deepEqual((await service.get(poll.id))?.options.map((option) => option.votes), [2, 1, 0]);
    assert.equal((await service.get(poll.id))?.totalVotes, 3);
  });

  test("błąd zapisu propozycji cofa całe tworzenie", async () => {
    const data = input();
    await assert.rejects(service.create({ ...data, options: ["Pizza", "Pizza"] }));
    assert.equal((await db.select().from(schema.polls).where(eq(schema.polls.creationToken, data.operationId))).length, 0);
  });

  test("odczytuje zapisane rekordy z nowego połączenia i nowej instancji usługi", async () => {
    const poll = await create();
    await service.vote(poll.id, { operationId: randomUUID(), optionId: poll.options[0].id });
    const freshPool = new Pool({ connectionString, max: 1 });
    try {
      const freshService = new PollService(drizzle(freshPool, { schema }));
      assert.equal((await freshService.get(poll.id))?.totalVotes, 1);
    } finally { await freshPool.end(); }
  });
});
