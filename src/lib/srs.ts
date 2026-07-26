import { withLearningDefaults } from "./cards";
import type {
  ExerciseMode,
  Flashcard,
  LearningStage,
  ReviewRating,
} from "../types";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const ACTIVE_MODES = new Set<ExerciseMode>([
  "choice-de-pl",
  "choice-pl-de",
  "type-de-pl",
  "type-pl-de",
]);

export interface ReviewEvidence {
  mode: "introduction" | ExerciseMode;
  correct: boolean;
  score?: number;
}

export function isDue(card: Flashcard, now = new Date()): boolean {
  return new Date(card.dueAt).getTime() <= now.getTime();
}

function nextGoodInterval(repetitions: number, intervalDays: number, ease: number): number {
  if (repetitions <= 1) return 1;
  if (repetitions === 2) return 3;
  if (repetitions === 3) return 7;
  return Math.max(10, Math.round(Math.max(7, intervalDays) * ease));
}

function masteryStage(
  card: Flashcard,
  successfulModes: ExerciseMode[],
  correctStreak: number,
  firstActiveRecallAt: string | null,
  now: Date,
): LearningStage {
  const activeSpan = firstActiveRecallAt
    ? now.getTime() - new Date(firstActiveRecallAt).getTime()
    : 0;
  if (
    successfulModes.length >= 3 &&
    correctStreak >= 5 &&
    card.intervalDays >= 7 &&
    activeSpan >= 7 * DAY_MS
  ) {
    return "mastered";
  }
  if (successfulModes.length >= 1 && correctStreak >= 2) return "known";
  return card.repetitions > 0 ? "learning" : "new";
}

export function reviewCard(
  input: Flashcard,
  rating: ReviewRating,
  evidence: ReviewEvidence,
  now = new Date(),
): Flashcard {
  const card = withLearningDefaults(input);
  const activeMode = ACTIVE_MODES.has(evidence.mode as ExerciseMode)
    ? evidence.mode as ExerciseMode
    : null;
  const typed = activeMode?.startsWith("type") ?? false;
  const typedAttempts = card.typedAttempts + (typed ? 1 : 0);
  const typedSuccesses = card.typedSuccesses + (typed && evidence.correct ? 1 : 0);

  if (rating === "again" || !evidence.correct) {
    const stage: LearningStage = card.repetitions === 0 && evidence.mode === "introduction"
      ? "learning"
      : "uncertain";
    return {
      ...card,
      repetitions: Math.max(1, card.repetitions),
      intervalDays: 0,
      ease: Math.max(1.3, Number((card.ease - 0.18).toFixed(2))),
      dueAt: new Date(now.getTime() + 10 * MINUTE_MS).toISOString(),
      learned: false,
      lapses: card.lapses + 1,
      stage,
      correctStreak: 0,
      lastReviewedAt: now.toISOString(),
      typedAttempts,
      typedSuccesses,
    };
  }

  const repetitions = card.repetitions + 1;
  const correctStreak = card.correctStreak + 1;
  const firstActiveRecallAt =
    activeMode && !card.firstActiveRecallAt ? now.toISOString() : card.firstActiveRecallAt;
  const successfulModes = activeMode
    ? [...new Set([...card.successfulModes, activeMode])]
    : card.successfulModes;

  if (rating === "hard") {
    const intervalDays = card.intervalDays <= 0
      ? 1
      : Math.max(1, Math.round(card.intervalDays * 1.2));
    return {
      ...card,
      repetitions,
      intervalDays,
      ease: Math.max(1.3, Number((card.ease - 0.05).toFixed(2))),
      dueAt: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
      learned: false,
      stage: "uncertain",
      correctStreak,
      successfulModes,
      firstActiveRecallAt,
      lastActiveRecallAt: activeMode ? now.toISOString() : card.lastActiveRecallAt,
      lastReviewedAt: now.toISOString(),
      typedAttempts,
      typedSuccesses,
    };
  }

  const intervalDays = nextGoodInterval(repetitions, card.intervalDays, card.ease);
  const stage = evidence.mode === "introduction"
    ? "known"
    : masteryStage(card, successfulModes, correctStreak, firstActiveRecallAt, now);
  return {
    ...card,
    repetitions,
    intervalDays,
    ease: Math.min(3, Number((card.ease + 0.04).toFixed(2))),
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
    learned: stage === "known" || stage === "mastered",
    stage,
    correctStreak,
    successfulModes,
    firstActiveRecallAt,
    lastActiveRecallAt: activeMode ? now.toISOString() : card.lastActiveRecallAt,
    lastReviewedAt: now.toISOString(),
    typedAttempts,
    typedSuccesses,
  };
}

export function sortForLearning(cards: Flashcard[], now = new Date()): Flashcard[] {
  return [...cards].sort((a, b) => {
    const aDue = isDue(a, now) ? 0 : 1;
    const bDue = isDue(b, now) ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
    if (a.stage === "uncertain" && b.stage !== "uncertain") return -1;
    if (b.stage === "uncertain" && a.stage !== "uncertain") return 1;
    if (a.lapses !== b.lapses) return b.lapses - a.lapses;
    if (a.repetitions !== b.repetitions) return a.repetitions - b.repetitions;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function updateStreak(
  streak: number,
  lastStudyDate: string | null,
  now = new Date(),
): { streak: number; lastStudyDate: string } {
  const today = localDateKey(now);
  if (lastStudyDate === today) return { streak, lastStudyDate: today };

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  return {
    streak: lastStudyDate === localDateKey(yesterday) ? streak + 1 : 1,
    lastStudyDate: today,
  };
}
