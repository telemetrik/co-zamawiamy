# Co zamawiamy?

Jedna osoba tworzy głosowanie na lunch i udostępnia link. Pozostali wybierają jedną propozycję, głosują i widzą wyniki. Interfejs jest po polsku, działa na telefonie i nie wymaga kont.

Next.js App Router + TypeScript + PostgreSQL (Neon) + Drizzle. Bez analityki w tej iteracji: PostHog będzie dodany w osobnym kroku. Deploy na Vercel również pozostaje osobnym krokiem.

## Uruchomienie lokalne z Neon

Wymagany Node.js >=22.9 (zalecany 24 LTS) i npm.

```sh
npm ci
cp .env.example .env.local
```

1. W [Neon Console](https://console.neon.tech) utwórz projekt `co-zamawiamy` w planie Free. Wybierz region bliski przyszłemu serwerowi na Vercel, np. Frankfurt.
2. Otwórz **Connect**, wybierz branch i bazę. Włącz **Connection pooling** i skopiuj connection string PostgreSQL.
3. Wklej ją jako `DATABASE_URL` w `.env.local`. Zachowaj parametry TLS z Neon, w tym `sslmode=require`. Nie dodawaj prefiksu `NEXT_PUBLIC_` i nie publikuj pliku.
4. Opcjonalnie skopiuj connection string bez poolingu do `DATABASE_URL_UNPOOLED`. Jest używana tylko przez migracje; bez niej migracje użyją `DATABASE_URL`.
5. Uruchom migracje, a następnie aplikację:

```sh
npm run db:migrate -- --target YOUR-ENDPOINT-pooler.eu-central-1.aws.neon.tech:5432/neondb
npm run dev
```

Otwórz [http://localhost:3000](http://localhost:3000). Dane od początku są zapisywane w Neon. Aplikacja nie przełącza się na pamięć, plik ani atrapę bazy. Restart serwera i kolejne wdrożenie zachowują dane, jeśli `DATABASE_URL` nadal wskazuje tę samą bazę i branch.

W poleceniu migracji zastąp przykładowy cel rzeczywistym `HOST:PORT/BAZA`, bez hasła. Musi pasować do `DATABASE_URL_UNPOOLED`, jeśli jest ustawiona, albo do `DATABASE_URL`. Brak lub pomyłka w `--target` zatrzymuje skrypt przed połączeniem. Nie kopiuj celu z komunikatu bez sprawdzenia, czy chcesz zmieniać właśnie tę bazę.

Bez `DATABASE_URL` strona główna nadal działa, ale zapis zwróci czytelny błąd. Po zmianie `.env.local` zrestartuj serwer.

## Migracje i wdrożenie na Vercel

1. Opublikuj projekt we własnym repozytorium Git i zaimportuj je w Vercel. Framework: **Next.js**, Node.js: **24.x**. Build: `npm run build`; instalacja: `npm ci`. Nie ustawiaj statycznego eksportu ani katalogu `out`.
2. W **Settings > Environment Variables** ustaw `DATABASE_URL` z Neon dla **Production**. Zmienna jest potrzebna w serwerze, nie w przeglądarce. `DATABASE_URL_UNPOOLED` nie jest potrzebna do działania aplikacji na Vercel.
3. Dla **Preview** użyj osobnego brancha lub bazy Neon i osobnej wartości `DATABASE_URL`. Preview nie powinno zapisywać głosów do bazy demonstracyjnej Production.
4. **Przed pierwszym wdrożeniem** zastosuj migracje do właściwej bazy. Uruchom lokalnie `npm run db:migrate -- --target HOST:PORT/BAZA` z `.env.local` wskazującym docelowy branch i celem pasującym do wybranego połączenia. Skrypt wymaga podania celu także przy ponownym uruchomieniu. Oceniaj bezpieczeństwo zmian na podstawie SQL i próby na izolowanej bazie.
5. Przy kolejnych zmianach schematu: zmień `db/schema.ts`, uruchom `npm run db:generate`, sprawdź wygenerowany SQL i zapisz cały katalog `drizzle` w Git. Zastosuj `npm run db:migrate -- --target HOST:PORT/BAZA` **raz, przed wdrożeniem nowego kodu**, z połączeniem do docelowej bazy. Dla Preview wskaż jego osobny branch i cel.
6. Dopiero potem uruchom deploy. Zmiana zmiennych środowiskowych wymaga nowego wdrożenia.

Build i start **nie uruchamiają migracji automatycznie**. Nie dodawaj migracji do `build` ani do obsługi żądania - równoległe wdrożenia nie powinny zmieniać schematu jednocześnie. Zastosowane migracje są zapisane w `drizzle.__drizzle_migrations`. Nie używaj `db:push` zamiast historii migracji.

Neon Free jest bezpłatny w granicach limitów. Według [cennika Neon](https://neon.com/pricing) sprawdzonego 2026-11-09 obejmuje 100 CU-hours miesięcznie i 1 GB danych na projekt. Bezczynna baza usypia compute; pierwsze żądanie może trwać dłużej. Wyczerpanie limitów może wstrzymać działanie.

[Vercel Hobby](https://vercel.com/docs/plans/hobby) jest przeznaczony do osobistego, niekomercyjnego użytku. Przed demonstracją w ramach płatnego szkolenia sprawdź, czy Twój plan pozwala na ten sposób użycia; samo utrzymanie się w limitach zasobów nie rozstrzyga tego warunku. Na tym etapie aplikacja działa lokalnie, bez korzystania z płatnych usług Vercel.

## Dane i odporność na ponowienia

- `public.polls`: pytanie, data, ID oraz losowy token tworzenia i skrót treści żądania.
- `public.options`: propozycje przypisane kluczem obcym do głosowania, z kolejnością i kluczem unikalnej nazwy.
- `public.votes`: głosy przypisane kluczem obcym do propozycji. ID głosu jest losowym identyfikatorem operacji.

Tworzenie głosowania i jego propozycji jest jedną transakcją. Serwer waliduje dane, normalizuje spacje, wykrywa powtórzenia bez rozróżniania wielkości liter i sprawdza przynależność propozycji do głosowania.

Klient przygotowuje identyfikator operacji przed zapisem i zachowuje go przy ponowieniu. Unikalność w PostgreSQL zapobiega powieleniu zapisu nawet przy równoczesnych żądaniach. Użycie tego samego tokenu z innymi danymi daje błąd 409.

Niepewna próba tworzenia jest zapamiętana w `sessionStorage`, a próba głosowania i potwierdzony głos w `localStorage` osobno dla każdego głosowania. Po utracie odpowiedzi pola pozostają zablokowane: przycisk ponawia tę samą operację. Po odświeżeniu można ponowić nierozstrzygniętą próbę. Przy blokadzie pamięci przeglądarki aplikacja nadal zapisuje, ale informuje, że nie zapamięta tego po odświeżeniu.

To ochrona przed przypadkowym powtórzeniem. Osoba korzystająca z innej przeglądarki lub czyszcząca pamięć może zagłosować ponownie. Nie ma identyfikacji uczestników ani zbierania imion i emaili.

Wyniki są pobierane z bazy po otwarciu strony i zapisie głosu, a po zagłosowaniu aktualizują się automatycznie: kolejny odczyt zaczyna się 2 sekundy po zakończeniu poprzedniego. To polling HTTP, bez dodatkowej usługi realtime. Ukrycie karty wstrzymuje odczyty. Powrót do karty lub odzyskanie połączenia uruchamia odczyt od razu. Przy błędzie przeglądarka zachowuje ostatnie wyniki, pokazuje komunikat i ponawia odczyty. Otwarta karta utrzymuje aktywność bazy, więc ten ruch trzeba uwzględnić przy ocenie limitów Neon i Vercel. Kod QR jest generowany w przeglądarce, bez zewnętrznego serwisu, i prowadzi do tego samego głosowania co kopiowany link. Procenty są zaokrąglone do pełnych liczb, więc ich suma może wynieść 99% lub 101%.

## Sprawdzenia

```sh
npm test
npm run typecheck
npm run build
```

Testy integracyjne wymagają **osobnej bazy lub brancha Neon**. Dodaj `TEST_DATABASE_URL` do `.env.local` i uruchom:

```sh
npm run test:db
```

Testy stosują migracje, tworzą własne rekordy i usuwają wyłącznie utworzone przez siebie głosowania wraz z ich propozycjami i głosami. Nie kasują cudzych rekordów. Odmawiają użycia tego samego adresu bazy co `DATABASE_URL`. Sprawdzają m.in. równoczesne ponowienia, głos na propozycję z innego głosowania, rollback transakcji oraz odczyt z nowej instancji usługi.

Produkcję można sprawdzić lokalnie przez `npm run build`, a następnie `npm start`.

## Scenariusz lekcji

1. Skonfiguruj Neon, zastosuj migracje i wykonaj deploy na Vercel.
2. Utwórz głosowanie z propozycjami Pizza, Sushi i Żurek.
3. Kliknij **Kopiuj link** i otwórz go w drugiej przeglądarce albo zeskanuj widoczny kod QR telefonem. Telefon musi mieć dostęp do adresu aplikacji; `localhost` działa tylko na komputerze uruchamiającym serwer.
4. Oddaj głos. Sprawdź potwierdzenie, wszystkie propozycje, liczniki i procenty.
5. Oddaj drugi głos z innej przeglądarki. W pierwszej, widocznej karcie wynik zmieni się automatycznie po kolejnym odczycie, bez odświeżania strony.
6. W Neon wybierz ten sam branch i bazę. W **Tables** obejrzyj `polls`, `options`, `votes` lub uruchom zapytanie poniżej w **SQL Editor**. Zapis jest widoczny od razu po zatwierdzeniu transakcji; otwarty wcześniej widok tabeli trzeba odświeżyć. Metryki monitoringu Neon to osobny widok, nie źródło potwierdzenia zapisu.
7. Zrestartuj lokalny serwer lub wykonaj kolejne wdrożenie z tym samym połączeniem do bazy. Otwórz poprzedni link i sprawdź, że dane zostały zachowane.

```sql
SELECT p.id AS poll_id, p.question, o.label, count(v.id) AS votes
FROM polls p
JOIN options o ON o.poll_id = p.id
LEFT JOIN votes v ON v.option_id = o.id
GROUP BY p.id, o.id
ORDER BY p.created_at DESC, o.position;
```

## PostHog

SDK, pomiar odsłon, obsługa błędów i poniższe zdarzenia są zainstalowane. Ustaw `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` oraz `NEXT_PUBLIC_POSTHOG_HOST` z `.env.example` i zrestartuj serwer lub wykonaj ponowny build. Bez konfiguracji aplikacja działa bez analityki:

- `poll_created`: po poprawnej odpowiedzi `POST /api/polls`, przed przejściem na link.
- `poll_link_copied`: dopiero po sukcesie `navigator.clipboard.writeText`.
- `vote_submitted`: po poprawnej odpowiedzi `POST /api/polls/[pollId]/votes`.

Dodatkowe pola tych zdarzeń opisują liczbę propozycji, pozycję wybranej opcji i ponowienie operacji; nie zawierają pytania, etykiet propozycji ani identyfikatora głosowania. SDK dodaje również swoje domyślne właściwości, np. adres strony. Serwer eksportuje logi `poll_created` i `vote_recorded`. Przy ponawianiu operacji deduplikacja zapisu w bazie nie oznacza deduplikacji zdarzeń analitycznych. Odbiór w rzeczywistym projekcie PostHog i konfigurację prywatności sprawdź przed wdrożeniem.

## Źródła konfiguracji

- [Next.js - instalacja](https://nextjs.org/docs/app/getting-started/installation)
- [Neon - połączenia PostgreSQL](https://neon.com/docs/connect/connect-from-any-app)
- [Neon - pooling](https://neon.com/docs/connect/connection-pooling)
- [node-postgres - TLS](https://node-postgres.com/features/ssl)
- [Drizzle - migracje](https://orm.drizzle.team/docs/drizzle-kit-migrate)
