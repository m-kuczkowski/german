import { createExercise, evaluateTypedAnswer, type Exercise } from "./exercises";
import type {
  ChallengeAnswer,
  ChallengeExerciseMode,
  ChallengeItem,
  ChallengeSession,
  ChallengeSkill,
  ChallengeStats,
  ChallengeType,
  Flashcard,
} from "../types";

const DAY_MS = 86_400_000;

export const challengeModes: ChallengeExerciseMode[] = [
  "choice-article",
  "type-listen-de",
  "type-pl-de",
  "choice-de-pl",
];

const typeMode: Record<Exclude<ChallengeType, "mixed">, ChallengeExerciseMode> = {
  article: "choice-article",
  listening: "type-listen-de",
  writing: "type-pl-de",
  meaning: "choice-de-pl",
};

export const challengeTypeLabels: Record<ChallengeType, string> = {
  article: "Rodzajniki",
  listening: "Ze słuchu",
  writing: "Napisz po niemiecku",
  meaning: "Wybierz znaczenie",
  mixed: "Mieszane",
};

export const challengeTypeDescriptions: Record<ChallengeType, string> = {
  article: "Dobierz der, die albo das do poznanych rzeczowników.",
  listening: "Posłuchaj słowa i zapisz je po niemiecku.",
  writing: "Przetłumacz poznane słowo z polskiego na niemiecki.",
  meaning: "Wskaż polskie znaczenie spośród trzech odpowiedzi.",
  mixed: "Spokojna równowaga dostępnych rodzajów ćwiczeń.",
};

export function challengeSkillForMode(mode: ChallengeExerciseMode): ChallengeSkill {
  return {
    "choice-article": "article",
    "type-listen-de": "listening",
    "type-pl-de": "writing",
    "choice-de-pl": "meaning",
  }[mode] as ChallengeSkill;
}

export function knownChallengeCards(cards: Flashcard[]): Flashcard[] {
  return cards.filter((card) => card.stage === "known" || card.stage === "mastered");
}

function distinctPolishCount(cards: Flashcard[]): number {
  return new Set(
    cards.map((card) => card.polish.trim().toLocaleLowerCase("pl-PL")).filter(Boolean),
  ).size;
}

function cardsForMode(
  cards: Flashcard[],
  mode: ChallengeExerciseMode,
): Flashcard[] {
  const known = knownChallengeCards(cards);
  if (mode === "choice-article") return known.filter((card) => Boolean(card.article));
  if (mode === "choice-de-pl" && distinctPolishCount(known) < 3) return [];
  return known;
}

export function qualifyingChallengeCards(
  cards: Flashcard[],
  type: ChallengeType,
): Flashcard[] {
  if (type !== "mixed") return cardsForMode(cards, typeMode[type]);
  const availableModes = challengeModes.filter((mode) => cardsForMode(cards, mode).length > 0);
  if (availableModes.length === 0) return [];
  const ids = new Set(
    availableModes.flatMap((mode) => cardsForMode(cards, mode).map((card) => card.id)),
  );
  return knownChallengeCards(cards).filter((card) => ids.has(card.id));
}

export function availableChallengeTypes(cards: Flashcard[]): Array<{
  type: ChallengeType;
  count: number;
}> {
  return (["article", "listening", "writing", "meaning", "mixed"] as ChallengeType[])
    .map((type) => ({ type, count: qualifyingChallengeCards(cards, type).length }))
    .filter((entry) => entry.count > 0);
}

export function clampChallengeCount(requested: number, available: number): number {
  if (!Number.isFinite(requested) || available <= 0) return 0;
  return Math.min(available, Math.max(1, Math.floor(requested)));
}

