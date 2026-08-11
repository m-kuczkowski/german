import type { LearningMeta, LessonSize } from "../types";
import { localDateKey, updateStreak } from "./srs";

export const defaultMeta: LearningMeta = {
  streak: 0,
  lastStudyDate: null,
  completedToday: 0,
  totalReviews: 0,
  lessonSize: 10,
  theme: "system",
  contentVersion: 0,
  activeSession: null,
  activeChallenge: null,
  challengeUpdatedAt: null,
  activeGrammarSession: null,
};

export function withMetaDefaults(meta: Partial<LearningMeta> | null | undefined): LearningMeta {
  const merged = { ...defaultMeta, ...(meta ?? {}) };
  const allowedLessonSizes: LessonSize[] = [5, 10, 15, 20, 30, 40];
  const lessonSize = allowedLessonSizes.includes(merged.lessonSize as LessonSize)
    ? merged.lessonSize as LessonSize
    : defaultMeta.lessonSize;
  const challenge = merged.activeChallenge;
  const validChallenge = Boolean(
    challenge &&
    Array.isArray(challenge.queue) &&
    challenge.queue.length > 0 &&
    Number.isFinite(challenge.index) &&
    typeof challenge.startedAt === "string",
  );
  return {
    ...merged,
    lessonSize,
    activeSession: merged.activeSession
      ? {
          ...merged.activeSession,
          version: 3,
          plannedCount: merged.activeSession.plannedCount ?? merged.activeSession.queue.length,
          pendingAnswer: merged.activeSession.pendingAnswer ?? null,
        }
      : null,
    activeChallenge: validChallenge && challenge
      ? {
          ...challenge,
          version: 1,
          index: Math.max(0, Math.min(challenge.queue.length, challenge.index)),
          answers: Array.isArray(challenge.answers)
            ? challenge.answers
            : [],
          pendingAnswer: challenge.pendingAnswer ?? null,
          retryOf: challenge.retryOf ?? null,
          updatedAt: challenge.updatedAt ?? challenge.startedAt,
        }
      : null,
    activeGrammarSession: merged.activeGrammarSession &&
      Array.isArray(merged.activeGrammarSession.queue) &&
      Number.isFinite(merged.activeGrammarSession.index)
      ? {
          ...merged.activeGrammarSession,
          version: 1,
          index: Math.max(0, Math.min(
            merged.activeGrammarSession.queue.length,
            merged.activeGrammarSession.index,
          )),
          answers: Array.isArray(merged.activeGrammarSession.answers)
            ? merged.activeGrammarSession.answers
            : [],
          pendingAnswer: merged.activeGrammarSession.pendingAnswer ?? null,
        }
      : null,
    challengeUpdatedAt: merged.challengeUpdatedAt ??
      (validChallenge ? challenge?.updatedAt : null) ??
      null,
  };
}

export function recordReview(meta: LearningMeta, now = new Date()): LearningMeta {
  const today = localDateKey(now);
  const freshDay = meta.lastStudyDate !== today;
  const streak = updateStreak(meta.streak, meta.lastStudyDate, now);

  return {
    ...meta,
    ...streak,
    completedToday: freshDay ? 1 : meta.completedToday + 1,
    totalReviews: meta.totalReviews + 1,
  };
}
