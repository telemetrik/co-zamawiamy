# Wydanie i awaria - instrukcja dla Piotra

Właściciel: Piotr Kacała. Aplikacja jest publiczna; cel to do 200 osób jednocześnie i koszt utrzymania 0 zł. Stare głosowania można stracić, ale trwające muszą zostać zachowane. Nie ustalono jeszcze granicy wieku głosowania ani dopuszczalnego czasu przerwy. Ta instrukcja nie upoważnia do publikacji ani zmieniania produkcyjnej bazy.

## Przed publikacją

1. Wskaż konkretną wersję kodu i zapisz wynik `npm test`, `npm run typecheck` oraz builda. Build może wysyłać source mapy zgodnie z istniejącą konfiguracją; próbę lokalną wykonuj bez wysyłania do usług. Wyniki, datę i środowisko zapisz w checkliście HTML.
2. Potwierdź adres, bazę i konfigurację nowego wdrożenia. Nie kopiuj haseł do notatek. Lokalna `.env.local` obecnie wskazuje branch produkcyjny, więc testy zapisujące wolno uruchomić dopiero po sprawdzeniu oddzielnej bazy testowej.
3. Jeżeli wydanie zmienia schemat, sprawdź SQL i wykonaj próbę na izolowanej kopii. W poleceniu migracji trzeba jawnie podać `--target HOST:PORT/BAZA`. Nie potwierdzaj adresu tylko dlatego, że skrypt go wyświetlił. Zmiana samego kodu tej poprawki nie wymaga migracji bazy.
4. Wskaż wcześniejsze, sprawdzone wdrożenie, do którego można wrócić. Potwierdź jego zgodność z obecnym schematem. Sama lista starszych wdrożeń nie dowodzi, że któreś jest sprawne.
5. Sprawdź poniższy scenariusz na bezpiecznych danych. Przed otwarciem nowego wydania dla użytkowników powtórz go pod adresem docelowego wdrożenia. Zapis w usługach zewnętrznych uzgodnij osobno z Piotrem.

## Krótka kontrola wydania

| Krok | Oczekiwany wynik |
| --- | --- |
| Otwórz docelowy adres bez konta Vercel, także w osobnej przeglądarce | Strona i formularz są dostępne przez HTTPS. |
| Utwórz fikcyjne głosowanie z 3 propozycjami | Otwiera się głosowanie z właściwym pytaniem i wszystkimi propozycjami. |
| Skopiuj link i odczytaj QR | Oba adresy wskazują to samo głosowanie we właściwym środowisku. |
| Zagłosuj z dwóch osobnych przeglądarek | Suma wynosi 2; liczniki i procenty pasują do oddanych głosów. |
| Odśwież stronę uczestnika | Poprzedni głos jest zapamiętany, nie przybywa drugi głos. |
| Oddaj kolejny głos w osobnej przeglądarce | Wyniki w otwartej karcie aktualizują się bez odświeżania. |
| Powtórz głosowanie dla 2, 4 i 5 propozycji | Każdy dozwolony wariant pokazuje wyniki po zapisaniu głosu. |
| Sprawdź logi tego wdrożenia z czasu próby | Nie ma nieoczekiwanych błędów; wpisy nie ujawniają sekretów ani treści głosowań. |

**Warunek zatrzymania publikacji:** dowolny niespełniony wiersz, utrata lub podwojenie głosu, brak dostępu, nieprawidłowy adres albo nieoczekiwany błąd zapisu/wyników. Przed otwarciem nowego wydania zatrzymaj publikację. Jeśli wydanie już działa, rozpocznij diagnozę poniżej i rozważ powrót tylko do potwierdzonej sprawnej wersji.

Obecnie kontrola produktu nie przejdzie: włączona usterka demonstracyjna psuje wyniki 5 propozycji, a link/QR ma stałą domenę produkcyjną. Te zachowania pozostają bez zmian na prośbę Piotra. Test, który oczekuje ekranu błędu w demo, nie zastępuje kontroli poprawnego działania produktu.

## Gdy użytkownik zgłasza awarię

