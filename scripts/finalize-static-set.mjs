#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";

function replace(path, replacements) {
  let content = readFileSync(path, "utf8");
  for (const [from, to] of replacements) {
    if (!content.includes(from)) throw new Error(`Nie znaleziono oczekiwanego fragmentu w ${path}.`);
    content = content.replace(from, to);
  }
  writeFileSync(path, content);
}

replace("src/lib/storage.ts", [["const CURRENT_CONTENT_VERSION = 2;", "const CURRENT_CONTENT_VERSION = 3;"]]);

replace("tests/cards.test.ts", [
  [
    'import { isDuplicate, mergeUnique, normalizeGerman, toFlashcard } from "../src/lib/cards";',
    'import { isDuplicate, mergeUnique, toFlashcard } from "../src/lib/cards";',
  ],
  [
    'it("zawiera 299 unikalnych kart Nicos Weg A2 i B1", () => {\n    expect(starterCards).toHaveLength(299);\n    expect(new Set(starterCards.map((card) => normalizeGerman(card.german))).size).toBe(299);\n    expect(starterCards.filter((card) => card.level === "A2")).toHaveLength(228);\n    expect(starterCards.filter((card) => card.level === "B1")).toHaveLength(71);\n  });',
    'it("zawiera komplet 3038 kart Nicos Weg A2 i B1", () => {\n    expect(starterCards).toHaveLength(3038);\n    expect(new Set(starterCards.map((card) => card.id)).size).toBe(3038);\n    expect(starterCards.filter((card) => card.level === "A2")).toHaveLength(1856);\n    expect(starterCards.filter((card) => card.level === "B1")).toHaveLength(1182);\n    expect(starterCards.every((card) => card.exampleGerman.length > 4)).toBe(true);\n    expect(starterCards.every((card) => card.examplePolish.length > 4)).toBe(true);\n  });',
  ],
  ['german: "die Bushaltestellenanzeige",', 'german: "die TestkarteXYZ",'],
  ['plural: "Bushaltestellenanzeigen",', 'plural: "TestkartenXYZ",'],
  ['exampleGerman: "Die Anzeige zeigt die Abfahrt.",', 'exampleGerman: "Die TestkarteXYZ ist nur ein technisches Beispiel.",'],
  ['examplePolish: "Tablica pokazuje odjazd.",', 'examplePolish: "Karta TestkarteXYZ jest tylko przykładem technicznym.",'],
  ['expect(result.cards).toHaveLength(300);', 'expect(result.cards).toHaveLength(3039);'],
]);

replace("tests/storage.test.ts", [
  ['expect(result.cards).toHaveLength(299);', 'expect(result.cards).toHaveLength(3038);'],
  ['expect(result.meta.contentVersion).toBe(2);', 'expect(result.meta.contentVersion).toBe(3);'],
  ['expect(await loadCards()).toHaveLength(299);', 'expect(await loadCards()).toHaveLength(3038);'],
  ['expect(migrated.cards).toHaveLength(299);', 'expect(migrated.cards).toHaveLength(3038);'],
  ['expect(migrated.meta.contentVersion).toBe(2);', 'expect(migrated.meta.contentVersion).toBe(3);'],
  ['expect(afterDeletion.cards).toHaveLength(298);', 'expect(afterDeletion.cards).toHaveLength(3037);'],
]);
