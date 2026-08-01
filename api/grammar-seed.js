/**
 * The published lessons. Their full learning content lives in the versioned
 * client catalogue; this small projection makes progress referential.
 */
export const grammarTopicSeed = [
  ["A1-01", "A1", 1, "Zaimki osobowe i sein", "Personalpronomen und sein"],
  ["A1-02", "A1", 2, "Haben i posiadanie", "haben"],
  ["A1-03", "A1", 3, "Czas teraźniejszy regularny", "Präsens"],
  ["A1-04", "A1", 4, "Najczęstsze czasowniki nieregularne", "Verben mit Vokalwechsel"],
  ["A1-05", "A1", 5, "Czasownik na drugim miejscu", "Verbzweitstellung"],
  ["A1-06", "A1", 6, "Pytania tak/nie i pytania W", "Ja/Nein- und W-Fragen"],
  ["A1-07", "A1", 7, "Rodzaj i rodzajniki", "Genus und Artikel"],
  ["A1-08", "A1", 8, "Liczba mnoga", "Plural"],
  ["A1-09", "A1", 9, "Biernik", "Akkusativ"],
  ["A1-10", "A1", 10, "Przeczenie nicht i kein", "Negation"],
  ["A1-11", "A1", 11, "Zaimki dzierżawcze", "Possessivartikel"],
  ["A1-12", "A1", 12, "Czasowniki modalne", "Modalverben"],
  ["A1-13", "A1", 13, "Klamra zdaniowa", "Satzklammer"],
  ["A1-14", "A1", 14, "Czasowniki rozdzielnie złożone", "Trennbare Verben"],
  ["A1-15", "A1", 15, "Celownik w podstawowych zwrotach", "Dativ"],
  ["A1-16", "A1", 16, "Przyimki czasu", "Temporale Präpositionen"],
  ["A1-17", "A1", 17, "Przyimki miejsca i ruchu", "Lokale Präpositionen"],
  ["A1-18", "A1", 18, "Tryb rozkazujący", "Imperativ"],
  ["A1-19", "A1", 19, "Łączenie prostych zdań", "und, oder, aber, deshalb"],
  ["A1-20", "A1", 20, "Przymiotnik i proste porównanie", "Adjektiv und Komparation"],
  ["A2-01", "A2", 101, "Perfekt z haben", "Perfekt mit haben"],
  ["A2-02", "A2", 102, "Perfekt z sein", "Perfekt mit sein"],
  ["A2-11", "A2", 111, "Zdania z weil i dass", "Nebensätze mit weil und dass"],
  ["B1-01", "B1", 201, "Opowiadanie o przeszłości", "Vergangenheit erzählen"],
  ["B1-05", "B1", 205, "Zdania względne", "Relativsätze"],
  ["B1-13", "B1", 213, "Konjunktiv II: rady i życzenia", "Konjunktiv II"],
].map(([id, level, sortOrder, titlePl, titleDe]) => ({
  id,
  level,
  sortOrder,
  titlePl,
  titleDe,
  published: true,
}));
