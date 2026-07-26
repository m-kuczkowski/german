import type { Flashcard } from "../types";
import { isDue, sortForLearning } from "./srs";

export interface CategoryProgress {
  id: string;
  title: string;
  cards: Flashcard[];
  total: number;
  introduced: number;
  mastered: number;
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
    const introduced = categoryCards.filter((card) => card.repetitions > 0).length;
    const mastered = categoryCards.filter((card) => card.learned).length;
    return {
      id,
      title: categoryTitle(id),
      cards: categoryCards,
      total: categoryCards.length,
      introduced,
      mastered,
      due: categoryCards.filter((card) => isDue(card, now)).length,
      percent: categoryCards.length ? Math.round((mastered / categoryCards.length) * 100) : 0,
    };
  });
}

export function suggestedCategory(categories: CategoryProgress[]): string | null {
  return categories.find((category) => category.mastered < category.total)?.id ?? null;
}

export function sessionCardsForCategory(
  cards: Flashcard[],
  categoryId: string,
  mode: "learn" | "review",
  now = new Date(),
  limit = 10,
): Flashcard[] {
  const inCategory = cards.filter((card) => card.category === categoryId);
  const due = sortForLearning(inCategory.filter((card) => card.repetitions > 0 && isDue(card, now)), now);
  if (mode === "review") return due.slice(0, limit);

  const newCards = inCategory.filter((card) => card.repetitions === 0);
  const seen = new Set(due.map((card) => card.id));
  return [...due, ...newCards.filter((card) => !seen.has(card.id))].slice(0, limit);
}
