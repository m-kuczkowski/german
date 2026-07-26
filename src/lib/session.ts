import { preferredExerciseMode } from "./exercises";
import type {
  Flashcard,
  LearningSession,
  ReviewEvidence,
  ReviewRating,
  SessionAnswer,
  SessionItem,
} from "../types";

export function createLearningSession(
  cards: Flashcard[],
  mode: LearningSession["mode"],
  categoryId: string | null,
  now = new Date(),
): LearningSession {
  return {
    version: 2,
    mode,
    categoryId,
    queue: cards.map((card) => ({
      id: card.id,
      kind: card.stage === "new" ? "introduction" : "exercise",
      round: 0,
    })),
    index: 0,
    startedAt: now.toISOString(),
    correct: 0,
    mistakes: 0,
    introduced: 0,
    pendingAnswer: null,
  };
}

function deterministicGap(cardId: string, index: number, rating: ReviewRating): number {
  let hash = 0;
  for (const character of `${cardId}:${index}:${rating}`) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }
  const ranges: Record<ReviewRating, [number, number]> = {
    again: [3, 5],
    hard: [6, 8],
    good: [8, 11],
  };
  const [minimum, maximum] = ranges[rating];
  return minimum + (hash % (maximum - minimum + 1));
}

export function recordSessionAnswer(
  session: LearningSession,
  previousCard: Flashcard,
  updatedCard: Flashcard,
  item: SessionItem,
  rating: ReviewRating,
  evidence: ReviewEvidence,
  answerValue: string | null,
  correctAnswer: string,
  now = new Date(),
): LearningSession {
  if (session.pendingAnswer) return session;
  const queue = [...session.queue];
  const shouldReturn =
    (item.kind === "introduction" && item.round === 0) ||
    (!evidence.correct && item.round < 2);
  if (shouldReturn) {
    const gap = deterministicGap(previousCard.id, session.index, rating);
    const nextItem: SessionItem = {
      id: previousCard.id,
      kind: rating === "again" && item.kind === "introduction"
        ? "introduction"
        : "exercise",
      forcedMode: rating === "good" && item.kind === "introduction"
        ? "type-pl-de"
        : rating === "hard"
          ? "choice-de-pl"
          : preferredExerciseMode(updatedCard, session.index + gap),
      round: item.round + 1,
    };
    queue.splice(Math.min(queue.length, session.index + gap + 1), 0, nextItem);
  }

  const pendingAnswer: SessionAnswer = {
    cardId: previousCard.id,
    rating,
    evidence,
    answerValue,
    correctAnswer,
    fromBox: previousCard.leitnerBox,
    toBox: updatedCard.leitnerBox,
    dueAt: updatedCard.dueAt,
    reason: updatedCard.lastSchedulingReason,
    recordedAt: now.toISOString(),
  };
  return {
    ...session,
    queue,
    correct: session.correct + (evidence.correct ? 1 : 0),
    mistakes: session.mistakes + (evidence.correct ? 0 : 1),
    introduced: session.introduced + (item.kind === "introduction" && item.round === 0 ? 1 : 0),
    pendingAnswer,
  };
}

export function advanceSession(session: LearningSession): LearningSession {
  if (!session.pendingAnswer) return session;
  return { ...session, index: session.index + 1, pendingAnswer: null };
}

export function sessionComplete(session: LearningSession | null): boolean {
  return Boolean(
    session &&
    !session.pendingAnswer &&
    session.queue.length > 0 &&
    session.index >= session.queue.length,
  );
}
