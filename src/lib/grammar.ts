import {
  grammarExerciseById,
  grammarTopicsById,
} from "../data/grammarCatalog";
import type {
  GrammarExercise,
  GrammarSession,
  GrammarSessionAnswer,
  GrammarSessionItem,
  GrammarTopic,
  GrammarTopicProgress,
} from "../types";

const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30, 60];
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

export interface GrammarEvaluation {
  correct: boolean;
  score: number;
  normalizedAnswer: string;
}

function polishDateKey(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Zurich",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function normalizeGermanAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?;:]+$/g, "")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ");
}

function tokenScore(answer: string, expected: string): number {
  const actualTokens = normalizeGermanAnswer(answer).split(" ").filter(Boolean);
  const expectedTokens = normalizeGermanAnswer(expected).split(" ").filter(Boolean);
  if (!actualTokens.length || !expectedTokens.length) return 0;
  const matching = actualTokens.filter((token, index) => token === expectedTokens[index]).length;
  return matching / Math.max(actualTokens.length, expectedTokens.length);
}

export function evaluateGrammarAnswer(
  exercise: GrammarExercise,
  answerValue: string,
): GrammarEvaluation {
  const normalizedAnswer = normalizeGermanAnswer(answerValue);
  const accepted = [exercise.answer, ...(exercise.acceptedAnswers ?? [])]
    .map(normalizeGermanAnswer);
  const correct = accepted.includes(normalizedAnswer);
  return {
    correct,
    score: correct ? 1 : tokenScore(answerValue, exercise.answer),
    normalizedAnswer,
  };
}

export function initialGrammarProgress(topicId: string): GrammarTopicProgress {
  return {
    topicId,
    status: "new",
    masteryScore: 0,
    lessonCompletions: 0,
    reviewStep: 0,
    nextReviewAt: null,
    firstStartedAt: null,
    lastPracticedAt: null,
    masteredAt: null,
    successfulReviewDates: [],
  };
}

export function grammarProgressFor(
  progress: GrammarTopicProgress[],
  topicId: string,
): GrammarTopicProgress {
  return progress.find((item) => item.topicId === topicId) ?? initialGrammarProgress(topicId);
}

function seededIndex(seed: string, length: number): number {
  let hash = 0;
  for (const character of seed) hash = ((hash << 5) - hash) + character.charCodeAt(0);
  return Math.abs(hash) % Math.max(1, length);
}

function cycleExercises(topic: GrammarTopic, count: number, seed: string): GrammarSessionItem[] {
  const source = topic.exercises;
  if (!source.length) return [];
  const start = seededIndex(seed, source.length);
  return Array.from({ length: Math.min(count, source.length) }, (_, index) => ({
    topicId: topic.id,
    exerciseId: source[(start + index) % source.length]!.id,
    retry: false,
  }));
}

export function createGrammarLesson(topic: GrammarTopic, now = new Date()): GrammarSession {
  return {
    version: 1,
    kind: "lesson",
    queue: cycleExercises(topic, 20, `${topic.id}:${polishDateKey(now)}`),
    index: 0,
    startedAt: now.toISOString(),
    correct: 0,
    mistakes: 0,
    answers: [],
    pendingAnswer: null,
  };
}

export function dueGrammarTopics(
  topics: GrammarTopic[],
  progress: GrammarTopicProgress[],
  now = new Date(),
): GrammarTopic[] {
  const timestamp = now.getTime();
  return topics
    .filter((topic) => topic.published)
    .filter((topic) => {
      const item = grammarProgressFor(progress, topic.id);
      return item.nextReviewAt !== null && new Date(item.nextReviewAt).getTime() <= timestamp;
    })
    .sort((left, right) => {
      const leftDue = grammarProgressFor(progress, left.id).nextReviewAt ?? "";
      const rightDue = grammarProgressFor(progress, right.id).nextReviewAt ?? "";
      return leftDue.localeCompare(rightDue);
    });
}

export function recommendedGrammarTopic(
  topics: GrammarTopic[],
  progress: GrammarTopicProgress[],
): GrammarTopic | undefined {
  const published = topics.filter((topic) => topic.published).sort(
    (left, right) => left.sortOrder - right.sortOrder,
  );
  return published.find((topic) => grammarProgressFor(progress, topic.id).status === "new")
    ?? published.find((topic) => grammarProgressFor(progress, topic.id).status !== "mastered")
    ?? published[0];
}

export function createGrammarReview(
  topics: GrammarTopic[],
  progress: GrammarTopicProgress[],
  now = new Date(),
): GrammarSession {
  const selected = dueGrammarTopics(topics, progress, now).slice(0, 3);
  const queue = selected.flatMap((topic, index) => cycleExercises(
    topic,
    2,
    `${topic.id}:review:${polishDateKey(now)}:${index}`,
  ));
  return {
    version: 1,
    kind: "review",
    queue,
    index: 0,
    startedAt: now.toISOString(),
    correct: 0,
    mistakes: 0,
    answers: [],
    pendingAnswer: null,
  };
}

