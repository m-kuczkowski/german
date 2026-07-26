import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import { defaultMeta } from "../src/lib/meta";
import { hydrateRemoteState } from "../src/lib/remote";

describe("synchronizacja z bazą", () => {
  it("nakłada postęp z bazy na katalog kart bez gubienia kolejności", () => {
    const first = starterCards[0];
    const result = hydrateRemoteState(starterCards.slice(0, 2), defaultMeta, {
      cards: [first, starterCards[1]],
      progress: [{ ...first, repetitions: 2, learned: false, intervalDays: 3 }],
      meta: { streak: 4, totalReviews: 8 },
    });
    expect(result.cards).toHaveLength(2);
    expect(result.cards[0].id).toBe(first.id);
    expect(result.cards[0].repetitions).toBe(2);
    expect(result.meta.streak).toBe(4);
  });
});
