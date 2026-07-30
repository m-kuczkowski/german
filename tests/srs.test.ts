import { describe, expect, it } from "vitest";
import { starterCards } from "../src/data/starterCards";
import {
  adaptiveIntervalDays,
  isDue,
  nextReviewLabel,
  reviewCard,
  sortForLearning,
  updateStreak,
} from "../src/lib/srs";

describe("algorytm powtórek", () => {
  const now = new Date("2026-07-26T10:00:00.000Z");

  it("deklaracja Znam nie awansuje bez aktywnego sprawdzenia", () => {
    const result = reviewCard(
      starterCards[0],
      "good",
      { mode: "introduction", correct: true },
      now,
    );
    expect(result.leitnerBox).toBe(1);
    expect(result.intervalDays).toBe(0);
    expect(new Date(result.dueAt).getTime() - now.getTime()).toBe(10 * 60 * 1000);
    expect(result.lastSchedulingReason).toContain("aktywne sprawdzenie");
  });

  it("prowadzona fiszka w przegródce 2 czeka z awansem na aktywne wpisanie", () => {
    const result = reviewCard(
      { ...starterCards[0], stage: "known", learned: true, leitnerBox: 2 },
      "good",
      { mode: "introduction", correct: true },
      now,
    );
    expect(result.leitnerBox).toBe(2);
    expect(result.learned).toBe(true);
    expect(result.correctStreak).toBe(0);
    expect(result.lastSchedulingReason).toContain("aktywne sprawdzenie");
  });

  it("Niepewnie pozostawia prowadzoną fiszkę w bieżącej przegródce", () => {
    const result = reviewCard(
      { ...starterCards[0], stage: "known", learned: true, leitnerBox: 3 },
      "hard",
      { mode: "introduction", correct: true },
      now,
    );
    expect(result.leitnerBox).toBe(3);
    expect(result.learned).toBe(true);
    expect(result.lastSchedulingReason).toContain("wróci jako dyktando");
  });

  it("Nie znam oznacza niepewność, ale nie kasuje całej historii słowa", () => {
    const result = reviewCard(
      { ...starterCards[0], stage: "known", learned: true, leitnerBox: 3 },
      "again",
      { mode: "introduction", correct: false },
      now,
    );
    expect(result.leitnerBox).toBe(3);
    expect(result.stage).toBe("uncertain");
    expect(result.lastSchedulingReason).toContain("odświeżenia");
  });

  it("aktywne poprawne odpowiedzi prowadzą przez przegródki 2–4", () => {
    const evidence = { mode: "choice-de-pl" as const, correct: true };
    const first = reviewCard(starterCards[0], "good", evidence, now);
    const second = reviewCard(first, "good", evidence, new Date("2026-07-29T10:00:00.000Z"));
    const third = reviewCard(second, "good", evidence, new Date("2026-08-05T10:00:00.000Z"));

    expect([first.leitnerBox, second.leitnerBox, third.leitnerBox]).toEqual([2, 3, 4]);
    expect([first.intervalDays, second.intervalDays, third.intervalDays]).toEqual([1, 7, 14]);
  });

  it("trudną kartę przywraca za 10 minut i zwiększa liczbę pomyłek", () => {
    const result = reviewCard(
      starterCards[0],
      "again",
      { mode: "introduction", correct: false },
      now,
    );
    expect(result.lapses).toBe(0);
    expect(result.stage).toBe("learning");
    expect(new Date(result.dueAt).getTime() - now.getTime()).toBe(10 * 60 * 1000);
  });

  it("po błędzie aktywnym obniża znane słowo do niepewnych", () => {
    const known = {
      ...starterCards[0],
      stage: "known" as const,
      learned: true,
      repetitions: 4,
      intervalDays: 14,
      leitnerBox: 4 as const,
      correctStreak: 4,
    };
    const result = reviewCard(
      known,
      "again",
      { mode: "type-pl-de", correct: false, score: 0.72 },
      now,
    );
    expect(result.stage).toBe("uncertain");
    expect(result.learned).toBe(false);
    expect(result.correctStreak).toBe(0);
    expect(result.leitnerBox).toBe(3);
    expect(result.reviewHistory.at(-1)?.correct).toBe(false);
  });

  it("opisuje trudną poprawną odpowiedź prostym zdaniem", () => {
    const result = reviewCard(
      { ...starterCards[0], leitnerBox: 2 as const, stage: "known" as const },
      "hard",
      { mode: "type-pl-de", correct: true, score: 0.92 },
      now,
    );
    expect(result.lastSchedulingReason).toBe(
      "Poprawnie, ale z wysiłkiem. Karta zostaje w przegródce 2 i wróci po krótszym odstępie.",
    );
  });

  it("przegródka 5 wymaga wpisywania, serii i trzech różnych dni", () => {
    const card = {
      ...starterCards[0],
      stage: "known" as const,
      learned: true,
      repetitions: 4,
      intervalDays: 14,
      leitnerBox: 4 as const,
      correctStreak: 3,
      successfulModes: ["choice-de-pl", "type-de-pl"] as const,
      firstActiveRecallAt: "2026-07-10T10:00:00.000Z",
      successfulReviewDays: ["2026-07-10", "2026-07-18"],
    };
    const result = reviewCard(
      { ...card, successfulModes: [...card.successfulModes] },
      "good",
      { mode: "type-pl-de", correct: true },
      now,
    );
    expect(result.stage).toBe("mastered");
    expect(result.leitnerBox).toBe(5);
    expect(result.successfulReviewDays).toHaveLength(3);
    expect(result.intervalDays).toBe(30);
  });

  it("traktuje poprawne dyktando jako aktywne odtworzenie formy", () => {
    const result = reviewCard(
      { ...starterCards[0], stage: "known", leitnerBox: 2 },
      "good",
      { mode: "type-listen-de", correct: true, score: 1 },
      now,
    );
    expect(result.leitnerBox).toBe(2);
    expect(result.typedAttempts).toBe(1);
    expect(result.typedSuccesses).toBe(1);
    expect(result.successfulModes).toContain("type-listen-de");
  });

  it("błędny rodzajnik osłabia tylko tę umiejętność", () => {
    const result = reviewCard(
      { ...starterCards[0], stage: "known", leitnerBox: 3 },
      "again",
      { mode: "choice-article", correct: false, score: 0 },
      now,
    );
    expect(result.leitnerBox).toBe(3);
    expect(result.stage).toBe("known");
    expect(result.lapses).toBe(1);
    expect(result.learningStats.article?.needsWork).toBe(true);
  });

  it("pozwala na najwyżej jeden awans przegródki dziennie", () => {
    const evidence = { mode: "type-pl-de" as const, correct: true, score: 1 };
    const first = reviewCard(starterCards[0], "good", evidence, now);
    const second = reviewCard(first, "good", evidence, new Date("2026-07-26T14:00:00.000Z"));
    expect(first.leitnerBox).toBe(2);
    expect(second.leitnerBox).toBe(2);
    expect(second.intervalDays).toBe(1);
    expect(second.lastSchedulingReason).toContain("awans został już wykorzystany");
  });

  it("dopasowuje odstęp do łatwości i liczby wcześniejszych potknięć", () => {
    expect(adaptiveIntervalDays({ ease: 2.8, lapses: 0 }, 4))
      .toBeGreaterThan(adaptiveIntervalDays({ ease: 1.5, lapses: 4 }, 4));
  });

  it("ustawia trudne i zaległe karty na początku", () => {
    const future = { ...starterCards[0], dueAt: "2027-01-01T00:00:00.000Z" };
    const hard = { ...starterCards[1], dueAt: "2026-01-01T00:00:00.000Z", lapses: 3 };
    const easy = { ...starterCards[2], dueAt: "2026-01-01T00:00:00.000Z", lapses: 0 };
    const sorted = sortForLearning([future, easy, hard], now);
    expect(sorted.map((card) => card.id)).toEqual([hard.id, easy.id, future.id]);
    expect(isDue(future, now)).toBe(false);
  });

  it("podtrzymuje serię tylko dla kolejnych dni", () => {
    expect(updateStreak(4, "2026-07-25", now).streak).toBe(5);
    expect(updateStreak(4, "2026-07-20", now).streak).toBe(1);
  });

  it("pokazuje terminy w ludzkim języku", () => {
    expect(nextReviewLabel("2026-07-26T10:10:00.000Z", now)).toBe("za 10 min");
    expect(nextReviewLabel("2026-07-27T10:00:00.000Z", now)).toBe("jutro");
    expect(nextReviewLabel("2026-08-02T10:00:00.000Z", now)).toBe("za 7 dni");
  });
});
