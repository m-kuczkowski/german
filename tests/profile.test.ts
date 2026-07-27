import { describe, expect, it } from "vitest";
import { normalizeProfileName } from "../src/lib/profile";

describe("profile imienne", () => {
  it("porządkuje spacje i zachowuje polskie znaki", () => {
    expect(normalizeProfileName("  Maciej   Kuczkowski ")).toBe("Maciej Kuczkowski");
    expect(normalizeProfileName("Łukasz")).toBe("Łukasz");
  });

  it("odrzuca puste, zbyt krótkie i techniczne identyfikatory", () => {
    expect(normalizeProfileName("")).toBeNull();
    expect(normalizeProfileName("M")).toBeNull();
    expect(normalizeProfileName("maciej@example.com")).toBeNull();
    expect(normalizeProfileName("Maciej_123")).toBeNull();
  });
});
