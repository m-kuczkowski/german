import type { CardContent, Flashcard } from "../types";
import { toFlashcard } from "../lib/cards";

type Article = CardContent["article"];
type Row = [
  german: string,
  polish: string,
  article: Article,
  plural: string | null,
  exampleGerman: string,
  examplePolish: string,
];

const groups: Array<[category: string, rows: Row[]]> = [
  [
    "Dom",
    [
      ["Haus", "dom", "das", "Häuser", "Unser Haus hat einen kleinen Garten.", "Nasz dom ma mały ogród."],
      ["Wohnung", "mieszkanie", "die", "Wohnungen", "Meine Wohnung liegt im zweiten Stock.", "Moje mieszkanie znajduje się na drugim piętrze."],
      ["Zimmer", "pokój", "das", "Zimmer", "Das Zimmer ist hell und ruhig.", "Pokój jest jasny i cichy."],
      ["Küche", "kuchnia", "die", "Küchen", "Wir essen morgens in der Küche.", "Rano jemy w kuchni."],
      ["Bad", "łazienka", "das", "Bäder", "Das Bad ist neben dem Schlafzimmer.", "Łazienka jest obok sypialni."],
      ["Schlafzimmer", "sypialnia", "das", "Schlafzimmer", "Im Schlafzimmer steht ein großes Bett.", "W sypialni stoi duże łóżko."],
      ["Tisch", "stół", "der", "Tische", "Die Schlüssel liegen auf dem Tisch.", "Klucze leżą na stole."],
      ["Stuhl", "krzesło", "der", "Stühle", "Bitte setz dich auf den Stuhl.", "Usiądź proszę na krześle."],
      ["Fenster", "okno", "das", "Fenster", "Kannst du das Fenster öffnen?", "Czy możesz otworzyć okno?"],
      ["Tür", "drzwi", "die", "Türen", "Mach bitte die Tür zu.", "Zamknij proszę drzwi."],
    ],
  ],
  [
    "Rodzina",
    [
      ["Familie", "rodzina", "die", "Familien", "Meine Familie wohnt in Polen.", "Moja rodzina mieszka w Polsce."],
      ["Mutter", "matka", "die", "Mütter", "Meine Mutter arbeitet im Krankenhaus.", "Moja mama pracuje w szpitalu."],
      ["Vater", "ojciec", "der", "Väter", "Mein Vater kocht sehr gern.", "Mój tata bardzo lubi gotować."],
      ["Bruder", "brat", "der", "Brüder", "Mein Bruder ist zwei Jahre jünger.", "Mój brat jest o dwa lata młodszy."],
      ["Schwester", "siostra", "die", "Schwestern", "Meine Schwester lernt Spanisch.", "Moja siostra uczy się hiszpańskiego."],
      ["Sohn", "syn", "der", "Söhne", "Ihr Sohn geht schon zur Schule.", "Jej syn chodzi już do szkoły."],
      ["Tochter", "córka", "die", "Töchter", "Unsere Tochter spielt Klavier.", "Nasza córka gra na pianinie."],
      ["Kind", "dziecko", "das", "Kinder", "Das Kind malt ein Bild.", "Dziecko maluje obrazek."],
      ["Großmutter", "babcia", "die", "Großmütter", "Meine Großmutter erzählt schöne Geschichten.", "Moja babcia opowiada piękne historie."],
      ["Großvater", "dziadek", "der", "Großväter", "Am Sonntag besuche ich meinen Großvater.", "W niedzielę odwiedzam dziadka."],
    ],
  ],
  [
    "Praca",
    [
      ["Arbeit", "praca", "die", "Arbeiten", "Ich fahre jeden Morgen zur Arbeit.", "Każdego ranka jadę do pracy."],
      ["Beruf", "zawód", "der", "Berufe", "Was sind Sie von Beruf?", "Jaki ma Pan lub Pani zawód?"],
      ["Firma", "firma", "die", "Firmen", "Die Firma hat ein Büro in Berlin.", "Firma ma biuro w Berlinie."],
      ["Büro", "biuro", "das", "Büros", "Unser Büro ist bis 18 Uhr geöffnet.", "Nasze biuro jest otwarte do godziny 18."],
      ["Chef", "szef", "der", "Chefs", "Mein Chef erklärt mir die Aufgabe.", "Mój szef wyjaśnia mi zadanie."],
      ["Kollegin", "koleżanka z pracy", "die", "Kolleginnen", "Meine Kollegin hilft mir oft.", "Moja koleżanka z pracy często mi pomaga."],
      ["Pause", "przerwa", "die", "Pausen", "Um zwölf Uhr machen wir eine Pause.", "O dwunastej robimy przerwę."],
      ["Termin", "termin, spotkanie", "der", "Termine", "Ich habe morgen einen wichtigen Termin.", "Jutro mam ważne spotkanie."],
      ["arbeiten", "pracować", null, null, "Sie arbeitet dreimal pro Woche.", "Ona pracuje trzy razy w tygodniu."],
      ["verdienen", "zarabiać", null, null, "Er verdient genug für die Wohnung.", "On zarabia wystarczająco na mieszkanie."],
    ],
  ],
  [
    "Zakupy",
    [
      ["Geschäft", "sklep", "das", "Geschäfte", "Das Geschäft schließt um acht Uhr.", "Sklep zamyka się o ósmej."],
      ["Supermarkt", "supermarket", "der", "Supermärkte", "Der Supermarkt ist gleich um die Ecke.", "Supermarket jest tuż za rogiem."],
      ["Preis", "cena", "der", "Preise", "Der Preis ist heute niedriger.", "Cena jest dziś niższa."],
      ["Kasse", "kasa", "die", "Kassen", "An der Kasse ist eine lange Schlange.", "Przy kasie jest długa kolejka."],
      ["Verkäuferin", "sprzedawczyni", "die", "Verkäuferinnen", "Die Verkäuferin zeigt mir eine Jacke.", "Sprzedawczyni pokazuje mi kurtkę."],
      ["Größe", "rozmiar", "die", "Größen", "Haben Sie das in Größe M?", "Czy mają Państwo to w rozmiarze M?"],
      ["Angebot", "oferta, promocja", "das", "Angebote", "Diese Äpfel sind heute im Angebot.", "Te jabłka są dziś w promocji."],
      ["bezahlen", "płacić", null, null, "Kann ich mit Karte bezahlen?", "Czy mogę zapłacić kartą?"],
      ["kosten", "kosztować", null, null, "Wie viel kostet dieses Hemd?", "Ile kosztuje ta koszula?"],
      ["anprobieren", "przymierzać", null, null, "Ich möchte die Schuhe anprobieren.", "Chciałbym przymierzyć buty."],
    ],
  ],
  [
    "Jedzenie",
    [
      ["Brot", "chleb", "das", "Brote", "Zum Frühstück esse ich Brot mit Käse.", "Na śniadanie jem chleb z serem."],
      ["Käse", "ser", "der", "Käsesorten", "Dieser Käse kommt aus der Schweiz.", "Ten ser pochodzi ze Szwajcarii."],
      ["Milch", "mleko", "die", null, "Trinkst du Kaffee mit Milch?", "Pijesz kawę z mlekiem?"],
      ["Wasser", "woda", "das", null, "Ich nehme ein Glas Wasser.", "Wezmę szklankę wody."],
      ["Apfel", "jabłko", "der", "Äpfel", "Der Apfel schmeckt süß.", "Jabłko smakuje słodko."],
      ["Gemüse", "warzywa", "das", null, "Wir kaufen frisches Gemüse auf dem Markt.", "Kupujemy świeże warzywa na targu."],
      ["Frühstück", "śniadanie", "das", "Frühstücke", "Das Frühstück ist im Preis inklusive.", "Śniadanie jest wliczone w cenę."],
      ["kochen", "gotować", null, null, "Heute koche ich eine Gemüsesuppe.", "Dziś gotuję zupę warzywną."],
      ["schmecken", "smakować", null, null, "Die Suppe schmeckt sehr gut.", "Zupa smakuje bardzo dobrze."],
      ["bestellen", "zamawiać", null, null, "Wir bestellen zwei Pizzen.", "Zamawiamy dwie pizze."],
    ],
  ],
  [
    "Podróże",
    [
      ["Reise", "podróż", "die", "Reisen", "Unsere Reise nach Wien dauert vier Tage.", "Nasza podróż do Wiednia trwa cztery dni."],
      ["Bahnhof", "dworzec kolejowy", "der", "Bahnhöfe", "Der Bahnhof ist zehn Minuten entfernt.", "Dworzec jest oddalony o dziesięć minut."],
      ["Zug", "pociąg", "der", "Züge", "Der Zug nach Hamburg hat Verspätung.", "Pociąg do Hamburga ma opóźnienie."],
      ["Fahrkarte", "bilet", "die", "Fahrkarten", "Wo kann ich eine Fahrkarte kaufen?", "Gdzie mogę kupić bilet?"],
      ["Flughafen", "lotnisko", "der", "Flughäfen", "Wir müssen um sechs Uhr am Flughafen sein.", "Musimy być na lotnisku o szóstej."],
      ["Hotel", "hotel", "das", "Hotels", "Das Hotel liegt im Stadtzentrum.", "Hotel znajduje się w centrum miasta."],
      ["Koffer", "walizka", "der", "Koffer", "Mein Koffer ist ziemlich schwer.", "Moja walizka jest dość ciężka."],
      ["abfahren", "odjeżdżać", null, null, "Der Bus fährt um 8:15 Uhr ab.", "Autobus odjeżdża o 8:15."],
      ["ankommen", "przyjeżdżać, docierać", null, null, "Wir kommen am Abend in München an.", "Wieczorem docieramy do Monachium."],
      ["umsteigen", "przesiadać się", null, null, "In Köln müssen Sie umsteigen.", "W Kolonii musi się Pan lub Pani przesiąść."],
    ],
  ],
  [
    "Zdrowie",
    [
      ["Arzt", "lekarz", "der", "Ärzte", "Ich habe morgen einen Termin beim Arzt.", "Jutro mam wizytę u lekarza."],
      ["Ärztin", "lekarka", "die", "Ärztinnen", "Die Ärztin untersucht meinen Hals.", "Lekarka bada moje gardło."],
      ["Apotheke", "apteka", "die", "Apotheken", "Die nächste Apotheke ist am Marktplatz.", "Najbliższa apteka jest przy rynku."],
      ["Medikament", "lek", "das", "Medikamente", "Nehmen Sie das Medikament nach dem Essen.", "Proszę przyjąć lek po jedzeniu."],
      ["Schmerz", "ból", "der", "Schmerzen", "Ich habe starke Schmerzen im Rücken.", "Mam silny ból pleców."],
      ["Fieber", "gorączka", "das", null, "Das Kind hat seit gestern Fieber.", "Dziecko ma gorączkę od wczoraj."],
      ["krank", "chory", null, null, "Ich bin krank und bleibe heute zu Hause.", "Jestem chory i zostaję dziś w domu."],
      ["gesund", "zdrowy", null, null, "Obst und Bewegung sind gesund.", "Owoce i ruch są zdrowe."],
      ["wehtun", "boleć", null, null, "Mein Knie tut beim Laufen weh.", "Podczas biegania boli mnie kolano."],
      ["sich ausruhen", "odpoczywać", null, null, "Du solltest dich heute ausruhen.", "Powinieneś dziś odpocząć."],
    ],
  ],
  [
    "Czas wolny",
    [
      ["Freizeit", "czas wolny", "die", null, "In meiner Freizeit fahre ich gern Rad.", "W wolnym czasie lubię jeździć na rowerze."],
      ["Hobby", "hobby", "das", "Hobbys", "Fotografie ist mein liebstes Hobby.", "Fotografia jest moim ulubionym hobby."],
      ["Sport", "sport", "der", "Sportarten", "Welchen Sport machst du gern?", "Jaki sport lubisz uprawiać?"],
      ["Buch", "książka", "das", "Bücher", "Ich lese gerade ein deutsches Buch.", "Czytam właśnie niemiecką książkę."],
      ["Film", "film", "der", "Filme", "Wollen wir heute einen Film sehen?", "Chcemy dziś obejrzeć film?"],
      ["Musik", "muzyka", "die", null, "Beim Kochen höre ich Musik.", "Podczas gotowania słucham muzyki."],
      ["spazieren gehen", "iść na spacer", null, null, "Nach dem Essen gehen wir spazieren.", "Po jedzeniu idziemy na spacer."],
      ["Freunde treffen", "spotykać się z przyjaciółmi", null, null, "Am Freitag treffe ich meine Freunde.", "W piątek spotykam się z przyjaciółmi."],
      ["lesen", "czytać", null, null, "Sie liest jeden Abend zwanzig Minuten.", "Ona czyta każdego wieczoru przez dwadzieścia minut."],
      ["schwimmen", "pływać", null, null, "Im Sommer schwimmen wir im See.", "Latem pływamy w jeziorze."],
    ],
  ],
  [
    "Miasto",
    [
      ["Stadt", "miasto", "die", "Städte", "Die Stadt ist für ihre Altstadt bekannt.", "Miasto jest znane ze starego miasta."],
      ["Straße", "ulica", "die", "Straßen", "Das Museum liegt auf der anderen Straßenseite.", "Muzeum znajduje się po drugiej stronie ulicy."],
      ["Platz", "plac, miejsce", "der", "Plätze", "Wir treffen uns auf dem großen Platz.", "Spotykamy się na dużym placu."],
      ["Bushaltestelle", "przystanek autobusowy", "die", "Bushaltestellen", "Die Bushaltestelle ist vor der Bank.", "Przystanek autobusowy jest przed bankiem."],
      ["Rathaus", "ratusz", "das", "Rathäuser", "Das Rathaus steht in der Stadtmitte.", "Ratusz stoi w centrum miasta."],
      ["Bank", "bank", "die", "Banken", "Die Bank öffnet um neun Uhr.", "Bank otwiera się o dziewiątej."],
      ["Post", "poczta", "die", null, "Ich muss ein Paket zur Post bringen.", "Muszę zanieść paczkę na pocztę."],
      ["Ampel", "sygnalizacja świetlna", "die", "Ampeln", "An der Ampel gehen Sie nach links.", "Przy światłach proszę iść w lewo."],
      ["geradeaus", "prosto", null, null, "Gehen Sie zweihundert Meter geradeaus.", "Proszę iść dwieście metrów prosto."],
      ["abbiegen", "skręcać", null, null, "An der nächsten Kreuzung biegen wir rechts ab.", "Na następnym skrzyżowaniu skręcamy w prawo."],
    ],
  ],
  [
    "Pogoda",
    [
      ["Wetter", "pogoda", "das", null, "Wie wird das Wetter morgen?", "Jaka będzie jutro pogoda?"],
      ["Sonne", "słońce", "die", "Sonnen", "Am Nachmittag kommt die Sonne heraus.", "Po południu wychodzi słońce."],
      ["Regen", "deszcz", "der", null, "Nimm wegen des Regens einen Schirm mit.", "Weź parasol ze względu na deszcz."],
      ["Wind", "wiatr", "der", "Winde", "Heute kommt starker Wind aus Westen.", "Dziś wieje silny wiatr z zachodu."],
      ["Wolke", "chmura", "die", "Wolken", "Am Himmel sind dunkle Wolken.", "Na niebie są ciemne chmury."],
      ["Grad", "stopień", "der", "Grade", "Heute sind es draußen zwanzig Grad.", "Dziś na zewnątrz jest dwadzieścia stopni."],
      ["warm", "ciepły, ciepło", null, null, "Im Mai ist es oft schon warm.", "W maju często jest już ciepło."],
      ["kalt", "zimny, zimno", null, null, "In der Nacht wird es sehr kalt.", "W nocy robi się bardzo zimno."],
      ["regnen", "padać (o deszczu)", null, null, "Morgen soll es den ganzen Tag regnen.", "Jutro ma padać przez cały dzień."],
      ["scheinen", "świecić", null, null, "Die Sonne scheint durch das Fenster.", "Słońce świeci przez okno."],
    ],
  ],
  [
    "Czasowniki",
    [
      ["aufstehen", "wstawać", null, null, "Ich stehe werktags um sieben Uhr auf.", "W dni robocze wstaję o siódmej."],
      ["anfangen", "zaczynać", null, null, "Der Deutschkurs fängt nächste Woche an.", "Kurs niemieckiego zaczyna się w przyszłym tygodniu."],
      ["einkaufen", "robić zakupy", null, null, "Samstags kaufen wir auf dem Markt ein.", "W soboty robimy zakupy na targu."],
      ["helfen", "pomagać", null, null, "Kannst du mir mit der Tasche helfen?", "Czy możesz mi pomóc z torbą?"],
      ["vergessen", "zapominać", null, null, "Vergiss bitte deinen Schlüssel nicht.", "Proszę, nie zapomnij klucza."],
      ["verstehen", "rozumieć", null, null, "Ich verstehe diese Frage noch nicht.", "Jeszcze nie rozumiem tego pytania."],
      ["brauchen", "potrzebować", null, null, "Wir brauchen noch Brot und Milch.", "Potrzebujemy jeszcze chleba i mleka."],
      ["bringen", "przynosić, zawozić", null, null, "Ich bringe dir morgen das Buch.", "Przyniosę ci jutro książkę."],
      ["nehmen", "brać", null, null, "Ich nehme den Bus zur Arbeit.", "Jadę autobusem do pracy."],
      ["bleiben", "zostawać", null, null, "Am Wochenende bleiben wir zu Hause.", "W weekend zostajemy w domu."],
    ],
  ],
];

const contents: CardContent[] = groups.flatMap(([category, rows]) =>
  rows.map(([german, polish, article, plural, exampleGerman, examplePolish], index) => ({
    id: `starter-${category.toLocaleLowerCase("pl-PL").replace(/\s+/g, "-")}-${index + 1}`,
    german,
    polish,
    article,
    plural,
    exampleGerman,
    examplePolish,
    category,
  })),
);

const seedDate = new Date("2026-01-01T08:00:00.000Z");

export const starterCards: Flashcard[] = contents.map((content, index) =>
  toFlashcard(content, "starter", new Date(seedDate.getTime() + index)),
);

export const starterCategories = groups.map(([category]) => category);
