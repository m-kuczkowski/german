import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import {
  answerSimilarity,
  createExercise,
  evaluateTypedAnswer,
  isTypedAnswerCorrect,
  normalizeAnswer,
} from "../src/lib/exercises";

describe("ćwiczenia językowe", () => {
  it("zwiększa trudność ćwiczeń wraz ze znajomością słowa", () => {
    const learning = createExercise(
      { ...starterCards[0], stage: "learning" },
      starterCards,
      0,
    );
    const known = createExercise(
      { ...starterCards[0], stage: "known" },
      starterCards,
      0,
    );
    expect(learning.mode).toBe("choice-de-pl");
    expect(known.mode).toBe("type-pl-de");
  });

  it("buduje trzy unikalne odpowiedzi z dokładnie jedną poprawną", () => {
    const exercise = createExercise(starterCards[0], starterCards, 0);
    expect(exercise.options).toHaveLength(3);
    expect(new Set(exercise.options.map((option) => option.label)).size).toBe(3);
    expect(exercise.options.filter((option) => option.correct)).toHaveLength(1);
  });

  it("akceptuje wielkość liter, rodzajnik i zapis czasownika rozdzielnie złożonego", () => {
    const noun = starterCards.find((card) => card.article);
    expect(noun).toBeDefined();
    const exercise = createExercise(noun!, starterCards, 1);
    expect(isTypedAnswerCorrect(`  ${exercise.answerLabel.toUpperCase()}! `, exercise.acceptedAnswers)).toBe(true);
    expect(normalizeAnswer("an|sehen")).toBe("ansehen");
  });

  it("odrzuca błędną odpowiedź", () => {
    const exercise = createExercise(starterCards[0], starterCards, 3);
    expect(isTypedAnswerCorrect("zupełnie inne słowo", exercise.acceptedAnswers)).toBe(false);
  });

  it("zalicza co najmniej 90% zgodności i odrzuca wynik poniżej progu", () => {
    expect(evaluateTypedAnswer("Krankenhavs", ["Krankenhaus"]).correct).toBe(true);
    expect(answerSimilarity("Krankenhavs", "Krankenhaus")).toBeGreaterThanOrEqual(0.9);
    expect(evaluateTypedAnswer("schon", ["schön"]).correct).toBe(false);
  });

  it("wymaga rodzajnika, jeśli rzeczownik go posiada", () => {
    const noun = starterCards.find((card) => card.article);
    expect(noun).toBeDefined();
    const exercise = createExercise(noun!, starterCards, 0, "type-pl-de");
    expect(isTypedAnswerCorrect(noun!.german, exercise.acceptedAnswers)).toBe(false);
    expect(isTypedAnswerCorrect(exercise.answerLabel, exercise.acceptedAnswers)).toBe(true);
  });
});
