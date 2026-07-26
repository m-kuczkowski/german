# Podstawa naukowa systemu nauki

Stan przeglądu: 26 lipca 2026. Dokument opisuje decyzje zastosowane w aplikacji
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

## Konfiguracja i jej uzasadnienie

- Przegródka 1: 1 dzień; 2: 3 dni; 3: 7 dni; 4: 14 dni; 5: 30 dni.
- „Nie znam” lub wynik poniżej 90%: przegródka 1, następna data za 10 minut oraz
  powrót po 3–5 innych elementach w bieżącej sesji.
- „Niepewnie”: pozostanie w tej samej przegródce albo cofnięcie o jedną od
  przegródki 3 wzwyż; następny odstęp to połowa odstępu danej przegródki.
- Poprawna aktywna odpowiedź: awans o jedną przegródkę.
- „Znam” podczas pierwszej prezentacji: bez awansu, za to aktywne wpisywanie po
  8–11 innych elementach.
- Sesja ma maksymalnie 10 początkowych kart i najpierw bierze zaległe powtórki.
  Dziesięć to konserwatywny limit obciążenia interfejsu, nie liczba uznana w
  badaniach za optymalną dla wszystkich. Nie ma wiarygodnej jednej wartości:
  limit powinien zależeć od powstającego obciążenia powtórkami.
- Historia przechowuje ostatnie 50 decyzji na kartę. To wystarcza do wyjaśnienia
  działania bez nieograniczonego wzrostu danych synchronizowanych z telefonem.

## Świadomie odrzucone rozwiązania

- **Automatyczne przejście po sekundzie.** Odbiera czas na przetworzenie
  informacji zwrotnej i kontekstu. Wynik pozostaje do ręcznego „Dalej”.
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
