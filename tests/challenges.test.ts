import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import {
  advanceChallenge,
  availableChallengeTypes,
  challengeComplete,
  challengeExercise,
  challengeMistakes,
  createChallengeSession,
  createMistakeRetry,
  evaluateChallengeAnswer,
  qualifyingChallengeCards,
  recordCardChallengeResult,
  recordChallengeAnswer,
} from "../src/lib/challenges";
import { difficultCards } from "../src/lib/learning";
import { defaultMeta, withMetaDefaults } from "../src/lib/meta";
import type { ExerciseMode } from "../src/types";

const knownCards = starterCards.slice(0, 12).map((card, index) => ({
  ...card,
  stage: index === 0 ? "mastered" as const : "known" as const,
  learned: true,
}));

describe("dobrowolne wyzwania", () => {
  it("korzysta wyłącznie z poznanych lub opanowanych kart", () => {
    const cards = [
      ...knownCards.slice(0, 4),
      { ...starterCards[20], stage: "uncertain" as const },
      { ...starterCards[21], stage: "new" as const },
    ];
    const eligible = qualifyingChallengeCards(cards, "writing");
    expect(eligible).toHaveLength(4);
    expect(eligible.every((card) => card.stage === "known" || card.stage === "mastered"))
      .toBe(true);
  });

  it("pokazuje tylko dostępne typy i rodzajniki ogranicza do rzeczowników", () => {
    const cards = knownCards.filter((card) => card.article);
    const types = availableChallengeTypes(cards);
    expect(types.some(({ type }) => type === "article")).toBe(true);
    expect(qualifyingChallengeCards(cards, "article").every((card) => card.article))
      .toBe(true);
  });

  it("ogranicza liczbę zadań, nie duplikuje kart i równoważy tryb mieszany", () => {
    const session = createChallengeSession(knownCards, "mixed", 50, new Date("2026-07-27"), () => 0.42);
    expect(session.queue.length).toBeLessThanOrEqual(knownCards.length);
    expect(new Set(session.queue.map((item) => item.cardId)).size).toBe(session.queue.length);
    expect(new Set(session.queue.map((item) => item.mode)).size).toBeGreaterThan(1);
  });

  it("ocenia wybór rodzajnika i wymaga ręcznego przejścia dalej", () => {
    const noun = knownCards.find((card) => card.article)!;
    const item = { cardId: noun.id, mode: "choice-article" as const };
    const evaluation = evaluateChallengeAnswer(
      item,
      noun,
      knownCards,
      0,
      `article-${noun.article}`,
    );
    const started = createChallengeSession([noun], "article", 1, new Date("2026-07-27"), () => 0);
    const answered = recordChallengeAnswer(
      started,
      started.queue[0],
      `article-${noun.article}`,
      evaluation,
      new Date("2026-07-27T10:00:00.000Z"),
    );
    expect(evaluation.correct).toBe(true);
    expect(answered.index).toBe(0);
    expect(answered.pendingAnswer).not.toBeNull();
    expect(challengeComplete(answered)).toBe(false);
    expect(challengeComplete(advanceChallenge(answered))).toBe(true);
  });

  it("w dyktandzie nie ujawnia słowa i akceptuje pominięcie nawiasu", () => {
    const phrase = {
      ...knownCards[0],
      article: null,
      german: "Interesse (an etwas) haben",
    };
    const item = { cardId: phrase.id, mode: "type-listen-de" as const };
    const exercise = challengeExercise(phrase, [phrase, ...knownCards.slice(1)], 0, item.mode);
    const result = evaluateChallengeAnswer(
      item,
      phrase,
      [phrase, ...knownCards.slice(1)],
      0,
      "Interesse haben",
    );
    expect(exercise.prompt).toBe("");
    expect(exercise.speechPrompt).toContain("Interesse");
    expect(result).toMatchObject({ correct: true, score: 1 });
  });

  it("błąd aktualizuje tylko daną umiejętność bez zmiany harmonogramu Leitnera", () => {
    const original = {
      ...knownCards[0],
      leitnerBox: 4 as const,
      dueAt: "2026-08-20T08:00:00.000Z",
      repetitions: 11,
      successfulModes: ["choice-de-pl", "type-pl-de"] as ExerciseMode[],
      reviewHistory: [{ ...knownCards[0].reviewHistory[0] }].filter(Boolean),
    };
    const updated = recordCardChallengeResult(
      original,
      "type-pl-de",
      false,
      new Date("2026-07-27T11:00:00.000Z"),
    );
    expect(updated.leitnerBox).toBe(original.leitnerBox);
    expect(updated.dueAt).toBe(original.dueAt);
    expect(updated.repetitions).toBe(original.repetitions);
    expect(updated.stage).toBe(original.stage);
    expect(updated.reviewHistory).toEqual(original.reviewHistory);
    expect(updated.successfulModes).toContain("choice-de-pl");
    expect(updated.successfulModes).toContain("type-pl-de");
    expect(updated.challengeStats.writing?.needsWork).toBe(true);
    expect(difficultCards([updated])).toContainEqual(updated);
  });

  it("zapamiętuje aktywną sesję po normalizacji metadanych", () => {
    const session = createChallengeSession(knownCards, "writing", 5, new Date("2026-07-27"), () => 0.2);
    const restored = withMetaDefaults({
      ...defaultMeta,
      activeChallenge: session,
      challengeUpdatedAt: session.updatedAt,
    });
    expect(restored.activeChallenge).toEqual(session);
    expect(restored.challengeUpdatedAt).toBe(session.updatedAt);
  });

  it("tworzy spokojną dogrywkę wyłącznie z błędnych odpowiedzi", () => {
    const started = createChallengeSession(knownCards, "writing", 2, new Date("2026-07-27"), () => 0);
    const wrong = recordChallengeAnswer(
      started,
      started.queue[0],
      "błąd",
      { correct: false, score: 0, correctAnswer: "x" },
    );
    const afterWrong = advanceChallenge(wrong);
    const right = recordChallengeAnswer(
      afterWrong,
      afterWrong.queue[1],
      "dobrze",
      { correct: true, score: 1, correctAnswer: "y" },
    );
    const completed = advanceChallenge(right);
    const retry = createMistakeRetry(completed, new Date("2026-07-27T12:00:00.000Z"));
    expect(challengeMistakes(completed)).toHaveLength(1);
    expect(retry?.queue).toEqual([completed.queue[0]]);
    expect(retry?.retryOf).toBe(completed.startedAt);
  });
});
