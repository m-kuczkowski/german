import type { LearningMeta } from "../types";
import { localDateKey, updateStreak } from "./srs";

export const defaultMeta: LearningMeta = {
  streak: 0,
  lastStudyDate: null,
  completedToday: 0,
  totalReviews: 0,
  theme: "system",
  contentVersion: 0,
  activeSession: null,
};

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
