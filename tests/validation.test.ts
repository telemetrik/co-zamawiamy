import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { AppError, validateCreatePoll, validateVote } from "../lib/validation";

const valid = () => ({ operationId: randomUUID(), question: "Co jemy?", options: ["Pizza", "Sushi"] });

test("usuwa nadmiarowe białe znaki i zachowuje polskie litery", () => {
  const input = validateCreatePoll({ ...valid(), question: "  Co\n dziś   jemy? ", options: ["  Żurek  ", "Pierogi   ruskie"] });
  assert.equal(input.question, "Co dziś jemy?");
  assert.deepEqual(input.options, ["Żurek", "Pierogi ruskie"]);
});

test("odrzuca puste, za długie i nieprawidłowo typowane pola", () => {
  for (const patch of [{ question: " \n " }, { question: "a".repeat(121) }, { question: 123 }, { options: [" ", "Pizza"] }, { options: ["a".repeat(61), "Pizza"] }, { options: [null, "Pizza"] }]) {
    assert.throws(() => validateCreatePoll({ ...valid(), ...patch }), AppError);
  }
  assert.equal(validateCreatePoll({ ...valid(), question: "a".repeat(120), options: ["a".repeat(60), "Pizza"] }).question.length, 120);
});

test("wymaga od 2 do 5 propozycji", () => {
  for (const options of [[], ["Pizza"], ["a", "b", "c", "d", "e", "f"], "Pizza"]) {
    assert.throws(() => validateCreatePoll({ ...valid(), options }), AppError);
  }
  assert.equal(validateCreatePoll({ ...valid(), options: ["a", "b", "c", "d", "e"] }).options.length, 5);
});

test("rozpoznaje duplikaty po wielkości liter, odstępach i normalizacji Unicode", () => {
  for (const options of [["Pizza", " pizza "], ["Pierogi ruskie", "pierogi   RUSKIE"], ["Żurek", "Z\u0307urek"]]) {
    assert.throws(() => validateCreatePoll({ ...valid(), options }), (error: unknown) => error instanceof AppError && !!error.fields["option-1"]);
  }
});

test("wymaga identyfikatorów operacji i jednej propozycji", () => {
  assert.throws(() => validateCreatePoll({ ...valid(), operationId: "bad" }), AppError);
  for (const value of [null, [], {}, { operationId: randomUUID(), optionId: [randomUUID()] }, { operationId: "bad", optionId: randomUUID() }]) {
    assert.throws(() => validateVote(value), AppError);
  }
  const vote = { operationId: randomUUID(), optionId: randomUUID() };
  assert.deepEqual(validateVote(vote), vote);
});
