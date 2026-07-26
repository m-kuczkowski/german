import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { buildCategoryProgress, sessionCardsForCategory } from "../src/lib/learning";

describe("nauka kategoriami", () => {
  it("liczy postęp osobno dla każdej lekcji", () => {
    const cards = [
      { ...starterCards[0], category: "Nicos Weg A2 · Start", repetitions: 1, learned: false },
      { ...starterCards[1], category: "Nicos Weg A2 · Start", repetitions: 3, learned: true },
      { ...starterCards[2], category: "Nicos Weg A2 · Dom", repetitions: 0 },
    ];
    const categories = buildCategoryProgress(cards, new Date("2026-07-26T10:00:00.000Z"));
    expect(categories.map((category) => [category.title, category.introduced, category.mastered])).toEqual([
      ["Start", 2, 1],
      ["Dom", 0, 0],
    ]);
  });

  it("łączy powtórki z nowymi kartami tylko z wybranej kategorii", () => {
    const now = new Date("2026-07-26T10:00:00.000Z");
    const cards = [
      { ...starterCards[0], category: "Nicos Weg A2 · Start", repetitions: 1, dueAt: "2026-07-25T10:00:00.000Z" },
      { ...starterCards[1], category: "Nicos Weg A2 · Start", repetitions: 0 },
      { ...starterCards[2], category: "Nicos Weg A2 · Dom", repetitions: 0 },
    ];
    expect(sessionCardsForCategory(cards, "Nicos Weg A2 · Start", "learn", now).map((card) => card.id)).toEqual([
      cards[0].id,
      cards[1].id,
    ]);
  });
});
