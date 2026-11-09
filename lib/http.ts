import { NextResponse } from "next/server";
import { AppError } from "./validation";

export async function readJson(request: Request): Promise<unknown> {
  const origin = request.headers.get("origin");
  // Next.js może używać wewnętrznego adresu 0.0.0.0 w request.url.
  // Host wskazuje publiczny adres użyty przez przeglądarkę (także za proxy Vercel).
  if (origin) {
    let originHost: string;
    try { originHost = new URL(origin).host; }
    catch { throw new AppError("Nieprawidłowy adres źródłowy żądania.", 403); }
    if (originHost !== (request.headers.get("host") || new URL(request.url).host)) {
      throw new AppError("Otwórz głosowanie w tej samej aplikacji i spróbuj ponownie.", 403);
    }
  }
  if (!request.headers.get("content-type")?.includes("application/json")) throw new AppError("Nieprawidłowy format danych.", 415);
  const maxBytes = 8192;
  const reader = request.body?.getReader();
  if (!reader) throw new AppError("Brak danych formularza.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AppError("Formularz jest zbyt duży.", 413);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); }
  catch { throw new AppError("Nie udało się odczytać formularza. Spróbuj ponownie."); }
}

export function errorResponse(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.message, fields: error.fields }, { status: error.status });
  }
  // Nigdy nie loguj surowego błędu sterownika: może zawierać dane połączenia.
  console.error("DATABASE_OPERATION_FAILED");
  return NextResponse.json({ error: "Nie udało się połączyć. Spróbuj ponownie za chwilę." }, { status: 503 });
}
