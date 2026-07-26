import type { Flashcard } from "../types";
import { isDue, sortForLearning } from "./srs";

export interface CategoryProgress {
  id: string;
  title: string;
  cards: Flashcard[];
  total: number;
  introduced: number;
  learning: number;
  uncertain: number;
  known: number;
  mastered: number;
  retained: number;
  due: number;
  percent: number;
}

export function categoryTitle(category: string): string {
  return category.replace(/^Nicos Weg (A2|B1) · /, "");
}

export function buildCategoryProgress(cards: Flashcard[], now = new Date()): CategoryProgress[] {
  const grouped = new Map<string, Flashcard[]>();
  for (const card of cards) {
    const group = grouped.get(card.category) ?? [];
    group.push(card);
    grouped.set(card.category, group);
  }

  return [...grouped.entries()].map(([id, categoryCards]) => {
    const introduced = categoryCards.filter((card) => card.stage !== "new").length;
    const mastered = categoryCards.filter((card) => card.stage === "mastered").length;
    const known = categoryCards.filter((card) => card.stage === "known").length;
    const retained = known + mastered;
    return {
      id,
      title: categoryTitle(id),
      cards: categoryCards,
      total: categoryCards.length,
      introduced,
      learning: categoryCards.filter((card) => card.stage === "learning").length,
      uncertain: categoryCards.filter((card) => card.stage === "uncertain").length,
      known,
      mastered,
      retained,
      due: categoryCards.filter((card) => card.stage !== "new" && isDue(card, now)).length,
      percent: categoryCards.length ? Math.round((retained / categoryCards.length) * 100) : 0,
    };
  });
}

export function suggestedCategory(categories: CategoryProgress[]): string | null {
  return categories.find((category) => category.introduced < category.total || category.due > 0)?.id
    ?? categories.find((category) => category.mastered < category.total)?.id
    ?? null;
}

export function sessionCardsForCategory(
  cards: Flashcard[],
  categoryId: string,
  mode: "learn" | "review",
  now = new Date(),
  limit = 10,
): Flashcard[] {
  const inCategory = cards.filter((card) => card.category === categoryId);
  const due = sortForLearning(
    inCategory.filter((card) => card.stage !== "new" && isDue(card, now)),
    now,
  );
  if (mode === "review") return due.slice(0, limit);

  const newCards = inCategory.filter((card) => card.stage === "new");
  const seen = new Set(due.map((card) => card.id));
  return [...due, ...newCards.filter((card) => !seen.has(card.id))].slice(0, limit);
}

export function difficultCards(cards: Flashcard[], now = new Date(), limit = 10): Flashcard[] {
  return sortForLearning(
    cards.filter((card) =>
      card.stage === "uncertain" ||
      card.lapses >= 2 ||
      (card.typedAttempts >= 2 && card.typedSuccesses / card.typedAttempts < 0.7),
    ),
    now,
  ).slice(0, limit);
}
