import type { Flashcard } from "../types";

export type ExerciseMode =
  | "choice-de-pl"
  | "choice-pl-de"
  | "type-de-pl"
  | "type-pl-de";

export interface ChoiceOption {
  cardId: string;
  label: string;
  correct: boolean;
}

export interface Exercise {
  mode: ExerciseMode;
  prompt: string;
  instruction: string;
  answerLabel: string;
  acceptedAnswers: string[];
  options: ChoiceOption[];
  answerLanguage: "de" | "pl";
}

const modes: ExerciseMode[] = [
  "choice-de-pl",
  "type-pl-de",
  "choice-pl-de",
  "type-de-pl",
];

function germanLabel(card: Flashcard): string {
  return card.article ? `${card.article} ${card.german}` : card.german;
}

export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFC")
    .trim()
    .toLocaleLowerCase("de-DE")
    .replace(/[|·]/g, "")
    .replace(/[„“”"'.!?;:()[\]]/g, "")
    .replace(/\s+/g, " ");
}

function polishAnswers(card: Flashcard): string[] {
  const variants = [card.polish, ...card.polish.split(/[;,/]/)];
  return [...new Set(variants.map((value) => value.trim()).filter(Boolean))];
}

function germanAnswers(card: Flashcard): string[] {
  return [...new Set([card.german, germanLabel(card), card.exampleGerman].filter(Boolean))];
}

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function choiceOptions(
  card: Flashcard,
  cards: Flashcard[],
  language: "de" | "pl",
  sessionIndex: number,
): ChoiceOption[] {
  const label = language === "de" ? germanLabel : (item: Flashcard) => item.polish;
  const correctLabel = label(card);
  const used = new Set([normalizeAnswer(correctLabel)]);
  const distractors = cards
    .filter((candidate) => candidate.id !== card.id)
    .sort(
      (left, right) =>
        hash(`${card.id}:${sessionIndex}:${left.id}`) -
        hash(`${card.id}:${sessionIndex}:${right.id}`),
    )
    .filter((candidate) => {
      const normalized = normalizeAnswer(label(candidate));
      if (!normalized || used.has(normalized)) return false;
      used.add(normalized);
      return true;
    })
    .slice(0, 2);

  return [card, ...distractors]
    .sort(
      (left, right) =>
        hash(`${sessionIndex}:${left.id}:position`) -
        hash(`${sessionIndex}:${right.id}:position`),
    )
    .map((candidate) => ({
      cardId: candidate.id,
      label: label(candidate),
      correct: candidate.id === card.id,
    }));
}

export function createExercise(
  card: Flashcard,
  cards: Flashcard[],
  sessionIndex: number,
): Exercise {
  const mode = modes[sessionIndex % modes.length];
  const asksForGerman = mode.endsWith("pl-de");
  const isChoice = mode.startsWith("choice");
  const acceptedAnswers = asksForGerman ? germanAnswers(card) : polishAnswers(card);
  return {
    mode,
    prompt: asksForGerman ? card.polish : germanLabel(card),
    instruction: isChoice
      ? asksForGerman
        ? "Wybierz niemieckie tłumaczenie"
        : "Wybierz polskie tłumaczenie"
      : asksForGerman
        ? "Napisz po niemiecku"
        : "Napisz po polsku",
    answerLabel: asksForGerman ? germanLabel(card) : card.polish,
    acceptedAnswers,
    options: isChoice
      ? choiceOptions(card, cards, asksForGerman ? "de" : "pl", sessionIndex)
      : [],
    answerLanguage: asksForGerman ? "de" : "pl",
  };
}

export function isTypedAnswerCorrect(answer: string, acceptedAnswers: string[]): boolean {
  const normalized = normalizeAnswer(answer);
  return (
    normalized.length > 0 &&
    acceptedAnswers.some((accepted) => normalizeAnswer(accepted) === normalized)
  );
}
