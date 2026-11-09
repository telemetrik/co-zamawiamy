import type { FieldErrors } from "./types";

export class ApiError extends Error {
  constructor(message: string, public status = 0, public fields: FieldErrors = {}) { super(message); }
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25_000);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: "no-store",
    });
    const data = await response.json();
    if (!response.ok) throw new ApiError(data.error ?? "Nie udało się zapisać. Spróbuj ponownie.", response.status, data.fields);
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("Nie mamy potwierdzenia zapisu. Sprawdź połączenie i ponów próbę - nie zapiszemy tej samej operacji drugi raz.");
  } finally { clearTimeout(timer); }
}

export function readStorage(kind: "localStorage" | "sessionStorage", key: string): unknown {
  try { const value = window[kind].getItem(key); return value ? JSON.parse(value) : null; }
  catch { return null; }
}

export function writeStorage(kind: "localStorage" | "sessionStorage", key: string, value: unknown): boolean {
  try {
    if (value === null) window[kind].removeItem(key);
    else window[kind].setItem(key, JSON.stringify(value));
    return true;
  } catch { return false; }
}
