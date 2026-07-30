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
  const itemFor = (card: Flashcard): SessionItem => {
    const latest = card.reviewHistory.at(-1);
    if (
      latest &&
      latest.mode !== "introduction" &&
      !latest.correct
    ) {
      return {
        id: card.id,
        kind: "exercise",
        forcedMode: latest.mode,
        round: 0,
      };
    }
    if (
      card.leitnerBox === 1 &&
      latest?.mode === "type-listen-de" &&
      latest.correct
    ) {
      return { id: card.id, kind: "exercise", forcedMode: "type-pl-de", round: 0 };
    }
    if (card.stage === "new") return { id: card.id, kind: "introduction", round: 0 };
    if (card.leitnerBox === 2 || card.leitnerBox === 3) {
      return { id: card.id, kind: "guided-review", round: 0 };
    }
    const latestIntroduction = [...card.reviewHistory]
      .reverse()
      .find((event) => event.mode === "introduction");
    if (card.leitnerBox === 1 && latestIntroduction) {
      if (latestIntroduction.rating === "good") {
        return { id: card.id, kind: "exercise", forcedMode: "type-pl-de", round: 0 };
      }
      if (latestIntroduction.rating === "hard") {
        return { id: card.id, kind: "exercise", forcedMode: "type-listen-de", round: 0 };
      }
      return { id: card.id, kind: "guided-review", round: 0 };
    }
    return { id: card.id, kind: "exercise", round: 0 };
  };
  return {
    version: 3,
    mode,
    categoryId,
    queue: cards.map(itemFor),
    index: 0,
    startedAt: now.toISOString(),
    correct: 0,
    mistakes: 0,
    introduced: 0,
    pendingAnswer: null,
  };
}

export function deterministicGap(cardId: string, index: number, rating: ReviewRating): number {
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

export function sessionFollowUpLabel(
  session: LearningSession,
  cardId: string,
  rating: ReviewRating,
): string {
  const gap = deterministicGap(cardId, session.index, rating);
  const remaining = session.queue.length - session.index - 1;
  if (remaining < gap) {
    if (rating === "hard") return "dyktando w krótkiej powtórce";
    if (rating === "good") return "wpisywanie w krótkiej powtórce";
    return "fiszka w krótkiej powtórce";
  }
  if (rating === "hard") return `dyktando za ${gap} fiszek`;
  if (rating === "good") return `wpisywanie za ${gap} fiszek`;
  return `ponownie za ${gap} ${gap === 5 ? "fiszek" : "fiszki"}`;
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
  let nextItem: SessionItem | null = null;
  let gapRating = rating;

  const isFlashcardAnswer =
    item.kind !== "exercise" && evidence.mode === "introduction";

  if (isFlashcardAnswer) {
    if (rating === "again" && item.round === 0) {
      nextItem = {
        id: previousCard.id,
        kind: item.kind,
        round: item.round + 1,
      };
    } else if (rating === "hard" && item.round <= 1) {
      nextItem = {
        id: previousCard.id,
        kind: "exercise",
        forcedMode: "type-listen-de",
        round: item.round + 1,
      };
    } else if (rating === "good" && item.round <= 1) {
      nextItem = {
        id: previousCard.id,
        kind: "exercise",
        forcedMode: "type-pl-de",
        round: item.round + 1,
      };
    }
  } else if (evidence.mode === "type-listen-de" && evidence.correct) {
    nextItem = {
      id: previousCard.id,
      kind: "exercise",
      forcedMode: "type-pl-de",
      round: item.round + 1,
    };
    gapRating = "hard";
  } else if (!evidence.correct && item.round < 2) {
    nextItem = {
      id: previousCard.id,
      kind: "exercise",
      forcedMode: evidence.mode === "introduction"
        ? preferredExerciseMode(updatedCard, session.index)
        : evidence.mode,
      round: item.round + 1,
    };
  }

  if (nextItem) {
    const gap = deterministicGap(previousCard.id, session.index, gapRating);
    const remaining = queue.length - session.index - 1;
    if (remaining >= gap) {
      queue.splice(session.index + gap + 1, 0, nextItem);
    }
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
