import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { isDue, reviewCard, sortForLearning, updateStreak } from "../src/lib/srs";

describe("algorytm powtórek", () => {
  const now = new Date("2026-07-26T10:00:00.000Z");

  it("planuje zapamiętaną kartę kolejno za 1, 3 i 7 dni", () => {
    const evidence = { mode: "choice-de-pl" as const, correct: true };
    const first = reviewCard(starterCards[0], "good", evidence, now);
    const second = reviewCard(first, "good", evidence, now);
    const third = reviewCard(second, "good", evidence, now);

    expect(first.intervalDays).toBe(1);
    expect(second.intervalDays).toBe(3);
    expect(third.intervalDays).toBe(7);
    expect(third.stage).toBe("known");
  });

  it("trudną kartę przywraca za 10 minut i zwiększa liczbę pomyłek", () => {
    const result = reviewCard(
      starterCards[0],
      "again",
      { mode: "introduction", correct: false },
      now,
    );
    expect(result.lapses).toBe(1);
    expect(result.stage).toBe("learning");
    expect(new Date(result.dueAt).getTime() - now.getTime()).toBe(10 * 60 * 1000);
  });

  it("po błędzie aktywnym obniża znane słowo do niepewnych", () => {
    const known = {
      ...starterCards[0],
      stage: "known" as const,
      learned: true,
      repetitions: 4,
      intervalDays: 14,
      correctStreak: 4,
    };
    const result = reviewCard(
      known,
      "again",
      { mode: "type-pl-de", correct: false, score: 0.72 },
      now,
    );
    expect(result.stage).toBe("uncertain");
    expect(result.learned).toBe(false);
    expect(result.correctStreak).toBe(0);
  });

  it("opanowanie wymaga różnych aktywnych ćwiczeń i odstępu czasu", () => {
    const card = {
      ...starterCards[0],
      stage: "known" as const,
      learned: true,
      repetitions: 4,
      intervalDays: 14,
      correctStreak: 4,
      successfulModes: ["choice-de-pl", "type-de-pl"] as const,
      firstActiveRecallAt: "2026-07-10T10:00:00.000Z",
    };
    const result = reviewCard(
      { ...card, successfulModes: [...card.successfulModes] },
      "good",
      { mode: "type-pl-de", correct: true },
      now,
    );
    expect(result.stage).toBe("mastered");
    expect(result.successfulModes).toHaveLength(3);
  });

  it("ustawia trudne i zaległe karty na początku", () => {
    const future = { ...starterCards[0], dueAt: "2027-01-01T00:00:00.000Z" };
    const hard = { ...starterCards[1], dueAt: "2026-01-01T00:00:00.000Z", lapses: 3 };
    const easy = { ...starterCards[2], dueAt: "2026-01-01T00:00:00.000Z", lapses: 0 };
    const sorted = sortForLearning([future, easy, hard], now);
    expect(sorted.map((card) => card.id)).toEqual([hard.id, easy.id, future.id]);
    expect(isDue(future, now)).toBe(false);
  });

  it("podtrzymuje serię tylko dla kolejnych dni", () => {
    expect(updateStreak(4, "2026-07-25", now).streak).toBe(5);
    expect(updateStreak(4, "2026-07-20", now).streak).toBe(1);
  });
});
