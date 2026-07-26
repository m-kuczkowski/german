import type { CardContent, CardSource, Flashcard } from "../types";

export function normalizeGerman(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/^(der|die|das)\s+/, "")
    .replace(/[.,!?;:]/g, "")
    .replace(/\s+/g, " ");
}

export function isDuplicate(
  candidate: Pick<CardContent, "german">,
  cards: Array<Pick<CardContent, "german">>,
): boolean {
  const normalized = normalizeGerman(candidate.german);
  return cards.some((card) => normalizeGerman(card.german) === normalized);
}

export function toFlashcard(
  content: CardContent,
  source: CardSource,
  now = new Date(),
): Flashcard {
  return {
    ...content,
    id: content.id || crypto.randomUUID(),
    source,
    createdAt: now.toISOString(),
    repetitions: 0,
    intervalDays: 0,
    ease: 2.3,
    dueAt: now.toISOString(),
    learned: false,
    lapses: 0,
  };
}

export function validateCardContent(value: unknown): value is CardContent {
  if (!value || typeof value !== "object") return false;
  const card = value as Record<string, unknown>;
  const required = [
    "id",
    "german",
    "polish",
    "exampleGerman",
    "examplePolish",
    "category",
  ];
  if (!required.every((key) => typeof card[key] === "string" && card[key] !== "")) {
    return false;
  }
  if (![null, "der", "die", "das"].includes(card.article as null | string)) return false;
  if (card.plural !== null && typeof card.plural !== "string") return false;
  return true;
}

export function mergeUnique(
  existing: Flashcard[],
  incoming: Flashcard[],
): { cards: Flashcard[]; skipped: number } {
  const cards = [...existing];
  let skipped = 0;
  for (const card of incoming) {
    if (isDuplicate(card, cards)) {
      skipped += 1;
    } else {
      cards.push(card);
    }
  }
  return { cards, skipped };
}