function priority(
  card: Flashcard,
  mode: ChallengeExerciseMode,
  now: Date,
  random: () => number,
): number {
  const progress = card.challengeStats[challengeSkillForMode(mode)];
  if (!progress) return 1_000 + random() * 25;
  const practicedAt = new Date(progress.lastPracticedAt).getTime();
  const ageDays = Number.isFinite(practicedAt)
    ? Math.max(0, Math.min(365, (now.getTime() - practicedAt) / DAY_MS))
    : 365;
  const accuracy = progress.attempts > 0 ? progress.successes / progress.attempts : 0;
  return ageDays + (1 - accuracy) * 12 + (progress.needsWork ? 20 : 0) + random() * 8;
}

function rankedCards(
  cards: Flashcard[],
  mode: ChallengeExerciseMode,
  now: Date,
  random: () => number,
): Flashcard[] {
  return cards
    .map((card) => ({ card, score: priority(card, mode, now, random) }))
    .sort((left, right) => right.score - left.score)
    .map(({ card }) => card);
}

function mixedQueue(
  cards: Flashcard[],
  limit: number,
  now: Date,
  random: () => number,
): ChallengeItem[] {
  const availableModes = challengeModes.filter((mode) => cardsForMode(cards, mode).length > 0);
  const offset = availableModes.length > 1
    ? Math.floor(random() * availableModes.length)
    : 0;
  const orderedModes = [
    ...availableModes.slice(offset),
    ...availableModes.slice(0, offset),
  ];
  const candidates = new Map(
    orderedModes.map((mode) => [
      mode,
      rankedCards(cardsForMode(cards, mode), mode, now, random),
    ]),
  );
  const used = new Set<string>();
  const queue: ChallengeItem[] = [];
  let cursor = 0;

  while (queue.length < limit) {
    let selected: ChallengeItem | null = null;
    for (let step = 0; step < orderedModes.length; step += 1) {
      const mode = orderedModes[(cursor + step) % orderedModes.length];
      const card = candidates.get(mode)?.find((candidate) => !used.has(candidate.id));
      if (!card) continue;
      selected = { cardId: card.id, mode };
      cursor = (cursor + step + 1) % orderedModes.length;
      break;
    }
    if (!selected) break;
    used.add(selected.cardId);
    queue.push(selected);
  }
  return queue;
}

export function createChallengeSession(
  cards: Flashcard[],
  type: ChallengeType,
  requestedCount: number,
  now = new Date(),
  random: () => number = Math.random,
): ChallengeSession {
  const available = qualifyingChallengeCards(cards, type);
  const limit = clampChallengeCount(requestedCount, available.length);
  const queue = type === "mixed"
    ? mixedQueue(cards, limit, now, random)
    : rankedCards(available, typeMode[type], now, random)
      .slice(0, limit)
      .map((card) => ({ cardId: card.id, mode: typeMode[type] }));
  const timestamp = now.toISOString();
  return {
    version: 1,
    type,
    requestedCount: queue.length,
    queue,
    index: 0,
    startedAt: timestamp,
    updatedAt: timestamp,
    correct: 0,
    mistakes: 0,
    answers: [],
    pendingAnswer: null,
    retryOf: null,
  };
}

export function challengeExercise(
  card: Flashcard,
  cards: Flashcard[],
  sessionIndex: number,
  mode: ChallengeExerciseMode,
): Exercise {
  return createExercise(card, knownChallengeCards(cards), sessionIndex, mode);
}

export interface ChallengeEvaluation {
  correct: boolean;
  score: number;
  correctAnswer: string;
}

export function evaluateChallengeAnswer(
  item: ChallengeItem,
  card: Flashcard,
  cards: Flashcard[],
  sessionIndex: number,
  answerValue: string,
): ChallengeEvaluation {
  const exercise = challengeExercise(card, cards, sessionIndex, item.mode);
  if (item.mode === "choice-article" || item.mode === "choice-de-pl") {
    const selected = exercise.options.find((option) => option.cardId === answerValue);
    return {
      correct: Boolean(selected?.correct),
      score: selected?.correct ? 1 : 0,
      correctAnswer: exercise.answerLabel,
    };
  }
  const result = evaluateTypedAnswer(
    answerValue,
    exercise.acceptedAnswers,
    exercise.answerLanguage,
  );
  return {
    correct: result.correct,
    score: result.score,
    correctAnswer: exercise.answerLabel,
  };
}

