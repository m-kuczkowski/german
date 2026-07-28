import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

describe("long German flashcard words", () => {
  it("can shrink and wrap instead of being clipped", () => {
    const rule = styles.match(
      /\.flip-face\s*>\s*strong\.long-single-word\s*\{([^}]*)\}/,
    )?.[1];

    expect(rule).toBeDefined();
    expect(rule).toContain("font-size: clamp(24px, 7.2vw, 38px)");
    expect(rule).toContain("hyphens: auto");
    expect(rule).toContain("overflow-wrap: anywhere");
    expect(rule).toContain("white-space: normal");
    expect(rule).not.toContain("white-space: nowrap");
  });
});
