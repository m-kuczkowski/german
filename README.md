# Wortschatz

Mobilna aplikacja PWA do nauki niemieckiego po polsku. Łączy spokojny interfejs z aktywnym przypominaniem, adaptacyjnymi powtórkami i oficjalnym rdzeniem słownictwa Goethe A2/B1. Pełny zestaw kart Nicos Weg pozostaje zachowany jako biblioteka rozszerzona. Aplikacja działa przede wszystkim na iPhonie, zachowuje postęp offline i synchronizuje go przez Neon po odzyskaniu połączenia.

Interfejs jest zaprojektowany przede wszystkim dla Safari na iPhonie. Po pierwszym otwarciu aplikacja działa również offline.

Podstawa badawcza i uzasadnienie harmonogramu są opisane w
[docs/research-learning-methods.md](docs/research-learning-methods.md).

## Co działa

- oficjalny rdzeń Goethe: 3041 pozycji źródłowych odwzorowanych na 3180 kart (1364 A2 i 1816 B1);
- katalog 4937 kart, w tym zachowane wszystkie 3038 kart Nicos Weg;
- pierwsze spotkanie jako zwykła fiszka z trzema ocenami: „Nie znam”, „Niepewnie”, „Znam”;
- adaptacyjne powroty w tej samej lekcji: po 3–5, 6–8 albo 8–11 innych kartach;
- wybór jednego tłumaczenia z trzech odpowiedzi i wpisywanie w obu kierunkach;
- osobne ćwiczenia rodzajnika i dyktanda ze słuchu;
- wskaźniki znajomości znaczenia, formy, rodzajnika i brzmienia słowa;
- adaptacyjna liczba nowych kart zależna od kolejki powtórek;
- pedagogiczna kolejność nowych słów zamiast alfabetycznej kolejności PDF:
  najpierw codzienne A2, częstsze i prostsze formy oraz podstawy rodzin słów;
- ocena podobieństwa wpisanej odpowiedzi z progiem 90%, bez ignorowania rodzajników i umlautów;
- pięć czytelnych przegródek Leitnera z adaptacyjnymi odstępami około 1, 2–4, 5–10, 10–21 i 21–60 dni;
- widok zawartości przegródek, terminów i historii decyzji dla każdej karty;
- opanowanie wymagające poprawnych aktywnych odpowiedzi w różnych formach oraz odstępu czasu;
- tryb trudnych słów, dzienna krótka lekcja i spokojne podsumowanie;
- dobrowolna zakładka „Wyzwania” z rodzajnikami, dyktandem, wpisywaniem,
  wyborem znaczenia i trybem mieszanym wyłącznie dla poznanych słów;
- wybór 5, 10, 20 lub wszystkich dostępnych zadań, bez duplikowania kart;
- osobny postęp umiejętności w wyzwaniach bez przesuwania terminów Leitnera;
- wznowienie rozpoczętego wyzwania po odświeżeniu i na innym urządzeniu;
- zakładka „Gramatyka” z kursem A1 → A2 → B1: krótkie wyjaśnienie po polsku,
  przykłady z tłumaczeniem oraz wybór, uzupełnianie, układanie szyku i wpisywanie;
- osobny ekran „Teoria” przy każdej dostępnej lekcji: wzór, trzy zasady,
  przykłady z odsłuchem, sposób zapamiętania i typowy błąd;
- teoria pozostaje dostępna także podczas ćwiczenia i można z niej wrócić do
  tego samego pytania bez przerywania sesji;
- 12 gotowych lekcji pilotażowych (po 5 ćwiczeń) oraz widoczny katalog 60 tematów;
- osobne powtórki gramatyczne po 1, 3, 7, 14, 30 i 60 dniach, bez wpływu na
  koszyki Leitnera, terminy fiszek ani wyzwania;
- pojedyncze kliknięcie oceny przechodzi do następnej zwykłej fiszki;
- ręczne „Dalej” po wyborze lub wpisywaniu — wynik i kontekst nie znikają automatycznie;
- automatyczne obniżenie stanu karty po błędzie aktywnego przypominania;
- kolekcja z wyszukiwaniem, filtrami, edycją i usuwaniem;
- ręczne dodawanie własnych kart;
- postępy, dzienna seria i statystyki poziomów;
- naturalna wymowa wszystkich 4937 haseł głosem Kokoro Martin, z systemowym
  lektorem `de-DE` jako fallbackiem dla nowych kart Goethe i niedostępnych nagrań;
- profil wybierany po imieniu bez rejestracji, zapamiętywany na urządzeniu;
- zapis w IndexedDB, synchronizacja postępu imiennego w Neon oraz eksport i import kopii JSON;
- jasny, ciemny i systemowy motyw;
- instalacja na ekranie początkowym jako PWA.

## Źródła słownictwa

