import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import {
  buildCategoryProgress,
  canStartLearningSession,
  categoryLearningOrder,
  difficultCards,
  learningSessionPlan,
  recommendedNewCardLimit,
  sessionCardsForCategory,
} from "../src/lib/learning";

describe("nauka kategoriami", () => {
  it("prowadzi przez kategorie od najbardziej codziennych do uzupełniających", () => {
    const cards = categoryLearningOrder.slice(0, 5).reverse().map((category, index) => ({
      ...starterCards[index],
      id: `category-${index}`,
      category,
    }));

    expect(buildCategoryProgress(cards).map((category) => category.id)).toEqual(
      categoryLearningOrder.slice(0, 5),
    );
  });

  it("zaczyna od praktycznych haseł, a nie alfabetycznego początku listy Goethe", () => {
    const category = "Dom i mieszkanie (Wohnen und Haushalt)";
    const plan = learningSessionPlan(starterCards, category);

    expect(plan.newCards.map((card) => card.german)).toEqual([
      "kommen",
      "sollen",
      "Seite",
      "Haus",
      "neu",
      "direkt",
    ]);
    expect(plan.newCards.some((card) => card.german === "Abfall")).toBe(false);
  });

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
      recommendedNewCardLimit(25),
    ]).toEqual([6, 6, 3, 3, 2, 1]);
  });

  it("nie blokuje nowych kart, gdy zaległości są w innych kategoriach", () => {
    const now = new Date("2026-07-26T10:00:00.000Z");
    const target = "Dom";
    const fresh = {
      ...starterCards[0],
      id: "fresh-target",
      category: target,
      stage: "new" as const,
      curriculumTier: "core" as const,
    };
    const backlog = starterCards.slice(1, 11).map((card, index) => ({
      ...card,
      id: `backlog-${index}`,
      category: "Inna kategoria",
      stage: "known" as const,
      dueAt: "2026-07-25T10:00:00.000Z",
    }));
    const plan = learningSessionPlan([fresh, ...backlog], target, now);
    expect(plan.globalDueCount).toBe(10);
    expect(plan.newCards.map((card) => card.id)).toEqual([fresh.id]);
    expect(plan.cards).toHaveLength(10);
    expect(plan.cards.slice(0, 3).map((card) => card.id)).toEqual([
      backlog[0]!.id,
      backlog[1]!.id,
      fresh.id,
    ]);
    expect(canStartLearningSession(plan)).toBe(true);
  });

  it("miesza powtórki z nowymi kartami w jednej krótkiej lekcji", () => {
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
    expect(plan.newCards).toHaveLength(3);
    expect(plan.cards.map((card) => card.id)).toEqual([
      due[0]!.id,
      due[1]!.id,
      plan.newCards[0]!.id,
      due[2]!.id,
      due[3]!.id,
      plan.newCards[1]!.id,
      due[4]!.id,
      plan.newCards[2]!.id,
    ]);
  });

  it("przy dużych zaległościach nadal dodaje jedno nowe słowo i ogranicza lekcję", () => {
    const now = new Date("2026-07-26T10:00:00.000Z");
    const category = "Dom";
    const fresh = { ...starterCards[0], id: "fresh", category, stage: "new" as const };
    const backlog = Array.from({ length: 30 }, (_, index) => ({
      ...starterCards[(index + 1) % starterCards.length]!,
      id: `overdue-${index}`,
      category: `Kategoria ${index}`,
      stage: "known" as const,
      repetitions: 2,
      dueAt: "2026-07-25T10:00:00.000Z",
    }));

    const plan = learningSessionPlan([fresh, ...backlog], category, now, 12);
    expect(plan.globalDueCount).toBe(30);
    expect(plan.newCards.map((card) => card.id)).toEqual([fresh.id]);
    expect(plan.due).toHaveLength(11);
    expect(plan.cards).toHaveLength(12);
    expect(plan.cards.slice(0, 3).map((card) => card.id)).toEqual([
      backlog[0]!.id,
      backlog[1]!.id,
      fresh.id,
    ]);
    expect(canStartLearningSession(plan)).toBe(true);
  });

  it("respektuje wybraną przez użytkownika krótszą liczbę kart w lekcji", () => {
    const now = new Date("2026-07-26T10:00:00.000Z");
    const category = "Dom";
    const fresh = starterCards.slice(0, 6).map((card, index) => ({
      ...card,
      id: `fresh-${index}`,
      category,
      stage: "new" as const,
      curriculumTier: "core" as const,
    }));
    const due = starterCards.slice(6, 12).map((card, index) => ({
      ...card,
      id: `due-${index}`,
      category,
      stage: "learning" as const,
      dueAt: "2026-07-25T10:00:00.000Z",
    }));

    const plan = learningSessionPlan([...fresh, ...due], category, now, 5);

    expect(plan.cards).toHaveLength(5);
    expect(plan.newCards).toHaveLength(3);
    expect(plan.due).toHaveLength(2);
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
