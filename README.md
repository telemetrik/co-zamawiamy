# Co zamawiamy?

Aplikacja do wspólnego wyboru lunchu: tworzysz głosowanie, wysyłasz link, ekipa głosuje i widzi wyniki. Bez kont i danych uczestników. Wyniki aktualizują się automatycznie, a głosowanie udostępnisz linkiem lub kodem QR.

**Stack:** Next.js App Router, React, TypeScript, PostgreSQL w Neon, Drizzle, opcjonalna analityka PostHog. Wdrożenie na Vercel jest osobnym krokiem.

## Uruchomienie

Node.js >=22.9 (zalecany 24 LTS) i npm:

```sh
npm ci
cp .env.example .env.local
```

W [Neon Console](https://console.neon.tech) utwórz projekt Free. W **Connect** wybierz właściwy branch i bazę, włącz **Connection pooling** i wstaw connection string jako `DATABASE_URL` do `.env.local`. Zachowaj parametry TLS z Neon. Nie publikuj pliku ani hasła.

```sh
npm run db:migrate
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Po zmianie zmiennych zrestartuj serwer. Bez połączenia do bazy działa strona główna, ale zapis zgłasza błąd - nie ma zastępczej bazy w pamięci.

## Sprawdzenia

```sh
npm test
npm run typecheck
npm run build
```

Test zapisu do PostgreSQL: ustaw `TEST_DATABASE_URL` na **osobną bazę/branch** w `.env.local`, następnie `npm run test:db`. Testy stosują migracje i sprzątają wyłącznie swoje rekordy. Odmawiają użycia tego samego adresu co `DATABASE_URL`.

Build produkcyjny uruchomisz przez `npm start`.

## Wdrożenie i lekcja

Na Vercel wybierz Next.js i Node.js 24.x. Ustaw `DATABASE_URL` dla Production; Preview powinno korzystać z osobnego brancha Neon. **Przed pierwszym wdrożeniem i po zmianie schematu uruchom raz `npm run db:migrate` z połączeniem do docelowej bazy, a dopiero potem deploy.** Migracje nie uruchamiają się w buildzie ani przy żądaniach.

Pełne instrukcje konfiguracji, migracji, podglądu rekordów, ograniczeń darmowych planów i scenariusz demonstracji: [lekcja i wdrożenie](docs/lesson-and-deployment.md).

Stan sprawdzeń i granice weryfikacji: [weryfikacja](docs/verification.md).

## Jak działa zapis

Trzy tabele: `polls`, `options`, `votes`. Tworzenie głosowania jest transakcją; serwer waliduje dane i sprawdza przynależność propozycji. Unikalne identyfikatory operacji zabezpieczają zapis przed powtórzeniem po błędzie sieci. Wyniki pochodzą z bazy. Po oddaniu głosu przeglądarka pobiera je automatycznie co 2 sekundy od zakończenia poprzedniego odczytu. Ukryta karta wstrzymuje odczyty; powrót do niej lub odzyskanie połączenia wznawia aktualizacje. Przy błędzie pozostają ostatnie wyniki i komunikat o ponawianiu połączenia. Kod QR pojawia się na stronie głosowania od razu po jego utworzeniu i jest generowany lokalnie z tego samego adresu co kopiowany link.

Przeglądarka zapamiętuje oddany głos osobno dla każdego głosowania. Czyszczenie pamięci lub użycie innej przeglądarki umożliwia kolejny głos - to celowo prosta ochrona przed przypadkowym powtórzeniem, bez identyfikacji uczestników.

PostHog rejestruje `poll_created`, `poll_link_copied` i `vote_submitted`, błędy przeglądarki oraz serwerowe logi `poll_created` i `vote_recorded`. Aby go włączyć, ustaw `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` i `NEXT_PUBLIC_POSTHOG_HOST` z `.env.example`, a następnie zrestartuj serwer (lub ponownie zbuduj aplikację produkcyjną). Bez tych zmiennych aplikacja działa bez analityki.
