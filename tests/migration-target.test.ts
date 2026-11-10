import assert from "node:assert/strict";
import { test } from "node:test";
import { databaseTarget, requireMigrationTarget } from "../scripts/migration-target";

const connection = "postgresql://operator:private-password@database.example:5433/lunch?sslmode=verify-full";

test("migracja wymaga dokładnego wskazania hosta, portu i bazy", () => {
  for (const args of [[], ["--target", "local"], ["--target", "database.example:5432/lunch"], ["--target", "database.example:5433/other"], ["--target", "database.example:5433/lunch", "--force"]]) {
    assert.throws(() => requireMigrationTarget(args, connection), /Migracja zatrzymana przed połączeniem/);
  }
  assert.equal(requireMigrationTarget(["--target", "database.example:5433/lunch"], connection).connectionString, connection);
});

test("komunikat odmowy nie ujawnia użytkownika, hasła ani parametrów połączenia", () => {
  assert.throws(() => requireMigrationTarget([], connection), (error: unknown) => {
    assert.ok(error instanceof Error);
    assert.match(error.message, /database\.example:5433\/lunch/);
    for (const secret of ["operator", "private-password", "verify-full"]) assert.ok(!error.message.includes(secret));
    return true;
  });
});

test("cel nie ignoruje zmiany poolera, a brak portu oznacza 5432", () => {
  assert.equal(databaseTarget("postgres://user:pass@ep-example-pooler.neon.tech/lunch"), "ep-example-pooler.neon.tech:5432/lunch");
  assert.throws(() => requireMigrationTarget(["--target", "ep-example.neon.tech:5432/lunch"], "postgres://user:pass@ep-example-pooler.neon.tech/lunch"));
});

test("brak konfiguracji i nieprawidłowy adres zatrzymują migrację", () => {
  assert.throws(() => requireMigrationTarget([], undefined), /Brakuje DATABASE_URL/);
  for (const url of ["private-password", "https://database.example/lunch", "postgres://database.example/"]) {
    assert.throws(() => requireMigrationTarget([], url));
  }
});

test("adres nie może ukrywać innego celu w parametrach sterownika lub gnieździe Unix", () => {
  for (const url of ["postgres://local.example/lunch?host=production.example", "postgres://local.example/lunch?port=5433", "postgres://%2Ftmp/lunch"]) {
    assert.throws(() => requireMigrationTarget(["--target", "local.example:5432/lunch"], url), /bez ich nadpisywania/);
  }
});
