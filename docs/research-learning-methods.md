# Podstawa naukowa systemu nauki

Stan przeglądu: 27 lipca 2026. Dokument opisuje decyzje zastosowane w aplikacji
Wortschatz. Najpierw uwzględniono recenzowane badania i metaanalizy, a dokumentację
Anki/FSRS potraktowano jako źródło wdrożeniowe, nie dowód rozstrzygający.

## Najmocniejsze wnioski

| Zjawisko | Co pokazują źródła | Decyzja w aplikacji |
| --- | --- | --- |
| Aktywne przypominanie (retrieval practice / testing effect) | Testowanie daje lepsze odroczone zapamiętanie niż ponowne czytanie. Efekt jest stabilny w metaanalizie, choć jego wielkość zależy od rodzaju testu i materiału. | Nowa karta służy do poznania słowa, lecz późniejszy awans wymaga wyboru albo wpisania odpowiedzi. Samo obejrzenie odwrotu nie prowadzi do opanowania. |
| Rozłożenie nauki w czasie | Praktyka rozłożona w czasie przewyższa skumulowaną. Najlepsza przerwa zależy od tego, jak długo wiedza ma zostać zachowana — nie istnieje jedna uniwersalna tabela dni. | Pięć przegródek ma jawne, rosnące odstępy 1, 3, 7, 14 i 30 dni. To prosta reguła produktu, a nie „naukowo jedyny” harmonogram. |
| Successive relearning | Skuteczna procedura łączy poprawne odtworzenie z ponownym poprawnym odtworzeniem w późniejszych, rozłożonych sesjach. Kilka sukcesów jednego dnia nie zastępuje sukcesów w różne dni. | Przegródka 5 wymaga poprawnych aktywnych odpowiedzi w co najmniej 3 różne dni, serii co najmniej 4 i co najmniej jednego poprawnego wpisania. |
| Informacja zwrotna | Informacja o poprawnej odpowiedzi po teście zwiększa korzyść i ogranicza utrwalanie błędnych odpowiedzi w testach wyboru. | Wynik pozostaje bez limitu czasu i pokazuje prawidłową odpowiedź, oba tłumaczenia, zdania kontekstowe i decyzję harmonogramu. Następna karta pojawia się dopiero po „Dalej”. |
| Samoocena | Ocena własnej znajomości przy widocznej odpowiedzi może tworzyć złudzenie kompetencji. | „Znam” na zwykłej fiszce planuje aktywne sprawdzenie, ale nie awansuje karty do wyższej przegródki. Błąd aktywny ma większą wagę niż deklaracja. |
| Przeplatanie | Przeplatanie może poprawiać rozróżnianie podobnych typów problemów, ale korzyść zależy od zadania i nie jest tak uniwersalna jak odstępy i testowanie. | W sesji przeplatane są kierunki DE→PL, PL→DE, wybór i wpisywanie. Kategorie pozostają życiowymi, czytelnymi lekcjami; aplikacja nie miesza wszystkiego losowo. |
| Odstępy w nauce L2 | Metaanaliza 48 eksperymentów wykazała średni do dużego efektu rozłożenia nauki języka w czasie. Dłuższe odstępy pomagały bardziej w testach odroczonych; odstępy równe i rosnące były statystycznie porównywalne. | Zachowujemy prosty, wyjaśnialny system pięciu przegródek. Nie zwiększamy liczby powtórek tego samego dnia, a nowe karty są ograniczane, gdy rośnie kolejka zaległych. |
| Wiedza receptywna i produktywna | Znajomość słowa ma różne składniki. Rozpoznanie znaczenia nie dowodzi umiejętności odtworzenia formy w pisaniu lub mowie. Metaanaliza nauki wspomaganej technologią wykazała średni efekt dla rozpoznawania i mniejszy dla produkcji, choć różnica między podgrupami nie była istotna statystycznie. | Aplikacja osobno pokazuje sprawdzenie znaczenia, niemieckiej formy, rodzajnika i słuchu. Wyższe etapy częściej wymagają wpisywania niż wyboru. |
| Forma dźwiękowa | Trening percepcji dźwięków L2 poprawia przede wszystkim percepcję, a w mniejszym stopniu również produkcję. Eksperyment ze słownictwem mówionym pokazał przewagę odtwarzania z informacją zwrotną nad samym powtarzaniem wzorca. | Dodano dyktando: użytkownik słucha niemieckiego hasła i odtwarza jego zapis. Dźwięk pochodzi z bezpłatnej syntezy mowy urządzenia, a po odpowiedzi pojawia się tekst, kontekst i możliwość ponownego odsłuchu. |
| Informacja o formie gramatycznej | Metaanaliza korekty w nauce L2 wskazuje na trwałe korzyści informacji zwrotnej, szczególnie w zadaniach wymagających samodzielnej odpowiedzi. Wyniki zależą jednak od struktury, wieku i rodzaju zadania. | Dla rzeczowników dodano osobne rozpoznawanie `der/die/das`. Błąd rodzajnika jest błędem aktywnego sprawdzenia i kieruje kartę do wcześniejszej powtórki. |
| Zakres A2–B1 | CEFR oraz Goethe traktują rozumienie ze słuchu, czytanie, pisanie i mówienie jako odrębne, potrzebne kompetencje. Goethe A2 obejmuje codzienne rozmowy, komunikaty i wiadomości; B1 wymaga rozumienia głównych punktów i szczegółów jasnej mowy standardowej. | Fiszki pozostają narzędziem słownikowym, ale nie udają pełnego kursu. Dyktando uzupełnia największą lukę — brak aktywnego sprawdzania formy słyszanej — bez obietnicy zastąpienia ćwiczeń rozmowy i dłuższych tekstów. |

