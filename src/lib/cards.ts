import type {
  CardContent,
  CardSource,
  ExerciseMode,
  Flashcard,
  LearningStage,
} from "../types";

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
    stage: "new",
    correctStreak: 0,
    successfulModes: [],
    firstActiveRecallAt: null,
    lastActiveRecallAt: null,
    lastReviewedAt: null,
    typedAttempts: 0,
    typedSuccesses: 0,
  };
}

const exerciseModes = new Set<ExerciseMode>([
  "choice-de-pl",
  "choice-pl-de",
  "type-de-pl",
  "type-pl-de",
]);

function legacyStage(card: Flashcard): LearningStage {
  if (card.repetitions === 0) return "new";
  return card.learned ? "known" : "learning";
}

export function withLearningDefaults(card: Flashcard): Flashcard {
  const stage =
    !card.stage || (card.stage === "new" && card.repetitions > 0)
      ? legacyStage(card)
      : card.stage;
  return {
    ...card,
    stage,
    learned: stage === "known" || stage === "mastered",
    correctStreak: Number.isFinite(card.correctStreak)
      ? Math.max(0, card.correctStreak)
      : Math.max(0, card.repetitions),
    successfulModes: Array.isArray(card.successfulModes)
      ? [...new Set(card.successfulModes.filter((mode) => exerciseModes.has(mode)))]
      : [],
    firstActiveRecallAt: card.firstActiveRecallAt ?? null,
    lastActiveRecallAt: card.lastActiveRecallAt ?? null,
    lastReviewedAt: card.lastReviewedAt ?? null,
    typedAttempts: Number.isFinite(card.typedAttempts) ? Math.max(0, card.typedAttempts) : 0,
    typedSuccesses: Number.isFinite(card.typedSuccesses) ? Math.max(0, card.typedSuccesses) : 0,
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
