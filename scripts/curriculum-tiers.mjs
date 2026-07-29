// Conservative curriculum curation for the Nicos Weg catalogue.
// The normal path contains everyday and extension vocabulary; specialist terms
// remain searchable in the collection without being introduced automatically.

const SPECIALIST_TERMS = new Set([
  "Kreislaufzusammenbruch",
  "Meldebescheinigung",
  "Gastronomiemanager",
  "Gastronomiemanagerin",
  "Restaurantkritiker",
  "Restaurantkritikerin",
]);

const SPECIALIST_LESSONS = new Set([
  "Bund und Länder",
  "Die EU",
  "Gerechtigkeit?",
  "Wir haben die Wahl",
  "Das Ruhrgebiet",
  "Industrie",
  "Strukturwandel",
  "Existenzgründung",
]);

export function curriculumTierFor(card) {
  if (SPECIALIST_TERMS.has(card.german) || SPECIALIST_LESSONS.has(card.lesson)) {
    return "specialist";
  }
  return card.level === "B1" ? "extension" : "core";
}

