import { withLearningDefaults } from "./cards";
import type {
  ExerciseMode,
  Flashcard,
  LeitnerBox,
  LearningStage,
  ReviewEvidence,
  ReviewHistoryEntry,
  ReviewRating,
} from "../types";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;
const ACTIVE_MODES = new Set<ExerciseMode>([
  "choice-de-pl",
  "choice-pl-de",
  "choice-article",
  "type-de-pl",
  "type-pl-de",
  "type-listen-de",
]);

export type { ReviewEvidence } from "../types";

export const LEITNER_INTERVALS: Record<LeitnerBox, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

export function isDue(card: Flashcard, now = new Date()): boolean {
  return new Date(card.dueAt).getTime() <= now.getTime();
}

export function nextReviewLabel(dueAt: string, now = new Date()): string {
  const due = new Date(dueAt);
  const difference = due.getTime() - now.getTime();
  if (difference <= 0) return "teraz";
  if (
    localDateKey(due) !== localDateKey(now) &&
    difference <= 36 * 60 * MINUTE_MS
  ) {
    return "jutro";
  }
  if (difference < DAY_MS) {
    const minutes = Math.max(1, Math.ceil(difference / MINUTE_MS));
    if (minutes < 60) return `za ${minutes} min`;
    return `za ${Math.ceil(minutes / 60)} godz.`;
  }
  const days = Math.ceil(difference / DAY_MS);
  if (days === 1) return "jutro";
  if (days <= 30) return `za ${days} dni`;
  return due.toLocaleDateString("pl-PL", { day: "numeric", month: "short" });
}

export function boxDescription(box: LeitnerBox): string {
  return {
    1: "Codziennie",
    2: "Co 3 dni",
    3: "Co tydzień",
    4: "Co 2 tygodnie",
    5: "Co miesiąc",
  }[box];
}

function stageFor(box: LeitnerBox, lapses: number, active: boolean): LearningStage {
  if (box === 5) return "mastered";
  if (box >= 2) return "known";
  return lapses > 0 && active ? "uncertain" : "learning";
}

function qualifiesForBoxFive(
  successfulModes: ExerciseMode[],
  successfulDays: string[],
  correctStreak: number,
): boolean {
  return successfulDays.length >= 3 &&
    correctStreak >= 4 &&
    successfulModes.some((mode) => mode.startsWith("type"));
}

