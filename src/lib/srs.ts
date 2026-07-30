import { withLearningDefaults } from "./cards";
import { exerciseSkill } from "./exercises";
import type {
  ExerciseMode,
  Flashcard,
  KnowledgeSkill,
  LearningSkillProgress,
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
  "type-context-de",
]);
const CORE_SKILLS = new Set<KnowledgeSkill>(["meaning", "form", "context"]);
const PROMOTION_SKILLS = new Set<KnowledgeSkill>(["meaning", "form", "context"]);

export type { ReviewEvidence } from "../types";

export const LEITNER_INTERVALS: Record<LeitnerBox, number> = {
  1: 1,
  2: 3,
  3: 7,
  4: 14,
  5: 30,
};

const INTERVAL_LIMITS: Record<LeitnerBox, [number, number]> = {
  1: [1, 1],
  2: [2, 4],
  3: [5, 10],
  4: [10, 21],
  5: [21, 60],
};

export function isDue(card: Flashcard, now = new Date()): boolean {
  return new Date(card.dueAt).getTime() <= now.getTime();
}

export function nextReviewLabel(dueAt: string, now = new Date()): string {
  const due = new Date(dueAt);
  const difference = due.getTime() - now.getTime();
  if (difference <= 0) return "teraz";
  if (localDateKey(due) !== localDateKey(now) && difference <= 36 * 60 * MINUTE_MS) {
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
    1: "Około 1 dnia",
    2: "Co 2–4 dni",
    3: "Co 5–10 dni",
    4: "Co 10–21 dni",
    5: "Co 3–8 tygodni",
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

function updatedSkill(
  current: LearningSkillProgress | undefined,
  correct: boolean,
  now: Date,
): LearningSkillProgress {
  return {
    attempts: (current?.attempts ?? 0) + 1,
    successes: (current?.successes ?? 0) + (correct ? 1 : 0),
    correctStreak: correct ? (current?.correctStreak ?? 0) + 1 : 0,
    lapses: (current?.lapses ?? 0) + (correct ? 0 : 1),
    lastPracticedAt: now.toISOString(),
    needsWork: !correct,
  };
}

function promotedToday(card: Flashcard, now: Date): boolean {
  const today = localDateKey(now);
  return card.reviewHistory.some((event) =>
    event.correct &&
    event.mode !== "introduction" &&
    event.toBox > event.fromBox &&
    localDateKey(new Date(event.reviewedAt)) === today
  );
}

export function adaptiveIntervalDays(
  card: Pick<Flashcard, "ease" | "lapses">,
  box: LeitnerBox,
  rating: ReviewRating = "good",
): number {
  const [minimum, maximum] = INTERVAL_LIMITS[box];
  if (box === 1) return 1;
  const easeFactor = Math.min(1.3, Math.max(0.72, card.ease / 2.3));
  const lapseFactor = Math.max(0.68, 1 - Math.min(5, card.lapses) * 0.065);
  const ratingFactor = rating === "hard" ? 0.72 : 1;
  return Math.min(
    maximum,
    Math.max(minimum, Math.round(LEITNER_INTERVALS[box] * easeFactor * lapseFactor * ratingFactor)),
  );
}

function scheduledAt(now: Date, days: number): string {
  return new Date(now.getTime() + days * DAY_MS).toISOString();
}

export function reviewCard(
  input: Flashcard,
  rating: ReviewRating,
  evidence: ReviewEvidence,
  now = new Date(),
): Flashcard {
  const card = withLearningDefaults(input);
  const isFlashcard = evidence.mode === "introduction";
  const isGuided = isFlashcard && card.stage !== "new" && card.leitnerBox >= 2;
  const activeMode = ACTIVE_MODES.has(evidence.mode as ExerciseMode)
    ? evidence.mode as ExerciseMode
    : null;
  const skill = activeMode ? exerciseSkill(activeMode) : null;
  const typed = activeMode?.startsWith("type") ?? false;
  const typedAttempts = card.typedAttempts + (typed ? 1 : 0);
  const typedSuccesses = card.typedSuccesses + (typed && evidence.correct ? 1 : 0);
  const learningStats = skill
    ? { ...card.learningStats, [skill]: updatedSkill(card.learningStats[skill], evidence.correct, now) }
    : card.learningStats;
  const activeDay = activeMode && evidence.correct ? localDateKey(now) : null;
  const successfulReviewDays = activeDay
    ? [...new Set([...card.successfulReviewDays, activeDay])].sort()
    : card.successfulReviewDays;
  const successfulModes = activeMode && evidence.correct
    ? [...new Set([...card.successfulModes, activeMode])]
    : card.successfulModes;
  const repetitions = card.repetitions + 1;
  const firstActiveRecallAt =
    activeMode && !card.firstActiveRecallAt ? now.toISOString() : card.firstActiveRecallAt;

  // Samo obejrzenie fiszki nigdy nie awansuje karty. Aktywne sprawdzenie następuje
  // później w tej samej lekcji albo w krótkiej sesji uzupełniającej.
  if (isFlashcard) {
    const dueAt = new Date(now.getTime() + 10 * MINUTE_MS).toISOString();
    const reason = rating === "again"
      ? isGuided
        ? `Znaczenie wymaga odświeżenia. Karta zostaje w przegródce ${card.leitnerBox} i wróci jako fiszka.`
        : "To nowe słowo wróci jako fiszka po kilku innych kartach."
      : rating === "hard"
        ? `Jeszcze niepewnie. Karta zostaje w przegródce ${card.leitnerBox} i wróci jako dyktando.`
        : `Deklaracja „Znam” uruchamia aktywne sprawdzenie. Karta zostaje w przegródce ${card.leitnerBox}.`;
    const newLapses = card.lapses + (rating === "again" && card.stage !== "new" ? 1 : 0);
    const history = historyEntry(card, rating, evidence, card.leitnerBox, dueAt, reason, now);
    return {
      ...card,
      repetitions,
      intervalDays: 0,
      ease: rating === "again"
        ? Math.max(1.3, Number((card.ease - 0.1).toFixed(2)))
        : card.ease,
      dueAt,
      learned: card.leitnerBox >= 2 && rating !== "again",
      lapses: newLapses,
      stage: card.leitnerBox >= 2
        ? rating === "again" ? "uncertain" : stageFor(card.leitnerBox, newLapses, false)
        : rating === "again" ? "learning" : "learning",
      lastReviewedAt: now.toISOString(),
      typedAttempts,
      typedSuccesses,
      reviewHistory: [...card.reviewHistory, history].slice(-50),
      lastSchedulingReason: reason,
      successfulReviewDays,
      learningStats,
    };
  }

  const correct = evidence.correct && rating !== "again";
  if (!correct) {
    const coreFailure = skill ? CORE_SKILLS.has(skill) : true;
    const toBox = (coreFailure && card.leitnerBox > 1
      ? card.leitnerBox - 1
      : card.leitnerBox) as LeitnerBox;
    const dueAt = new Date(now.getTime() + 10 * MINUTE_MS).toISOString();
    const skillLabel: Record<KnowledgeSkill, string> = {
      meaning: "znaczenie",
      form: "pisownia",
      article: "rodzajnik",
      listening: "rozumienie ze słuchu",
      context: "użycie w kontekście",
    };
    const reason = coreFailure
      ? `Do poprawy: ${skill ? skillLabel[skill] : "aktywne przypominanie"}. Karta cofa się najwyżej o jedną przegródkę i wróci wkrótce.`
      : `Do poprawy: ${skill ? skillLabel[skill] : "ta umiejętność"}. Ogólna znajomość słowa zostaje bez zmian; wróci ten typ zadania.`;
    const history = historyEntry(card, "again", evidence, toBox, dueAt, reason, now);
    const lapses = card.lapses + 1;
    return {
      ...card,
      repetitions,
      intervalDays: 0,
      ease: Math.max(1.3, Number((card.ease - (coreFailure ? 0.16 : 0.06)).toFixed(2))),
      dueAt,
      learned: coreFailure ? false : toBox >= 2,
      lapses,
      stage: coreFailure ? "uncertain" : stageFor(toBox, lapses, true),
      correctStreak: 0,
      firstActiveRecallAt,
      lastActiveRecallAt: now.toISOString(),
      lastReviewedAt: now.toISOString(),
      typedAttempts,
      typedSuccesses,
      leitnerBox: toBox,
      reviewHistory: [...card.reviewHistory, history].slice(-50),
      lastSchedulingReason: reason,
      successfulReviewDays,
      learningStats,
    };
  }

  const correctStreak = card.correctStreak + 1;
  const canPromote = rating === "good" && Boolean(skill && PROMOTION_SKILLS.has(skill)) &&
    !promotedToday(card, now);
  const candidateBox = (canPromote
    ? Math.min(5, card.leitnerBox + 1)
    : card.leitnerBox) as LeitnerBox;
  const toBox = candidateBox === 5 &&
    !qualifiesForBoxFive(successfulModes, successfulReviewDays, correctStreak)
      ? 4
      : candidateBox;
  const firstPromotion = card.leitnerBox === 1 && toBox === 2;
  const needsCoreFollowup = skill === "listening" && card.leitnerBox === 1;
  const alreadyPromotedToday = promotedToday(card, now);
  const intervalDays = needsCoreFollowup
    ? 0
    : alreadyPromotedToday || firstPromotion ? 1 : adaptiveIntervalDays(card, toBox, rating);
  const dueAt = needsCoreFollowup
    ? new Date(now.getTime() + 10 * MINUTE_MS).toISOString()
    : scheduledAt(now, intervalDays);
  const reason = rating === "hard"
    ? `Poprawnie, ale z wysiłkiem. Karta zostaje w przegródce ${toBox} i wróci po krótszym odstępie.`
    : needsCoreFollowup
      ? "Dyktando poprawne. Karta zostaje w przegródce 1 do sprawdzenia pisowni z polskiego."
    : alreadyPromotedToday
      ? `Poprawnie. Dzisiejszy awans został już wykorzystany, więc karta zostaje w przegródce ${toBox} do kolejnej sesji.`
      : candidateBox === 5 && toBox === 4
        ? "Poprawnie, ale przegródka 5 wymaga wpisywania, serii i powtórek w 3 różne dni."
        : `Poprawne aktywne przypomnienie — awans do przegródki ${toBox}.`;
  const stage = stageFor(toBox, card.lapses, true);
  const history = historyEntry(card, rating, evidence, toBox, dueAt, reason, now);
  return {
    ...card,
    repetitions,
    intervalDays,
    ease: rating === "hard"
      ? Math.max(1.3, Number((card.ease - 0.03).toFixed(2)))
      : Math.min(3, Number((card.ease + 0.04).toFixed(2))),
    dueAt,
    learned: stage === "known" || stage === "mastered",
    stage,
    correctStreak,
    successfulModes,
    firstActiveRecallAt,
    lastActiveRecallAt: now.toISOString(),
    lastReviewedAt: now.toISOString(),
    typedAttempts,
    typedSuccesses,
    leitnerBox: toBox,
    reviewHistory: [...card.reviewHistory, history].slice(-50),
    lastSchedulingReason: reason,
    successfulReviewDays,
    learningStats,
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
