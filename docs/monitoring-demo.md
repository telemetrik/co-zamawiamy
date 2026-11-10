# Demo: głos zapisany, wyniki nie działają

Kontrolowana usterka do lekcji AI Product Heroes. Przy dokładnie pięciu
propozycjach zapis głosu działa, ale render wyników rzuca `PollResultsDemoError`.
Głosowania z 2-4 propozycjami działają normalnie. Domyślnie usterka jest wyłączona.

## Przygotowanie

1. Skonfiguruj `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` i `NEXT_PUBLIC_POSTHOG_HOST`.
2. W projekcie PostHog włącz Error Tracking i Session Replay. Przed lekcją
   sprawdź odbiór wyjątków i nagrań; w demonstracji używaj danych testowych.
3. Ustaw w `.env.local` `NEXT_PUBLIC_DEMO_RESULTS_ERROR=1` i zrestartuj `npm run dev`.
   Dla wersji produkcyjnej ustaw tę wartość przed buildem i wykonaj nowy deploy.
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
7. Wyłącz flagę (usuń ją lub ustaw `0`), zrestartuj dev albo wykonaj nowy
   build/deploy. Otwórz ten sam link w tej samej przeglądarce.
   Wyniki się wyświetlą, a wcześniejszy głos pozostanie zapisany.

Przycisk ponowienia i odświeżenie będą odtwarzały awarię, dopóki flaga jest aktywna.
Nie wymagaj od uczestnika ponownego głosowania ani czyszczenia localStorage.
Automatyczne przechwytywanie wyjątków może zgłosić tę samą awarię dodatkowo;
liczba wystąpień błędu nie jest liczbą nieudanych zapisów głosu.

## Weryfikacja przeglądarkowa

Z osobną `E2E_DATABASE_URL` w `.env.local`:

```sh
NEXT_PUBLIC_DEMO_RESULTS_ERROR=1 npm run test:e2e -- tests/e2e/monitoring-demo.spec.ts --project=chromium
npm run test:e2e -- tests/e2e/monitoring-demo.spec.ts --project=chromium
```

Test sprawdza działanie trzech propozycji, zachowanie pięciu z flagą i bez niej,
zapis głosu w PostgreSQL, pamięć przeglądarki i brak ponownego zapisu po odświeżeniu.
Runner wyłącza PostHog; dostarczenie wyjątku do rzeczywistego projektu trzeba
sprawdzić osobno podczas próby demo.
