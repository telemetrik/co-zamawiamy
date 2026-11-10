# Weryfikacja - 2026-11-09

## Izolacja plików trace Playwright - 2026-11-10

- Błąd `browserContext.close: ENOENT` odtworzono dwoma niezależnymi runnerami: drugi usuwał wspólny katalog wyników, gdy pierwszy nadal nagrywał trace z dwóch kontekstów przeglądarki.
- Konfiguracja automatycznie nadaje przebiegowi osobny `test-results/<UUID>/`. ID jest dziedziczone przez workery. Zachowano `retain-on-failure`, domyślny raport HTML i wspólny plik ostatniego wyniku dla `--last-failed`.
- Kontrolowana próba po poprawce zakończyła się poprawnie dla obu równoległych runnerów. Sprawdzono poprawność archiwów ZIP oraz obecność trace obu kontekstów. Osobny, celowo nieudany test potwierdził zachowanie `trace.zip` przy błędzie asercji; `--last-failed --list` odnalazł ten test w kolejnym przebiegu.
- Zwykłe `npm run test:e2e`, bez dodatkowych argumentów katalogu wyników: **26/26** na bazie testowej Neon, 45.2 s, bez ponowień. `npm test`: **12/12**; `npm run typecheck` i `git diff --check`: poprawnie.
- Izolacja dotyczy artefaktów. Pełne przebiegi nadal współdzielą port 3100 i build `.next/e2e`, więc nie uruchamiają równolegle dwóch serwerów aplikacji.

## Zakończone sprawdzenia

- `npm test`: 7/7 testów walidacji i obsługi żądań HTTP.
- `npm run test:db`: 7/7 testów integracyjnych na prawdziwym PostgreSQL 18.6, uruchomionym tymczasowo na localhost. Bez atrapy bazy. Testy można powtórzyć na osobnym branchu Neon.
- `npm run typecheck`: poprawnie.
- `npm run build`: poprawnie, bez połączenia do bazy podczas kompilacji.
- Migracje zastosowane do dwóch pustych baz testowych; ponowienie migracji nie zmienia istniejących danych.
- `npm audit --omit=dev`: 0 podatności zależności produkcyjnych.

## Przeglądarka - lokalny PostgreSQL

Testowano produkcyjny serwer `next start` połączony z PostgreSQL:

1. Puste propozycje i duplikaty z inną wielkością liter wywołują błędy przy odpowiednich polach.
2. Dodawanie pól kończy się na 5, a usuwanie na 2; odpowiednie przyciski są blokowane.
3. Utworzenie głosowania zapisuje rekordy i przenosi na jego unikalny adres.
4. Przycisk kopiowania potwierdza sukces i kopiuje właściwy URL.
5. Otwarcie linku w kontekście z odrębną pamięcią przeglądarki pozwala oddać głos.
6. Dwa głosy na różne propozycje dają łącznie 2 głosy i 50%/50%/0%.
7. Po odświeżeniu pozostają wyniki i potwierdzenie wcześniejszego głosu, bez ponownego zapisu.
8. Przerwano odpowiedzi HTTP po zatwierdzonym zapisie głosowania i głosu. Po ponowieniach baza zawiera dokładnie jedno głosowanie i jeden głos dla testowanej operacji. Nierozstrzygnięte tworzenie zostało również odtworzone po odświeżeniu z `sessionStorage`.
9. Zatrzymano i ponownie uruchomiono zarówno serwer aplikacji, jak i sam PostgreSQL z tym samym katalogiem danych. Poprzedni link nadal pokazuje 2 głosy i prawidłowe wyniki.
10. Nieistniejący identyfikator pokazuje komunikat i link do strony głównej.
11. Formularz i wyniki sprawdzono przy 320, 375, 414 i 768 px oraz w widoku desktopowym. Szerokość dokumentu nie przekracza szerokości ekranu. Przeglądnięto etykiety, natywne przyciski radiowe, kolejność nagłówków i obsługę fokusu.

Testy używały dwóch originów localhost z oddzielnymi pamięciami przeglądarki, zamiast dwóch fizycznych urządzeń. Symulacja utraty odpowiedzi używała tymczasowego proxy poza projektem. Te narzędzia nie są zależnościami aplikacji.

## Weryfikacja na Neon

Po skonfigurowaniu przez użytkownika `DATABASE_URL` w `.env.local` sprawdzono również rzeczywistą bazę Neon:

