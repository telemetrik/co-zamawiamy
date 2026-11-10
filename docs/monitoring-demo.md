# Demo: głos zapisany, wyniki nie działają

Kontrolowana usterka do lekcji AI Product Heroes. Przy dokładnie pięciu
propozycjach zapis głosu działa, ale render wyników rzuca `PollResultsDemoError`.
Głosowania z 2-4 propozycjami działają normalnie. Obecnie usterka jest wyłączona;
można ją włączyć bezpośrednio w kodzie.

## Przełącznik w kodzie

W `lib/demo-results-error.ts` ustaw:

```ts
export const DEMO_RESULTS_ERROR_ENABLED = true;
```

`true` włącza usterkę, `false` przywraca prawidłowe wyniki. Warunek w
`components/poll-screen.tsx` rzuca wyjątek tylko po zapisaniu głosu przy pięciu
propozycjach. Zmienna środowiskowa nie jest potrzebna.

## Przygotowanie

1. Skonfiguruj `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` i `NEXT_PUBLIC_POSTHOG_HOST`.
2. W projekcie PostHog włącz Error Tracking i Session Replay. Przed lekcją
   sprawdź odbiór wyjątków i nagrań; w demonstracji używaj danych testowych.
3. W kodzie ustaw `DEMO_RESULTS_ERROR_ENABLED = true`.
   Lokalnie zmiana jest podchwytywana przez `next dev`; odśwież stronę.
   Dla wersji produkcyjnej wykonaj nowy build i deploy z tym kodem.
4. Przy buildzie produkcyjnym skonfiguruj istniejący upload source map
   (`POSTHOG_API_KEY`, `POSTHOG_PROJECT_ID`, `POSTHOG_HOST`), aby stack trace
   wskazywał oryginalny kod. Prywatny klucz API pozostaje po stronie serwera/builda.

## Przebieg

1. Utwórz głosowanie z trzema propozycjami i zagłosuj. Wyniki działają.
2. Utwórz drugie z pięcioma propozycjami: Pizza, Sushi, Pierogi, Żurek, Sałatka.
3. Oddaj głos. Pojawi się ekran "Chwila przerwy". Zachowaj adres głosowania.
4. W PostHog otwórz Error Tracking i znajdź `PollResultsDemoError` z komunikatem
   `POLL_RESULTS_RENDER_FAILED: nie można wyświetlić wyników dla 5 propozycji.`
   Przetwarzanie zgłoszenia może chwilę potrwać.
5. Obejrzyj stack trace i właściwości ręcznego zgłoszenia z error boundary:
   `demo_scenario: five-option-results`, `option_count: 5`,
   `screen: poll_results`, `vote_saved: true`.
   Jeśli sesja została nagrana, odtwórz ją. Porównaj z eventem `vote_submitted`
   w tej samej sesji: zapis się udał, awaria dotyczy wyświetlania.
6. Przekaż AI szczegóły błędu i poproś o znalezienie miejsca awarii.
   To jawna symulacja usterki w `components/poll-screen.tsx`, a nie przypadkowy
   błąd produkcyjny ani ograniczenie dozwolonej liczby propozycji.
7. Ustaw w kodzie `DEMO_RESULTS_ERROR_ENABLED = false` i odśwież stronę
   albo wykonaj nowy build/deploy. Otwórz ten sam link w tej samej przeglądarce.
   Wyniki się wyświetlą, a wcześniejszy głos pozostanie zapisany.

Przycisk ponowienia i odświeżenie będą odtwarzały awarię, dopóki stała ma wartość `true`.
Nie wymagaj od uczestnika ponownego głosowania ani czyszczenia localStorage.
Automatyczne przechwytywanie wyjątków może zgłosić tę samą awarię dodatkowo;
liczba wystąpień błędu nie jest liczbą nieudanych zapisów głosu.

## Regresja i rollback

1. Ustaw stałą na `false`, zapisz poprawnie działającą wersję w commicie i wdróż ją.
2. Zmień tę jedną linię na `true`, utwórz osobny commit regresji i wdróż go.
3. Odtwórz awarię i pokaż wyjątek w PostHogu.
4. Cofnij wyłącznie commit regresji przez `git revert <SHA_commita_regresji>`
   i wdróż wynik. Alternatywnie przywróć wcześniejsze, poprawne wdrożenie na hostingu.
5. Odśwież ten sam link: wyniki wrócą, głos pozostanie zapisany.

Przy rollbacku wdrożenia kod w repozytorium nadal może zawierać regresję.
Przed następnym deployem cofnij ją również w Git.

## Weryfikacja przeglądarkowa

Z osobną `E2E_DATABASE_URL` w `.env.local`:

```sh
npm run test:e2e -- tests/e2e/monitoring-demo.spec.ts --project=chromium
```

Test odczytuje stałą z kodu. Uruchom go po ustawieniu `true`, a następnie po ustawieniu
`false`. Sprawdza działanie trzech propozycji, zachowanie pięciu zgodne z przełącznikiem,
zapis głosu w PostgreSQL, pamięć przeglądarki i brak ponownego zapisu po odświeżeniu.
Runner wyłącza PostHog; dostarczenie wyjątku do rzeczywistego projektu trzeba
sprawdzić osobno podczas próby demo.
