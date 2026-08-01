import type {
  GrammarExercise,
  GrammarExerciseType,
  GrammarLevel,
  GrammarTopic,
} from "../types";

type ExerciseSeed = Omit<GrammarExercise, "id"> & { id: string };

function exercise(seed: ExerciseSeed): GrammarExercise {
  return seed;
}

function options(...items: string[]) {
  return items.map((text, index) => ({ id: `option-${index + 1}`, text }));
}

function topic(
  data: Omit<GrammarTopic, "published" | "exercises"> & { exercises: ExerciseSeed[] },
): GrammarTopic {
  return { ...data, published: true };
}

function planned(
  id: string,
  level: GrammarLevel,
  sortOrder: number,
  titlePl: string,
  titleDe: string,
  goalPl: string,
  prerequisites: string[],
): GrammarTopic {
  return {
    id,
    level,
    sortOrder,
    titlePl,
    titleDe,
    goalPl,
    explanation: "Lekcja jest przygotowywana. Najpierw publikujemy sprawdzone ćwiczenia, a nie automatycznie wygenerowane reguły.",
    examples: [],
    prerequisites,
    published: false,
    exercises: [],
  };
}

const pilotTopics: GrammarTopic[] = [
  topic({
    id: "A1-03", level: "A1", sortOrder: 3,
    titlePl: "Czas teraźniejszy regularny", titleDe: "Präsens",
    goalPl: "Powiesz, co robisz na co dzień.",
    pattern: "ich lern-e · du lern-st · er/sie/es lern-t · wir lern-en",
    prerequisites: ["A1-01"],
    explanation: "W czasie teraźniejszym końcówka czasownika zależy od osoby. Najpierw odetnij końcówkę -en, a potem dodaj właściwą końcówkę. W niemieckim zaimek zwykle stoi przed odmienionym czasownikiem.",
    theory: {
      rules: [
        "Usuń końcówkę -en z bezokolicznika, aby otrzymać temat: lernen → lern-.",
        "Dodaj końcówkę osoby: ich -e, du -st, er/sie/es -t, wir/sie/Sie -en, ihr -t.",
        "W zwykłym zdaniu odmieniony czasownik zajmuje drugą pozycję.",
      ],
      memoryTip: "Najpierw znajdź osobę, dopiero potem wybierz końcówkę czasownika.",
      commonMistake: { incorrect: "Du lernen Deutsch.", correct: "Du lernst Deutsch.", explanation: "Po du czasownik regularny potrzebuje końcówki -st." },
    },
    examples: [
      { german: "Ich lerne jeden Tag Deutsch.", polish: "Uczę się niemieckiego każdego dnia.", highlight: "lerne" },
      { german: "Du wohnst in Zürich.", polish: "Mieszkasz w Zurychu.", highlight: "wohnst" },
      { german: "Wir arbeiten heute zu Hause.", polish: "Pracujemy dziś w domu.", highlight: "arbeiten" },
    ],
    exercises: [
      exercise({ id: "a1-03-1", type: "multiple-choice", instruction: "Wybierz poprawną formę.", prompt: "Ich ___ jeden Tag Deutsch.", answer: "lerne", options: options("lerne", "lernst", "lernen"), explanation: "Z ich używamy końcówki -e: ich lerne.", targetSkill: "present-ich", contextGerman: "Ich lerne jeden Tag Deutsch.", contextPolish: "Uczę się niemieckiego każdego dnia." }),
      exercise({ id: "a1-03-2", type: "gap-fill", instruction: "Wpisz poprawną formę czasownika.", prompt: "Du ___ in Bern. (wohnen)", answer: "wohnst", explanation: "Z du dodajemy -st: du wohnst.", targetSkill: "present-du", contextGerman: "Du wohnst in Bern.", contextPolish: "Mieszkasz w Bernie." }),
      exercise({ id: "a1-03-3", type: "word-order", instruction: "Ułóż zdanie po niemiecku.", prompt: "Oni pracują dziś.", answer: "Sie arbeiten heute.", tokens: ["Sie", "arbeiten", "heute."], explanation: "W prostym zdaniu odmieniony czasownik stoi na drugim miejscu.", targetSkill: "present-plural", contextGerman: "Sie arbeiten heute.", contextPolish: "Oni pracują dziś." }),
      exercise({ id: "a1-03-4", type: "typed-form", instruction: "Wpisz formę dla: er.", prompt: "machen", answer: "macht", explanation: "Z er używamy końcówki -t: er macht.", targetSkill: "present-er", contextGerman: "Er macht heute Abend Essen.", contextPolish: "On robi dziś wieczorem jedzenie." }),
      exercise({ id: "a1-03-5", type: "translation-pl-de", instruction: "Przetłumacz krótko na niemiecki.", prompt: "My uczymy się razem.", answer: "Wir lernen zusammen.", acceptedAnswers: ["Wir lernen zusammen"], explanation: "Z wir używamy bezokolicznika: wir lernen.", targetSkill: "present-wir", contextGerman: "Wir lernen zusammen.", contextPolish: "Uczymy się razem." }),
    ],
  }),
  topic({
    id: "A1-05", level: "A1", sortOrder: 5,
    titlePl: "Czasownik na drugim miejscu", titleDe: "Verbzweitstellung",
    goalPl: "Zaczniesz zdanie od czasu lub miejsca bez gubienia szyku.",
    pattern: "Heute | lerne | ich Deutsch.",
    prerequisites: ["A1-03"],
    explanation: "W zdaniu głównym odmieniony czasownik zajmuje drugą pozycję. Gdy na początku stawiasz czas lub miejsce, podmiot przechodzi za czasownik. Liczą się części zdania, nie liczba pojedynczych słów.",
    theory: {
      rules: [
        "Odmieniony czasownik jest drugą częścią zdania głównego.",
        "Czas, miejsce lub inna informacja może wejść na pierwszą pozycję.",
        "Gdy coś innego jest pierwsze, podmiot zwykle stoi bezpośrednio po czasowniku.",
      ],
      memoryTip: "Wyobraź sobie czasownik przyklejony do miejsca numer 2.",
      commonMistake: { incorrect: "Heute ich arbeite zu Hause.", correct: "Heute arbeite ich zu Hause.", explanation: "Heute zajmuje pierwszą pozycję, więc arbeite musi być drugie." },
    },
    examples: [
      { german: "Heute lerne ich Deutsch.", polish: "Dziś uczę się niemieckiego.", highlight: "lerne" },
      { german: "In Berlin wohnt meine Schwester.", polish: "W Berlinie mieszka moja siostra.", highlight: "wohnt" },
      { german: "Am Abend koche ich gern.", polish: "Wieczorem chętnie gotuję.", highlight: "koche" },
    ],
    exercises: [
      exercise({ id: "a1-05-1", type: "word-order", instruction: "Ułóż zdanie.", prompt: "Dziś pracuję w domu.", answer: "Heute arbeite ich zu Hause.", tokens: ["Heute", "arbeite", "ich", "zu Hause."], explanation: "Heute jest pierwszą częścią, arbeite musi być drugie.", targetSkill: "v2-time", contextGerman: "Heute arbeite ich zu Hause.", contextPolish: "Dziś pracuję w domu." }),
      exercise({ id: "a1-05-2", type: "multiple-choice", instruction: "Wybierz poprawne zdanie.", prompt: "W poniedziałek idę do pracy.", answer: "Am Montag gehe ich zur Arbeit.", options: options("Am Montag ich gehe zur Arbeit.", "Am Montag gehe ich zur Arbeit.", "Am Montag zur Arbeit gehe ich."), explanation: "Po wyrażeniu czasu czasownik gehe zajmuje drugie miejsce.", targetSkill: "v2-time", contextGerman: "Am Montag gehe ich zur Arbeit.", contextPolish: "W poniedziałek idę do pracy." }),
      exercise({ id: "a1-05-3", type: "gap-fill", instruction: "Wpisz brakujący zaimek.", prompt: "In Zürich wohne ___.", answer: "ich", explanation: "Gdy miejsce stoi na początku, ich przechodzi za czasownik.", targetSkill: "inversion", contextGerman: "In Zürich wohne ich.", contextPolish: "Mieszkam w Zurychu." }),
      exercise({ id: "a1-05-4", type: "error-correction", instruction: "Popraw szyk zdania.", prompt: "Heute ich koche Pasta.", answer: "Heute koche ich Pasta.", explanation: "W zdaniu głównym koche musi być na drugiej pozycji.", targetSkill: "v2-time", contextGerman: "Heute koche ich Pasta.", contextPolish: "Dziś gotuję makaron." }),
      exercise({ id: "a1-05-5", type: "translation-pl-de", instruction: "Przetłumacz na niemiecki.", prompt: "Wieczorem oglądam film.", answer: "Am Abend sehe ich einen Film.", acceptedAnswers: ["Am Abend sehe ich einen Film", "Abends sehe ich einen Film"], explanation: "Am Abend/Abends może stać na początku, a sehe jest drugie.", targetSkill: "v2-time", contextGerman: "Am Abend sehe ich einen Film.", contextPolish: "Wieczorem oglądam film." }),
    ],
  }),
  topic({
    id: "A1-07", level: "A1", sortOrder: 7,
    titlePl: "Rodzaj i rodzajniki", titleDe: "Genus und Artikel",
    goalPl: "Rozpoznasz i dobierzesz der, die oraz das.",
    pattern: "der Tisch · die Lampe · das Bett",
    prerequisites: [],
    explanation: "Każdy niemiecki rzeczownik ma rodzaj: der, die albo das. Ucz się rzeczownika od razu z rodzajnikiem. W liczbie mnogiej używamy die niezależnie od rodzaju w liczbie pojedynczej.",
    theory: {
      rules: [
        "Ucz się rzeczownika jako jednej całości z rodzajnikiem: der Tisch, die Lampe, das Bett.",
        "Niemieckie rzeczowniki zapisujemy wielką literą.",
        "W liczbie mnogiej rodzajnik określony ma zawsze formę die.",
      ],
      memoryTip: "Kolor lub obraz przypisany do der, die i das pomaga zapamiętać rodzaj razem ze słowem.",
      commonMistake: { incorrect: "der Wohnung", correct: "die Wohnung", explanation: "Wohnung jest rodzaju żeńskiego i trzeba zapamiętać ją razem z die." },
    },
    examples: [
      { german: "Der Tisch ist neu.", polish: "Stół jest nowy.", highlight: "Der Tisch" },
      { german: "Die Lampe ist klein.", polish: "Lampa jest mała.", highlight: "Die Lampe" },
      { german: "Das Bett ist bequem.", polish: "Łóżko jest wygodne.", highlight: "Das Bett" },
    ],
    exercises: [
      exercise({ id: "a1-07-1", type: "case-choice", instruction: "Wybierz rodzajnik.", prompt: "___ Wohnung", answer: "die", options: options("der", "die", "das"), explanation: "Wohnung jest rodzaju żeńskiego: die Wohnung.", targetSkill: "article-gender", contextGerman: "Die Wohnung ist groß.", contextPolish: "Mieszkanie jest duże." }),
      exercise({ id: "a1-07-2", type: "case-choice", instruction: "Wybierz rodzajnik.", prompt: "___ Bahnhof", answer: "der", options: options("der", "die", "das"), explanation: "Bahnhof jest rodzaju męskiego: der Bahnhof.", targetSkill: "article-gender", contextGerman: "Der Bahnhof ist nah.", contextPolish: "Dworzec jest blisko." }),
      exercise({ id: "a1-07-3", type: "case-choice", instruction: "Wybierz rodzajnik.", prompt: "___ Kind", answer: "das", options: options("der", "die", "das"), explanation: "Kind jest rodzaju nijakiego: das Kind.", targetSkill: "article-gender", contextGerman: "Das Kind spielt draußen.", contextPolish: "Dziecko bawi się na zewnątrz." }),
      exercise({ id: "a1-07-4", type: "multiple-choice", instruction: "Wybierz poprawne zdanie.", prompt: "Mieszkanie jest wygodne.", answer: "Die Wohnung ist bequem.", options: options("Der Wohnung ist bequem.", "Die Wohnung ist bequem.", "Das Wohnung ist bequem."), explanation: "Wohnung łączy się z die.", targetSkill: "article-gender", contextGerman: "Die Wohnung ist bequem.", contextPolish: "Mieszkanie jest wygodne." }),
      exercise({ id: "a1-07-5", type: "typed-form", instruction: "Wpisz rodzajnik.", prompt: "___ Auto", answer: "das", explanation: "Auto jest rodzaju nijakiego: das Auto.", targetSkill: "article-gender", contextGerman: "Das Auto steht vor dem Haus.", contextPolish: "Samochód stoi przed domem." }),
    ],
  }),
  topic({
    id: "A1-09", level: "A1", sortOrder: 9,
    titlePl: "Biernik", titleDe: "Akkusativ",
    goalPl: "Powiesz, co kupujesz, widzisz lub potrzebujesz.",
    pattern: "der → den · die → die · das → das",
    prerequisites: ["A1-07"],
    explanation: "Biernik często odpowiada na pytanie kogo? co? Po wielu czasownikach, np. sehen, kaufen i brauchen, rzeczownik jest w Akkusativie. Zmienia się głównie rodzaj męski: der staje się den.",
    theory: {
      rules: [
        "Akkusativ oznacza najczęściej osobę lub rzecz, na którą skierowana jest czynność.",
        "Rodzaj męski zmienia der → den oraz ein → einen.",
        "Formy die, eine, das i ein pozostają w bierniku bez zmiany.",
      ],
      memoryTip: "Szukaj czasownika i zapytaj: widzę, kupuję lub potrzebuję kogo albo co?",
      commonMistake: { incorrect: "Ich sehe der Hund.", correct: "Ich sehe den Hund.", explanation: "Hund jest męski i po sehen występuje w Akkusativie: den Hund." },
    },
    examples: [
      { german: "Ich kaufe den Kaffee.", polish: "Kupuję kawę.", highlight: "den Kaffee" },
      { german: "Sie sieht die Lampe.", polish: "Ona widzi lampę.", highlight: "die Lampe" },
      { german: "Wir brauchen das Ticket.", polish: "Potrzebujemy biletu.", highlight: "das Ticket" },
    ],
    exercises: [
      exercise({ id: "a1-09-1", type: "case-choice", instruction: "Wybierz poprawną formę.", prompt: "Ich sehe ___ Mann.", answer: "den", options: options("der", "den", "dem"), explanation: "sehen wymaga Akkusativu; der Mann zmienia się na den Mann.", targetSkill: "accusative-masculine", contextGerman: "Ich sehe den Mann.", contextPolish: "Widzę mężczyznę." }),
      exercise({ id: "a1-09-2", type: "gap-fill", instruction: "Wpisz rodzajnik.", prompt: "Wir kaufen ___ Tisch. (der)", answer: "den", explanation: "kaufen łączy się z Akkusativem: den Tisch.", targetSkill: "accusative-masculine", contextGerman: "Wir kaufen den Tisch.", contextPolish: "Kupujemy stół." }),
      exercise({ id: "a1-09-3", type: "multiple-choice", instruction: "Wybierz poprawne zdanie.", prompt: "Potrzebuję bilet.", answer: "Ich brauche das Ticket.", options: options("Ich brauche den Ticket.", "Ich brauche das Ticket.", "Ich brauche dem Ticket."), explanation: "Ticket ma rodzaj das; w Akkusativie forma pozostaje das.", targetSkill: "accusative-neuter", contextGerman: "Ich brauche das Ticket.", contextPolish: "Potrzebuję biletu." }),
      exercise({ id: "a1-09-4", type: "translation-pl-de", instruction: "Przetłumacz na niemiecki.", prompt: "Ona kupuje kawę.", answer: "Sie kauft den Kaffee.", acceptedAnswers: ["Sie kauft den Kaffee"], explanation: "Kaffee jest rodzaju męskiego, więc po kaufen używamy den.", targetSkill: "accusative-masculine", contextGerman: "Sie kauft den Kaffee.", contextPolish: "Ona kupuje kawę." }),
      exercise({ id: "a1-09-5", type: "error-correction", instruction: "Popraw rodzajnik.", prompt: "Ich sehe der Hund.", answer: "Ich sehe den Hund.", explanation: "sehen wymaga Akkusativu; der Hund zmienia się na den Hund.", targetSkill: "accusative-masculine", contextGerman: "Ich sehe den Hund.", contextPolish: "Widzę psa." }),
    ],
  }),
  topic({
    id: "A1-10", level: "A1", sortOrder: 10,
    titlePl: "Przeczenie nicht i kein", titleDe: "Negation",
    goalPl: "Poprawnie zaprzeczysz czynności i rzeczownikowi.",
    pattern: "Ich komme nicht. · Ich habe kein Auto.",
    prerequisites: ["A1-03", "A1-07"],
    explanation: "Używaj nicht, gdy zaprzeczasz czynność, cechę lub całe zdanie. Używaj kein, gdy zaprzeczasz rzeczownik z ein albo bez rodzajnika. Kein odmienia się podobnie jak ein.",
    theory: {
      rules: [
        "kein zaprzecza rzeczownikowi, przed którym normalnie byłoby ein/eine albo nie byłoby rodzajnika.",
        "nicht zaprzecza czasownikowi, przymiotnikowi, określeniu lub całemu zdaniu.",
        "kein odmienia się jak ein: kein Auto, keine Zeit, keinen Bruder.",
      ],
      memoryTip: "Jeśli po polskim „nie” od razu stoi rzecz, najpierw sprawdź, czy potrzebujesz kein.",
      commonMistake: { incorrect: "Ich habe nicht Auto.", correct: "Ich habe kein Auto.", explanation: "Zaprzeczamy rzeczownik Auto, dlatego używamy kein." },
    },
    examples: [
      { german: "Ich arbeite heute nicht.", polish: "Nie pracuję dziś.", highlight: "nicht" },
      { german: "Er hat kein Auto.", polish: "On nie ma samochodu.", highlight: "kein Auto" },
      { german: "Das ist nicht teuer.", polish: "To nie jest drogie.", highlight: "nicht teuer" },
    ],
    exercises: [
      exercise({ id: "a1-10-1", type: "multiple-choice", instruction: "Wybierz właściwe przeczenie.", prompt: "Ich habe ___ Zeit.", answer: "keine", options: options("nicht", "keine", "kein"), explanation: "Zeit jest rodzaju żeńskiego i tu zaprzeczamy rzeczownik: keine Zeit.", targetSkill: "kein", contextGerman: "Ich habe keine Zeit.", contextPolish: "Nie mam czasu." }),
      exercise({ id: "a1-10-2", type: "gap-fill", instruction: "Wpisz właściwe słowo.", prompt: "Heute komme ich ___.", answer: "nicht", explanation: "Zaprzeczamy czynność kommen, więc używamy nicht.", targetSkill: "nicht", contextGerman: "Heute komme ich nicht.", contextPolish: "Dziś nie przychodzę." }),
      exercise({ id: "a1-10-3", type: "error-correction", instruction: "Popraw przeczenie.", prompt: "Ich habe nicht Auto.", answer: "Ich habe kein Auto.", explanation: "Przed rzeczownikiem Auto używamy kein, nie nicht.", targetSkill: "kein", contextGerman: "Ich habe kein Auto.", contextPolish: "Nie mam samochodu." }),
      exercise({ id: "a1-10-4", type: "translation-pl-de", instruction: "Przetłumacz na niemiecki.", prompt: "To nie jest drogie.", answer: "Das ist nicht teuer.", acceptedAnswers: ["Das ist nicht teuer"], explanation: "Zaprzeczamy cechę teuer, dlatego używamy nicht.", targetSkill: "nicht", contextGerman: "Das ist nicht teuer.", contextPolish: "To nie jest drogie." }),
      exercise({ id: "a1-10-5", type: "case-choice", instruction: "Wybierz poprawną formę.", prompt: "Sie hat ___ Bruder.", answer: "keinen", options: options("kein", "keinen", "nicht"), explanation: "Bruder jest męski i po haben występuje Akkusativ: keinen Bruder.", targetSkill: "kein-accusative", contextGerman: "Sie hat keinen Bruder.", contextPolish: "Ona nie ma brata." }),
    ],
  }),
  topic({
    id: "A1-12", level: "A1", sortOrder: 12,
    titlePl: "Czasowniki modalne", titleDe: "Modalverben",
    goalPl: "Powiesz, co możesz, chcesz i musisz zrobić.",
    pattern: "Ich muss heute arbeiten.",
    prerequisites: ["A1-03"],
    explanation: "Czasownik modalny stoi odmieniony na drugim miejscu. Drugi czasownik pozostaje w bezokoliczniku i idzie na koniec zdania. To tworzy niemiecką klamrę zdaniową.",
    theory: {
      rules: [
        "Odmień czasownik modalny zgodnie z osobą i ustaw go na drugiej pozycji.",
        "Czasownik opisujący czynność pozostaje w bezokoliczniku na końcu.",
        "W pytaniu tak/nie czasownik modalny przechodzi na początek.",
      ],
      memoryTip: "Modalny otwiera klamrę, a bezokolicznik zamyka zdanie.",
      commonMistake: { incorrect: "Ich muss heute arbeite.", correct: "Ich muss heute arbeiten.", explanation: "Po czasowniku modalnym drugi czasownik pozostaje w bezokoliczniku." },
    },
    examples: [
      { german: "Ich kann heute kommen.", polish: "Mogę dziś przyjść.", highlight: "kann ... kommen" },
      { german: "Wir müssen arbeiten.", polish: "Musimy pracować.", highlight: "müssen ... arbeiten" },
      { german: "Möchtest du Kaffee trinken?", polish: "Czy chcesz napić się kawy?", highlight: "Möchtest ... trinken" },
    ],
    exercises: [
      exercise({ id: "a1-12-1", type: "multiple-choice", instruction: "Wybierz poprawne zdanie.", prompt: "Muszę dziś pracować.", answer: "Ich muss heute arbeiten.", options: options("Ich muss arbeiten heute.", "Ich muss heute arbeiten.", "Ich heute muss arbeiten."), explanation: "muss jest na drugim miejscu, arbeiten na końcu.", targetSkill: "modal-frame", contextGerman: "Ich muss heute arbeiten.", contextPolish: "Muszę dziś pracować." }),
      exercise({ id: "a1-12-2", type: "gap-fill", instruction: "Wpisz formę dla du.", prompt: "Du ___ Deutsch sprechen. (können)", answer: "kannst", explanation: "Z du: du kannst.", targetSkill: "modal-conjugation", contextGerman: "Du kannst Deutsch sprechen.", contextPolish: "Potrafisz mówić po niemiecku." }),
      exercise({ id: "a1-12-3", type: "word-order", instruction: "Ułóż zdanie.", prompt: "Chcemy jutro jechać do Berlina.", answer: "Wir wollen morgen nach Berlin fahren.", tokens: ["Wir", "wollen", "morgen", "nach Berlin", "fahren."], explanation: "wollen jest drugie, fahren pozostaje na końcu.", targetSkill: "modal-frame", contextGerman: "Wir wollen morgen nach Berlin fahren.", contextPolish: "Chcemy jutro jechać do Berlina." }),
      exercise({ id: "a1-12-4", type: "typed-form", instruction: "Wpisz bezokolicznik na końcu zdania.", prompt: "Ich möchte einen Kaffee ___.", answer: "trinken", explanation: "Po möchte drugi czasownik ma formę bezokolicznika.", targetSkill: "modal-infinitive", contextGerman: "Ich möchte einen Kaffee trinken.", contextPolish: "Chciałbym wypić kawę." }),
      exercise({ id: "a1-12-5", type: "translation-pl-de", instruction: "Przetłumacz na niemiecki.", prompt: "Czy możesz mi pomóc?", answer: "Kannst du mir helfen?", acceptedAnswers: ["Kannst du mir helfen"], explanation: "W pytaniu tak/nie czasownik modalny stoi na początku.", targetSkill: "modal-question", contextGerman: "Kannst du mir helfen?", contextPolish: "Czy możesz mi pomóc?" }),
    ],
  }),
  topic({
    id: "A2-01", level: "A2", sortOrder: 101,
    titlePl: "Perfekt z haben", titleDe: "Perfekt mit haben",
    goalPl: "Opowiesz, co zrobiłeś w przeszłości.",
    pattern: "Ich habe Deutsch gelernt.",
    prerequisites: ["A1-03", "A1-12"],
    explanation: "Perfekt tworzymy z odmienionym haben na drugim miejscu oraz Partizip II na końcu. W rozmowie o przeszłości Perfekt jest bardzo częsty.",
    theory: {
      rules: [
        "Odmień haben zgodnie z osobą i ustaw je na drugiej pozycji.",
        "Partizip II opisujący wykonaną czynność trafia na koniec zdania.",
        "Regularne czasowniki często tworzą Partizip II jako ge- + temat + -t: machen → gemacht.",
      ],
      memoryTip: "haben i Partizip II tworzą klamrę wokół reszty zdania.",
      commonMistake: { incorrect: "Ich habe gelernt Deutsch.", correct: "Ich habe Deutsch gelernt.", explanation: "Partizip II gelernt musi zamknąć zdanie." },
    },
    examples: [
      { german: "Ich habe gestern gearbeitet.", polish: "Wczoraj pracowałem.", highlight: "habe ... gearbeitet" },
      { german: "Wir haben einen Film gesehen.", polish: "Oglądaliśmy film.", highlight: "haben ... gesehen" },
      { german: "Sie hat Deutsch gelernt.", polish: "Ona uczyła się niemieckiego.", highlight: "hat ... gelernt" },
    ],
    exercises: [
      exercise({ id: "a2-01-1", type: "gap-fill", instruction: "Wpisz czasownik posiłkowy.", prompt: "Ich ___ gestern gearbeitet.", answer: "habe", explanation: "Z ich używamy habe.", targetSkill: "perfect-haben", contextGerman: "Ich habe gestern gearbeitet.", contextPolish: "Wczoraj pracowałem." }),
      exercise({ id: "a2-01-2", type: "multiple-choice", instruction: "Wybierz poprawne zdanie.", prompt: "Ona uczyła się niemieckiego.", answer: "Sie hat Deutsch gelernt.", options: options("Sie hat Deutsch lernen.", "Sie hat Deutsch gelernt.", "Sie ist Deutsch gelernt."), explanation: "lernen tworzy Perfekt z haben i gelernt.", targetSkill: "perfect-haben", contextGerman: "Sie hat Deutsch gelernt.", contextPolish: "Ona uczyła się niemieckiego." }),
      exercise({ id: "a2-01-3", type: "word-order", instruction: "Ułóż zdanie.", prompt: "Wczoraj oglądaliśmy film.", answer: "Gestern haben wir einen Film gesehen.", tokens: ["Gestern", "haben", "wir", "einen Film", "gesehen."], explanation: "haben jest drugie, Partizip II gesehen na końcu.", targetSkill: "perfect-word-order", contextGerman: "Gestern haben wir einen Film gesehen.", contextPolish: "Wczoraj oglądaliśmy film." }),
      exercise({ id: "a2-01-4", type: "typed-form", instruction: "Wpisz Partizip II.", prompt: "machen →", answer: "gemacht", explanation: "Regularne czasowniki często tworzą ge- + temat + -t: gemacht.", targetSkill: "participle-regular", contextGerman: "Ich habe das gemacht.", contextPolish: "Zrobiłem to." }),
      exercise({ id: "a2-01-5", type: "translation-pl-de", instruction: "Przetłumacz na niemiecki.", prompt: "Kupiliśmy bilet.", answer: "Wir haben ein Ticket gekauft.", acceptedAnswers: ["Wir haben ein Ticket gekauft"], explanation: "kaufen: haben + gekauft.", targetSkill: "perfect-haben", contextGerman: "Wir haben ein Ticket gekauft.", contextPolish: "Kupiliśmy bilet." }),
    ],
  }),
  topic({
    id: "A2-02", level: "A2", sortOrder: 102,
    titlePl: "Perfekt z sein", titleDe: "Perfekt mit sein",
    goalPl: "Opowiesz o ruchu i zmianie stanu.",
    pattern: "Ich bin nach Berlin gefahren.",
    prerequisites: ["A2-01"],
    explanation: "Czasowniki wyrażające ruch z miejsca do miejsca albo zmianę stanu często tworzą Perfekt z sein. Odmienione sein jest na drugim miejscu, a Partizip II na końcu.",
    theory: {
      rules: [
        "Używaj sein przy ruchu z miejsca do miejsca, np. gehen, kommen i fahren.",
        "sein występuje też przy zmianie stanu oraz z bleiben, sein i werden.",
        "Odmienione sein jest drugie, a Partizip II pozostaje na końcu.",
      ],
      memoryTip: "Jeśli podmiot zmienia miejsce lub stan, sprawdź najpierw sein.",
      commonMistake: { incorrect: "Ich habe nach Hause gegangen.", correct: "Ich bin nach Hause gegangen.", explanation: "gehen opisuje ruch i tworzy Perfekt z sein." },
    },
    examples: [
      { german: "Ich bin nach Berlin gefahren.", polish: "Pojechałem do Berlina.", highlight: "bin ... gefahren" },
      { german: "Sie ist früh angekommen.", polish: "Ona przyjechała wcześnie.", highlight: "ist ... angekommen" },
      { german: "Wir sind zu Hause geblieben.", polish: "Zostaliśmy w domu.", highlight: "sind ... geblieben" },
    ],
    exercises: [
      exercise({ id: "a2-02-1", type: "case-choice", instruction: "Wybierz czasownik posiłkowy.", prompt: "Ich ___ nach Hause gegangen.", answer: "bin", options: options("habe", "bin", "war"), explanation: "gehen opisuje ruch, dlatego używamy sein: bin gegangen.", targetSkill: "perfect-sein", contextGerman: "Ich bin nach Hause gegangen.", contextPolish: "Poszedłem do domu." }),
      exercise({ id: "a2-02-2", type: "gap-fill", instruction: "Wpisz Partizip II.", prompt: "Sie ist früh ___. (ankommen)", answer: "angekommen", explanation: "ankommen: ist angekommen.", targetSkill: "participle-separable", contextGerman: "Sie ist früh angekommen.", contextPolish: "Ona przyjechała wcześnie." }),
      exercise({ id: "a2-02-3", type: "multiple-choice", instruction: "Wybierz poprawne zdanie.", prompt: "Zostaliśmy w domu.", answer: "Wir sind zu Hause geblieben.", options: options("Wir haben zu Hause geblieben.", "Wir sind zu Hause geblieben.", "Wir sind zu Hause bleiben."), explanation: "bleiben tworzy Perfekt z sein: sind geblieben.", targetSkill: "perfect-sein", contextGerman: "Wir sind zu Hause geblieben.", contextPolish: "Zostaliśmy w domu." }),
      exercise({ id: "a2-02-4", type: "word-order", instruction: "Ułóż zdanie.", prompt: "Wczoraj pojechałem do Berlina.", answer: "Gestern bin ich nach Berlin gefahren.", tokens: ["Gestern", "bin", "ich", "nach Berlin", "gefahren."], explanation: "bin jest drugie, gefahren na końcu.", targetSkill: "perfect-word-order", contextGerman: "Gestern bin ich nach Berlin gefahren.", contextPolish: "Wczoraj pojechałem do Berlina." }),
      exercise({ id: "a2-02-5", type: "translation-pl-de", instruction: "Przetłumacz na niemiecki.", prompt: "Ona przyszła późno.", answer: "Sie ist spät gekommen.", acceptedAnswers: ["Sie ist spät gekommen"], explanation: "kommen tworzy Perfekt z sein.", targetSkill: "perfect-sein", contextGerman: "Sie ist spät gekommen.", contextPolish: "Ona przyszła późno." }),
    ],
  }),
  topic({
    id: "A2-11", level: "A2", sortOrder: 111,
    titlePl: "Zdania z weil i dass", titleDe: "Nebensätze mit weil und dass",
    goalPl: "Podasz powód i przekażesz informację.",
    pattern: "..., weil ich heute arbeiten muss.",
    prerequisites: ["A1-05", "A1-12"],
    explanation: "weil i dass wprowadzają zdanie podrzędne. W takim zdaniu odmieniony czasownik idzie na koniec. Gdy jest czasownik modalny, bezokolicznik stoi przed nim.",
    theory: {
      rules: [
        "weil podaje powód, a dass wprowadza przekazywaną informację.",
        "Przed weil lub dass stawiamy przecinek.",
        "W zdaniu podrzędnym odmieniony czasownik idzie na koniec; przy czasowniku modalnym bezokolicznik stoi tuż przed nim.",
      ],
      memoryTip: "weil i dass odsyłają odmieniony czasownik na sam koniec swojej części zdania.",
      commonMistake: { incorrect: "..., weil ich bin krank.", correct: "..., weil ich krank bin.", explanation: "Po weil odmienione bin musi znaleźć się na końcu." },
    },
    examples: [
      { german: "Ich bleibe zu Hause, weil ich krank bin.", polish: "Zostaję w domu, ponieważ jestem chory.", highlight: "weil ich krank bin" },
      { german: "Ich weiß, dass er heute kommt.", polish: "Wiem, że on dziś przychodzi.", highlight: "dass er heute kommt" },
      { german: "Sie lernt Deutsch, weil sie in Berlin arbeiten möchte.", polish: "Ona uczy się niemieckiego, ponieważ chce pracować w Berlinie.", highlight: "arbeiten möchte" },
    ],
    exercises: [
      exercise({ id: "a2-11-1", type: "multiple-choice", instruction: "Wybierz poprawne zakończenie.", prompt: "Ich bleibe zu Hause, weil ...", answer: "ich krank bin.", options: options("ich bin krank.", "ich krank bin.", "bin ich krank."), explanation: "Po weil czasownik bin jest na końcu.", targetSkill: "subordinate-word-order", contextGerman: "Ich bleibe zu Hause, weil ich krank bin.", contextPolish: "Zostaję w domu, ponieważ jestem chory." }),
      exercise({ id: "a2-11-2", type: "word-order", instruction: "Ułóż zdanie podrzędne.", prompt: "ponieważ dziś muszę pracować", answer: "weil ich heute arbeiten muss", tokens: ["weil", "ich", "heute", "arbeiten", "muss"], explanation: "W zdaniu z modalnym arbeiten stoi przed końcowym muss.", targetSkill: "subordinate-modal", contextGerman: "Ich komme nicht, weil ich heute arbeiten muss.", contextPolish: "Nie przychodzę, ponieważ muszę dziś pracować." }),
      exercise({ id: "a2-11-3", type: "error-correction", instruction: "Popraw szyk zdania.", prompt: "Ich weiß, dass er kommt heute.", answer: "Ich weiß, dass er heute kommt.", explanation: "W zdaniu z dass czasownik kommt stoi na końcu.", targetSkill: "subordinate-word-order", contextGerman: "Ich weiß, dass er heute kommt.", contextPolish: "Wiem, że on dziś przychodzi." }),
      exercise({ id: "a2-11-4", type: "gap-fill", instruction: "Wpisz końcowy czasownik.", prompt: "Sie lernt, weil sie morgen eine Prüfung ___. (haben)", answer: "hat", explanation: "Po weil odmieniony czasownik ma pozycję końcową.", targetSkill: "subordinate-word-order", contextGerman: "Sie lernt, weil sie morgen eine Prüfung hat.", contextPolish: "Ona się uczy, ponieważ jutro ma egzamin." }),
      exercise({ id: "a2-11-5", type: "translation-pl-de", instruction: "Przetłumacz na niemiecki.", prompt: "Nie przychodzę, ponieważ jestem chory.", answer: "Ich komme nicht, weil ich krank bin.", acceptedAnswers: ["Ich komme nicht, weil ich krank bin"], explanation: "W części po weil bin trafia na koniec.", targetSkill: "subordinate-word-order", contextGerman: "Ich komme nicht, weil ich krank bin.", contextPolish: "Nie przychodzę, ponieważ jestem chory." }),
    ],
  }),
  topic({
    id: "B1-01", level: "B1", sortOrder: 201,
    titlePl: "Opowiadanie w przeszłości", titleDe: "Perfekt und Präteritum",
    goalPl: "Spójnie opowiesz o wydarzeniu z przeszłości.",
    pattern: "Zuerst war ich müde, dann habe ich einen Kaffee getrunken.",
    prerequisites: ["A2-01", "A2-02"],
    explanation: "W rozmowie Perfekt pozostaje podstawowym czasem przeszłym. Formy war i hatte są jednak bardzo częste, gdy opisujesz tło lub stan. Łącz zdania wyrazami zuerst, dann i später, aby historia była jasna.",
    theory: {
      rules: [
        "Używaj Perfekt do kolejnych wydarzeń i czynności w rozmowie.",
        "Formy war i hatte naturalnie opisują wcześniejszy stan, sytuację lub tło.",
        "Porządkuj historię wyrazami zuerst, dann, danach i später; po nich czasownik nadal jest drugi.",
      ],
      memoryTip: "Najpierw ustaw oś czasu, potem dobierz Perfekt do zdarzeń oraz war/hatte do tła.",
      commonMistake: { incorrect: "Dann ich habe angerufen.", correct: "Dann habe ich angerufen.", explanation: "Dann zajmuje pierwszą pozycję, więc habe musi być drugie." },
    },
    examples: [
      { german: "Zuerst war ich müde, dann habe ich einen Kaffee getrunken.", polish: "Najpierw byłem zmęczony, potem wypiłem kawę.", highlight: "war ... habe ... getrunken" },
      { german: "Wir hatten wenig Zeit, deshalb sind wir mit dem Taxi gefahren.", polish: "Mieliśmy mało czasu, dlatego pojechaliśmy taksówką.", highlight: "hatten ... sind ... gefahren" },
      { german: "Später habe ich meine Freundin angerufen.", polish: "Później zadzwoniłem do mojej przyjaciółki.", highlight: "habe ... angerufen" },
    ],
    exercises: [
      exercise({ id: "b1-01-1", type: "multiple-choice", instruction: "Wybierz naturalne zdanie.", prompt: "Najpierw byłem zmęczony.", answer: "Zuerst war ich müde.", options: options("Zuerst bin ich müde gewesen.", "Zuerst war ich müde.", "Zuerst hatte ich müde."), explanation: "war jest częstą prostą formą Präteritum od sein.", targetSkill: "preterite-sein", contextGerman: "Zuerst war ich müde.", contextPolish: "Najpierw byłem zmęczony." }),
      exercise({ id: "b1-01-2", type: "word-order", instruction: "Ułóż zdanie.", prompt: "Potem wypiłem kawę.", answer: "Dann habe ich einen Kaffee getrunken.", tokens: ["Dann", "habe", "ich", "einen Kaffee", "getrunken."], explanation: "Dann jest pierwsze, habe drugie, getrunken na końcu.", targetSkill: "narrative-order", contextGerman: "Dann habe ich einen Kaffee getrunken.", contextPolish: "Potem wypiłem kawę." }),
      exercise({ id: "b1-01-3", type: "gap-fill", instruction: "Wpisz formę Präteritum.", prompt: "Wir ___ wenig Zeit. (haben)", answer: "hatten", explanation: "Präteritum od haben w liczbie mnogiej: hatten.", targetSkill: "preterite-haben", contextGerman: "Wir hatten wenig Zeit.", contextPolish: "Mieliśmy mało czasu." }),
      exercise({ id: "b1-01-4", type: "translation-pl-de", instruction: "Przetłumacz na niemiecki.", prompt: "Później zadzwoniłem do mojej przyjaciółki.", answer: "Später habe ich meine Freundin angerufen.", acceptedAnswers: ["Später habe ich meine Freundin angerufen"], explanation: "anrufen tworzy Perfekt z haben; Partizip II jest na końcu.", targetSkill: "narrative-perfect", contextGerman: "Später habe ich meine Freundin angerufen.", contextPolish: "Później zadzwoniłem do mojej przyjaciółki." }),
      exercise({ id: "b1-01-5", type: "error-correction", instruction: "Popraw zdanie.", prompt: "Dann ich habe nach Hause gegangen.", answer: "Dann bin ich nach Hause gegangen.", explanation: "gehen tworzy Perfekt z sein, a bin stoi na drugiej pozycji.", targetSkill: "narrative-perfect", contextGerman: "Dann bin ich nach Hause gegangen.", contextPolish: "Potem poszedłem do domu." }),
    ],
  }),
  topic({
    id: "B1-05", level: "B1", sortOrder: 205,
    titlePl: "Zdania względne w Nominativie i Akkusativie", titleDe: "Relativsätze",
    goalPl: "Doprecyzujesz, o której osobie lub rzeczy mówisz.",
    pattern: "Das ist der Mann, der hier wohnt.",
    prerequisites: ["A1-09", "A2-11"],
    explanation: "Zdanie względne dodaje informację o osobie lub rzeczy. Zaczyna się od der, die albo das i oddzielamy je przecinkiem. W zdaniu względnym odmieniony czasownik idzie na koniec.",
    theory: {
      rules: [
        "Rodzaj zaimka względnego wynika z opisywanego rzeczownika.",
        "Przypadek zaimka wynika z jego funkcji wewnątrz zdania względnego: der jako podmiot, den jako dopełnienie męskie.",
        "Zdanie względne oddzielamy przecinkiem, a odmieniony czasownik ustawiamy na końcu.",
      ],
      memoryTip: "Najpierw sprawdź rodzaj rzeczownika, potem zapytaj, co zaimek robi w drugiej części zdania.",
      commonMistake: { incorrect: "Das ist der Film, den ich sehe heute.", correct: "Das ist der Film, den ich heute sehe.", explanation: "W zdaniu względnym sehe musi stać na końcu." },
    },
    examples: [
      { german: "Das ist der Mann, der hier wohnt.", polish: "To jest mężczyzna, który tu mieszka.", highlight: "der hier wohnt" },
      { german: "Ich suche eine Wohnung, die nicht teuer ist.", polish: "Szukam mieszkania, które nie jest drogie.", highlight: "die nicht teuer ist" },
      { german: "Das ist das Buch, das ich lese.", polish: "To jest książka, którą czytam.", highlight: "das ich lese" },
    ],
    exercises: [
      exercise({ id: "b1-05-1", type: "case-choice", instruction: "Wybierz zaimek względny.", prompt: "Das ist der Mann, ___ hier wohnt.", answer: "der", options: options("der", "den", "dem"), explanation: "Mann jest podmiotem w zdaniu względnym, więc używamy der.", targetSkill: "relative-nominative", contextGerman: "Das ist der Mann, der hier wohnt.", contextPolish: "To jest mężczyzna, który tu mieszka." }),
      exercise({ id: "b1-05-2", type: "gap-fill", instruction: "Wpisz zaimek względny.", prompt: "Ich suche eine Wohnung, ___ nicht teuer ist.", answer: "die", explanation: "Wohnung jest rodzaju żeńskiego i jest podmiotem zdania względnego: die.", targetSkill: "relative-nominative", contextGerman: "Ich suche eine Wohnung, die nicht teuer ist.", contextPolish: "Szukam mieszkania, które nie jest drogie." }),
      exercise({ id: "b1-05-3", type: "word-order", instruction: "Ułóż zdanie względne.", prompt: "którą czytam", answer: "das ich lese", tokens: ["das", "ich", "lese"], explanation: "W zdaniu względnym lese stoi na końcu.", targetSkill: "relative-word-order", contextGerman: "Das ist das Buch, das ich lese.", contextPolish: "To jest książka, którą czytam." }),
      exercise({ id: "b1-05-4", type: "error-correction", instruction: "Popraw szyk zdania.", prompt: "Das ist der Film, den ich sehe heute.", answer: "Das ist der Film, den ich heute sehe.", explanation: "W zdaniu względnym czasownik sehe jest na końcu.", targetSkill: "relative-word-order", contextGerman: "Das ist der Film, den ich heute sehe.", contextPolish: "To jest film, który dziś oglądam." }),
      exercise({ id: "b1-05-5", type: "translation-pl-de", instruction: "Przetłumacz na niemiecki.", prompt: "To jest książka, którą czytam.", answer: "Das ist das Buch, das ich lese.", acceptedAnswers: ["Das ist das Buch, das ich lese"], explanation: "Buch ma rodzaj das, a lese jest na końcu zdania względnego.", targetSkill: "relative-accusative", contextGerman: "Das ist das Buch, das ich lese.", contextPolish: "To jest książka, którą czytam." }),
    ],
  }),
  topic({
    id: "B1-13", level: "B1", sortOrder: 213,
    titlePl: "Konjunktiv II: rady i życzenia", titleDe: "Konjunktiv II",
    goalPl: "Udzielisz rady i opiszesz uprzejmie życzenie.",
    pattern: "Ich würde mehr schlafen. · Du könntest früher kommen.",
    prerequisites: ["A2-10", "A2-11"],
    explanation: "Konjunktiv II łagodzi wypowiedź. Użyj würde + bezokolicznik, aby mówić o życzeniu lub hipotetycznej sytuacji. Formy könnte i hätte są bardzo przydatne w radach oraz uprzejmych prośbach.",
    theory: {
      rules: [
        "würde + bezokolicznik opisuje hipotetyczną czynność lub łagodną radę.",
        "Częste krótkie formy to hätte, wäre, könnte i müsste.",
        "W konstrukcji z würde bezokolicznik trafia na koniec zdania.",
      ],
      memoryTip: "Konjunktiv II tworzy językowy dystans — wypowiedź brzmi jak możliwość, rada lub uprzejme życzenie.",
      commonMistake: { incorrect: "Ich würde mehr schlafe.", correct: "Ich würde mehr schlafen.", explanation: "Po würde używamy pełnego bezokolicznika schlafen." },
    },
    examples: [
      { german: "An deiner Stelle würde ich mehr schlafen.", polish: "Na twoim miejscu spałbym więcej.", highlight: "würde ich mehr schlafen" },
      { german: "Du könntest früher kommen.", polish: "Mógłbyś przyjść wcześniej.", highlight: "könntest" },
      { german: "Ich hätte gern einen Tee.", polish: "Poprosiłbym herbatę.", highlight: "hätte gern" },
    ],
    exercises: [
      exercise({ id: "b1-13-1", type: "multiple-choice", instruction: "Wybierz uprzejmą radę.", prompt: "Mógłbyś przyjść wcześniej.", answer: "Du könntest früher kommen.", options: options("Du kannst früher kommen.", "Du könntest früher kommen.", "Du kommst früher."), explanation: "könntest brzmi łagodniej niż kannst.", targetSkill: "konjunktiv-advice", contextGerman: "Du könntest früher kommen.", contextPolish: "Mógłbyś przyjść wcześniej." }),
      exercise({ id: "b1-13-2", type: "gap-fill", instruction: "Wpisz poprawną formę.", prompt: "Ich ___ gern einen Tee. (haben)", answer: "hätte", explanation: "Uprzejme życzenie: ich hätte gern.", targetSkill: "konjunktiv-haben", contextGerman: "Ich hätte gern einen Tee.", contextPolish: "Poprosiłbym herbatę." }),
      exercise({ id: "b1-13-3", type: "word-order", instruction: "Ułóż radę.", prompt: "Na twoim miejscu spałbym więcej.", answer: "An deiner Stelle würde ich mehr schlafen.", tokens: ["An deiner Stelle", "würde", "ich", "mehr", "schlafen."], explanation: "würde jest drugie, schlafen na końcu.", targetSkill: "konjunktiv-wuerde", contextGerman: "An deiner Stelle würde ich mehr schlafen.", contextPolish: "Na twoim miejscu spałbym więcej." }),
      exercise({ id: "b1-13-4", type: "typed-form", instruction: "Wpisz formę Konjunktiv II od können.", prompt: "ich →", answer: "könnte", acceptedAnswers: ["koennte"], explanation: "können → könnte. Zapis koennte także jest akceptowany.", targetSkill: "konjunktiv-koennen", contextGerman: "Ich könnte dir helfen.", contextPolish: "Mógłbym ci pomóc." }),
      exercise({ id: "b1-13-5", type: "translation-pl-de", instruction: "Przetłumacz na niemiecki.", prompt: "Mógłbym ci pomóc.", answer: "Ich könnte dir helfen.", acceptedAnswers: ["Ich koennte dir helfen"], explanation: "könnte tworzy uprzejmą, hipotetyczną możliwość.", targetSkill: "konjunktiv-koennen", contextGerman: "Ich könnte dir helfen.", contextPolish: "Mógłbym ci pomóc." }),
    ],
  }),
];

