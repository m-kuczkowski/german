import type {
  CardContent,
  CardSource,
  ChallengeSkill,
  ChallengeStats,
  ExerciseMode,
  Flashcard,
  LeitnerBox,
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
    leitnerBox: 1,
    reviewHistory: [],
    lastSchedulingReason: "Nowa karta — zaczyna w przegródce 1.",
    successfulReviewDays: [],
    challengeStats: {},
  };
}

const exerciseModes = new Set<ExerciseMode>([
  "choice-de-pl",
  "choice-pl-de",
  "choice-article",
  "type-de-pl",
  "type-pl-de",
  "type-listen-de",
]);

function legacyStage(card: Flashcard): LearningStage {
  if (card.repetitions === 0) return "new";
  return card.learned ? "known" : "learning";
}

function legacyLeitnerBox(card: Flashcard, stage: LearningStage): LeitnerBox {
  if (stage === "mastered") return 5;
  if (stage === "new" || stage === "learning" || stage === "uncertain") return 1;
  if (card.intervalDays >= 14) return 4;
  if (card.intervalDays >= 7) return 3;
  return 2;
}

function reviewDays(card: Flashcard): string[] {
  const existing = Array.isArray(card.successfulReviewDays)
    ? card.successfulReviewDays.filter((value) => /^\d{4}-\d{2}-\d{2}$/.test(value))
    : [];
  const legacy = [card.firstActiveRecallAt, card.lastActiveRecallAt]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.slice(0, 10));
  return [...new Set([...existing, ...legacy])].sort();
}

const challengeSkills: ChallengeSkill[] = ["article", "listening", "writing", "meaning"];

function challengeProgress(card: Flashcard): ChallengeStats {
  if (!card.challengeStats || typeof card.challengeStats !== "object") return {};
  const result: ChallengeStats = {};
  for (const skill of challengeSkills) {
    const progress = card.challengeStats[skill];
    if (
      !progress ||
      typeof progress.lastPracticedAt !== "string" ||
      !Number.isFinite(progress.attempts) ||
      !Number.isFinite(progress.successes)
    ) {
      continue;
    }
    result[skill] = {
      attempts: Math.max(0, progress.attempts),
      successes: Math.max(0, progress.successes),
      lastPracticedAt: progress.lastPracticedAt,
      needsWork: Boolean(progress.needsWork),
    };
  }
  return result;
}

export function withLearningDefaults(card: Flashcard): Flashcard {
  const stage =
    !card.stage || (card.stage === "new" && card.repetitions > 0)
      ? legacyStage(card)
      : card.stage;
  const leitnerBox = [1, 2, 3, 4, 5].includes(card.leitnerBox)
    ? card.leitnerBox
    : legacyLeitnerBox(card, stage);
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
    leitnerBox,
    reviewHistory: Array.isArray(card.reviewHistory) ? card.reviewHistory.slice(-50) : [],
    lastSchedulingReason: card.lastSchedulingReason ||
      `Przeniesiono z wcześniejszego etapu „${stage}” do przegródki ${leitnerBox}.`,
    successfulReviewDays: reviewDays(card),
    challengeStats: challengeProgress(card),
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
