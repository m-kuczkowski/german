import type { CurriculumTier, Flashcard, WordFamilyRole } from "../types";
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
  specialist: number;
}

export function curriculumTier(card: Pick<Flashcard, "curriculumTier">): CurriculumTier {
  return card.curriculumTier ?? "core";
}

export function isDefaultCurriculumCard(card: Pick<Flashcard, "curriculumTier">): boolean {
  return curriculumTier(card) === "core";
}

function newCardOrder(card: Flashcard): number {
  const tierOrder: Record<CurriculumTier, number> = { core: 0, extension: 1, specialist: 2 };
  const familyOrder: Record<WordFamilyRole, number> = { base: 0, derived: 2, compound: 3 };
  const roleOrder = card.wordFamilyRole ? familyOrder[card.wordFamilyRole] : 1;
  const officialOrder = Number.isFinite(card.curriculumOrder)
    ? Math.max(0, card.curriculumOrder!)
    : 999_999;
  return tierOrder[curriculumTier(card)] * 10_000_000 + officialOrder * 10 + roleOrder;
}

export function prerequisitesReady(
  card: Pick<Flashcard, "prerequisiteIds">,
  cardsById: ReadonlyMap<string, Flashcard>,
): boolean {
  return (card.prerequisiteIds ?? []).every((prerequisiteId) => {
    const prerequisite = cardsById.get(prerequisiteId);
    return !prerequisite || prerequisite.leitnerBox >= 2;
  });
}

export function categoryTitle(category: string): string {
  return category.replace(/^Nicos Weg (A2|B1) · /, "");
}

export const categoryLearningOrder = [
  "Codzienność i problemy (Alltag und Probleme)",
  "Życie i relacje (Leben und Beziehungen)",
  "Dom i mieszkanie (Wohnen und Haushalt)",
  "Jedzenie i zakupy (Essen und Einkaufen)",
  "Podróże i miasto (Reisen und Stadt)",
  "Zdrowie i bezpieczeństwo (Gesundheit und Sicherheit)",
  "Edukacja i język (Bildung und Sprache)",
  "Praca i kariera (Arbeit und Karriere)",
  "Finanse i usługi (Geld und Dienstleistungen)",
  "Czas wolny i sport (Freizeit und Sport)",
  "Technologia i komunikacja (Technik und Kommunikation)",
  "Emocje i opinie (Gefühle und Meinungen)",
  "Przyroda i środowisko (Natur und Umwelt)",
  "Kultura i media (Kultur und Medien)",
  "Społeczeństwo i polityka (Gesellschaft und Politik)",
  "Plany i przyszłość (Pläne und Zukunft)",
  "Historia i życie w Niemczech (Geschichte und Leben in Deutschland)",
] as const;

export function buildCategoryProgress(cards: Flashcard[], now = new Date()): CategoryProgress[] {
  const grouped = new Map<string, Flashcard[]>();
  for (const card of cards) {
    const group = grouped.get(card.category) ?? [];
    group.push(card);
    grouped.set(card.category, group);
  }

  return [...grouped.entries()].map(([id, categoryCards]) => {
    const courseCards = categoryCards.filter(isDefaultCurriculumCard);
    const introduced = courseCards.filter((card) => card.stage !== "new").length;
    const mastered = courseCards.filter((card) => card.stage === "mastered").length;
    const known = courseCards.filter((card) => card.stage === "known").length;
    const retained = known + mastered;
    return {
      id,
      title: categoryTitle(id),
      cards: courseCards,
      total: courseCards.length,
      introduced,
      learning: courseCards.filter((card) => card.stage === "learning").length,
      uncertain: courseCards.filter((card) => card.stage === "uncertain").length,
      known,
      mastered,
      retained,
      due: categoryCards.filter((card) => card.stage !== "new" && isDue(card, now)).length,
      percent: courseCards.length ? Math.round((retained / courseCards.length) * 100) : 0,
      specialist: categoryCards.length - courseCards.length,
    };
  }).sort((left, right) => {
    const leftOrder = categoryLearningOrder.indexOf(
      left.id as (typeof categoryLearningOrder)[number],
    );
    const rightOrder = categoryLearningOrder.indexOf(
      right.id as (typeof categoryLearningOrder)[number],
    );
    if (leftOrder === -1 && rightOrder === -1) return 0;
    if (leftOrder === -1) return 1;
    if (rightOrder === -1) return -1;
    return leftOrder - rightOrder;
  });
}

export function suggestedCategory(categories: CategoryProgress[]): string | null {
  return categories.find((category) => category.introduced < category.total || category.due > 0)?.id
    ?? categories.find((category) => category.mastered < category.total)?.id
    ?? null;
}

export interface LearningSessionPlan {
  due: Flashcard[];
  newCards: Flashcard[];
  cards: Flashcard[];
  globalDueCount: number;
}

export function recommendedNewCardLimit(dueCount: number): number {
  if (dueCount >= 10) return 0;
  if (dueCount >= 7) return 1;
  if (dueCount >= 4) return 2;
  if (dueCount >= 1) return 4;
  return 6;
}

export function learningSessionPlan(
  cards: Flashcard[],
  categoryId: string,
  now = new Date(),
  limit = 10,
): LearningSessionPlan {
  const inCategory = cards.filter((card) => card.category === categoryId);
  const cardsById = new Map(cards.map((card) => [card.id, card]));
  const globalDueCount = cards.filter((card) =>
    card.stage !== "new" && isDue(card, now)
  ).length;
  const due = sortForLearning(
    inCategory.filter((card) => card.stage !== "new" && isDue(card, now)),
    now,
  ).slice(0, limit);
  const newLimit = Math.min(
    recommendedNewCardLimit(globalDueCount),
    Math.max(0, limit - due.length),
  );
  const newCards = inCategory
    .filter((card) =>
      card.stage === "new" &&
      isDefaultCurriculumCard(card) &&
      prerequisitesReady(card, cardsById),
    )
    .sort((left, right) => newCardOrder(left) - newCardOrder(right))
    .slice(0, newLimit);
  return { due, newCards, cards: [...due, ...newCards], globalDueCount };
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
  return learningSessionPlan(cards, categoryId, now, limit).cards;
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