export function recordChallengeAnswer(
  session: ChallengeSession,
  item: ChallengeItem,
  answerValue: string,
  evaluation: ChallengeEvaluation,
  now = new Date(),
): ChallengeSession {
  if (session.pendingAnswer) return session;
  const answer: ChallengeAnswer = {
    cardId: item.cardId,
    mode: item.mode,
    answerValue,
    correct: evaluation.correct,
    score: evaluation.score,
    answeredAt: now.toISOString(),
  };
  return {
    ...session,
    updatedAt: answer.answeredAt,
    correct: session.correct + (answer.correct ? 1 : 0),
    mistakes: session.mistakes + (answer.correct ? 0 : 1),
    answers: [...session.answers, answer],
    pendingAnswer: answer,
  };
}

export function advanceChallenge(
  session: ChallengeSession,
  now = new Date(),
): ChallengeSession {
  if (!session.pendingAnswer) return session;
  return {
    ...session,
    index: session.index + 1,
    updatedAt: now.toISOString(),
    pendingAnswer: null,
  };
}

export function challengeComplete(session: ChallengeSession | null): boolean {
  return Boolean(
    session &&
    session.queue.length > 0 &&
    session.index >= session.queue.length &&
    !session.pendingAnswer,
  );
}

export function challengeMistakes(session: ChallengeSession): ChallengeAnswer[] {
  return session.answers.filter((answer) => !answer.correct);
}

export function createMistakeRetry(
  session: ChallengeSession,
  now = new Date(),
): ChallengeSession | null {
  const mistakes = challengeMistakes(session);
  if (mistakes.length === 0) return null;
  const timestamp = now.toISOString();
  return {
    version: 1,
    type: session.type,
    requestedCount: mistakes.length,
    queue: mistakes.map((answer) => ({ cardId: answer.cardId, mode: answer.mode })),
    index: 0,
    startedAt: timestamp,
    updatedAt: timestamp,
    correct: 0,
    mistakes: 0,
    answers: [],
    pendingAnswer: null,
    retryOf: session.startedAt,
  };
}

export function recordCardChallengeResult(
  card: Flashcard,
  mode: ChallengeExerciseMode,
  correct: boolean,
  now = new Date(),
): Flashcard {
  const skill = challengeSkillForMode(mode);
  const previous = card.challengeStats[skill];
  const progress = {
    attempts: (previous?.attempts ?? 0) + 1,
    successes: (previous?.successes ?? 0) + (correct ? 1 : 0),
    lastPracticedAt: now.toISOString(),
    needsWork: !correct,
  };
  return {
    ...card,
    challengeStats: {
      ...card.challengeStats,
      [skill]: progress,
    },
  };
}

export function mergeChallengeStats(
  local: ChallengeStats,
  remote: ChallengeStats,
): ChallengeStats {
  const result: ChallengeStats = {};
  for (const skill of ["article", "listening", "writing", "meaning"] as ChallengeSkill[]) {
    const localProgress = local[skill];
    const remoteProgress = remote[skill];
    if (!localProgress) {
      if (remoteProgress) result[skill] = remoteProgress;
      continue;
    }
    if (!remoteProgress) {
      result[skill] = localProgress;
      continue;
    }
    const localTime = new Date(localProgress.lastPracticedAt).getTime();
    const remoteTime = new Date(remoteProgress.lastPracticedAt).getTime();
    result[skill] = remoteTime > localTime ? remoteProgress : localProgress;
  }
  return result;
}

export function cleanChallengeGerman(value: string): string {
  return value
    .replace(/\s*[|/]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
