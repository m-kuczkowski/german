import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { isDuplicate, mergeUnique, normalizeGerman, toFlashcard } from "../src/lib/cards";

describe("kolekcja fiszek", () => {
  it("zawiera wszystkie unikalne karty Nicos Weg A2 i B1", () => {
    expect(starterCards).toHaveLength(3038);
    expect(new Set(starterCards.map((card) => card.id)).size).toBe(3038);
    expect(starterCards.filter((card) => card.level === "A2")).toHaveLength(1856);
    expect(starterCards.filter((card) => card.level === "B1")).toHaveLength(1182);
  });

  it("nie pokazuje technicznych separatorów z talii źródłowej", () => {
    expect(starterCards.filter((card) => /[|/]/.test(card.german))).toHaveLength(0);
    expect(starterCards.filter((card) => /[|/]/.test(card.polish))).toHaveLength(0);
    expect(starterCards.find((card) => card.id === "nicos-a2-d2c4975b3456"))
      .toMatchObject({ german: "zurückkommen", polish: "wrócić; wracać" });
    expect(starterCards.find((card) => card.id === "nicos-a2-3e7af31ad03f"))
      .toMatchObject({
        german: "vergessen (etwas oder jemanden)",
        polish: "zapomnieć o czymś lub o kimś",
      });
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
    expect(result.cards).toHaveLength(3039);
  });
});
