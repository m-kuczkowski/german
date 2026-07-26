import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { defaultMeta } from "../src/lib/meta";
import { hydrateRemoteState } from "../src/lib/remote";

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
        lastReviewedAt: "2026-07-26T10:00:00.000Z",
      }],
      meta: { streak: 4, totalReviews: 8 },
    });
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].id).toBe(first.id);
    expect(result.cards[0].repetitions).toBe(2);
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
});
