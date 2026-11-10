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
npm run db:migrate -- --target YOUR-ENDPOINT-pooler.eu-central-1.aws.neon.tech:5432/neondb
npm run dev
```

Zastąp cel po `--target` rzeczywistym hostem, portem i nazwą bazy. Skrypt porównuje go z `DATABASE_URL_UNPOOLED` (jeśli ustawiono) albo `DATABASE_URL`. Brak lub inny cel zatrzymuje migrację **przed połączeniem** i pokazuje adres bez użytkownika i hasła. To potwierdzenie wybranej bazy, nie automatyczne rozpoznawanie produkcji. Dla lokalnego PostgreSQL przykładowy cel to `127.0.0.1:5432/co_zamawiamy`.

Otwórz [http://localhost:3000](http://localhost:3000). Po zmianie zmiennych zrestartuj serwer. Bez połączenia do bazy działa strona główna, ale zapis zgłasza błąd - nie ma zastępczej bazy w pamięci.

## Sprawdzenia

```sh
npm test
npm run typecheck
npm run build
```

Test zapisu do PostgreSQL: ustaw `TEST_DATABASE_URL` na **osobną bazę/branch** w `.env.local`, następnie `npm run test:db`. Testy stosują migracje i sprzątają wyłącznie swoje rekordy. Odmawiają użycia tego samego adresu co `DATABASE_URL`.

Build produkcyjny uruchomisz przez `npm start`.

## Testy end-to-end

Playwright sprawdza aplikację w Chromium na desktopie i w emulacji telefonu Pixel 7. Testy przechodzą przez przeglądarkę, prawdziwe API i PostgreSQL.

W projekcie Neon `aiph-co-zamawiamy` jest osobny branch `tests` z bazą `co_zamawiamy_test`. Rola `test_runner` ma dostęp do danych testowych oraz prawa do wykonywania migracji w tej bazie, bez uprawnień administracyjnych. Lokalne `E2E_DATABASE_URL` i `TEST_DATABASE_URL` są skonfigurowane w ignorowanym `.env.local` i używają połączenia bezpośredniego z `sslmode=verify-full`. Compute testowy ma 0.25 CU i usypia po 5 minutach bezczynności.

1. Ustaw `E2E_DATABASE_URL` w `.env.local` lub środowisku procesu na **osobną bazę albo branch testowy PostgreSQL**. Testy odmawiają użycia adresu bazy aplikacji (`DATABASE_URL` lub `DATABASE_URL_UNPOOLED`, również przy różnicy między adresem poolera i bezpośrednim).
2. Zainstaluj przeglądarkę i uruchom zestaw:

```sh
npx playwright install chromium
npm run test:e2e
```

Runner stosuje migracje do bazy testowej, buduje aplikację produkcyjną w osobnym katalogu `.next/e2e` i uruchamia własny serwer na `http://127.0.0.1:3100`. Port musi być wolny. Analityka PostHog jest wyłączona podczas budowania i działania serwera testowego.

Zestaw sprawdza walidację i limity formularza, tworzenie głosowania, link i obecność QR, prawdziwy schowek i jego odmowę dostępu, głosowanie dwóch uczestników, wyniki na żywo, zapamiętanie głosu, nieistniejące linki oraz powrót po błędach sieci. Testy ponowień przepuszczają zapis do bazy, przerywają odpowiedź i sprawdzają w SQL, że ponowienie po odświeżeniu nie tworzy duplikatu. Po każdym teście runner usuwa wyłącznie jego głosowania wraz z propozycjami i głosami, także po nieudanej asercji.

```sh
npm run test:e2e -- --project=chromium  # tylko desktop
npm run test:e2e:ui                    # interaktywny runner
npx playwright show-report            # raport ostatniego przebiegu
```

Przy błędzie raport zawiera zrzut ekranu i trace. Każde uruchomienie automatycznie zapisuje artefakty w osobnym `test-results/<ID przebiegu>/`, żeby inny runner nie usunął aktywnych plików trace. Raport HTML pozostaje w `playwright-report/`, a `--last-failed` korzysta ze wspólnego `test-results/.last-run.json`. Port 3100 i build `.next/e2e` nadal pozwalają na jeden pełny przebieg aplikacji naraz.

GitHub Actions uruchamia ten sam zestaw na pull requestach i po pushu do `main`, z tymczasowym PostgreSQL 18, i przechowuje raport przez 14 dni. Konfiguracja jest zgodna z [dokumentacją Playwright](https://playwright.dev/docs/test-webserver).

## Wdrożenie i lekcja

Na Vercel wybierz Next.js i Node.js 24.x. Ustaw `DATABASE_URL` dla Production; Preview powinno korzystać z osobnego brancha Neon. **Przed pierwszym wdrożeniem i po zmianie schematu uruchom raz `npm run db:migrate -- --target HOST:PORT/BAZA` z jawnym celem zgodnym z konfiguracją, a dopiero potem deploy.** Migracje nie uruchamiają się w buildzie ani przy żądaniach.

Górny pasek, linki i przyciski mają czerwony motyw z etykietą `PRODUKCJA` dla `VERCEL_ENV=production`, a zielony z etykietą `DEV` dla pozostałych środowisk Vercel. Poza Vercel decyduje `NODE_ENV`: `npm run dev` ma motyw DEV, a build produkcyjny motyw PRODUKCJA.

Pełne instrukcje konfiguracji, migracji, podglądu rekordów, ograniczeń darmowych planów i scenariusz demonstracji: [lekcja i wdrożenie](docs/lesson-and-deployment.md).

Stan sprawdzeń i granice weryfikacji: [weryfikacja](docs/verification.md).

Kontrola nowego wydania, warunki zatrzymania publikacji i pierwsze kroki awarii: [instrukcja dla Piotra](docs/release-and-recovery.md).

Naprawa demonstracyjnego błędu wyników pięciu propozycji i jej weryfikacja:
[głos zapisany, wyniki działają](docs/monitoring-demo.md).

## Jak działa zapis

Trzy tabele: `polls`, `options`, `votes`. Tworzenie głosowania jest transakcją; serwer waliduje dane i sprawdza przynależność propozycji. Unikalne identyfikatory operacji zabezpieczają zapis przed powtórzeniem po błędzie sieci. Wyniki pochodzą z bazy. Po oddaniu głosu przeglądarka pobiera je automatycznie co 2 sekundy od zakończenia poprzedniego odczytu. Ukryta karta wstrzymuje odczyty; powrót do niej lub odzyskanie połączenia wznawia aktualizacje. Przy błędzie pozostają ostatnie wyniki i komunikat o ponawianiu połączenia. Kod QR pojawia się na stronie głosowania od razu po jego utworzeniu i jest generowany lokalnie z tego samego adresu co kopiowany link.

Przeglądarka zapamiętuje oddany głos osobno dla każdego głosowania. Czyszczenie pamięci lub użycie innej przeglądarki umożliwia kolejny głos - to celowo prosta ochrona przed przypadkowym powtórzeniem, bez identyfikacji uczestników.

PostHog rejestruje `poll_created`, `poll_link_copied` i `vote_submitted`, błędy przeglądarki oraz serwerowe logi `poll_created` i `vote_recorded`. Aby go włączyć, ustaw `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` i `NEXT_PUBLIC_POSTHOG_HOST` z `.env.example`, a następnie zrestartuj serwer (lub ponownie zbuduj aplikację produkcyjną). Bez tych zmiennych aplikacja działa bez analityki.
