import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { GrammarTheoryView } from "../src/components/GrammarView";
import { grammarTopics } from "../src/data/grammarCatalog";

describe("teoria gramatyki", () => {
  const published = grammarTopics.filter((topic) => topic.published);

  it("każda opublikowana lekcja ma zasady, sposób zapamiętania i typowy błąd", () => {
    expect(published).toHaveLength(12);
    for (const topic of published) {
      expect(topic.theory?.rules).toHaveLength(3);
      expect(topic.theory?.memoryTip.length).toBeGreaterThan(20);
      expect(topic.theory?.commonMistake.incorrect).not.toBe(topic.theory?.commonMistake.correct);
      expect(topic.examples.length).toBeGreaterThanOrEqual(3);
    }
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
    expect(html).toContain("Zapamiętaj te trzy rzeczy");
    expect(html).toContain("Zobacz regułę w zdaniu");
    expect(html).toContain("Typowy błąd");
    expect(html).toContain("Przejdź do ćwiczeń");
    expect(html).toContain("Du lernst Deutsch.");
  });
});
