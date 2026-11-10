export function databaseTarget(connectionString: string): string {
  let url: URL;
  try { url = new URL(connectionString); }
  catch { throw new Error("Nieprawidłowy adres bazy. Sprawdź konfigurację bez publikowania hasła."); }
  if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || url.pathname.length <= 1) {
    throw new Error("Adres musi wskazywać serwer PostgreSQL i konkretną bazę danych.");
  }
  // Sterownik pg pozwala nadpisać host i port parametrami URL.
  // Cel do potwierdzenia musi jednoznacznie opisywać rzeczywiste połączenie.
  if (url.hostname.includes("%") || ["host", "port"].some((key) => url.searchParams.has(key))) {
    throw new Error("Wpisz host i port bezpośrednio w adresie bazy, bez ich nadpisywania parametrami URL.");
  }
  return `${url.hostname}:${url.port || "5432"}${url.pathname}`;
}

export function requireMigrationTarget(args: string[], connectionString: string | undefined) {
  if (!connectionString) throw new Error("Brakuje DATABASE_URL w .env.local lub w środowisku procesu.");
  const target = databaseTarget(connectionString);
  if (args.length !== 2 || args[0] !== "--target" || args[1] !== target) {
    throw new Error(
      `Migracja zatrzymana przed połączeniem. Sprawdź cel: ${target}. ` +
      `Jeśli to właściwa baza, uruchom: npm run db:migrate -- --target ${target}`,
    );
  }
  return { connectionString, target };
}
