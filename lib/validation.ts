import type { CreatePollInput, FieldErrors, VoteInput } from "./types";

export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
    public fields: FieldErrors = {},
  ) {
    super(message);
  }
}

export const isUuid = (value: unknown): value is string =>
  typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);

export function normalizeText(value: string): string {
  return value.normalize("NFC").trim().replace(/\s+/gu, " ");
}

export const optionKey = (value: string) => normalizeText(value).toLocaleLowerCase("pl-PL");

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AppError("Nieprawidłowe dane formularza. Spróbuj ponownie.");
  }
  return value as Record<string, unknown>;
}

export function validateCreatePoll(value: unknown): CreatePollInput {
  const data = object(value);
  if (!isUuid(data.operationId)) throw new AppError("Odśwież stronę i spróbuj ponownie.");
  const question = typeof data.question === "string" ? normalizeText(data.question) : "";
  const fields: FieldErrors = {};
  if (!question) fields.question = "Wpisz pytanie do głosowania.";
  else if (question.length > 120) fields.question = "Skróć pytanie do 120 znaków.";

  if (!Array.isArray(data.options) || data.options.length < 2 || data.options.length > 5) {
    throw new AppError("Dodaj od 2 do 5 propozycji.", 400, { options: "Potrzebne są od 2 do 5 propozycji." });
  }
  const seen = new Map<string, number>();
  const options = data.options.map((value, index) => {
    const label = typeof value === "string" ? normalizeText(value) : "";
    if (!label) fields[`option-${index}`] = "Wpisz propozycję lub usuń to pole.";
    else if (label.length > 60) fields[`option-${index}`] = "Skróć propozycję do 60 znaków.";
    const key = optionKey(label);
    if (label && seen.has(key)) {
      fields[`option-${index}`] = "Ta propozycja już jest na liście. Wpisz inną.";
      fields[`option-${seen.get(key)}`] = "Ta propozycja się powtarza.";
    }
    seen.set(key, index);
    return label;
  });
  if (Object.keys(fields).length) throw new AppError("Sprawdź zaznaczone pola.", 400, fields);
  return { operationId: data.operationId, question, options };
}

export function validateVote(value: unknown): VoteInput {
  const data = object(value);
  if (!isUuid(data.operationId) || !isUuid(data.optionId)) {
    throw new AppError("Wybierz jedną z dostępnych propozycji i spróbuj ponownie.");
  }
  return { operationId: data.operationId, optionId: data.optionId };
}
