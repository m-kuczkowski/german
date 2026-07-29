import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import {
  PIPER_AUDIO_BASE_URL,
  PIPER_AUDIO_MIME_TYPE,
  PIPER_AUDIO_SPRITE_PREFIX,
  piperAudioClips,
} from "../src/data/piperAudioManifest";
import { spokenGerman } from "../scripts/piper-audio-source.mjs";

describe("nagrania niemieckiego lektora", () => {
  it("przygotowuje naturalny tekst do wymowy dla zapisu technicznego kart", () => {
    expect(spokenGerman({ german: "zurück|kommen" })).toBe("zurückkommen");
    expect(spokenGerman({ german: "Interesse (an etwas) haben" })).toBe("Interesse an etwas haben");
    expect(spokenGerman({ german: "etwas/jemanden vergessen" })).toBe("etwas oder jemanden vergessen");
    expect(spokenGerman({ german: "zuhören (jemandem)" })).toBe("jemandem zuhören");
  });

  it("posiada nagranie dla każdej z 3038 kart i żadnych obcych identyfikatorów", () => {
    const cardIds = new Set(starterCards.map((card) => card.id));
    const audioIds = Object.keys(piperAudioClips);
    expect(starterCards).toHaveLength(3038);
    expect(audioIds).toHaveLength(3038);
    expect(audioIds.every((id) => cardIds.has(id))).toBe(true);
    expect(starterCards.every((card) => piperAudioClips[card.id])).toBe(true);
  });

  it("ma poprawne, bezpieczne czasy segmentów i publiczną bazę WebM/Opus", () => {
    expect(PIPER_AUDIO_BASE_URL).toMatch(
      /^https:\/\/[a-z0-9]+\.public\.blob\.vercel-storage\.com\/wortschatz\/kokoro-martin-v1$/,
    );
    expect(PIPER_AUDIO_MIME_TYPE).toBe('audio/webm; codecs="opus"');
    expect(PIPER_AUDIO_SPRITE_PREFIX).toBe("kokoro-martin");

    for (const [shard, start, duration] of Object.values(piperAudioClips)) {
      expect(shard).toBeGreaterThanOrEqual(0);
      expect(shard).toBeLessThan(64);
      expect(start).toBeGreaterThanOrEqual(0);
      expect(duration).toBeGreaterThan(0.1);
      expect(duration).toBeLessThan(10);
    }
  });
});
