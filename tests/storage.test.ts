import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { defaultMeta } from "../src/lib/meta";
import {
  clearDatabase,
  createBackup,
  loadCards,
  loadOrSeed,
  parseBackup,
  saveCards,
} from "../src/lib/storage";

describe("lokalny zapis i kopie", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("w trybie bez danych uruchamia gotowy zestaw startowy", async () => {
    const result = await loadOrSeed(starterCards);
    expect(result.cards).toHaveLength(110);
    expect(await loadCards()).toHaveLength(110);
  });

  it("zapisuje i odczytuje zmiany w IndexedDB", async () => {
    await saveCards(starterCards.slice(0, 3));
    const stored = await loadCards();
    expect(stored.map((card) => card.id)).toEqual(starterCards.slice(0, 3).map((card) => card.id));
  });

  it("eksportuje i waliduje kopię zapasową", () => {
    const backup = createBackup(starterCards.slice(0, 2), defaultMeta);
    expect(parseBackup(JSON.parse(JSON.stringify(backup))).cards).toHaveLength(2);
    expect(() => parseBackup({ version: 1, cards: [{ german: "Haus" }] })).toThrow();
  });
});