## Audyt funkcji i priorytety

| Funkcja | Siła dowodów | Wpływ | Koszt / ryzyko interfejsu | Decyzja i pomiar |
| --- | --- | --- | --- | --- |
| Adaptacyjna liczba nowych kart | wysoka dla rozłożenia nauki; konkretne progi są decyzją produktu | wysoki, bo ogranicza narastanie zaległości | niski / bardzo niskie | **Teraz.** 6 nowych bez zaległości, 4 przy 1–3, 2 przy 4–6, 1 przy 7–9 i 0 przy co najmniej 10 zaległych. Mierzymy wielkość kolejki i terminowość powtórek. |
| Osobny rodzajnik | średnia; mocna podstawa w rozróżnianiu składników wiedzy, mniej badań nad tym dokładnym UI | wysoki dla 1558 z 3038 kart | niski / niskie | **Teraz.** Trzy krótkie odpowiedzi bez nowego ekranu. Mierzymy poprawne aktywne odpowiedzi w trybie rodzajnika. |
| Dyktando pojedynczych haseł | średnia do wysokiej dla percepcji i retrieval practice | wysoki, bo zamyka lukę słuchową | średni / niskie | **Teraz.** Odtworzenie jednym przyciskiem i wpisanie odpowiedzi. Mierzymy skuteczność oraz pomyłki w trybie słuchowym. |
| Wskaźniki znaczenie / forma / rodzajnik / słuch | pośrednia; wynikają z wielowymiarowego modelu znajomości słowa | średni, poprawia trafność samooceny | niski / niskie | **Teraz.** Są widoczne wyłącznie w szczegółach karty; brak nowych punktów lub celów. |
| Uzupełnianie luk w zdaniu | średnia dla nauki w kontekście i informacji zwrotnej | potencjalnie wysoki | wysoki: automatyczne luki bywają błędne przy odmianie | **Później.** Najpierw potrzebne są jawne lemmy i formy odmienione w danych. Pomiar: transfer do nowych zdań. |
| Pisanie i układanie całych zdań | CEFR wskazuje na znaczenie produkcji; dowody nie uzasadniają automatycznej, binarnej oceny dowolnych zdań | wysoki dla B1 | bardzo wysoki bez płatnego lub zawodnego oceniania | **Później.** Najpierw przygotować ręcznie zweryfikowane zadania zamknięte i rubryki. |
| Rozpoznawanie mowy i automatyczna ocena wymowy | metaanalizy ASR są obiecujące, szczególnie z jawną korektą | potencjalnie wysoki | wysoki: zależność od urządzenia, prywatność, błędy ASR | **Nie teraz.** Sam zapis transkrypcji nie jest wystarczająco wiarygodną oceną wymowy niemieckiej. |
| Obrazki, ligi, monety i rankingi | brak uzasadnienia jako rdzenia zapamiętywania w tym produkcie | niski | wysoki szum i presja | **Nie wdrażać.** Zachować spokojny interfejs oraz krótką informację o postępie. |

