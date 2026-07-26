# Wortschatz

Mobilna aplikacja PWA do nauki niemieckiego po polsku. Zawiera statyczny zestaw kart z kursu Nicos Weg, ćwiczenia w obu kierunkach językowych, przykładowe zdania po niemiecku z polskim przekładem, lokalne powtórki rozłożone w czasie i wymowę przez Web Speech API.

Interfejs jest zaprojektowany przede wszystkim dla Safari na iPhonie. Po pierwszym otwarciu aplikacja działa również offline.

## Co działa

- pełne 1856 kart A2 i 1182 karty B1;
- wybór jednego tłumaczenia z trzech odpowiedzi (DE → PL i PL → DE);
- wpisywanie tłumaczenia z klawiatury (DE → PL i PL → DE);
- sesje po maksymalnie 10 ćwiczeń;
- powtórki po 1, 3 i 7 dniach, a później w rosnących odstępach;
- priorytet dla kart zaległych i sprawiających trudność;
- kolekcja z wyszukiwaniem, filtrami, edycją i usuwaniem;
- ręczne dodawanie własnych kart;
- postępy, dzienna seria i statystyki poziomów;
- wymowa `de-DE` przez Web Speech API;
- zapis w IndexedDB oraz eksport i import kopii JSON;
- jasny, ciemny i systemowy motyw;
- instalacja na ekranie początkowym jako PWA.

## Źródła słownictwa

Statyczny zestaw powstał z dwóch publicznych talii AnkiWeb:

- [Nicos Weg A2 Deutsch Welle (English)](https://ankiweb.net/shared/info/458469586) — 1856 kart;
- [Nicos Weg B1 Deutsch Welle (Deutsch)](https://ankiweb.net/shared/info/492301569) — 1182 karty.

Aplikacja nie kopiuje plików audio, obrazów ani szablonów Anki. Przechowuje tekst haseł, polskie tłumaczenia przygotowane jednorazowo przez AI oraz odnośniki do oryginalnych talii.

## Architektura

Projekt jest w pełni statyczną aplikacją Vite/React wdrażaną na GitHub Pages pod ścieżką `/german/`. Nie ma backendu, Workera Cloudflare, wywołań OpenAI ani sekretów wymaganych w środowisku produkcyjnym.

Fiszki i postępy są zapisywane wyłącznie w IndexedDB na urządzeniu użytkownika.

## Technologie

- React 19 i TypeScript;
- Vite;
- natywne IndexedDB i Web Speech API;
- Vitest oraz `fake-indexeddb`;
- GitHub Actions i GitHub Pages.

## Uruchomienie lokalne

Wymagany jest Node.js 20 lub nowszy.

```bash
npm install
npm run dev
```

Strona będzie dostępna pod adresem podanym przez Vite, zazwyczaj `http://localhost:5173/german/`.

## Testy i build

```bash
npm test
npm run typecheck
npm run build
```

## Wdrożenie na GitHub Pages

Workflow `.github/workflows/deploy-pages.yml` uruchamia testy, typecheck i build po każdym pushu do `main`, a następnie publikuje katalog `dist`.

W ustawieniach repozytorium jako źródło Pages należy wybrać **GitHub Actions**.

## Aktualizacja danych z Anki

Skrypt `scripts/extract-anki-decks.mjs` wyodrębnia tekst wszystkich notatek z dwóch plików `.apkg`. Nie wykonuje tłumaczeń.

```bash
node scripts/extract-anki-decks.mjs A2.apkg B1.apkg output.json
```

Tłumaczenia i pary zdań kontekstowych są przygotowywane jednorazowo przez model AI, walidowane względem identyfikatorów źródłowych i dopiero wtedy zamieniane na statyczny plik TypeScript. Po wygenerowaniu wynik jest częścią repozytorium; aplikacja nie wykonuje żadnych zapytań do modelu.

## Dane i prywatność

- aplikacja nie posiada kont użytkowników ani zewnętrznej bazy danych;
- podczas korzystania ze strony żadne treści nie są wysyłane do OpenAI ani Cloudflare;
- usunięcie danych Safari może również usunąć postępy, dlatego warto regularnie eksportować kopię JSON.

## PWA na iPhonie

1. Otwórz stronę w Safari.
2. Dotknij ikony udostępniania.
3. Wybierz **Dodaj do ekranu początkowego**.

## Struktura

```text
src/
  data/             3038 statycznych kart Nicos Weg A2/B1
  lib/              ćwiczenia, SRS, IndexedDB, walidacja i wymowa
  App.tsx           interfejs i przepływy aplikacji
scripts/            odczyt źródłowych talii Anki
public/             manifest, service worker i ikony PWA
tests/              testy logiki i pamięci
.github/workflows/  testy, build i wdrożenie GitHub Pages
```
