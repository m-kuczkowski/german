import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { isDue, reviewCard, sortForLearning, updateStreak } from "../src/lib/srs";

describe("algorytm powtórek", () => {
  const now = new Date("2026-07-26T10:00:00.000Z");

  it("planuje zapamiętaną kartę kolejno za 1, 3 i 7 dni", () => {
    const first = reviewCard(starterCards[0], true, now);
    const second = reviewCard(first, true, now);
    const third = reviewCard(second, true, now);

    expect(first.intervalDays).toBe(1);
    expect(second.intervalDays).toBe(3);
    expect(third.intervalDays).toBe(7);
    expect(third.learned).toBe(true);
  });

  it("trudną kartę przywraca za 10 minut i zwiększa liczbę pomyłek", () => {
    const result = reviewCard(starterCards[0], false, now);
    expect(result.lapses).toBe(1);
    expect(result.repetitions).toBe(0);
    expect(new Date(result.dueAt).getTime() - now.getTime()).toBe(10 * 60 * 1000);
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
