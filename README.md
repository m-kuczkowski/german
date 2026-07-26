# Wortschatz A2

Mobilna aplikacja PWA do regularnej nauki niemieckiego na poziomie A2. Zawiera 110 ręcznie przygotowanych fiszek, powtórki rozłożone w czasie, lokalny zapis postępów, wymowę przez Web Speech API oraz opcjonalny generator nowych zestawów przez OpenAI.

Interfejs jest po polsku i został zaprojektowany przede wszystkim dla Safari na iPhonie.

## Co działa

- sesje po maksymalnie 10 kart z odpowiedziami „Umiem” i „Powtórz”;
- powtórki po 1, 3 i 7 dniach, a później w rosnących odstępach;
- priorytet dla kart zaległych i sprawiających trudność;
- 110 kart A2 w 11 kategoriach, dostępnych także offline;
- kolekcja z wyszukiwaniem, filtrami, edycją, usuwaniem i ochroną przed duplikatami;
- ręczne dodawanie kart;
- generator 5, 10 lub 20 fiszek przez OpenAI z podglądem przed zapisaniem;
- postępy, dzienna seria i statystyki kategorii;
- wymowa `de-DE` przez Web Speech API;
- zapis w IndexedDB, eksport i import kopii JSON;
- jasny, ciemny i systemowy motyw;
- instalacja na ekranie początkowym jako PWA.

## Architektura

Frontend jest statyczną aplikacją Vite/React wdrażaną na GitHub Pages pod ścieżką `/german/`.

Generator AI działa w osobnym Cloudflare Workerze:

1. przeglądarka wysyła wyłącznie temat i liczbę kart do Workera;
2. Worker waliduje dane, sprawdza origin i limit zapytań;
3. Worker używa serwerowego sekretu `SECRET_KEY` do wywołania OpenAI Responses API;
4. odpowiedź jest wymuszana przez JSON Schema i ponownie walidowana;
5. zaakceptowane karty są zapisywane wyłącznie lokalnie w IndexedDB.

Klucz OpenAI nigdy nie trafia do frontendu, repozytorium, `localStorage` ani katalogu `dist`.

## Technologie

- React 19 i TypeScript;
- Vite;
- natywne IndexedDB i Web Speech API;
- Vitest oraz `fake-indexeddb`;
- Cloudflare Workers;
- OpenAI Responses API, domyślnie `gpt-5-nano`;
- GitHub Actions i GitHub Pages.

## Uruchomienie frontendu lokalnie

Wymagany jest Node.js 20 lub nowszy.

```bash
npm install
npm run dev
```

Strona będzie dostępna pod adresem podanym przez Vite, zazwyczaj `http://localhost:5173/german/`.

Bez skonfigurowanego API cała nauka, kolekcja, postępy, import, eksport i wymowa nadal działają. Niedostępny jest tylko generator AI.

## Lokalny Worker

Utwórz ignorowany przez Git plik `.dev.vars`:

```dotenv
SECRET_KEY=tu_wstaw_klucz_OpenAI
```

Uruchom Workera z lokalnym originem:

```bash
npx wrangler dev --var ALLOWED_ORIGIN:http://localhost:5173
```

Następnie utwórz lokalny `.env.local`:

```dotenv
VITE_API_URL=http://localhost:8787
```

Uruchom ponownie `npm run dev`. Nigdy nie używaj nazwy zaczynającej się od `VITE_` dla klucza OpenAI — takie wartości trafiają do kodu przeglądarki.

## Testy i build

```bash
npm test
npm run typecheck
npm run build
npm run preview
```

Build powstaje w `dist/` z poprawną bazą `/german/`.

## Wdrożenie Cloudflare Workera

Worker musi zostać wdrożony przed włączeniem generatora w GitHub Pages.

### 1. Przygotuj konto Cloudflare

1. Załóż lub otwórz konto w Cloudflare.
2. Skopiuj `Account ID` z panelu konta.
3. Utwórz API Token z szablonu **Edit Cloudflare Workers**. Ogranicz token do swojego konta.

### 2. Dodaj sekrety GitHub Actions

W repozytorium przejdź do:

**Settings → Secrets and variables → Actions → Secrets**

Dodaj:

- `CLOUDFLARE_API_TOKEN` — token Cloudflare;
- `CLOUDFLARE_ACCOUNT_ID` — identyfikator konta;
- `SECRET_KEY` — klucz OpenAI.

