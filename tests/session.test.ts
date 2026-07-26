import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import {
  createLearningSession,
  scheduleSessionAnswer,
  sessionComplete,
} from "../src/lib/session";

describe("adaptacyjna kolejka w lekcji", () => {
  it("po zaznaczeniu Znam wraca po 8–11 innych kartach jako wpisywanie", () => {
    const card = starterCards[0];
    const session = createLearningSession(starterCards.slice(0, 10), "learn", card.category);
    const updated = scheduleSessionAnswer(session, card, session.queue[0], "good", true);
    const nextIndex = updated.queue.findIndex(
      (item, index) => index > 0 && item.id === card.id,
    );
    expect(nextIndex - 1).toBeGreaterThanOrEqual(8);
    expect(nextIndex - 1).toBeLessThanOrEqual(11);
    expect(updated.queue[nextIndex].kind).toBe("exercise");
    expect(updated.queue[nextIndex].forcedMode).toBe("type-pl-de");
  });

  it("Nie znam wraca szybciej jako zwykła fiszka", () => {
    const card = starterCards[0];
    const session = createLearningSession(starterCards.slice(0, 10), "learn", card.category);
    const updated = scheduleSessionAnswer(session, card, session.queue[0], "again", false);
    const nextIndex = updated.queue.findIndex(
      (item, index) => index > 0 && item.id === card.id,
    );
    expect(nextIndex - 1).toBeGreaterThanOrEqual(3);
    expect(nextIndex - 1).toBeLessThanOrEqual(5);
    expect(updated.queue[nextIndex].kind).toBe("introduction");
  });

  it("zachowuje podsumowanie i rozpoznaje koniec sesji", () => {
    const card = starterCards[0];
    const session = createLearningSession([card], "review", card.category);
    const item = { ...session.queue[0], round: 2 };
    const updated = scheduleSessionAnswer(
      { ...session, queue: [item] },
      { ...card, stage: "known" },
      item,
      "good",
      true,
    );
    expect(updated.correct).toBe(1);
    expect(sessionComplete(updated)).toBe(true);
  });
});
