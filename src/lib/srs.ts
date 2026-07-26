import type { Flashcard } from "../types";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

export function isDue(card: Flashcard, now = new Date()): boolean {
  return new Date(card.dueAt).getTime() <= now.getTime();
}

export function reviewCard(
  card: Flashcard,
  remembered: boolean,
  now = new Date(),
): Flashcard {
  if (!remembered) {
    return {
      ...card,
      repetitions: 0,
      intervalDays: 0,
      ease: Math.max(1.3, Number((card.ease - 0.2).toFixed(2))),
      dueAt: new Date(now.getTime() + 10 * MINUTE_MS).toISOString(),
      learned: false,
      lapses: card.lapses + 1,
    };
  }

  const repetitions = card.repetitions + 1;
  const intervalDays =
    repetitions === 1
      ? 1
      : repetitions === 2
        ? 3
        : repetitions === 3
          ? 7
          : Math.max(10, Math.round(card.intervalDays * card.ease));

  return {
    ...card,
    repetitions,
    intervalDays,
    ease: Math.min(3, Number((card.ease + 0.05).toFixed(2))),
    dueAt: new Date(now.getTime() + intervalDays * DAY_MS).toISOString(),
    learned: repetitions >= 3,
  };
}

export function sortForLearning(cards: Flashcard[], now = new Date()): Flashcard[] {
  return [...cards].sort((a, b) => {
    const aDue = isDue(a, now) ? 0 : 1;
    const bDue = isDue(b, now) ? 0 : 1;
    if (aDue !== bDue) return aDue - bDue;
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