1. **Zapisz objaw:** czas ze strefą czasową, adres strony, co użytkownik próbował zrobić i czy widział potwierdzenie głosu. Nie proś o hasła, klucze ani treść prywatnych danych. Nie zalecaj czyszczenia pamięci przeglądarki ani ponownego głosowania, jeśli zapis mógł się udać.
2. **Chroń trwające głosowania:** wstrzymaj kolejne publikacje i migracje. Nie usuwaj rekordów, nie resetuj brancha i nie odtwarzaj kopii bezpośrednio na produkcji. Gdy nie wiesz, czy zapis się udał, najpierw ustal stan danych.
3. **Rozpoznaj zakres:** otwórz stronę główną i wcześniej znany link, bez tworzenia nowych głosów. Zanotuj, czy problem dotyczy strony, zapisu, wyników, czy tylko wariantu z 5 propozycjami. Dla tego ostatniego istnieje opis [usterki demonstracyjnej](monitoring-demo.md); w tym pakiecie jej nie zmieniamy.
4. **Sprawdź Vercel:** otwórz [projekt co-zamawiamy](https://vercel.com/piotrs-projects-839be592/co-zamawiamy), następnie kartę Logs i wybierz produkcję, właściwe wdrożenie oraz czas problemu. Szukaj m.in. `DATABASE_OPERATION_FAILED` i `DATABASE_IDLE_CONNECTION_ERROR`. Zapisz ID wdrożenia, kod odpowiedzi i bezpieczny komunikat. Brak wpisu nie dowodzi braku awarii.
5. **Sprawdź Neon:** w [konsoli Neon](https://console.neon.tech) wybierz projekt `aiph-co-zamawiamy`, a potem branch używany przez problematyczne wdrożenie. Sprawdź stan compute i zużycie planu. Nazwa `production` lub lokalny adres bazy nie wystarczą: powiąż zasób z konfiguracją tego wdrożenia. Nie zmieniaj planu ani nie kupuj zasobów; budżet wynosi 0 zł.
6. **Wybierz działanie:** jeśli problem zaczął się po zmianie kodu, przejdź do powrotu wersji. Jeśli problem dotyczy usługi, limitu lub połączenia do bazy, sam powrót kodu może nie pomóc. Jeśli brakuje danych, przejdź do odzyskiwania kopii. Gdy brakuje dostępu do paneli lub zgodnej wersji, zatrzymaj operację i zapisz blokadę.

## Powrót do poprzedniego kodu

1. Wskaż ID wcześniejszego wdrożenia ze znanym pozytywnym wynikiem kontroli. Potwierdź, że obsłuży bieżące dane i schemat. Bez takiego kandydata nie cofaj wersji na próbę.
2. Po oddzielnym zatwierdzeniu działania na produkcji otwórz projekt w Vercel i wybierz Instant Rollback w kafelku Production Deployment. Wskaż wcześniej sprawdzony cel i przed potwierdzeniem porównaj domeny oraz informacje o konfiguracji. Zakres dostępnych wersji zależy od planu; jeśli właściwa wersja lub opcja jest niedostępna, zatrzymaj się. Szczegóły: [instrukcja dostawcy](https://vercel.com/docs/instant-rollback).
3. Cofnięcie wdrożenia przywraca jego kod i konfigurację; nie cofa zmian danych ani migracji PostgreSQL. Nie wykonuj automatycznej migracji wstecz. Ten pakiet nie zmienia schematu bazy.
4. Powtórz krótką kontrolę, w tym odczyt tego samego trwającego głosowania. Zapisz wersję i wynik. Jeśli nadal jest źle, nie wykonuj serii losowych cofnięć.

## Gdy trzeba odzyskać dane

1. Ustal brakujące głosowania, czas utraty i rzeczywistą bazę wdrożenia. Nie zakładaj, że odzyskanie starych danych wystarczy: aktywne głosowania mają pozostać kompletne.
2. Sprawdź dostępne okno historii i punkt odzyskania dla tej bazy. W pierwszym audycie API Neon wskazywało 1 dobę; dostępność właściwych danych i odtworzenie nie zostały potwierdzone. Odwołuj się do aktualnego [zarządzania branchami](https://neon.com/docs/manage/branches).
3. Po uzgodnieniu osobnej operacji i upewnieniu się, że mieści się w bezpłatnych limitach, odtwórz kopię do **oddzielnego brancha**, bez nadpisywania produkcji. Jeśli brakuje darmowej możliwości lub uprawnień, zapisz blokadę.
4. Porównaj pytania, propozycje i liczniki trwających głosowań, także głosy zapisane tuż przed awarią. Zapisz pochodzenie kopii, punkt odzyskania, datę próby i wynik. Brak potwierdzenia najnowszych głosów oznacza niespełnione wymaganie.
5. Dopiero po porównaniu ustal sposób przeniesienia lub połączenia danych i uzyskaj oddzielną zgodę. Nie przełączaj produkcji na starszą kopię, która zgubi nowsze głosy.

## Informacja dla użytkowników i zakończenie awarii

Piotr przekazuje informację tym samym kanałem, którym dotarło zgłoszenie; publiczny kanał wsparcia i odbiorca automatycznych alarmów nie są jeszcze skonfigurowani. Przykład: "Sprawdzam problem z wynikami. Jeśli głos został potwierdzony, nie oddawaj go ponownie. Następną informację przekażę o [konkretna godzina]." Godzinę dobierz do sytuacji, nie obiecuj niepotwierdzonego czasu naprawy.

Po naprawie potwierdź kontrolą działanie i zachowanie aktywnych danych. Przekaż wynik użytkownikom, zapisz przyczynę, wersję, czas, wykonane kroki i pozostałe ryzyko. Sam opis procedury nie potwierdza działającego alarmu, faktycznego rollbacku ani odzyskania danych. Te dowody pozostają osobnymi punktami checklisty.

Źródła kroków panelowych sprawdzone 2026-11-10: [Vercel Runtime Logs](https://vercel.com/docs/logs/runtime), [Vercel Instant Rollback](https://vercel.com/docs/instant-rollback), [Neon - branche](https://neon.com/docs/manage/branches).