const plannedTopics: GrammarTopic[] = [
  planned("A1-01", "A1", 1, "Zaimki osobowe i sein", "Personalpronomen und sein", "Przedstawisz siebie i inne osoby.", []),
  planned("A1-02", "A1", 2, "Haben i posiadanie", "haben", "Powiesz, co masz.", ["A1-01"]),
  planned("A1-04", "A1", 4, "Najczęstsze czasowniki nieregularne", "Verben mit Vokalwechsel", "Odmienisz typowe czasowniki jak fahren i sprechen.", ["A1-03"]),
  planned("A1-06", "A1", 6, "Pytania tak/nie i pytania W", "Ja/Nein- und W-Fragen", "Zapytasz o osobę, miejsce, czas i rzecz.", ["A1-03"]),
  planned("A1-08", "A1", 8, "Liczba mnoga", "Plural", "Powiesz o wielu rzeczach.", ["A1-07"]),
  planned("A1-11", "A1", 11, "Zaimki dzierżawcze", "Possessivartikel", "Powiesz o swojej rodzinie i rzeczach.", ["A1-07"]),
  planned("A1-13", "A1", 13, "Klamra zdaniowa", "Satzklammer", "Zbudujesz zdanie z modalnym i bezokolicznikiem.", ["A1-12"]),
  planned("A1-14", "A1", 14, "Czasowniki rozdzielnie złożone", "Trennbare Verben", "Opowiesz o planie dnia.", ["A1-05"]),
  planned("A1-15", "A1", 15, "Celownik w podstawowych zwrotach", "Dativ", "Użyjesz mir, dir i typowych czasowników z Dativem.", ["A1-09"]),
  planned("A1-16", "A1", 16, "Przyimki czasu", "Temporale Präpositionen", "Podasz godzinę, dzień i okres.", ["A1-07"]),
  planned("A1-17", "A1", 17, "Przyimki miejsca i ruchu", "Lokale Präpositionen", "Powiesz, gdzie jesteś i dokąd idziesz.", ["A1-09", "A1-15"]),
  planned("A1-18", "A1", 18, "Tryb rozkazujący", "Imperativ", "Wydasz prostą prośbę lub polecenie.", ["A1-03"]),
  planned("A1-19", "A1", 19, "Łączenie prostych zdań", "und, oder, aber, deshalb", "Połączysz dwie proste informacje.", ["A1-05"]),
  planned("A1-20", "A1", 20, "Przymiotnik i proste porównanie", "Adjektiv und Komparation", "Opiszesz rzecz i powiesz, co wolisz.", ["A1-07"]),
  planned("A2-03", "A2", 103, "Partizip II", "Partizip II", "Utworzysz najczęstsze formy Perfektu.", ["A2-01"]),
  planned("A2-04", "A2", 104, "Präteritum: sein, haben i modalne", "Präteritum", "Opiszesz przeszły stan i możliwość.", ["A1-12"]),
  planned("A2-05", "A2", 105, "Zaimki w Akkusativie i Dativie", "Personalpronomen", "Zastąpisz rzeczownik zaimkiem.", ["A1-09", "A1-15"]),
  planned("A2-06", "A2", 106, "Czasowniki zwrotne", "Reflexive Verben", "Opowiesz o rutynie i samopoczuciu.", ["A2-05"]),
  planned("A2-07", "A2", 107, "Przyimki zmienne", "Wechselpräpositionen", "Odróżnisz miejsce od kierunku.", ["A1-17"]),
  planned("A2-08", "A2", 108, "Odmiana przymiotnika – podstawy", "Adjektivdeklination", "Opiszesz rzecz z der i ein.", ["A1-07", "A1-09"]),
  planned("A2-09", "A2", 109, "Stopniowanie", "Komparativ und Superlativ", "Porównasz osoby i rzeczy.", ["A1-20"]),
  planned("A2-10", "A2", 110, "Uprzejme prośby", "Konjunktiv II", "Poprosisz i zamówisz uprzejmie.", ["A1-12"]),
  planned("A2-12", "A2", 112, "Zdania z wenn", "Nebensätze mit wenn", "Opiszesz warunek albo powtarzalną sytuację.", ["A2-11"]),
  planned("A2-13", "A2", 113, "Pytania pośrednie", "Indirekte W-Fragen", "Uprzejmie zapytasz o informację.", ["A1-06", "A2-11"]),
  planned("A2-14", "A2", 114, "Denn, deshalb i szyk zdania", "Konnektoren", "Rozróżnisz trzy sposoby uzasadniania.", ["A1-19", "A2-11"]),
  planned("A2-15", "A2", 115, "Przyimki czasu: seit, vor, bis", "Temporale Präpositionen", "Opiszesz czas trwania i moment w przeszłości.", ["A1-16"]),
  planned("A2-16", "A2", 116, "Jemand, niemand, etwas, nichts", "Indefinitpronomen", "Powiesz o nieokreślonych osobach i rzeczach.", ["A1-10"]),
  planned("B1-02", "B1", 202, "Plusquamperfekt", "Plusquamperfekt", "Powiesz, co wydarzyło się wcześniej.", ["B1-01"]),
  planned("B1-03", "B1", 203, "Als i wenn", "Temporale Nebensätze", "Odróżnisz jednorazową i powtarzalną przeszłość.", ["A2-12", "B1-01"]),
  planned("B1-04", "B1", 204, "Bevor, nachdem i während", "Temporale Nebensätze", "Uporządkujesz wydarzenia w czasie.", ["B1-02", "B1-03"]),
  planned("B1-06", "B1", 206, "Zdania względne w Dativie i z przyimkiem", "Relativsätze", "Doprecyzujesz osobę lub rzecz z przyimkiem.", ["B1-05", "A1-15"]),
  planned("B1-07", "B1", 207, "Odmiana przymiotnika – pełne podstawy", "Adjektivdeklination", "Poprawnie opiszesz rzecz po der, ein i bez rodzajnika.", ["A2-08"]),
  planned("B1-08", "B1", 208, "Czasowniki z przyimkami", "Verben mit Präpositionen", "Użyjesz połączeń jak warten auf.", ["A2-07"]),
  planned("B1-09", "B1", 209, "Da(r)- i wo(r)-", "Pronominaladverbien", "Powiesz o tym, na co i z czym.", ["B1-08"]),
  planned("B1-10", "B1", 210, "Bezokolicznik z zu", "Infinitiv mit zu", "Połączysz dwie czynności lub zamiary.", ["A1-13", "A2-11"]),
  planned("B1-11", "B1", 211, "Um … zu i damit", "Finalsätze", "Wyjaśnisz, po co coś robisz.", ["B1-10"]),
  planned("B1-12", "B1", 212, "Obwohl i trotzdem", "Konzessive Sätze", "Zestawisz sprzeczne informacje.", ["A2-14"]),
  planned("B1-14", "B1", 214, "Strona bierna w Präsens", "Passiv", "Opiszesz proces bez wskazywania wykonawcy.", ["A1-03"]),
  planned("B1-15", "B1", 215, "Strona bierna w Präteritum i z modalnym", "Passiv", "Opiszesz przeszły proces albo obowiązek.", ["B1-14", "A2-04"]),
  planned("B1-16", "B1", 216, "Werden: przyszłość, zmiana i strona bierna", "werden", "Odróżnisz trzy funkcje werden.", ["B1-14"]),
  planned("B1-17", "B1", 217, "Rekcja i kolejność dopełnień", "Satzergänzungen", "Poprawnie ustawisz Dativ i Akkusativ.", ["A2-05"]),
  planned("B1-18", "B1", 218, "Rzeczowniki słabe", "N-Deklination", "Odmienisz rzeczowniki typu der Kunde.", ["A1-15"]),
  planned("B1-19", "B1", 219, "Dopełniacz i formy z von", "Genitiv", "Wyrazisz przynależność.", ["A1-11"]),
  planned("B1-20", "B1", 220, "Mowa zależna z dass", "Indirekte Rede", "Streścisz czyjąś wypowiedź.", ["A2-11"]),
  planned("B1-21", "B1", 221, "Rozbudowany szyk zdania", "Satzstellung", "Połączysz zdanie główne, podrzędne i klamrę.", ["A1-13", "A2-11"]),
  planned("B1-22", "B1", 222, "Łączniki argumentacji", "Konnektoren", "Uzasadnisz opinię.", ["A2-14", "B1-12"]),
  planned("B1-23", "B1", 223, "Nominalizacja i słowotwórstwo", "Wortbildung", "Rozpoznasz częste rzeczowniki i przymiotniki.", ["A1-20"]),
  planned("B1-24", "B1", 224, "Powtórka funkcjonalna B1", "Wiederholung", "Opiszesz doświadczenie, plan, opinię i powód.", ["B1-01", "B1-05", "B1-13"]),
];

export const grammarTopics: GrammarTopic[] = [...pilotTopics, ...plannedTopics]
  .sort((left, right) => left.sortOrder - right.sortOrder);

export const grammarTopicsById = new Map(grammarTopics.map((item) => [item.id, item]));

export function grammarExerciseById(topicId: string, exerciseId: string): GrammarExercise | undefined {
  return grammarTopicsById.get(topicId)?.exercises.find((item) => item.id === exerciseId);
}

export function grammarLevels(): GrammarLevel[] {
  return ["A1", "A2", "B1"];
}

export const grammarSourceNote = "Zakres A1 i A2 opiera się na inwentarzach Goethe; B1 jest mapą konstrukcji potrzebnych do oficjalnych celów komunikacyjnych Goethe-Zertifikat B1.";

export const grammarExerciseTypes: GrammarExerciseType[] = [
  "multiple-choice",
  "gap-fill",
  "word-order",
  "typed-form",
  "case-choice",
  "error-correction",
  "translation-pl-de",
];
