import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GrammarTheoryView, GrammarView } from "../src/components/GrammarView";
import { grammarTopics } from "../src/data/grammarCatalog";
import { createGrammarLesson } from "../src/lib/grammar";

describe("teoria gramatyki", () => {
  const published = grammarTopics.filter((topic) => topic.published);

  it("każda opublikowana lekcja ma 20 ćwiczeń oraz praktyczną teorię", () => {
    expect(published).toHaveLength(26);
    for (const topic of published) {
      expect(topic.exercises).toHaveLength(20);
      expect(new Set(topic.exercises.map((exercise) => exercise.id))).toHaveLength(20);
      expect(topic.exercises.every((exercise) => exercise.contextGerman.length > 0 && exercise.contextPolish.length > 0)).toBe(true);
      expect(topic.theory?.rules).toHaveLength(3);
      expect(topic.theory?.practical.useCases).toHaveLength(2);
      expect(topic.theory?.practical.steps).toHaveLength(3);
      expect(topic.theory?.practical.whenToUse.length).toBeGreaterThan(40);
      expect(topic.theory?.memoryTip.length).toBeGreaterThan(20);
      expect(topic.theory?.commonMistake.incorrect).not.toBe(topic.theory?.commonMistake.correct);
      expect(topic.examples.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("udostępnia pełną ścieżkę A1 bez tematów w przygotowaniu", () => {
    const a1Topics = grammarTopics.filter((topic) => topic.level === "A1");
    expect(a1Topics).toHaveLength(20);
    expect(a1Topics.every((topic) => topic.published)).toBe(true);
    expect(a1Topics.map((topic) => topic.sortOrder)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
  });

  it("pokazuje pełną teorię i pozwala przejść do ćwiczeń", () => {
    const topic = published.find((item) => item.id === "A1-03")!;
    const html = renderToStaticMarkup(
      <GrammarTheoryView
        topic={topic}
        onBack={() => undefined}
        onStart={() => undefined}
        onSpeak={() => undefined}
      />,
    );
    expect(html).toContain("O co tutaj chodzi?");
    expect(html).toContain("Kiedy to naprawdę się przydaje?");
    expect(html).toContain("Jak to zrobić krok po kroku?");
    expect(html).toContain("Zapamiętaj te trzy rzeczy");
    expect(html).toContain("Zobacz regułę w zdaniu");
    expect(html).toContain("Typowy błąd");
    expect(html).toContain("Przejdź do ćwiczeń");
    expect(html).toContain("Du lernst Deutsch.");
  });

  it("udostępnia teorię również w trakcie aktywnego ćwiczenia", () => {
    const topic = published.find((item) => item.id === "A1-03")!;
    const session = createGrammarLesson(topic, new Date("2026-08-01T10:00:00.000Z"));
    const html = renderToStaticMarkup(
      <GrammarView
        topics={grammarTopics}
        progress={[]}
        session={session}
        onStartLesson={() => undefined}
        onStartReview={() => undefined}
        onAnswer={() => undefined}
        onNext={() => undefined}
        onFinish={() => undefined}
        onAbort={() => undefined}
        onSpeak={() => undefined}
      />,
    );
    expect(html).toContain("session-theory-button");
    expect(html).toContain("Teoria");
    expect(html).toContain("Przerwij");
  });
});