export function grammarSessionComplete(session: GrammarSession | null): boolean {
  return Boolean(session && session.index >= session.queue.length);
}

export function grammarSessionExercise(session: GrammarSession | null): GrammarExercise | undefined {
  const item = session?.queue[session.index];
  return item ? grammarExerciseById(item.topicId, item.exerciseId) : undefined;
}

function retryFor(session: GrammarSession, item: GrammarSessionItem): GrammarSessionItem | null {
  const topic = grammarTopicsById.get(item.topicId);
  if (!topic) return null;
  const current = grammarExerciseById(item.topicId, item.exerciseId);
  const alternatives = topic.exercises.filter((exercise) =>
    exercise.id !== item.exerciseId && exercise.targetSkill === current?.targetSkill,
  );
  const fallback = alternatives[0] ?? topic.exercises.find((exercise) => exercise.id !== item.exerciseId);
  return fallback ? { topicId: item.topicId, exerciseId: fallback.id, retry: true } : null;
}

export function recordGrammarAnswer(
  session: GrammarSession,
  answer: GrammarSessionAnswer,
): GrammarSession {
  if (session.pendingAnswer) return session;
  return {
    ...session,
    pendingAnswer: answer,
    answers: [...session.answers, answer],
    correct: session.correct + (answer.correct ? 1 : 0),
    mistakes: session.mistakes + (answer.correct ? 0 : 1),
  };
}

export function advanceGrammarSession(session: GrammarSession): GrammarSession {
  const current = session.queue[session.index];
  const pending = session.pendingAnswer;
  if (!current || !pending) return session;
  const queue = [...session.queue];
  if (!pending.correct && !current.retry) {
    const retry = retryFor(session, current);
    if (retry && !queue.some((item) => item.exerciseId === retry.exerciseId && item.topicId === retry.topicId && item.retry)) {
      const insertionIndex = Math.min(queue.length, session.index + 4);
      queue.splice(insertionIndex, 0, retry);
    }
  }
  return {
    ...session,
    queue,
    index: session.index + 1,
    pendingAnswer: null,
  };
}

function average(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function nextReviewDate(
  previous: GrammarTopicProgress,
  score: number,
  now: Date,
): { nextReviewAt: string; reviewStep: number; status: GrammarTopicProgress["status"]; masteredAt: string | null } {
  if (score < 0.7) {
    return {
      nextReviewAt: new Date(now.getTime() + (10 * MINUTE)).toISOString(),
      reviewStep: 0,
      status: "learning",
      masteredAt: null,
    };
  }
  const reviewStep = Math.min(REVIEW_INTERVALS_DAYS.length, previous.reviewStep + 1);
  const interval = REVIEW_INTERVALS_DAYS[Math.max(0, reviewStep - 1)]!;
  const successfulDates = new Set(previous.successfulReviewDates);
  successfulDates.add(polishDateKey(now));
  const mastered = reviewStep >= 3 && successfulDates.size >= 2 && score >= 0.9;
  return {
    nextReviewAt: new Date(now.getTime() + (interval * DAY)).toISOString(),
    reviewStep,
    status: mastered ? "mastered" : "review",
    masteredAt: mastered ? now.toISOString() : null,
  };
}

export function completeGrammarSession(
  existing: GrammarTopicProgress[],
  session: GrammarSession,
  now = new Date(),
): GrammarTopicProgress[] {
  const byTopic = new Map<string, GrammarSessionAnswer[]>();
  for (const answer of session.answers) {
    const answers = byTopic.get(answer.topicId) ?? [];
    answers.push(answer);
    byTopic.set(answer.topicId, answers);
  }
  const updates = new Map(existing.map((item) => [item.topicId, item]));
  for (const [topicId, answers] of byTopic) {
    const previous = grammarProgressFor(existing, topicId);
    const score = average(answers.map((answer) => answer.score));
    const schedule = nextReviewDate(previous, score, now);
    const successfulReviewDates = score >= 0.9
      ? [...new Set([...previous.successfulReviewDates, polishDateKey(now)])]
      : previous.successfulReviewDates;
    updates.set(topicId, {
      ...previous,
      status: schedule.status,
      masteryScore: Math.round(((previous.masteryScore * 0.55) + (score * 100 * 0.45)) * 10) / 10,
      lessonCompletions: previous.lessonCompletions + (session.kind === "lesson" ? 1 : 0),
      reviewStep: schedule.reviewStep,
      nextReviewAt: schedule.nextReviewAt,
      firstStartedAt: previous.firstStartedAt ?? now.toISOString(),
      lastPracticedAt: now.toISOString(),
      masteredAt: schedule.masteredAt ?? previous.masteredAt,
      successfulReviewDates,
    });
  }
  return [...updates.values()].sort((left, right) => left.topicId.localeCompare(right.topicId));
}
