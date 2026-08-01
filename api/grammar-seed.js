/**
 * The twelve published lessons. Their full learning content lives in the
 * versioned client catalogue; this small projection makes progress referential
 * and leaves room for publishing the remaining A1–B1 catalogue safely.
 */
export const grammarTopicSeed = [
  ["A1-03", "A1", 3, "Czas teraźniejszy regularny", "Präsens"],
  ["A1-05", "A1", 5, "Czasownik na drugim miejscu", "Verbzweitstellung"],
  ["A1-07", "A1", 7, "Rodzaj i rodzajniki", "Genus und Artikel"],
  ["A1-09", "A1", 9, "Biernik", "Akkusativ"],
  ["A1-10", "A1", 10, "Przeczenie nicht i kein", "Negation"],
  ["A1-12", "A1", 12, "Czasowniki modalne", "Modalverben"],
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
