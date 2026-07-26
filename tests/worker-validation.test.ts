import { describe, expect, it } from "vitest";
import {
  extractResponseText,
  validateCount,
  validateGeneratedCards,
  validateTopic,
} from "../worker/src/validation";

const generated = {
  cards: Array.from({ length: 5 }, (_, index) => ({
    german: `Wort ${index}`,
    polish: `słowo ${index}`,
    article: null,
    plural: null,
    exampleGerman: `Das ist Wort ${index}.`,
    examplePolish: `To jest słowo ${index}.`,
    category: "Test",
  })),
};

describe("walidacja Workera", () => {
  it("ogranicza temat i dozwolone liczby kart", () => {
    expect(validateTopic("  wizyta u lekarza ")).toBe("wizyta u lekarza");
    expect(validateTopic("x")).toBeNull();
    expect(validateCount(10)).toBe(10);
    expect(validateCount(15)).toBeNull();
  });

  it("akceptuje tylko pełny zestaw zgodny ze schematem", () => {
    expect(validateGeneratedCards(generated, 5)).toHaveLength(5);
    expect(validateGeneratedCards({ cards: generated.cards.slice(1) }, 5)).toBeNull();
  });

  it("wydobywa tekst z surowej odpowiedzi Responses API", () => {
    const text = JSON.stringify(generated);
    expect(
      extractResponseText({
        output: [{ type: "message", content: [{ type: "output_text", text }] }],
      }),
    ).toBe(text);
  });
});
