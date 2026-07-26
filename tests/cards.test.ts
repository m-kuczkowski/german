import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { isDuplicate, mergeUnique, normalizeGerman, toFlashcard } from "../src/lib/cards";

describe("kolekcja fiszek", () => {
  it("zawiera 299 unikalnych kart Nicos Weg A2 i B1", () => {
    expect(starterCards).toHaveLength(299);
    expect(new Set(starterCards.map((card) => normalizeGerman(card.german))).size).toBe(299);
    expect(starterCards.filter((card) => card.level === "A2")).toHaveLength(228);
    expect(starterCards.filter((card) => card.level === "B1")).toHaveLength(71);
  });

  it("wykrywa duplikat niezależnie od wielkości liter i rodzajnika", () => {
    expect(isDuplicate({ german: "das ABITUR" }, starterCards)).toBe(true);
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
    expect(result.cards).toHaveLength(300);
  });
});
