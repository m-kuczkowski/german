import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { withMetaDefaults } from "../src/lib/meta";
import {
  advanceSession,
  createLearningSession,
  recordSessionAnswer,
  sessionFollowUpLabel,
  sessionComplete,
} from "../src/lib/session";
import { reviewCard } from "../src/lib/srs";

describe("adaptacyjna kolejka w lekcji", () => {
  it("uzupełnia bezpieczną domyślną wielkość lekcji dla starszego postępu", () => {
    const restored = withMetaDefaults({
      streak: 0,
      lastStudyDate: null,
      completedToday: 0,
      totalReviews: 0,
      theme: "system",
      contentVersion: 0,
      activeSession: null,
      activeChallenge: null,
      challengeUpdatedAt: null,
      activeGrammarSession: null,
    });

    expect(restored.lessonSize).toBe(10);
  });

  it("otwiera starszą zapisaną sesję bez liczby zadań bazowych", () => {
    const session = createLearningSession(starterCards.slice(0, 3), "learn", starterCards[0].category);
    const { plannedCount: _plannedCount, ...legacySession } = session;
    const restored = withMetaDefaults({
      activeSession: legacySession as never,
    });

    expect(restored.activeSession?.plannedCount).toBe(3);
    expect(restored.activeSession?.queue).toHaveLength(3);
  });

  it("przegródki 2–3 zaczynają od fiszki, a przegródka 4 od aktywnego zadania", () => {
    const cards = [
      { ...starterCards[0], stage: "known" as const, learned: true, leitnerBox: 2 as const },
      { ...starterCards[1], stage: "known" as const, learned: true, leitnerBox: 3 as const },
      { ...starterCards[2], stage: "known" as const, learned: true, leitnerBox: 4 as const },
    ];
    const session = createLearningSession(cards, "review", cards[0].category);

    expect(session.plannedCount).toBe(3);

    expect(session.queue.map((item) => item.kind)).toEqual([
      "guided-review",
      "guided-review",
      "exercise",
    ]);
  });

  it("w przegródce 2 samo Znam nie awansuje, ale planuje wpisywanie w tej samej sesji", () => {
    const card = {
      ...starterCards[0],
      stage: "known" as const,
      learned: true,
      leitnerBox: 2 as const,
    };
    const pool = [card, ...starterCards.slice(1, 14)];
    const session = createLearningSession(pool, "review", card.category);
    const evidence = { mode: "introduction" as const, correct: true };
    const afterFlashcard = reviewCard(card, "good", evidence);
    const recorded = recordSessionAnswer(
      session,
      card,
      afterFlashcard,
      session.queue[0],
      "good",
      evidence,
      "good",
      card.polish,
    );
    const nextIndex = recorded.queue.findIndex(
      (item, index) => index > 0 && item.id === card.id,
    );

    expect(session.queue[0].kind).toBe("guided-review");
    expect(afterFlashcard.leitnerBox).toBe(2);
    expect(afterFlashcard.correctStreak).toBe(card.correctStreak);
    expect(recorded.introduced).toBe(0);
    expect(recorded.queue[nextIndex]).toMatchObject({
      kind: "exercise",
      forcedMode: "type-pl-de",
    });
    expect(nextIndex - 1).toBeGreaterThanOrEqual(8);
    expect(nextIndex - 1).toBeLessThanOrEqual(11);

    const afterRecall = reviewCard(
      afterFlashcard,
      "good",
      { mode: "type-pl-de", correct: true, score: 1 },
    );
    expect(afterRecall.leitnerBox).toBe(3);
    expect(afterRecall.correctStreak).toBe(card.correctStreak + 1);
  });

  it("ten sam łagodny krok prowadzi z przegródki 3 do 4", () => {
    const card = {
      ...starterCards[0],
      stage: "known" as const,
      learned: true,
      leitnerBox: 3 as const,
    };
    const afterFlashcard = reviewCard(
      card,
      "good",
      { mode: "introduction", correct: true },
    );
    const afterRecall = reviewCard(
      afterFlashcard,
      "good",
      { mode: "type-pl-de", correct: true, score: 1 },
    );

    expect(afterFlashcard.leitnerBox).toBe(3);
    expect(afterRecall.leitnerBox).toBe(4);
  });

  it("po zaznaczeniu Znam wraca po 8–11 innych kartach jako wpisywanie", () => {
    const card = starterCards[0];
    const session = createLearningSession(starterCards.slice(0, 14), "learn", card.category);
    const evidence = { mode: "introduction" as const, correct: true };
    const reviewed = reviewCard(card, "good", evidence);
    const recorded = recordSessionAnswer(
      session,
      card,
      reviewed,
      session.queue[0],
      "good",
      evidence,
      "good",
      card.polish,
    );
    const nextIndex = recorded.queue.findIndex(
      (item, index) => index > 0 && item.id === card.id,
    );
    expect(nextIndex - 1).toBeGreaterThanOrEqual(8);
    expect(nextIndex - 1).toBeLessThanOrEqual(11);
    expect(recorded.queue[nextIndex].kind).toBe("exercise");
    expect(recorded.queue[nextIndex].forcedMode).toBe("type-pl-de");
    expect(recorded.plannedCount).toBe(session.plannedCount);
    expect(recorded.index).toBe(0);
    expect(recorded.pendingAnswer?.cardId).toBe(card.id);
    expect(advanceSession(recorded).index).toBe(1);
  });

  it("skraca odstęp, aby wpisywanie zawsze odbyło się w tej samej lekcji", () => {
    const card = starterCards[0];
    const session = createLearningSession([card], "learn", card.category);
    const evidence = { mode: "introduction" as const, correct: true };
    const reviewed = reviewCard(card, "good", evidence);
    const recorded = recordSessionAnswer(
      session,
      card,
      reviewed,
      session.queue[0],
      "good",
      evidence,
      "good",
      card.polish,
    );
    expect(recorded.queue).toHaveLength(2);
    expect(recorded.queue[1]).toMatchObject({
      id: card.id,
      kind: "exercise",
      forcedMode: "type-pl-de",
    });
    expect(sessionFollowUpLabel(session, card.id, "good"))
      .toBe("wpisywanie jako następne zadanie");
    expect(new Date(reviewed.dueAt).getTime()).toBeGreaterThan(Date.now());
  });

  it("używa największego dostępnego odstępu przed końcem lekcji", () => {
    const card = starterCards[0];
    const session = createLearningSession(starterCards.slice(0, 4), "learn", card.category);
    const evidence = { mode: "introduction" as const, correct: true };
    const reviewed = reviewCard(card, "good", evidence);
    const recorded = recordSessionAnswer(
      session,
      card,
      reviewed,
      session.queue[0],
      "good",
      evidence,
      "good",
      card.polish,
    );

    expect(recorded.queue).toHaveLength(5);
    expect(recorded.queue[4]).toMatchObject({
      id: card.id,
      kind: "exercise",
      forcedMode: "type-pl-de",
    });
    expect(sessionFollowUpLabel(session, card.id, "good"))
      .toBe("wpisywanie za 3 fiszki");
  });

  it("Nie znam wraca szybciej jako zwykła fiszka", () => {
    const card = starterCards[0];
    const session = createLearningSession(starterCards.slice(0, 10), "learn", card.category);
    const evidence = { mode: "introduction" as const, correct: false };
    const reviewed = reviewCard(card, "again", evidence);
    const updated = recordSessionAnswer(
      session,
      card,
      reviewed,
      session.queue[0],
      "again",
      evidence,
      "again",
      card.polish,
    );
    const nextIndex = updated.queue.findIndex(
      (item, index) => index > 0 && item.id === card.id,
    );
    expect(nextIndex - 1).toBeGreaterThanOrEqual(3);
    expect(nextIndex - 1).toBeLessThanOrEqual(5);
    expect(updated.queue[nextIndex].kind).toBe("introduction");
  });

  it("Niepewnie wraca po 6–8 kartach jako dyktando", () => {
    const card = starterCards[0];
    const session = createLearningSession(starterCards.slice(0, 10), "learn", card.category);
    const evidence = { mode: "introduction" as const, correct: true };
    const reviewed = reviewCard(card, "hard", evidence);
    const recorded = recordSessionAnswer(
      session,
      card,
      reviewed,
      session.queue[0],
      "hard",
      evidence,
      "hard",
      card.polish,
    );
    const nextIndex = recorded.queue.findIndex(
      (item, index) => index > 0 && item.id === card.id,
    );
    expect(nextIndex - 1).toBeGreaterThanOrEqual(6);
    expect(nextIndex - 1).toBeLessThanOrEqual(8);
    expect(recorded.queue[nextIndex].forcedMode).toBe("type-listen-de");
  });

  it("Niepewnie podczas powtórki prowadzonej nie cofa przegródki", () => {
    const card = {
      ...starterCards[0],
      stage: "known" as const,
      learned: true,
      leitnerBox: 3 as const,
    };
    const pool = [card, ...starterCards.slice(1, 10)];
    const session = createLearningSession(pool, "review", card.category);
    const evidence = { mode: "introduction" as const, correct: true };
    const reviewed = reviewCard(card, "hard", evidence);
    const recorded = recordSessionAnswer(
      session,
      card,
      reviewed,
      session.queue[0],
      "hard",
      evidence,
      "hard",
      card.polish,
    );
    const nextIndex = recorded.queue.findIndex(
      (item, index) => index > 0 && item.id === card.id,
    );

    expect(reviewed.leitnerBox).toBe(3);
    expect(recorded.queue[nextIndex]).toMatchObject({
      kind: "exercise",
      forcedMode: "type-listen-de",
    });
  });

  it("poprawne dyktando planuje później wpisanie słowa z tłumaczenia", () => {
    const card = {
      ...starterCards[0],
      stage: "uncertain" as const,
      leitnerBox: 1 as const,
    };
    const session = createLearningSession(starterCards.slice(0, 10), "learn", card.category);
    const item = {
      ...session.queue[0],
      kind: "exercise" as const,
      forcedMode: "type-listen-de" as const,
      round: 1,
    };
    const evidence = { mode: "type-listen-de" as const, correct: true, score: 1 };
    const reviewed = reviewCard(card, "good", evidence);
    const recorded = recordSessionAnswer(
      { ...session, queue: [item, ...session.queue.slice(1)] },
      card,
      reviewed,
      item,
      "good",
      evidence,
      card.german,
      card.german,
    );
    const nextIndex = recorded.queue.findIndex(
      (candidate, index) => index > 0 && candidate.id === card.id,
    );
    expect(nextIndex - 1).toBeGreaterThanOrEqual(6);
    expect(nextIndex - 1).toBeLessThanOrEqual(8);
    expect(recorded.queue[nextIndex]).toMatchObject({
      kind: "exercise",
      forcedMode: "type-pl-de",
    });
  });

  it("zachowuje podsumowanie i rozpoznaje koniec sesji", () => {
    const card = starterCards[0];
    const session = createLearningSession([card], "review", card.category);
    const item = { ...session.queue[0], round: 2 };
    const evidence = { mode: "choice-de-pl" as const, correct: true };
    const reviewed = reviewCard({ ...card, stage: "known" }, "good", evidence);
    const recorded = recordSessionAnswer(
      { ...session, queue: [item] },
      { ...card, stage: "known" },
      reviewed,
      item,
      "good",
      evidence,
      card.id,
      card.polish,
    );
    expect(recorded.correct).toBe(1);
    expect(sessionComplete(recorded)).toBe(false);
    const updated = advanceSession(recorded);
    expect(sessionComplete(updated)).toBe(true);
  });

  it("nie zapisuje tej samej odpowiedzi drugi raz", () => {
    const card = starterCards[0];
    const session = createLearningSession([card], "learn", card.category);
    const evidence = { mode: "introduction" as const, correct: true };
    const reviewed = reviewCard(card, "good", evidence);
    const once = recordSessionAnswer(
      session,
      card,
      reviewed,
      session.queue[0],
      "good",
      evidence,
      "good",
      card.polish,
    );
    const twice = recordSessionAnswer(
      once,
      card,
      reviewed,
      session.queue[0],
      "good",
      evidence,
      "good",
      card.polish,
    );
    expect(twice).toBe(once);
    expect(twice.correct).toBe(1);
  });

  it("nie mnoży poprawnych powtórek tej samej karty w jednym dniu", () => {
    const card = { ...starterCards[0], stage: "known" as const, leitnerBox: 2 as const };
    const session = createLearningSession([card], "review", card.category);
    const evidence = { mode: "choice-de-pl" as const, correct: true };
    const reviewed = reviewCard(card, "good", evidence);
    const recorded = recordSessionAnswer(
      session,
      card,
      reviewed,
      session.queue[0],
      "good",
      evidence,
      card.id,
      card.polish,
    );
    expect(recorded.queue).toHaveLength(1);
  });

  it("po błędzie wraca do tego samego składnika znajomości słowa", () => {
    const card = {
      ...starterCards.find((item) => item.article)!,
      stage: "known" as const,
      leitnerBox: 3 as const,
    };
    const session = createLearningSession([card], "review", card.category);
    const evidence = { mode: "choice-article" as const, correct: false, score: 0 };
    const reviewed = reviewCard(card, "again", evidence);
    const recorded = recordSessionAnswer(
      session,
      card,
      reviewed,
      session.queue[0],
      "again",
      evidence,
      "article-der",
      `${card.article} ${card.german}`,
    );
    expect(recorded.queue).toHaveLength(1);
    const retry = createLearningSession([reviewed], "review", card.category);
    expect(retry.queue[0].forcedMode).toBe("choice-article");
  });
});
