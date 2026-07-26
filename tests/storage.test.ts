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
  saveMeta,
} from "../src/lib/storage";

describe("lokalny zapis i kopie", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("w trybie bez danych uruchamia gotowy zestaw startowy", async () => {
    const result = await loadOrSeed(starterCards);
    expect(result.cards).toHaveLength(3038);
    expect(result.meta.contentVersion).toBe(3);
    expect(await loadCards()).toHaveLength(3038);
  });

  it("zapisuje i odczytuje zmiany w IndexedDB", async () => {
    await saveCards(starterCards.slice(0, 3));
    const stored = await loadCards();
    expect(stored.map((card) => card.id).sort()).toEqual(
      starterCards.slice(0, 3).map((card) => card.id).sort(),
    );
  });

  it("dodaje nowy zestaw tylko raz i nie przywraca później usuniętych kart", async () => {
    await saveCards(starterCards.slice(0, 3));
    await saveMeta(defaultMeta);
    const migrated = await loadOrSeed(starterCards);
    expect(migrated.cards).toHaveLength(3038);
    expect(migrated.meta.contentVersion).toBe(3);

    await saveCards(migrated.cards.slice(1));
    const afterDeletion = await loadOrSeed(starterCards);
    expect(afterDeletion.cards).toHaveLength(3037);
  });

  it("eksportuje i waliduje kopię zapasową", () => {
    const backup = createBackup(starterCards.slice(0, 2), defaultMeta);
    expect(parseBackup(JSON.parse(JSON.stringify(backup))).cards).toHaveLength(2);
    expect(() => parseBackup({ version: 1, cards: [{ german: "Haus" }] })).toThrow();
  });
});