Jeżeli `SECRET_KEY` znajduje się obecnie tylko w sekcji sekretów dla agentów, dodaj go również jako sekret **Actions**. Sekrety agentów nie zawsze są automatycznie dostępne dla workflow GitHub Actions.

Workflow przekazuje `SECRET_KEY` bezpośrednio do sekretów runtime Workera. Nie jest on dodawany do statycznego builda.

### 3. Wdróż backend

Otwórz:

**Actions → Deploy Cloudflare Worker → Run workflow**

Po ukończeniu skopiuj adres Workera, np.:

```text
https://wortschatz-a2-api.twoj-subdomain.workers.dev
```

Endpoint będzie dostępny pod:

```text
https://wortschatz-a2-api.twoj-subdomain.workers.dev/api/generate-cards
```

### 4. Połącz frontend z Workerem

W GitHub przejdź do:

**Settings → Secrets and variables → Actions → Variables**

Dodaj publiczną zmienną:

```text
VITE_API_URL=https://wortschatz-a2-api.twoj-subdomain.workers.dev
```

Adres backendu nie jest sekretem. Po jego dodaniu ponownie uruchom workflow GitHub Pages.

## Wdrożenie GitHub Pages

1. Otwórz **Settings → Pages**.
2. W sekcji **Build and deployment** wybierz **GitHub Actions**.
3. Wypchnij zmiany do gałęzi `main` albo uruchom ręcznie:
   **Actions → Deploy GitHub Pages → Run workflow**.

Docelowy adres frontendu:

```text
https://m-kuczkowski.github.io/german/
```

Workflow wykonuje kolejno instalację, testy, typecheck, build i publikację.

## Konfiguracja OpenAI

Domyślny model znajduje się w `wrangler.toml`:

```toml
MODEL = "gpt-5-nano"
```

Można go zmienić bez modyfikacji frontendu. Worker używa Responses API i ustrukturyzowanej odpowiedzi JSON. Maksymalna liczba kart to 20, a limit pojedynczego klienta wynosi 8 generowań w ciągu 10 minut na instancję Workera.

W panelu OpenAI warto:

- ustawić niski miesięczny budżet projektu;
- dodać alerty np. przy 80% i 95% budżetu;
- używać osobnego klucza tylko dla tej aplikacji;
- okresowo przeglądać Usage;
- natychmiast obrócić klucz, jeżeli istnieje podejrzenie wycieku.

## Dane i prywatność

- fiszki i postępy są przechowywane w IndexedDB na bieżącym urządzeniu;
- aplikacja nie posiada kont użytkowników ani zewnętrznej bazy danych;
- do Workera trafia tylko temat generatora i liczba zamówionych kart;
- do OpenAI nie jest wysyłana cała kolekcja ani historia nauki;
- usunięcie danych Safari może również usunąć postępy, dlatego warto regularnie eksportować kopię JSON.

## PWA na iPhonie

1. Otwórz stronę w Safari.
2. Dotknij ikony udostępniania.
3. Wybierz **Dodaj do ekranu początkowego**.

Po pierwszym otwarciu online aplikacja przechowuje pliki niezbędne do nauki offline. Generator AI wymaga internetu.

## Typowe problemy

### Generator pokazuje, że nie jest skonfigurowany

Sprawdź, czy repozytorium ma zmienną Actions `VITE_API_URL`, a następnie ponownie uruchom workflow GitHub Pages.

### Worker zwraca 403

`ALLOWED_ORIGIN` w `wrangler.toml` musi odpowiadać originowi strony:

```text
https://m-kuczkowski.github.io
```

Origin nie zawiera ścieżki `/german/`.

### Workflow Workera nie widzi klucza

Upewnij się, że `SECRET_KEY` istnieje w **Secrets and variables → Actions**, nie tylko w sekcji sekretów agentów.

### GitHub Pages wyświetla pustą stronę

Sprawdź, czy źródłem Pages jest GitHub Actions oraz czy workflow zbudował aplikację z bazą `/german/`.

### Postępy zniknęły

Dane są lokalne dla danej przeglądarki i domeny. Przywróć ostatni wyeksportowany plik JSON w Ustawieniach.

## Struktura

```text
src/
  data/             110 kart startowych
  lib/              SRS, IndexedDB, API, walidacja i wymowa
  App.tsx           interfejs i przepływy aplikacji
worker/src/         bezpieczny backend OpenAI
public/             manifest, service worker i ikony PWA
tests/              testy logiki, pamięci, API i Workera
.github/workflows/  automatyczne wdrożenia
```
