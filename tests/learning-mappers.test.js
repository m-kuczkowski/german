import { describe, expect, it } from "vitest";
import { mapCatalogRow, mapProfileMeta, mapProgressRows } from "../api/learning-mappers.js";

describe("relational learning API mappers", () => {
  it("preserves the existing catalog response shape", () => {
    expect(mapCatalogRow({
      id: "card-1",
      german: "das Haus",
      polish: "dom",
      article: "das",
      plural: "die Häuser",
      example_german: "Das Haus ist groß.",
      example_polish: "Dom jest duży.",
      category: "Dom i mieszkanie (Wohnen und Haushalt)",
      curriculum_tier: "core",
      level: "A2",
      source_label: "Nicos Weg",
      source_url: "https://example.com",
      source_gloss: "house",
      source_language: "en",
    })).toEqual({
      id: "card-1",
      german: "das Haus",
      polish: "dom",
      article: "das",
      plural: "die Häuser",
      exampleGerman: "Das Haus ist groß.",
      examplePolish: "Dom jest duży.",
      category: "Dom i mieszkanie (Wohnen und Haushalt)",
      curriculumTier: "core",
      level: "A2",
      sourceLabel: "Nicos Weg",
      sourceUrl: "https://example.com",
      sourceGloss: "house",
      sourceLanguage: "en",
    });
  });

  it("reconstructs progress and ordered review history from relational rows", () => {
    const progress = mapProgressRows([{
      card_id: "card-1",
      data: {},
      repetitions: 3,
      interval_days: 7,
      ease: "2.54",
      due_at: "2026-08-03T12:00:00.000Z",
      learned: true,
      lapses: 1,
      stage: "known",
      correct_streak: 2,
      successful_modes: ["choice-article", "type-pl-de"],
      first_active_recall_at: "2026-07-20T12:00:00.000Z",
      last_active_recall_at: "2026-07-27T12:00:00.000Z",
      last_reviewed_at: "2026-07-27T12:00:00.000Z",
      typed_attempts: 1,
      typed_successes: 1,
      leitner_box: 3,
      last_scheduling_reason: "Poprawna odpowiedź.",
      successful_review_days: ["2026-07-20", "2026-07-27"],
      data: {
        challengeStats: {
          article: {
            attempts: 2,
            successes: 1,
            lastPracticedAt: "2026-07-27T13:00:00.000Z",
            needsWork: true,
          },
        },
      },
    }], [{
      card_id: "card-1",
      event_id: "event-1",
      reviewed_at: "2026-07-27T12:00:00.000Z",
      mode: "type-pl-de",
      rating: "good",
      correct: true,
      score: "100",
      from_box: 2,
      to_box: 3,
      scheduled_for: "2026-08-03T12:00:00.000Z",
      reason: "Poprawna odpowiedź.",
    }]);

    expect(progress[0]).toMatchObject({
      id: "card-1",
      ease: 2.54,
      leitnerBox: 3,
      successfulModes: ["choice-article", "type-pl-de"],
      successfulReviewDays: ["2026-07-20", "2026-07-27"],
      challengeStats: {
        article: {
          attempts: 2,
          successes: 1,
          lastPracticedAt: "2026-07-27T13:00:00.000Z",
          needsWork: true,
        },
      },
    });
    expect(progress[0].reviewHistory).toEqual([{
      id: "event-1",
      reviewedAt: "2026-07-27T12:00:00.000Z",
      mode: "type-pl-de",
      rating: "good",
      correct: true,
      score: 100,
      fromBox: 2,
      toBox: 3,
      scheduledFor: "2026-08-03T12:00:00.000Z",
      reason: "Poprawna odpowiedź.",
    }]);
  });

  it("falls back field-by-field to legacy JSONB during the transition", () => {
    const [progress] = mapProgressRows([{
      card_id: "legacy",
      data: {
        repetitions: 1,
        intervalDays: 1,
        ease: 2.5,
        reviewHistory: [{ id: "legacy-event" }],
        successfulModes: [],
        successfulReviewDays: [],
      },
    }], []);
    expect(progress.repetitions).toBe(1);
    expect(progress.intervalDays).toBe(1);
    expect(progress.reviewHistory).toEqual([{ id: "legacy-event" }]);
  });

  it("keeps active session JSONB while preferring typed profile statistics", () => {
    expect(mapProfileMeta({
      meta: {
        streak: 2,
        activeSession: { version: 2, index: 3 },
        activeChallenge: { version: 1, index: 4 },
      },
      streak: 4,
      active_session: { version: 2, index: 5 },
    })).toMatchObject({
      streak: 4,
      activeSession: { version: 2, index: 5 },
      activeChallenge: { version: 1, index: 4 },
    });
  });
});