- `npm run db:migrate` zakończyło się poprawnie. Są wszystkie trzy tabele i jedna zastosowana migracja w `drizzle.__drizzle_migrations`.
- Połączenie aplikacji do endpointu Neon jest szyfrowane TLS, a certyfikat został zweryfikowany. Sprawdzono to na gnieździe TLS klienta; `pg_stat_ssl` za poolerem nie opisuje połączenia klienta do poolera.
- W przeglądarce utworzono głosowanie "Test Neon - co dziś zamawiamy?" z propozycjami Pizza, Sushi i Żurek. ID: `9c953e90-10ad-48bb-82e7-19982754d67d`.
- Skopiowano poprawny link, otwarto go w kontekście z osobną pamięcią przeglądarki i zapisano dwa głosy: Pizza 1, Sushi 1, Żurek 0. UI pokazuje łącznie 2 głosy i 50%/50%/0%.
- Po odświeżeniu użytkownik nadal widzi wyniki i potwierdzenie wcześniejszego głosu.
- Trzy równoczesne ponowienia tworzenia zwróciły 201 i ten sam ID; pięć ponowień tej samej operacji głosowania zwróciło 200. Odczyt SQL potwierdził brak duplikatów: 1 głosowanie, 3 propozycje, 2 głosy.
- Zatrzymano proces aplikacji i uruchomiono go ponownie z połączeniem z `.env.local`. Ponownie otwarty link nadal pokazuje 2 głosy i te same wyniki z Neon.
- Głosowanie testowe pozostawiono w Neon do obejrzenia rekordów. Nie zmieniano innych danych ani pliku z sekretami.

Nie uruchamiano `npm run test:db` na głównej bazie aplikacji: nie skonfigurowano osobnego `TEST_DATABASE_URL`. Automatyczny zestaw integracyjny pozostaje sprawdzony na lokalnym PostgreSQL; powyższy przepływ i ponowienia sprawdzono na Neon przez UI, API i SQL.

## Aktualizacje na żywo i QR - 2026-11-09

- `npm test`: 7/7 istniejących testów; `npm run typecheck` i `npm run build`: poprawnie po zmianach.
- W przeglądarce utworzono głosowanie `aebe5852-4322-4754-ac65-28d68ee8dd5c`. Kod QR był widoczny przed oddaniem głosu. Przycisk kopiowania zapisał w schowku dokładny adres głosowania.
- Systemowy dekoder QR (Apple Vision) odczytał kod ze zrzutu ekranu i potwierdził dokładny adres testowego głosowania.
- Po pierwszym głosie UI pokazywał 1 głos. Dodanie głosu drugiego uczestnika przez API zmieniło otwartą stronę na 2 głosy i 50%/50%/0%, bez przeładowania.
- Sprawdzono również produkcyjny build przez `next start` z tą samą bazą Neon. Głos z osobnej pamięci przeglądarki dał łącznie 3 głosy.
- Tymczasowe lokalne proxy wymuszało odpowiedzi 503 wyłącznie przy odczycie wyników. UI zachował 3 głosy i pokazał komunikat o ponawianiu. Po wyłączeniu symulacji sam wrócił do statusu "Wyniki na żywo", bez przeładowania. Proxy nie należy do kodu aplikacji.
- Nie sprawdzano fizycznego telefonu ani publicznego wdrożenia. Ukrywanie karty i przełączanie trybu offline mają obsługę w kodzie; w tej sesji scenariusz powrotu po błędzie sprawdzono przez HTTP 503.
- Testowe głosowanie pozostawiono w Neon. Nie zmieniano istniejących głosowań.

## Do sprawdzenia po konfiguracji usług

- Nie weryfikowano planu ani wykorzystania limitów konta Neon. Nie restartowano infrastruktury samego dostawcy Neon.
- Vercel nie został skonfigurowany ani wdrożony, zgodnie z ustalonym zakresem. Nie sprawdzono rzeczywistego redeployu ani telefonu pod publicznym adresem HTTPS.
- PostHog jest zainstalowany. Zdarzenia i logi sprawdzono lokalnie według opisu poniżej; odbiór w rzeczywistym projekcie PostHog pozostaje do sprawdzenia.
- Tymczasowe serwery testowe i PostgreSQL zostały zatrzymane po sprawdzeniach. Uruchomienie aplikacji z Neon opisuje README.

## PR #1 - PostHog po połączeniu z main

- Rozwiązano konflikty ekranu głosowania oraz manifestu i lockfile zależności. Zachowano kod QR, aktualizacje wyników na żywo i zdarzenia PostHog.
- `npm ci`, 7/7 testów jednostkowych, 7/7 testów integracyjnych na tymczasowym lokalnym PostgreSQL, `npm run typecheck` i build produkcyjny zakończyły się poprawnie.
- Trzy testy Playwright z gałęzi `codex/playwright-ci`, uruchomione z tymczasowej konfiguracji poza repozytorium na produkcyjnym serwerze, potwierdziły: walidację duplikatów, tworzenie głosowania, widoczny QR, zapamiętanie głosu po odświeżeniu oraz aktualizację wyników po głosie drugiego uczestnika.
- Dodatkowy test Chrome potwierdził kopiowanie dokładnego adresu, zapis głosu i wysyłkę `poll_created`, `vote_submitted`, `poll_link_copied` oraz logów serwera `poll_created` i `vote_recorded` do lokalnego odbiornika. Sprawdzono liczbę propozycji i pozycję wybranej opcji. SDK filtruje automatyzację jako boty, dlatego test dostarczenia zdarzeń emulował zwykłą przeglądarkę.
- Poprawiono inicjalizację klienta: brak zmiennych PostHog wyłącza analitykę i nie rzuca wyjątku. Sprawdzono stronę w trybie deweloperskim bez tych zmiennych: brak błędów JavaScript.
- Testy używały fikcyjnego tokenu PostHog i adresu localhost, bez wysyłania do zewnętrznej usługi i bez zapisu do Neon. Odbiór w rzeczywistym projekcie PostHog, konfiguracja wdrożenia i przechwytywanie wyjątków pozostają niezweryfikowane.