## Źródła

1. Dunlosky, Rawson, Marsh, Nathan i Willingham (2013),
   *Improving Students’ Learning With Effective Learning Techniques*,
   `doi:10.1177/1529100612453266`.
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/26173288/).
2. Roediger i Karpicke (2006), *Test-Enhanced Learning*,
   `doi:10.1111/j.1467-9280.2006.01693.x`.
   [Association for Psychological Science](https://www.psychologicalscience.org/journals/psychological-science/j.1467-9280.2006.01693.x/).
3. Rowland (2014), *The Effect of Testing Versus Restudy on Retention: A
   Meta-Analytic Review*, `doi:10.1037/a0037559`.
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/25150680/).
4. Cepeda, Pashler, Vul, Wixted i Rohrer (2006), *Distributed Practice in
   Verbal Recall Tasks: A Review and Quantitative Synthesis*,
   `doi:10.1037/0033-2909.132.3.354`.
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/16719566/).
5. Rawson i Dunlosky (2022), *Successive Relearning: An Underexplored but
   Potent Technique for Obtaining and Maintaining Knowledge*,
   `doi:10.1177/09637214221100484`.
   [Current Directions in Psychological Science — PDF](https://journals.sagepub.com/doi/pdf/10.1177/09637214221100484?download=true).
6. Butler i Roediger (2008), *Feedback Enhances the Positive Effects and
   Reduces the Negative Effects of Multiple-Choice Testing*,
   `doi:10.3758/MC.36.3.604`.
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/18491500/).
7. Koriat i Bjork (2005), *Illusions of Competence in Monitoring One’s
   Knowledge During Study*, `doi:10.1037/0278-7393.31.2.187`.
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/15755238/).
8. Kornell i Bjork (2008), *Learning Concepts and Categories: Is Spacing the
   “Enemy of Induction”?*, `doi:10.1111/j.1467-9280.2008.02127.x`.
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/18578849/).
9. Weinstein i Sumeracki (2018), *Teaching the Science of Learning*,
   `doi:10.1007/s10648-017-9421-4`.
   [PubMed](https://pubmed.ncbi.nlm.nih.gov/29399621/).
10. [Anki Manual — Deck Options](https://docs.ankiweb.net/deck-options).
    Źródło wdrożeniowe: FSRS zaleca mało kroków tego samego dnia; dokumentacja
    ostrzega też, że 20 nowych kart dziennie może długoterminowo generować około
    200 dziennych powtórek. Nie jest to uniwersalna proporcja dla każdej osoby.
11. [Anki Manual — Statistics](https://docs.ankiweb.net/stats.html).
    Definicje stabilności, trudności, przewidywanej odtwarzalności i obciążenia.
12. Kim i Webb (2022), *The Effects of Spaced Practice on Second Language
    Learning: A Meta-Analysis*, `doi:10.1111/lang.12479`.
    [Language Learning](https://doi.org/10.1111/lang.12479).
13. Yu i Trainin (2022), *A meta-analysis examining technology-assisted L2
    vocabulary learning*, `doi:10.1017/S0958344021000239`.
    [ReCALL](https://doi.org/10.1017/S0958344021000239).
14. Kang, Gollan i Pashler (2013), *Don't just repeat after me: retrieval
    practice is better than imitation for foreign vocabulary learning*,
    `doi:10.3758/s13423-013-0450-z`.
    [PubMed](https://pubmed.ncbi.nlm.nih.gov/23681928/).
15. Sakai i Moorman (2018), *Can perception training improve the production
    of second language phonemes?*, `doi:10.1017/S0142716417000418`.
    [Applied Psycholinguistics](https://doi.org/10.1017/S0142716417000418).
16. Lyster i Saito (2010), *Oral Feedback in Classroom SLA: A Meta-Analysis*,
    `doi:10.1017/S0272263109990520`.
    [Studies in Second Language Acquisition](https://doi.org/10.1017/S0272263109990520).
17. Council of Europe (2020), *CEFR Companion Volume*.
    [Oficjalny PDF](https://rm.coe.int/cefr-companion-volume-with-new-descriptors-2018/1680787989.pdf).
18. Goethe-Institut, [Goethe-Zertifikat A2 — materiały i zakres](https://www.goethe.de/en/m/spr/prf/ueb/pa2.html)
    oraz [Goethe-Zertifikat B1 — moduły i wymagania](https://www.goethe.de/ins/us/en/spr/prf/gzb1.cfm).

## Konfiguracja i jej uzasadnienie

- Przegródka 1: 1 dzień; 2: 3 dni; 3: 7 dni; 4: 14 dni; 5: 30 dni.
- „Nie znam” lub wynik poniżej 90%: przegródka 1, następna data za 10 minut oraz
  powrót po 3–5 innych elementach w bieżącej sesji. Powrót sprawdza ten sam
  składnik, który sprawił trudność, np. rodzajnik albo zapis ze słuchu.
- „Niepewnie”: pozostanie w tej samej przegródce albo cofnięcie o jedną od
  przegródki 3 wzwyż; następny odstęp to połowa odstępu danej przegródki.
- Poprawna aktywna odpowiedź: awans o jedną przegródkę.
- „Znam” podczas pierwszej prezentacji: bez awansu, za to aktywne wpisywanie po
  8–11 innych elementach.
- Sesja ma maksymalnie 10 początkowych kart i najpierw bierze zaległe powtórki.
  Liczba nowych kart jest adaptacyjna: od 6 przy pustej kolejce do 0 przy co
  najmniej 10 zaległych. Konkretne progi są ostrożną regułą produktu, nie
  uniwersalnymi wartościami wyprowadzonymi z jednego badania.
- Historia przechowuje ostatnie 50 decyzji na kartę. To wystarcza do wyjaśnienia
  działania bez nieograniczonego wzrostu danych synchronizowanych z telefonem.

## Świadomie odrzucone rozwiązania

- **Automatyczne przejście po sekundzie po ćwiczeniu.** Odbiera czas na
  przetworzenie informacji zwrotnej i kontekstu. Po wyborze lub wpisywaniu
  wynik pozostaje do ręcznego „Dalej”; na zwykłej fiszce świadome kliknięcie
  jednej z trzech ocen jest jednocześnie przejściem dalej.
- **Awans na podstawie samego „Znam”.** Widoczna odpowiedź podnosi poczucie
  płynności, ale nie dowodzi samodzielnego odtworzenia.
- **Wiele natychmiastowych powtórzeń.** Używamy jednej krótkiej dogrywki z
  mikrodystansem, po czym ważniejszy staje się odstęp liczony w dniach.
- **Rozbudowana grywalizacja.** Seria i spokojny postęp pozostają, ale nie ma
  punktów, lig, kar ani animacji odciągających od odpowiedzi.
- **Udawana precyzja FSRS.** Bez wystarczającej historii użytkownika model
  pięciu przegródek jest bardziej wyjaśnialny. Zebrana historia umożliwia
  przyszłą personalizację bez utraty danych.
- **Kanoniczna „tabela Leitnera”.** Oryginalny system określa rosnącą
  częstotliwość i ruch kart, lecz popularne dokładne harmonogramy są konwencjami.
  Dokumentujemy własne odstępy zamiast przedstawiać je jako wynik jednego badania.