function historyEntry(
  card: Flashcard,
  rating: ReviewRating,
  evidence: ReviewEvidence,
  toBox: LeitnerBox,
  dueAt: string,
  reason: string,
  now: Date,
): ReviewHistoryEntry {
  return {
    id: `${now.getTime()}-${card.id}-${card.reviewHistory.length}`,
    reviewedAt: now.toISOString(),
    mode: evidence.mode,
    rating,
    correct: evidence.correct,
    score: evidence.score ?? null,
    fromBox: card.leitnerBox,
    toBox,
    scheduledFor: dueAt,
    reason,
  };
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
  const activeDay = activeMode && evidence.correct ? localDateKey(now) : null;
  const successfulReviewDays = activeDay
    ? [...new Set([...card.successfulReviewDays, activeDay])].sort()
    : card.successfulReviewDays;
  const successfulModes = activeMode && evidence.correct
    ? [...new Set([...card.successfulModes, activeMode])]
    : card.successfulModes;

  if (rating === "again" || !evidence.correct) {
    const dueAt = new Date(now.getTime() + 10 * MINUTE_MS).toISOString();
    const reason = evidence.mode === "introduction"
      ? "Jeszcze nieznane — przegródka 1 i szybki powrót w tej lekcji."
      : "Błąd aktywnego przypominania — przegródka 1 i szybka dogrywka.";
    const history = historyEntry(card, rating, evidence, 1, dueAt, reason, now);
    return {
      ...card,
      repetitions: Math.max(1, card.repetitions),
      intervalDays: 0,
      ease: Math.max(1.3, Number((card.ease - 0.18).toFixed(2))),
      dueAt,
      learned: false,
      lapses: card.lapses + 1,
      stage: evidence.mode === "introduction" ? "learning" : "uncertain",
      correctStreak: 0,
      lastReviewedAt: now.toISOString(),
      typedAttempts,
      typedSuccesses,
      leitnerBox: 1,
      reviewHistory: [...card.reviewHistory, history].slice(-50),
      lastSchedulingReason: reason,
      successfulReviewDays,
    };
  }

  const repetitions = card.repetitions + 1;
  const correctStreak = card.correctStreak + 1;
  const firstActiveRecallAt =
    activeMode && !card.firstActiveRecallAt ? now.toISOString() : card.firstActiveRecallAt;

  if (rating === "hard") {
    const toBox = (evidence.mode === "introduction"
      ? 1
      : card.leitnerBox >= 3
        ? card.leitnerBox - 1
        : card.leitnerBox) as LeitnerBox;
    const intervalDays = Math.max(1, Math.ceil(LEITNER_INTERVALS[toBox] / 2));
    const dueAt = new Date(now.getTime() + intervalDays * DAY_MS).toISOString();
    const reason = evidence.mode === "introduction"
      ? "Jeszcze niepewnie. Karta zostaje w przegródce 1 i wróci wcześniej."
      : toBox < card.leitnerBox
        ? `Poprawnie, ale z trudem. Karta wraca do przegródki ${toBox} i pojawi się wcześniej.`
        : `Poprawnie, ale z trudem. Karta zostaje w przegródce ${toBox} i pojawi się wcześniej.`;
    const history = historyEntry(card, rating, evidence, toBox, dueAt, reason, now);
    return {
      ...card,
      repetitions,
      intervalDays,
      ease: Math.max(1.3, Number((card.ease - 0.05).toFixed(2))),
      dueAt,
      learned: false,
      stage: stageFor(toBox, card.lapses, Boolean(activeMode)),
      correctStreak,
      successfulModes,
      firstActiveRecallAt,
      lastActiveRecallAt: activeMode ? now.toISOString() : card.lastActiveRecallAt,
      lastReviewedAt: now.toISOString(),
      typedAttempts,
      typedSuccesses,
      leitnerBox: toBox,
      reviewHistory: [...card.reviewHistory, history].slice(-50),
      lastSchedulingReason: reason,
      successfulReviewDays,
    };
  }

  const candidateBox = evidence.mode === "introduction"
    ? 1
    : Math.min(5, card.leitnerBox + 1) as LeitnerBox;
  const toBox = candidateBox === 5 &&
    !qualifiesForBoxFive(successfulModes, successfulReviewDays, correctStreak)
      ? 4
      : candidateBox;
  const intervalDays = LEITNER_INTERVALS[toBox];
  const dueAt = new Date(now.getTime() + intervalDays * DAY_MS).toISOString();
  const reason = evidence.mode === "introduction"
    ? "Deklaracja „Znam” uruchamia aktywne sprawdzenie; karta zostaje w przegródce 1."
    : candidateBox === 5 && toBox === 4
      ? "Poprawnie, ale przegródka 5 wymaga wpisywania, serii i powtórek w 3 różne dni."
      : `Poprawne aktywne przypomnienie — awans do przegródki ${toBox}.`;
  const stage = stageFor(toBox, card.lapses, Boolean(activeMode));
  const history = historyEntry(card, rating, evidence, toBox, dueAt, reason, now);
  return {
    ...card,
    repetitions,
    intervalDays,
    ease: Math.min(3, Number((card.ease + 0.04).toFixed(2))),
    dueAt,
    learned: stage === "known" || stage === "mastered",
    stage,
    correctStreak,
    successfulModes,
    firstActiveRecallAt,
    lastActiveRecallAt: activeMode ? now.toISOString() : card.lastActiveRecallAt,
    lastReviewedAt: now.toISOString(),
    typedAttempts,
    typedSuccesses,
    leitnerBox: toBox,
    reviewHistory: [...card.reviewHistory, history].slice(-50),
    lastSchedulingReason: reason,
    successfulReviewDays,
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