## Automatyczny zestaw E2E - 2026-11-09

- Dodano trwałą konfigurację Playwright, 12 scenariuszy uruchamianych w Chromium na desktopie oraz w emulacji Pixel 7: **24/24 przeszły**, bez ponowień, na produkcyjnym buildzie i osobnym, tymczasowym PostgreSQL 18.6.
- Zestaw sprawdza walidację pustych pól i duplikatów, limity liczby propozycji i fokus, tworzenie głosowania, obecność QR i jego link, odczyt prawdziwego schowka, odmowę dostępu do schowka, wymaganie wyboru odpowiedzi, zapamiętanie głosu po odświeżeniu i nieistniejące linki.
- Głosy dwóch uczestników są oddawane przez UI w osobnych kontekstach przeglądarki. Test potwierdza aktualizację sumy i procentów bez przeładowania dokumentu. Sprawdzono też brak poziomego przewijania formularza i wyników w testowanych widokach.
- Testy utraty odpowiedzi wykonują rzeczywisty zapis przez API, po czym przerywają odpowiedź. Ponowienie po odświeżeniu zachowuje identyfikator operacji. SQL potwierdza dokładnie jedno głosowanie, trzy propozycje oraz jeden głos dla odpowiednich scenariuszy.
- Wymuszony błąd HTTP 503 odczytu zachowuje poprzednie wyniki. Po usunięciu błędu strona samodzielnie pobiera nowy głos. Oddzielnie sprawdzono powrót do aktualizacji po przełączeniu przeglądarki offline/online.
- Sprawdzono odmowę uruchomienia bez `E2E_DATABASE_URL` oraz przy wskazaniu bazy aplikacji przez adres poolera lub bezpośredni.
- Po E2E i testach integracyjnych odczyt SQL potwierdził **0 głosowań, 0 propozycji i 0 głosów** w tymczasowej bazie. Nie używano Neon ani bazy lokalnego serwera aplikacji.
- `npm test`: 7/7; `npm run test:db`: 7/7; `npm run typecheck`: poprawnie. Build produkcyjny był częścią uruchomienia E2E i korzystał z oddzielnego katalogu `.next/e2e`.
- Dodano workflow GitHub Actions z PostgreSQL 18 i raportami Playwright. Uruchomienie workflow na GitHub pozostaje do sprawdzenia po wysłaniu zmian. Zestaw sprawdza obecność QR i poprawność udostępnianego linku, ale nie dekoduje QR ani nie zastępuje testu na fizycznym telefonie.

## Osobna baza testowa Neon - 2026-11-09

- W istniejącym projekcie `aiph-co-zamawiamy` (`super-forest-35853872`) utworzono branch `tests` (`br-twilight-bread-bacjwjzi`) oraz pustą bazę `co_zamawiamy_test`. Endpoint testowy: `ep-old-darkness-ba38bhd1`, region Frankfurt, PostgreSQL 18. Compute ma stałe 0.25 CU i usypianie po 300 sekundach bezczynności.
- Utworzono rolę `test_runner` z dostępem `read_write` do schematu `public` bazy testowej i dodano uprawnienia CREATE do tej bazy i schematu, potrzebne migracjom. SQL potwierdził brak SUPERUSER, CREATEDB, CREATEROLE i członkostwa w `neon_superuser`.
- Do ignorowanego `.env.local` dodano `E2E_DATABASE_URL` i `TEST_DATABASE_URL`. Oba wskazują bazę testową i rolę `test_runner`, z bezpośrednim połączeniem i `sslmode=verify-full`. Zachowano dotychczasowy `DATABASE_URL` aplikacji.
- `npm run test:db`: **7/7** na nowej bazie Neon. Migracje zostały zastosowane przez rolę testową.
- `npm run test:e2e`: **24/24**, bez ponowień, na tej samej bazie Neon i produkcyjnym buildzie aplikacji. Czas przebiegu Playwright: 46.2 s. Przeglądarkę uruchomiono z wcześniej pobranego katalogu tymczasowego; następnie zainstalowano zgodne Chromium także w standardowym cache Playwright do kolejnych uruchomień.
- Po obu zestawach SQL potwierdził 0 głosowań, 0 propozycji, 0 głosów i jedną zastosowaną migrację. Nie pozostały rekordy scenariuszy testowych.
- `npm test`: **7/7**; `npm run typecheck` i `git diff --check`: poprawnie. GitHub Actions nadal używa własnego tymczasowego PostgreSQL; konfiguracja Neon dotyczy lokalnych uruchomień.
