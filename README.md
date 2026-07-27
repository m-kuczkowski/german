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
- osobne ćwiczenia rodzajnika i dyktanda ze słuchu;
- wskaźniki znajomości znaczenia, formy, rodzajnika i brzmienia słowa;
- adaptacyjna liczba nowych kart zależna od kolejki powtórek;
- ocena podobieństwa wpisanej odpowiedzi z progiem 90%, bez ignorowania rodzajników i umlautów;
- pięć przegródek Leitnera z odstępami 1, 3, 7, 14 i 30 dni;
- widok zawartości przegródek, terminów i historii decyzji dla każdej karty;
- opanowanie wymagające poprawnych aktywnych odpowiedzi w różnych formach oraz odstępu czasu;
- tryb trudnych słów, dzienna krótka lekcja i spokojne podsumowanie;
- pojedyncze kliknięcie oceny przechodzi do następnej zwykłej fiszki;
- ręczne „Dalej” po wyborze lub wpisywaniu — wynik i kontekst nie znikają automatycznie;
- automatyczne obniżenie stanu karty po błędzie aktywnego przypominania;
- kolekcja z wyszukiwaniem, filtrami, edycją i usuwaniem;
- ręczne dodawanie własnych kart;
- postępy, dzienna seria i statystyki poziomów;
- naturalna wymowa wszystkich 3038 haseł głosem Thorsten (Piper), z systemowym
  lektorem `de-DE` jako fallbackiem;
- profil wybierany po imieniu bez rejestracji, zapamiętywany na urządzeniu;
- zapis w IndexedDB, synchronizacja postępu imiennego w Neon oraz eksport i import kopii JSON;
- jasny, ciemny i systemowy motyw;
- instalacja na ekranie początkowym jako PWA.

## Źródła słownictwa

Statyczny zestaw powstał z dwóch publicznych talii AnkiWeb:

- [Nicos Weg A2 Deutsch Welle (English)](https://ankiweb.net/shared/info/458469586) — 1856 kart;
- [Nicos Weg B1 Deutsch Welle (Deutsch)](https://ankiweb.net/shared/info/492301569) — 1182 karty.

Aplikacja nie kopiuje plików audio, obrazów ani szablonów Anki. Przechowuje tekst haseł, polskie tłumaczenia przygotowane jednorazowo przez AI oraz odnośniki do oryginalnych talii.
Techniczne separatory z talii (`|`, `/`) są usuwane przed publikacją. Rekcja pozostaje jako opcjonalna wskazówka w nawiasie, więc użytkownik wpisuje naturalne hasło, np. `vergessen`, a nie `etwas/jemanden vergessen`.

## Jak działa nauka

Nowe słowo jest najpierw prezentowane na dwustronnej fiszce. Trzy oceny są widoczne po obu stronach. „Znam” prowadzi do aktywnego wpisywania po kilku innych słowach, „Niepewnie” do prostszego quizu, a „Nie znam” do szybkiego ponownego pokazania fiszki.

Kolejne odpowiedzi aktualizują przegródkę, termin, serię, historię oraz zestaw zaliczonych typów ćwiczeń. Samo klikanie „Znam” nigdy nie wystarcza do opanowania. Ocena na zwykłej fiszce od razu otwiera kolejną kartę. Po wyborze jednej z trzech odpowiedzi lub wpisywaniu ekran wyniku pozostaje widoczny do kliknięcia „Dalej”.

## Architektura

- Vite, React i TypeScript po stronie klienta;
- Vercel Function `api/learning.js` jako wąski interfejs do danych;
- Neon Postgres dla katalogu 3038 kart i postępu oddzielonego według imienia;
- IndexedDB jako pamięć lokalna i źródło działania offline;
- service worker z dynamicznym zakresem dla Vercel i GitHub Pages;
- 3038 jednorazowo wygenerowanych offline nagrań Piper, spakowanych do 64
  niewielkich paczek WebM/Opus w publicznym Vercel Blob;
- zwykły element HTML Audio do odtwarzania oraz Web Speech API jako fallback.

Nie ma wywołań OpenAI ani Cloudflare w aplikacji produkcyjnej. Imię jest normalizowane
bez rozróżniania wielkości liter, a jego wybór pozostaje zapisany lokalnie. Ponieważ
nie ma hasła, osoba znająca imię może otworzyć ten sam postęp. Do przeglądarki nie
trafia adres bazy.

## Technologie

- React 19 i TypeScript;
- Vite;
- Neon Serverless, Vercel Blob, natywne IndexedDB, service worker i Web Speech API;
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

`scripts/curate-natural-cards.mjs` wykonuje powtarzalną, ręcznie zdefiniowaną korektę technicznych zapisów i wybranych tłumaczeń bez zmiany identyfikatorów kart.

## Nagrania Thorsten

Audio nie jest generowane podczas używania aplikacji. Skrypt
`scripts/piper-audio-source.mjs` przygotowuje dokładnie 3038 tekstów z bieżącego
katalogu, a `scripts/generate-piper-audio.py` jednorazowo syntezuje je lokalnie
przez Piper i kompresuje kodekiem Opus w kontenerze WebM. Paczki mają stabilne
nazwy, dzięki czemu mogą być długo buforowane przez CDN.

```bash
python -m pip install -r scripts/requirements-audio.txt
npm run audio:source -- --output /tmp/german-piper-source.json
python scripts/generate-piper-audio.py \
  --source /tmp/german-piper-source.json \
  --model /path/to/de_DE-thorsten-high.onnx \
  --config /path/to/de_DE-thorsten-high.onnx.json \
  --ffmpeg /path/to/ffmpeg \
  --output /tmp/german-piper-audio
npm run audio:upload -- --audio-dir /tmp/german-piper-audio
```

Ostatni krok wysyła 64 paczki i manifest do publicznego Vercel Blob oraz
generuje `src/data/piperAudioManifest.ts`. Wymaga lokalnego
`BLOB_READ_WRITE_TOKEN`; sekret nigdy nie trafia do kodu klienta.

Użyty model to
[`de_DE-thorsten-high`](https://huggingface.co/rhasspy/piper-voices/tree/main/de/de_DE/thorsten/high)
z repozytorium `rhasspy/piper-voices`. Repozytorium modelu jest objęte licencją MIT, a karta
modelu wskazuje zestaw głosowy Thorsten na licencji CC0. Zweryfikowane sumy MD5:
`256505fe58fb8b9d6ed78b83f6b8a9d2` dla modelu ONNX oraz
`e81686e00a9d825e2488ead660bec6fd` dla jego konfiguracji.

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
