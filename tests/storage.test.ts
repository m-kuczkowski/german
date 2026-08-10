import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { defaultMeta } from "../src/lib/meta";
import {
  clearDatabase,
  createBackup,
  loadCards,
  loadGrammarProgress,
  loadOrSeed,
  parseBackup,
  saveCards,
  saveGrammarProgress,
  saveMeta,
} from "../src/lib/storage";

describe("lokalny zapis i kopie", () => {
  beforeEach(async () => {
    await clearDatabase();
  });

  it("w trybie bez danych uruchamia gotowy zestaw startowy", async () => {
    const result = await loadOrSeed(starterCards);
    expect(result.cards).toHaveLength(4937);
    expect(result.meta.contentVersion).toBe(14);
    expect(await loadCards()).toHaveLength(4937);
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
    expect(migrated.cards).toHaveLength(4937);
    expect(migrated.meta.contentVersion).toBe(14);

    await saveCards(migrated.cards.slice(1));
    const afterDeletion = await loadOrSeed(starterCards);
    expect(afterDeletion.cards).toHaveLength(4936);
  });

  it("odświeża kategorię kart Nicos Weg bez kasowania ich powtórek", async () => {
    const oldCard = {
      ...starterCards[0],
      category: "Nicos Weg A2 · Stara lekcja",
      repetitions: 2,
      learned: false,
    };
    await saveCards([oldCard]);
    await saveMeta(defaultMeta);

    const migrated = await loadOrSeed(starterCards);
    const refreshed = migrated.cards.find((card) => card.id === oldCard.id);
    expect(refreshed?.category).toBe(starterCards[0].category);
    expect(refreshed?.repetitions).toBe(2);
    expect(refreshed?.stage).toBe("learning");
    expect(refreshed?.leitnerBox).toBe(1);
  });

  it("migruje wcześniejsze etapy deterministycznie bez zerowania postępu", async () => {
    const legacy = {
      ...starterCards[0],
      stage: "known" as const,
      repetitions: 6,
      intervalDays: 14,
      leitnerBox: undefined,
      reviewHistory: undefined,
    };
    await saveCards([legacy as unknown as typeof starterCards[number]]);
    await saveMeta(defaultMeta);
    const migrated = await loadOrSeed(starterCards);
    const card = migrated.cards.find((item) => item.id === legacy.id);
    expect(card?.leitnerBox).toBe(4);
    expect(card?.repetitions).toBe(6);
    expect(card?.reviewHistory).toEqual([]);
  });

  it("eksportuje i waliduje kopię zapasową", () => {
    const backup = createBackup(starterCards.slice(0, 2), defaultMeta);
    expect(parseBackup(JSON.parse(JSON.stringify(backup))).cards).toHaveLength(2);
    expect(() => parseBackup({ version: 1, cards: [{ german: "Haus" }] })).toThrow();
  });

  it("trzyma postęp gramatyki w osobnym magazynie IndexedDB", async () => {
    await saveGrammarProgress([{
      topicId: "A1-03",
      status: "review",
      masteryScore: 80,
      lessonCompletions: 1,
      reviewStep: 1,
      nextReviewAt: "2026-08-02T09:00:00.000Z",
      firstStartedAt: "2026-08-01T09:00:00.000Z",
      lastPracticedAt: "2026-08-01T09:05:00.000Z",
      masteredAt: null,
      successfulReviewDates: ["2026-08-01"],
    }]);
    expect(await loadGrammarProgress()).toMatchObject([{ topicId: "A1-03", reviewStep: 1 }]);
  });
});
