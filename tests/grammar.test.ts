import { describe, expect, it } from "vitest";
import { grammarTopics } from "../src/data/grammarCatalog";
import {
  advanceGrammarSession,
  completeGrammarSession,
  createGrammarLesson,
  createGrammarReview,
  dueGrammarTopics,
  evaluateGrammarAnswer,
  grammarProgressFor,
  normalizeGermanAnswer,
  recordGrammarAnswer,
} from "../src/lib/grammar";

describe("lekcje gramatyki", () => {
  const present = grammarTopics.find((topic) => topic.id === "A1-03")!;

  it("normalizuje typowe niemieckie zamienniki liter, ale nie zmienia składni", () => {
    expect(normalizeGermanAnswer("  Ich könnte  ")).toBe("ich koennte");
    expect(normalizeGermanAnswer("Straße!")).toBe("strasse");
  });

  it("akceptuje równoważny zapis umlautu w odpowiedzi wpisywanej", () => {
    const exercise = grammarTopics.find((topic) => topic.id === "B1-13")!.exercises[3]!;
    expect(evaluateGrammarAnswer(exercise, "koennte")).toMatchObject({ correct: true, score: 1 });
    expect(evaluateGrammarAnswer(exercise, "konnte").correct).toBe(false);
  });

  it("tworzy krótką lekcję z ćwiczeniami danego tematu", () => {
    const session = createGrammarLesson(present, new Date("2026-08-01T09:00:00.000Z"));
    expect(session.queue).toHaveLength(5);
    expect(new Set(session.queue.map((item) => item.topicId))).toEqual(new Set(["A1-03"]));
  });

  it("po błędzie wstawia inne ćwiczenie tego samego celu kilka pozycji później", () => {
    const session = createGrammarLesson(present, new Date("2026-08-01T09:00:00.000Z"));
    const first = session.queue[0]!;
    const recorded = recordGrammarAnswer(session, {
      topicId: first.topicId,
      exerciseId: first.exerciseId,
      answerValue: "błąd",
      correct: false,
      score: 0,
      answeredAt: "2026-08-01T09:01:00.000Z",
    });
    const advanced = advanceGrammarSession(recorded);
    expect(advanced.index).toBe(1);
    expect(advanced.queue).toHaveLength(6);
    expect(advanced.queue.some((item) => item.retry)).toBe(true);
  });

  it("planuje rozłożoną powtórkę niezależnie od koszyków fiszek", () => {
    const session = createGrammarLesson(present, new Date("2026-08-01T09:00:00.000Z"));
    const completed = {
      ...session,
      index: session.queue.length,
      answers: session.queue.map((item, index) => ({
        topicId: item.topicId,
        exerciseId: item.exerciseId,
        answerValue: "ok",
        correct: true,
        score: 1,
        answeredAt: `2026-08-01T09:0${index}:00.000Z`,
      })),
      correct: session.queue.length,
    };
    const progress = completeGrammarSession([], completed, new Date("2026-08-01T09:10:00.000Z"));
    const item = grammarProgressFor(progress, "A1-03");
    expect(item.status).toBe("review");
    expect(item.nextReviewAt).toBe("2026-08-02T09:10:00.000Z");
    expect(dueGrammarTopics(grammarTopics, progress, new Date("2026-08-01T10:00:00.000Z"))).toHaveLength(0);
    expect(dueGrammarTopics(grammarTopics, progress, new Date("2026-08-02T09:10:00.000Z"))[0]?.id).toBe("A1-03");
    expect(createGrammarReview(grammarTopics, progress, new Date("2026-08-02T09:10:00.000Z")).queue).toHaveLength(2);
  });
});
