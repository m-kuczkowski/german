# Wortschatz

Mobilna aplikacja PWA do nauki niemieckiego po polsku. Łączy spokojny interfejs z aktywnym przypominaniem, adaptacyjnymi powtórkami i pełnym zestawem kart Nicos Weg. Działa przede wszystkim na iPhonie, zachowuje postęp offline i synchronizuje go przez Neon po odzyskaniu połączenia.

Interfejs jest zaprojektowany przede wszystkim dla Safari na iPhonie. Po pierwszym otwarciu aplikacja działa również offline.

Podstawa badawcza i uzasadnienie harmonogramu są opisane w
[docs/research-learning-methods.md](docs/research-learning-methods.md).

## Co działa

- pełne 1856 kart A2 i 1182 karty B1;
- pierwsze spotkanie jako zwykła fiszka z trzema ocenami: „Nie znam”, „Niepewnie”, „Znam”;
- adaptacyjne powroty w tej samej lekcji: po 3–5, 6–8 albo 8–11 innych kartach;
- wybór jednego tłumaczenia z trzech odpowiedzi i wpisywanie w obu kierunkach;
- ocena podobieństwa wpisanej odpowiedzi z progiem 90%, bez ignorowania rodzajników i umlautów;
- pięć przegródek Leitnera z odstępami 1, 3, 7, 14 i 30 dni;
- widok zawartości przegródek, terminów i historii decyzji dla każdej karty;
- opanowanie wymagające poprawnych aktywnych odpowiedzi w różnych formach oraz odstępu czasu;
- tryb trudnych słów, dzienna krótka lekcja i spokojne podsumowanie;
- ręczne „Dalej” po odpowiedzi — wynik i kontekst nie znikają automatycznie;
- automatyczne obniżenie stanu karty po błędzie aktywnego przypominania;
- kolekcja z wyszukiwaniem, filtrami, edycją i usuwaniem;
- ręczne dodawanie własnych kart;
- postępy, dzienna seria i statystyki poziomów;
- wymowa `de-DE` przez Web Speech API;
- zapis w IndexedDB, synchronizacja postępu w Neon oraz eksport i import kopii JSON;
- jasny, ciemny i systemowy motyw;
- instalacja na ekranie początkowym jako PWA.

## Źródła słownictwa

Statyczny zestaw powstał z dwóch publicznych talii AnkiWeb:

- [Nicos Weg A2 Deutsch Welle (English)](https://ankiweb.net/shared/info/458469586) — 1856 kart;
- [Nicos Weg B1 Deutsch Welle (Deutsch)](https://ankiweb.net/shared/info/492301569) — 1182 karty.

Aplikacja nie kopiuje plików audio, obrazów ani szablonów Anki. Przechowuje tekst haseł, polskie tłumaczenia przygotowane jednorazowo przez AI oraz odnośniki do oryginalnych talii.

## Jak działa nauka

Nowe słowo jest najpierw prezentowane na dwustronnej fiszce. Trzy oceny są widoczne po obu stronach. „Znam” prowadzi do aktywnego wpisywania po kilku innych słowach, „Niepewnie” do prostszego quizu, a „Nie znam” do szybkiego ponownego pokazania fiszki.

Kolejne odpowiedzi aktualizują przegródkę, termin, serię, historię oraz zestaw zaliczonych typów ćwiczeń. Samo klikanie „Znam” nigdy nie wystarcza do opanowania. Błąd aktywnego przypominania przenosi kartę do przegródki 1 i planuje wcześniejszy powrót. Ekran wyniku pozostaje widoczny do kliknięcia „Dalej”.

## Architektura

- Vite, React i TypeScript po stronie klienta;
- Vercel Function `api/learning.js` jako wąski interfejs do danych;
- Neon Postgres dla katalogu 3038 kart i anonimowego postępu urządzenia;
- IndexedDB jako pamięć lokalna i źródło działania offline;
- service worker z dynamicznym zakresem dla Vercel i GitHub Pages;
- Web Speech API do bezpłatnej wymowy `de-DE`.

Nie ma wywołań OpenAI ani Cloudflare w aplikacji produkcyjnej. Dane urządzenia są identyfikowane losowym tokenem przechowywanym lokalnie; do przeglądarki nie trafia adres bazy.

## Technologie

- React 19 i TypeScript;
- Vite;
- Neon Serverless, natywne IndexedDB, service worker i Web Speech API;
- Vitest oraz `fake-indexeddb`;
- GitHub Actions i GitHub Pages.

## Uruchomienie lokalne

Wymagany jest Node.js 20 lub nowszy.

```bash
npm install
npm run dev
```

Strona będzie dostępna pod adresem podanym przez Vite, zazwyczaj `http://localhost:5173/german/`.

Do lokalnego uruchomienia API pobierz zmienne projektu Vercel do `.env.local`. Plik jest ignorowany przez Git.

## Testy i build

```bash
npm test
npm run typecheck
npm run build
```

## Wdrożenie

Produkcja działa na Vercel. Projekt wymaga `DATABASE_URL` z integracji Neon. Po zmianie katalogu kart uruchom `npm run db:push`, następnie wykonaj testy, build i wdrożenie produkcyjne.

Workflow GitHub Pages pozostaje statycznym podglądem awaryjnym; bez Vercel Function korzysta z katalogu osadzonego w aplikacji i lokalnego IndexedDB.

## Aktualizacja danych z Anki

Skrypt `scripts/extract-anki-decks.mjs` wyodrębnia tekst wszystkich notatek z dwóch plików `.apkg`. Nie wykonuje tłumaczeń.

```bash
node scripts/extract-anki-decks.mjs A2.apkg B1.apkg output.json
```

Tłumaczenia i pary zdań kontekstowych są przygotowywane jednorazowo przez model AI, walidowane względem identyfikatorów źródłowych i dopiero wtedy zamieniane na statyczny plik TypeScript. Po wygenerowaniu wynik jest częścią repozytorium; aplikacja nie wykonuje żadnych zapytań do modelu.

## Dane i prywatność

- aplikacja nie posiada kont użytkowników ani SSO;
- katalog i postęp są synchronizowane z Neon przez API Vercel;
- podczas nauki żadne treści nie są wysyłane do OpenAI ani Cloudflare;
- wyczyszczenie danych Safari usuwa lokalny anonimowy identyfikator, dlatego warto okresowo eksportować kopię JSON.

## PWA na iPhonie

1. Otwórz stronę w Safari.
2. Dotknij ikony udostępniania.
3. Wybierz **Dodaj do ekranu początkowego**.

## Struktura

```text
src/
  data/             3038 statycznych kart Nicos Weg A2/B1
  lib/              ćwiczenia, sesje, SRS, synchronizacja, IndexedDB i wymowa
  App.tsx           interfejs i przepływy aplikacji
scripts/            odczyt źródłowych talii Anki
api/                funkcja synchronizacji Vercel + Neon
public/             manifest, service worker i ikony PWA
tests/              testy logiki i pamięci
.github/workflows/  testy, build i wdrożenie GitHub Pages
```