Prawdziwą podstawą domyślnego programu są oficjalne listy egzaminacyjne:

- [Goethe-Zertifikat A2 Wortliste](https://www.goethe.de/pro/relaunch/prf/en/Goethe-Zertifikat_A2_Wortliste.pdf);
- [Goethe-Zertifikat B1 Wortliste](https://www.goethe.de/pro/relaunch/prf/en/Goethe-Zertifikat_B1_Wortliste.pdf).

Lista B1 jest traktowana jako kumulatywna. Po oczyszczeniu wariantów źródłowych katalog referencyjny zawiera 1277 pozycji A2 i 1764 dodatkowe pozycje B1. Zbieżne hasła wykorzystują istniejące, sprawdzone karty; brakujące zostały przetłumaczone jednorazowo w ChatGPT i dodane do rdzenia. Warianty płci, znaczeń i istniejące karty Nicos powodują, że 3041 pozycji źródłowych odpowiada 3180 kartom do nauki.

Biblioteka rozszerzona pochodzi z dwóch publicznych talii AnkiWeb:

- [Nicos Weg A2 Deutsch Welle (English)](https://ankiweb.net/shared/info/458469586) — 1856 kart;
- [Nicos Weg B1 Deutsch Welle (Deutsch)](https://ankiweb.net/shared/info/492301569) — 1182 karty.

Aplikacja nie kopiuje plików audio, obrazów ani szablonów Anki. Przechowuje tekst haseł, polskie tłumaczenia przygotowane jednorazowo przez AI oraz odnośniki do źródeł.
Techniczne separatory z talii (`|`, `/`) są usuwane przed publikacją. Rekcja pozostaje jako opcjonalna wskazówka w nawiasie, więc użytkownik wpisuje naturalne hasło, np. `vergessen`, a nie `etwas/jemanden vergessen`.

## Jak działa nauka

Nowe słowo jest najpierw prezentowane na dwustronnej fiszce. Trzy oceny są widoczne po obu stronach. „Znam” prowadzi do aktywnego wpisywania po kilku innych słowach, „Niepewnie” do odsłuchania i zapisania słowa po niemiecku, a „Nie znam” do szybkiego ponownego pokazania fiszki.

Kolejne odpowiedzi aktualizują przegródkę, termin, serię, historię oraz zestaw zaliczonych typów ćwiczeń. Samo klikanie „Znam” nigdy nie wystarcza do opanowania. Ocena na zwykłej fiszce od razu otwiera kolejną kartę. Po wyborze jednej z trzech odpowiedzi lub wpisywaniu ekran wyniku pozostaje widoczny do kliknięcia „Dalej”.

„Wyzwania” są niezależnym, dobrowolnym utrwalaniem. Losują poznane słowa,
preferując te dawno niećwiczone w danym trybie. Błąd oznacza do poprawy tylko
konkretną umiejętność (np. rodzajnik albo słuch) i dodaje ją do trudniejszych
słów, ale nie cofa pozostałej wiedzy ani nie zmienia terminu zwykłej powtórki.
Po każdym zadaniu wynik, pełna odpowiedź i zdanie kontekstowe pozostają na
ekranie do ręcznego kliknięcia „Dalej”.

### Kolejność nowych słów

Kolejka powtórek zawsze ma pierwszeństwo przed nowymi kartami. Same nowe słowa
nie są już podawane w alfabetycznej kolejności list Goethe. Generator przypisuje
każdej z 3180 kart rdzenia pasmo i miejsce w kategorii, biorąc pod uwagę:

- poziom Goethe A2 przed B1, z ograniczoną pulą najczęstszych słów B1 wcześniej;
- współczesną częstość w języku niemieckim;
- długość, liczbę elementów i złożoność formy;
- praktyczną kolejność kategorii, od codzienności, relacji i domu;
- podstawę przed bezpiecznie rozpoznanym derywatem lub złożeniem;
- odstęp między identycznymi hasłami i przeplatanie typów wyrazów.

Słowa funkcyjne pozostają w oficjalnym programie, lecz nie zajmują całego
początku kursu. Kolejność dotyczy wyłącznie kart jeszcze niepoznanych, dlatego
aktualizacja nie resetuje ani nie przesuwa dotychczasowych powtórek użytkownika.

## Architektura

- Vite, React i TypeScript po stronie klienta;
- Vercel Function `api/learning.js` jako wąski interfejs do danych;
- Neon Postgres dla katalogu 4937 kart i postępu oddzielonego według imienia;
- osobne, znormalizowane tabele Neon dla tematów, zależności, przykładów,
  ćwiczeń, odpowiedzi i postępu gramatycznego;
- IndexedDB jako pamięć lokalna i źródło działania offline;
- service worker z dynamicznym zakresem dla Vercel i GitHub Pages;
- 4937 jednorazowo wygenerowanych offline nagrań, spakowanych do 64
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

Produkcja działa na Vercel. Projekt wymaga `DATABASE_URL` z integracji Neon. Po zmianie katalogu kart uruchom `npm run db:push`, a po pierwszym wdrożeniu gramatyki również `npm run db:migrate:grammar`; następnie wykonaj testy, build i wdrożenie produkcyjne.

Workflow GitHub Pages pozostaje statycznym podglądem awaryjnym; bez Vercel Function korzysta z katalogu osadzonego w aplikacji i lokalnego IndexedDB.

## Aktualizacja danych Goethe i Anki

`scripts/goethe-curriculum.py` odtwarza referencyjny katalog z oficjalnych PDF-ów, dopasowuje go do zachowanych kart Nicos Weg i przygotowuje kolejkę brakujących tłumaczeń. Pliki `data/goetheTranslations-*.json` są walidowanymi wynikami jednorazowego tłumaczenia przez ChatGPT. `scripts/build-learning-priority.py` wylicza pedagogiczną kolejność na podstawie metadanych i niemieckiej częstości `wordfreq`, a `scripts/build-goethe-catalog.mjs` sprawdza kompletność identyfikatorów, pól i priorytetów, po czym generuje statyczny katalog aplikacji.

```bash
python3 -m venv .venv-curriculum
.venv-curriculum/bin/pip install -r scripts/requirements-curriculum.txt
.venv-curriculum/bin/python scripts/build-learning-priority.py
node scripts/build-goethe-catalog.mjs
```

Skrypt `scripts/extract-anki-decks.mjs` wyodrębnia tekst wszystkich notatek z dwóch plików `.apkg`. Nie wykonuje tłumaczeń.

```bash
node scripts/extract-anki-decks.mjs A2.apkg B1.apkg output.json
```

Tłumaczenia i pary zdań kontekstowych są przygotowywane jednorazowo przez model AI, walidowane względem identyfikatorów źródłowych i dopiero wtedy zamieniane na statyczny plik TypeScript. Po wygenerowaniu wynik jest częścią repozytorium; aplikacja nie wykonuje żadnych zapytań do modelu.

`scripts/curate-natural-cards.mjs` wykonuje powtarzalną, ręcznie zdefiniowaną korektę technicznych zapisów i wybranych tłumaczeń bez zmiany identyfikatorów kart.

## Nagrania Kokoro Martin

Audio nie jest generowane podczas używania aplikacji. Skrypt
`scripts/piper-audio-source.mjs` przygotowuje wszystkie 4937 tekstów katalogu
(lub sam rdzeń/opcjonalnie bibliotekę Nicos przez `--scope`), a `scripts/generate-kokoro-audio.py` jednorazowo syntezuje je lokalnie
przez Kokoro Martin i kompresuje kodekiem Opus w kontenerze WebM. Tekst do
wymowy upraszcza techniczne znaki kart (`|`, `/`, nawiasy), a każde nagranie ma
krótką ciszę przed i po słowie, aby początek nie był ucinany przy odtwarzaniu
segmentu. Paczki mają stabilne nazwy, dzięki czemu mogą być długo buforowane
przez CDN.

```bash
python -m pip install -r scripts/requirements-audio-kokoro.txt
npm run audio:source -- --scope all --output /tmp/german-kokoro-source.json
python scripts/generate-kokoro-audio.py \
  --source /tmp/german-kokoro-source.json \
  --model /path/to/kokoro-martin.onnx \
  --voices /path/to/voices-martin.npz \
  --output /tmp/german-kokoro-audio
npm run audio:upload -- --audio-dir /tmp/german-kokoro-audio
```

Ostatni krok wysyła 64 paczki i manifest do publicznego Vercel Blob oraz
generuje `src/data/piperAudioManifest.ts`. Wymaga lokalnego
`BLOB_READ_WRITE_TOKEN`; sekret nigdy nie trafia do kodu klienta.

Użyty model to [Kokoro German Martin](https://huggingface.co/Godelaune/Kokoro-82M-ONNX-German-Martin),
niemiecki model ONNX działający w pełni offline i objęty licencją Apache 2.0.
Nagrania powstają w tempie `0.9` i są kodowane mono Opus 40 kb/s. Systemowy
lektor przeglądarki pozostaje fallbackiem, gdy plik nie jest dostępny.

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
  data/             oficjalny rdzeń Goethe i zachowana biblioteka Nicos Weg
  lib/              ćwiczenia, sesje, SRS, synchronizacja, IndexedDB i wymowa
  App.tsx           interfejs i przepływy aplikacji
scripts/            odczyt Goethe/Anki, budowa katalogu, migracje i audio
api/                funkcja synchronizacji Vercel + Neon
public/             manifest, service worker i ikony PWA
tests/              testy logiki i pamięci
.github/workflows/  testy, build i wdrożenie GitHub Pages
```
