import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { isDuplicate, mergeUnique, normalizeGerman, toFlashcard } from "../src/lib/cards";

describe("kolekcja fiszek", () => {
  it("zawiera co najmniej 100 unikalnych kart startowych", () => {
    expect(starterCards).toHaveLength(110);
    expect(new Set(starterCards.map((card) => normalizeGerman(card.german))).size).toBe(110);
  });

  it("wykrywa duplikat niezależnie od wielkości liter i rodzajnika", () => {
    expect(isDuplicate({ german: "das HAUS" }, starterCards)).toBe(true);
  });

  it("pomija duplikaty podczas importu", () => {
    const unique = toFlashcard(
      {
        id: "new",
        german: "die Bushaltestellenanzeige",
        polish: "tablica na przystanku",
        article: "die",
        plural: "Bushaltestellenanzeigen",
        exampleGerman: "Die Anzeige zeigt die Abfahrt.",
        examplePolish: "Tablica pokazuje odjazd.",
        category: "Miasto",
      },
      "manual",
    );
    const result = mergeUnique(starterCards, [starterCards[0], unique]);
    expect(result.skipped).toBe(1);
    expect(result.cards).toHaveLength(111);
  });
});
