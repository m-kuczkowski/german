import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { isDuplicate, mergeUnique, normalizeGerman, toFlashcard } from "../src/lib/cards";

describe("kolekcja fiszek", () => {
  it("zawiera oficjalny rdzeń Goethe i zachowaną bibliotekę Nicos Weg", () => {
    expect(starterCards).toHaveLength(4937);
    expect(new Set(starterCards.map((card) => card.id)).size).toBe(4937);
    expect(starterCards.filter((card) => card.id.startsWith("nicos-"))).toHaveLength(3038);
    expect(starterCards.filter((card) => card.goetheLevel === "A2")).toHaveLength(1364);
    expect(starterCards.filter((card) => card.goetheLevel === "B1")).toHaveLength(1816);
    expect(starterCards.filter((card) => card.curriculumTier === "core")).toHaveLength(3180);
    expect(starterCards.find((card) => card.german === "Montag"))
      .toMatchObject({ article: "der", plural: "Montage", goetheLevel: "A2" });
    expect(starterCards.find((card) => card.german === "Kreislaufzusammenbruch"))
      .toMatchObject({ curriculumTier: "specialist" });
    expect(starterCards.find((card) => card.german === "ohnmächtig"))
      .toMatchObject({ curriculumTier: "extension" });
  });

  it("prowadzi od podstaw słowotwórczych do trudniejszych rozwinięć", () => {
    expect(new Set(
      starterCards
        .map((card) => card.wordFamilyId)
        .filter((family): family is string => Boolean(family)),
    ).size).toBe(8);
    expect(starterCards.find((card) => card.id === "nicos-a2-8132eb42ae5b"))
      .toMatchObject({
        german: "jemanden pflegen",
        curriculumTier: "core",
        goetheLevel: "B1",
        wordFamilyId: "pflege",
        wordFamilyRole: "base",
        prerequisiteIds: [],
      });
    expect(starterCards.find((card) => card.id === "nicos-a2-4ec3d0495161"))
      .toMatchObject({
        german: "Pflegeheim",
        curriculumTier: "extension",
        wordFamilyId: "pflege",
        wordFamilyRole: "compound",
        prerequisiteIds: ["nicos-b1-7c8fba159d9f"],
        wordParts: [
          { german: "Pflege", polish: "opieka" },
          { german: "Heim", polish: "dom lub ośrodek" },
        ],
      });
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
    expect(result.cards).toHaveLength(4938);
  });
});
