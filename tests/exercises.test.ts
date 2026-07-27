import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import {
  answerSimilarity,
  createExercise,
  evaluateTypedAnswer,
  isTypedAnswerCorrect,
  knowledgeFacets,
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

  it("traktuje fragmenty niemieckiej odpowiedzi w nawiasach jako opcjonalne", () => {
    const phrase = {
      ...starterCards[0],
      article: null,
      german: "Interesse (an etwas) haben",
    };
    const exercise = createExercise(phrase, [phrase, ...starterCards.slice(1)], 0, "type-pl-de");
    expect(evaluateTypedAnswer("Interesse haben", exercise.acceptedAnswers)).toMatchObject({
      correct: true,
      score: 1,
    });
    expect(isTypedAnswerCorrect("Interesse (an etwas) haben", exercise.acceptedAnswers)).toBe(true);
  });

  it("pomija opcjonalny fragment także na początku zwrotu", () => {
    const phrase = {
      ...starterCards[0],
      article: null,
      german: "(vor etwas) fliehen",
    };
    const exercise = createExercise(phrase, [phrase, ...starterCards.slice(1)], 0, "type-listen-de");
    expect(evaluateTypedAnswer("fliehen", exercise.acceptedAnswers)).toMatchObject({
      correct: true,
      score: 1,
    });
  });

  it("ocenia naturalne hasła z poprawionego katalogu bez wskazówek gramatycznych", () => {
    const vergessen = starterCards.find((card) => card.id === "nicos-a2-3e7af31ad03f")!;
    const zuhoeren = starterCards.find((card) => card.id === "nicos-a2-7ecd4eacc8a5")!;
    const vergessenExercise = createExercise(
      vergessen,
      starterCards,
      0,
      "type-pl-de",
    );
    const zuhoerenExercise = createExercise(
      zuhoeren,
      starterCards,
      0,
      "type-pl-de",
    );

    expect(evaluateTypedAnswer("vergessen", vergessenExercise.acceptedAnswers))
      .toMatchObject({ correct: true, score: 1 });
    expect(evaluateTypedAnswer("zuhören", zuhoerenExercise.acceptedAnswers))
      .toMatchObject({ correct: true, score: 1 });
  });

  it("ćwiczy rodzajnik osobno dla poznanego rzeczownika", () => {
    const noun = starterCards.find((card) => card.article);
    expect(noun).toBeDefined();
    const exercise = createExercise(
      { ...noun!, stage: "known", successfulModes: ["type-pl-de"] },
      starterCards,
      0,
    );
    expect(exercise.mode).toBe("choice-article");
    expect(exercise.prompt).toBe(noun!.german);
    expect(exercise.promptLanguage).toBe("de");
    expect(exercise.options.map((option) => option.label)).toEqual(["der", "die", "das"]);
    expect(exercise.options.filter((option) => option.correct).map((option) => option.label))
      .toEqual([noun!.article]);
  });

  it("buduje dyktando bez pokazywania niemieckiej odpowiedzi", () => {
    const card = starterCards[0];
    const exercise = createExercise(card, starterCards, 0, "type-listen-de");
    expect(exercise.prompt).toBe("");
    expect(exercise.speechPrompt).toBe(exercise.answerLabel);
    expect(exercise.instruction).toContain("Posłuchaj");
    expect(exercise.inputPlaceholder).toContain("słyszysz");
  });

  it("śledzi osobno znaczenie, formę, rodzajnik i słuch", () => {
    const noun = starterCards.find((card) => card.article)!;
    const facets = knowledgeFacets({
      ...noun,
      successfulModes: ["choice-de-pl", "choice-article", "type-listen-de"],
    });
    expect(Object.fromEntries(facets.map((facet) => [facet.id, facet.achieved]))).toEqual({
      meaning: true,
      form: true,
      article: true,
      listening: true,
    });
  });
});
