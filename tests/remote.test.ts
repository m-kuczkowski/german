import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { defaultMeta } from "../src/lib/meta";
import { hydrateGrammarProgress, hydrateRemoteState } from "../src/lib/remote";

describe("synchronizacja z bazą", () => {
  it("nakłada postęp z bazy na katalog kart bez gubienia kolejności", () => {
    const first = starterCards[0];
    const result = hydrateRemoteState(starterCards.slice(0, 2), defaultMeta, {
      cards: [first, starterCards[1]],
      progress: [{
        ...first,
        repetitions: 2,
        learned: false,
        intervalDays: 3,
        successfulModes: ["choice-article", "type-listen-de"],
        lastReviewedAt: "2026-07-26T10:00:00.000Z",
      }],
      meta: { streak: 4, totalReviews: 8 },
    });
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].id).toBe(first.id);
    expect(result.cards[0].repetitions).toBe(2);
    expect(result.cards[0].successfulModes).toEqual(["choice-article", "type-listen-de"]);
    expect(result.meta.streak).toBe(4);
  });

  it("zachowuje nowszą zmianę offline i przygotowuje ją do ponownej synchronizacji", () => {
    const local = {
      ...starterCards[0],
      repetitions: 7,
      leitnerBox: 4 as const,
      lastReviewedAt: "2026-07-27T10:00:00.000Z",
    };
    const result = hydrateRemoteState([local], { ...defaultMeta, totalReviews: 7 }, {
      cards: [starterCards[0]],
      progress: [{
        ...starterCards[0],
        repetitions: 2,
        leitnerBox: 2,
        lastReviewedAt: "2026-07-26T10:00:00.000Z",
      }],
      meta: { totalReviews: 2 },
    });
    expect(result.cards[0].repetitions).toBe(7);
    expect(result.cards[0].leitnerBox).toBe(4);
    expect(result.meta.totalReviews).toBe(7);
  });

  it("scala osobno postęp wyzwań i zachowuje najnowszą aktywną sesję", () => {
    const first = {
      ...starterCards[0],
      stage: "known" as const,
      learned: true,
      challengeStats: {
        writing: {
          attempts: 1,
          successes: 0,
          lastPracticedAt: "2026-07-27T09:00:00.000Z",
          needsWork: true,
        },
      },
    };
    const localChallenge = {
      version: 1 as const,
      type: "writing" as const,
      requestedCount: 1,
      queue: [{ cardId: first.id, mode: "type-pl-de" as const }],
      index: 0,
      startedAt: "2026-07-27T09:00:00.000Z",
      updatedAt: "2026-07-27T09:00:00.000Z",
      correct: 0,
      mistakes: 0,
      answers: [],
      pendingAnswer: null,
      retryOf: null,
    };
    const remoteChallenge = {
      ...localChallenge,
      index: 1,
      updatedAt: "2026-07-27T11:00:00.000Z",
    };
    const result = hydrateRemoteState(
      [first],
      {
        ...defaultMeta,
        activeChallenge: localChallenge,
        challengeUpdatedAt: localChallenge.updatedAt,
      },
      {
        cards: [first],
        progress: [{
          id: first.id,
          challengeStats: {
            writing: {
              attempts: 2,
              successes: 2,
              lastPracticedAt: "2026-07-27T10:00:00.000Z",
              needsWork: false,
            },
          },
        }],
        meta: {
          activeChallenge: remoteChallenge,
          challengeUpdatedAt: remoteChallenge.updatedAt,
        },
      },
    );
    expect(result.cards[0].challengeStats.writing).toMatchObject({
      attempts: 2,
      successes: 2,
      needsWork: false,
    });
    expect(result.cards[0].successfulModes).toEqual(first.successfulModes);
    expect(result.meta.activeChallenge?.index).toBe(1);
  });

  it("normalizuje datę serii podczas łączenia pamięci urządzenia i bazy", () => {
    const result = hydrateRemoteState([], {
      ...defaultMeta,
      lastStudyDate: "2026-07-30T00:00:00.000Z",
    }, {
      cards: [],
      progress: [],
      meta: { lastStudyDate: "2026-07-29T22:00:00.000Z" },
    });

    expect(result.meta.lastStudyDate).toBe("2026-07-30");
  });

  it("scala postęp gramatyki osobno, wybierając nowszy zapis tematu", () => {
    const result = hydrateGrammarProgress([{
      topicId: "A1-03",
      status: "learning",
      masteryScore: 40,
      lessonCompletions: 1,
      reviewStep: 0,
      nextReviewAt: null,
      firstStartedAt: "2026-08-01T08:00:00.000Z",
      lastPracticedAt: "2026-08-01T08:00:00.000Z",
      masteredAt: null,
      successfulReviewDates: [],
    }], [{
      topicId: "A1-03",
      status: "review",
      masteryScore: 90,
      lessonCompletions: 1,
      reviewStep: 1,
      nextReviewAt: "2026-08-02T09:00:00.000Z",
      firstStartedAt: "2026-08-01T08:00:00.000Z",
      lastPracticedAt: "2026-08-01T09:00:00.000Z",
      masteredAt: null,
      successfulReviewDates: ["2026-08-01"],
    }]);
    expect(result[0]).toMatchObject({ status: "review", masteryScore: 90, reviewStep: 1 });
  });

  it("wznawia nowszą rozpoczętą lekcję gramatyki z drugiego urządzenia", () => {
    const grammarSession = {
      version: 1 as const,
      kind: "lesson" as const,
      queue: [{ topicId: "A1-03", exerciseId: "a1-03-1", retry: false }],
      index: 0,
      startedAt: "2026-08-01T11:00:00.000Z",
      correct: 0,
      mistakes: 0,
      answers: [],
      pendingAnswer: null,
    };
    const result = hydrateRemoteState([], defaultMeta, {
      cards: [],
      progress: [],
      meta: { activeGrammarSession: grammarSession },
    });
    expect(result.meta.activeGrammarSession?.queue[0]?.topicId).toBe("A1-03");
  });
});
