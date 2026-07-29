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
      { ...starterCards[0], category: "Nicos Weg A2 · Start", curriculumTier: "core" as const, repetitions: 1, stage: "learning" as const, learned: false },
      { ...starterCards[1], category: "Nicos Weg A2 · Start", curriculumTier: "core" as const, repetitions: 3, stage: "mastered" as const, learned: true },
      { ...starterCards[2], category: "Nicos Weg A2 · Dom", curriculumTier: "core" as const, repetitions: 0 },
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
      { ...starterCards[0], category: "Nicos Weg A2 · Start", curriculumTier: "core" as const, repetitions: 1, stage: "learning" as const, dueAt: "2026-07-25T10:00:00.000Z" },
      { ...starterCards[1], category: "Nicos Weg A2 · Start", curriculumTier: "core" as const, repetitions: 0 },
      { ...starterCards[2], category: "Nicos Weg A2 · Dom", curriculumTier: "core" as const, repetitions: 0 },
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
      curriculumTier: "core" as const,
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

  it("wprowadza tylko oficjalny rdzeń, a rozszerzenia pozostawia w bibliotece", () => {
    const category = "Nicos Weg A2 · Zdrowie";
    const [template] = starterCards;
    const cards = [
      { ...template, id: "extension", category, stage: "new" as const, curriculumTier: "extension" as const },
      { ...template, id: "specialist", category, stage: "new" as const, curriculumTier: "specialist" as const },
      { ...template, id: "core", category, stage: "new" as const, curriculumTier: "core" as const },
    ];
    const plan = learningSessionPlan(cards, category, new Date("2026-07-26T10:00:00.000Z"));
    expect(plan.newCards.map((card) => card.id)).toEqual(["core"]);
    expect(buildCategoryProgress(cards)[0]).toMatchObject({ total: 1, specialist: 2 });
  });

  it("odblokowuje rozwinięcie dopiero po aktywnym przypomnieniu słowa bazowego", () => {
    const category = "Zdrowie i bezpieczeństwo";
    const [template] = starterCards;
    const base = {
      ...template,
      id: "pflege-base",
      category,
      stage: "new" as const,
      leitnerBox: 1 as const,
      wordFamilyId: "pflege",
      wordFamilyRole: "base" as const,
      prerequisiteIds: [],
    };
    const compound = {
      ...template,
      id: "pflegeheim",
      category,
      stage: "new" as const,
      leitnerBox: 1 as const,
      wordFamilyId: "pflege",
      wordFamilyRole: "compound" as const,
      prerequisiteIds: [base.id],
    };

    expect(learningSessionPlan([compound, base], category).newCards.map((card) => card.id))
      .toEqual([base.id]);

    const recalledBase = {
      ...base,
      stage: "learning" as const,
      leitnerBox: 2 as const,
      dueAt: "2026-08-10T10:00:00.000Z",
    };
    expect(
      learningSessionPlan(
        [compound, recalledBase],
        category,
        new Date("2026-07-29T10:00:00.000Z"),
      ).newCards.map((card) => card.id),
    ).toEqual([compound.id]);
  });

  it("nie ukrywa rozpoczętej wcześniej karty, nawet jeśli jej podstawa jest jeszcze nowa", () => {
    const category = "Zdrowie i bezpieczeństwo";
    const [template] = starterCards;
    const base = {
      ...template,
      id: "pflege-base",
      category,
      stage: "new" as const,
      leitnerBox: 1 as const,
    };
    const introducedCompound = {
      ...template,
      id: "pflegeheim",
      category,
      stage: "learning" as const,
      leitnerBox: 1 as const,
      dueAt: "2026-07-28T10:00:00.000Z",
      prerequisiteIds: [base.id],
    };
    const plan = learningSessionPlan(
      [base, introducedCompound],
      category,
      new Date("2026-07-29T10:00:00.000Z"),
    );
    expect(plan.due.map((card) => card.id)).toContain(introducedCompound.id);
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
