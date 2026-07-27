import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ChallengeDashboard } from "../src/components/ChallengeDashboard";
import { ChallengeSession } from "../src/components/ChallengeSession";
import { starterCards } from "../src/data/starterCards";
import {
  availableChallengeTypes,
  createChallengeSession,
  recordChallengeAnswer,
} from "../src/lib/challenges";

const knownCards = starterCards.slice(0, 12).map((card) => ({
  ...card,
  stage: "known" as const,
  learned: true,
}));

describe("interfejs wyzwań", () => {
  it("pokazuje dostępne tryby i wybór liczby zadań bez dodatkowego potwierdzenia", () => {
    const html = renderToStaticMarkup(
      <ChallengeDashboard
        available={availableChallengeTypes(knownCards)}
        selectedType="writing"
        onSelect={() => undefined}
        onStart={() => undefined}
      />,
    );
    expect(html).toContain("Wyzwania");
    expect(html).toContain("Napisz po niemiecku");
    expect(html).toContain("Ile zadań?");
    expect(html).toContain("Wszystkie");
  });

  it("w rodzajnikach pokazuje lukę, duże słowo i trzy stałe odpowiedzi", () => {
    const nouns = knownCards.filter((card) => card.article);
    const session = createChallengeSession(nouns, "article", 1, new Date("2026-07-27"), () => 0);
    const card = nouns.find((candidate) => candidate.id === session.queue[0].cardId)!;
    const html = renderToStaticMarkup(
      <ChallengeSession
        cards={nouns}
        session={session}
        onAnswer={() => undefined}
        onNext={() => undefined}
        onSpeak={() => undefined}
      />,
    );
    expect(html).toContain("___");
    expect(html).toContain(card.german);
    expect(html).toContain(">der<");
    expect(html).toContain(">die<");
    expect(html).toContain(">das<");
  });

  it("dyktando ukrywa niemieckie hasło przed odpowiedzią", () => {
    const session = createChallengeSession(
      knownCards,
      "listening",
      1,
      new Date("2026-07-27"),
      () => 0,
    );
    const card = knownCards.find((candidate) => candidate.id === session.queue[0].cardId)!;
    const html = renderToStaticMarkup(
      <ChallengeSession
        cards={knownCards}
        session={session}
        onAnswer={() => undefined}
        onNext={() => undefined}
        onSpeak={() => undefined}
      />,
    );
    expect(html).toContain("Odtwórz słowo");
    expect(html).not.toContain(card.german);
  });

  it("po odpowiedzi zachowuje kontekst i wymaga ręcznego kliknięcia Dalej", () => {
    const session = createChallengeSession(
      knownCards,
      "writing",
      1,
      new Date("2026-07-27"),
      () => 0,
    );
    const item = session.queue[0];
    const answered = recordChallengeAnswer(
      session,
      item,
      "odpowiedź",
      { correct: false, score: 0.5, correctAnswer: "poprawna" },
      new Date("2026-07-27T10:00:00.000Z"),
    );
    const card = knownCards.find((candidate) => candidate.id === item.cardId)!;
    const html = renderToStaticMarkup(
      <ChallengeSession
        cards={knownCards}
        session={answered}
        onAnswer={() => undefined}
        onNext={() => undefined}
        onSpeak={() => undefined}
      />,
    );
    expect(html).toContain("W kontekście");
    expect(html).toContain(card.exampleGerman);
    expect(html).toContain("Dalej");
    expect(html).toContain("Termin zwykłej powtórki pozostaje bez zmian");
  });
});
