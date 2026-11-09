"use client";

import Link from "next/link";

export function RetryPanel() {
  return <section className="form-sheet status-sheet"><h1>Chwila przerwy</h1><p>Nie udało się wczytać głosowania. Sprawdź połączenie i spróbuj ponownie.</p><button className="button primary" onClick={() => window.location.reload()}>Spróbuj ponownie</button><Link href="/">Wróć na stronę główną</Link></section>;
}
