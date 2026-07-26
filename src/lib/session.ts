import { preferredExerciseMode } from "./exercises";
import type {
  Flashcard,
  LearningSession,
  ReviewRating,
  SessionItem,
} from "../types";

export function createLearningSession(
  cards: Flashcard[],
  mode: LearningSession["mode"],
  categoryId: string | null,
  now = new Date(),
): LearningSession {
  return {
    version: 1,
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

export function scheduleSessionAnswer(
  session: LearningSession,
  card: Flashcard,
  item: SessionItem,
  rating: ReviewRating,
  correct: boolean,
): LearningSession {
  const queue = [...session.queue];
  const shouldReturn = item.round === 0 || (!correct && item.round < 2);
  if (shouldReturn) {
    const gap = deterministicGap(card.id, session.index, rating);
    const nextItem: SessionItem = {
      id: card.id,
      kind: rating === "again" && item.kind === "introduction"
        ? "introduction"
        : "exercise",
      forcedMode: rating === "good" && item.kind === "introduction"
        ? "type-pl-de"
        : rating === "hard"
          ? "choice-de-pl"
          : preferredExerciseMode(card, session.index + gap),
      round: item.round + 1,
    };
    queue.splice(Math.min(queue.length, session.index + gap + 1), 0, nextItem);
  }

  return {
    ...session,
    queue,
    index: session.index + 1,
    correct: session.correct + (correct ? 1 : 0),
    mistakes: session.mistakes + (correct ? 0 : 1),
    introduced: session.introduced + (item.kind === "introduction" && item.round === 0 ? 1 : 0),
  };
}

export function sessionComplete(session: LearningSession | null): boolean {
  return Boolean(session && session.queue.length > 0 && session.index >= session.queue.length);
}
