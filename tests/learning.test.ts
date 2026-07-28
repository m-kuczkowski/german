import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import {
  buildCategoryProgress,
  difficultCards,
  learningSessionPlan,
  recommendedNewCardLimit,
  sessionCardsForCategory,
} from "../src/lib/learning";

describe("nauka kategoriami", () => {
  it("liczy postęp osobno dla każdej lekcji", () => {
    const cards = [
      { ...starterCards[0], category: "Nicos Weg A2 · Start", repetitions: 1, stage: "learning" as const, learned: false },
      { ...starterCards[1], category: "Nicos Weg A2 · Start", repetitions: 3, stage: "mastered" as const, learned: true },
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
      { ...starterCards[0], category: "Nicos Weg A2 · Start", repetitions: 1, stage: "learning" as const, dueAt: "2026-07-25T10:00:00.000Z" },
      { ...starterCards[1], category: "Nicos Weg A2 · Start", repetitions: 0 },
      { ...starterCards[2], category: "Nicos Weg A2 · Dom", repetitions: 0 },
    ];
    expect(sessionCardsForCategory(cards, "Nicos Weg A2 · Start", "learn", now).map((card) => card.id)).toEqual([
      cards[0].id,
      cards[1].id,
    ]);
  });

  it("zmniejsza liczbę nowych kart, gdy rośnie kolejka powtórek", () => {
    expect([
      recommendedNewCardLimit(0),
      recommendedNewCardLimit(2),
      recommendedNewCardLimit(5),
      recommendedNewCardLimit(8),
      recommendedNewCardLimit(10),
    ]).toEqual([6, 4, 2, 1, 0]);
  });

  it("układa adaptacyjny plan bez wypychania zaległych kart", () => {
    const now = new Date("2026-07-26T10:00:00.000Z");
    const category = "Nicos Weg A2 · Start";
    const due = starterCards.slice(0, 5).map((card, index) => ({
      ...card,
      id: `due-${index}`,
      category,
      stage: "learning" as const,
      repetitions: 1,
      dueAt: "2026-07-25T10:00:00.000Z",
    }));
    const fresh = starterCards.slice(5, 12).map((card, index) => ({
      ...card,
      id: `new-${index}`,
      category,
      stage: "new" as const,
      repetitions: 0,
    }));
    const plan = learningSessionPlan([...due, ...fresh], category, now);
    expect(plan.due).toHaveLength(5);
    expect(plan.newCards).toHaveLength(2);
    expect(plan.cards.map((card) => card.id)).toEqual([
      ...plan.due.map((card) => card.id),
      ...plan.newCards.map((card) => card.id),
    ]);
  });

  it("nie dodaje słowa do trudnych wyłącznie przez błąd w wyzwaniu", () => {
    const card = {
      ...starterCards[0],
      stage: "known" as const,
      lapses: 0,
      typedAttempts: 0,
      typedSuccesses: 0,
      challengeStats: {
        writing: {
          attempts: 2,
          successes: 0,
          lastPracticedAt: "2026-07-28T10:00:00.000Z",
          needsWork: true,
        },
      },
    };
    expect(difficultCards([card])).toEqual([]);
  });
});
