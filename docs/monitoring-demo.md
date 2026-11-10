# Naprawa: głos zapisany, wyniki działają

Kontrolowana usterka do lekcji AI Product Heroes rzucała `PollResultsDemoError`
przy wyświetlaniu wyników ankiety z dokładnie pięcioma propozycjami. Zapis głosu
kończył się wcześniej, dlatego odświeżenie i ponawianie renderowania odtwarzały
awarię mimo poprawnego zapisu w bazie.

Kod wywołujący wyjątek, jego przełącznik i klasa błędu zostały usunięte.
Error boundary nadal zgłasza rzeczywiste błędy do PostHog. Wyniki pięciu
propozycji korzystają z tego samego renderowania co pozostałe ankiety.

## Weryfikacja przeglądarkowa

Z osobną `E2E_DATABASE_URL` w `.env.local`:

```sh
npm run test:e2e -- tests/e2e/monitoring-demo.spec.ts
```

Test wymaga poprawnych wyników niezależnie od konfiguracji aplikacji.
Sprawdza zwykłe głosowanie i wariant z pięcioma propozycjami, zapis głosu
w PostgreSQL i pamięci przeglądarki, wszystkie pięć wyników oraz poprawne
wyniki po odświeżeniu bez ponownego żądania zapisu i błędów przeglądarki.
Runner wyłącza PostHog, więc test nie wysyła zdarzeń do projektu analitycznego.

## Wdrożenie i stare zdarzenia

Naprawa zacznie działać na danym adresie po wdrożeniu wersji z usuniętą usterką.
Starsze wdrożenia i otwarte karty ze starym kodem mogą nadal zgłaszać ten wyjątek.
Po wdrożeniu otwórz ten sam link w tej samej przeglądarce i odśwież stronę.
Wyniki powinny się wyświetlić z wcześniej zapisanym głosem; nie trzeba czyścić
localStorage ani głosować ponownie.

Historyczne wystąpienia pozostają w PostHog. Przy ocenie naprawy porównuj czas,
adres i wersję aplikacji, z której pochodzi zdarzenie. Liczba wyjątków nie jest
liczbą nieudanych zapisów głosu.
