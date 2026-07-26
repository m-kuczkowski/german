import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import {
  createExercise,
  isTypedAnswerCorrect,
  normalizeAnswer,
} from "../src/lib/exercises";

describe("ćwiczenia językowe", () => {
  it("przeplata wybór i wpisywanie w obu kierunkach", () => {
    const modes = [0, 1, 2, 3].map(
      (index) => createExercise(starterCards[0], starterCards, index).mode,
    );
    expect(modes).toEqual([
      "choice-de-pl",
      "type-pl-de",
      "choice-pl-de",
      "type-de-pl",
    ]);
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
});
