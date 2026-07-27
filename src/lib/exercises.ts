import type { ExerciseMode, Flashcard, LearningStage } from "../types";

export type { ExerciseMode } from "../types";

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
  promptLanguage: "de" | "pl";
  speechPrompt: string | null;
  inputPlaceholder: string;
}

export interface TypedAnswerResult {
  correct: boolean;
  score: number;
  bestMatch: string;
}

function germanLabel(card: Flashcard): string {
  return card.article ? `${card.article} ${card.german}` : card.german;
}

function germanSpeech(card: Flashcard): string {
  return germanLabel(card).replace(/[|·]/g, "");
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
  return [germanLabel(card)];
}

export interface KnowledgeFacet {
  id: "meaning" | "form" | "article" | "listening";
  label: string;
  achieved: boolean;
  applicable: boolean;
}

export function knowledgeFacets(card: Flashcard): KnowledgeFacet[] {
  const modes = new Set(card.successfulModes);
  return [
    {
      id: "meaning",
      label: "Znaczenie",
      achieved: modes.has("choice-de-pl") || modes.has("type-de-pl"),
      applicable: true,
    },
    {
      id: "form",
      label: "Forma",
      achieved: modes.has("type-pl-de") || modes.has("type-listen-de"),
      applicable: true,
    },
    {
      id: "article",
      label: "Rodzajnik",
      achieved: modes.has("choice-article") || modes.has("type-pl-de") ||
        modes.has("type-listen-de"),
      applicable: Boolean(card.article),
    },
    {
      id: "listening",
      label: "Słuch",
      achieved: modes.has("type-listen-de"),
      applicable: true,
    },
  ];
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
  const sameCategory = cards.filter((candidate) => candidate.category === card.category);
  const candidates = sameCategory.length >= 3 ? sameCategory : cards;
  const distractors = candidates
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

const stageModes: Record<Exclude<LearningStage, "new">, ExerciseMode[]> = {
  learning: ["choice-de-pl", "choice-pl-de"],
  uncertain: ["choice-de-pl", "choice-pl-de", "type-de-pl"],
  known: ["type-pl-de", "type-de-pl", "choice-pl-de"],
  mastered: ["type-pl-de", "type-de-pl", "choice-de-pl", "choice-pl-de"],
};

export function preferredExerciseMode(card: Flashcard, sessionIndex: number): ExerciseMode {
  const stage = card.stage === "new" ? "learning" : card.stage;
  const candidates = [...stageModes[stage]];
  if (stage !== "learning" && card.article) {
    candidates.splice(Math.min(1, candidates.length), 0, "choice-article");
  }
  if (stage === "known" || stage === "mastered") {
    candidates.splice(Math.min(card.article ? 2 : 1, candidates.length), 0, "type-listen-de");
  }
  const unseen = candidates.find((mode) => !card.successfulModes.includes(mode));
  return unseen ?? candidates[sessionIndex % candidates.length];
}

export function createExercise(
  card: Flashcard,
  cards: Flashcard[],
  sessionIndex: number,
  forcedMode?: ExerciseMode,
): Exercise {
  const mode = forcedMode ?? preferredExerciseMode(card, sessionIndex);
  if (mode === "choice-article" && card.article) {
    return {
      mode,
      prompt: card.german,
      instruction: "Wybierz właściwy rodzajnik",
      answerLabel: germanLabel(card),
      acceptedAnswers: [card.article],
      options: (["der", "die", "das"] as const).map((article) => ({
        cardId: `article-${article}`,
        label: article,
        correct: article === card.article,
      })),
      answerLanguage: "de",
      promptLanguage: "de",
      speechPrompt: null,
      inputPlaceholder: "",
    };
  }

  const listening = mode === "type-listen-de";
  const asksForGerman = mode === "choice-pl-de" || mode === "type-pl-de" || listening;
  const isChoice = mode.startsWith("choice");
  const acceptedAnswers = asksForGerman ? germanAnswers(card) : polishAnswers(card);
  return {
    mode,
    prompt: listening ? "" : asksForGerman ? card.polish : germanLabel(card),
    instruction: listening
      ? "Posłuchaj i wpisz po niemiecku"
      : isChoice
      ? asksForGerman
        ? "Wybierz po niemiecku"
        : "Wybierz po polsku"
      : asksForGerman
        ? "Napisz po niemiecku"
        : "Napisz po polsku",
    answerLabel: asksForGerman ? germanLabel(card) : card.polish,
    acceptedAnswers,
    options: isChoice
      ? choiceOptions(card, cards, asksForGerman ? "de" : "pl", sessionIndex)
      : [],
    answerLanguage: asksForGerman ? "de" : "pl",
    promptLanguage: asksForGerman ? "pl" : "de",
    speechPrompt: listening ? germanSpeech(card) : null,
    inputPlaceholder: listening
      ? "Wpisz to, co słyszysz…"
      : asksForGerman
        ? "Wpisz po niemiecku…"
        : "Wpisz po polsku…",
  };
}

function levenshtein(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1),
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

export function answerSimilarity(answer: string, accepted: string): number {
  const normalizedAnswer = normalizeAnswer(answer);
  const normalizedAccepted = normalizeAnswer(accepted);
  if (!normalizedAnswer || !normalizedAccepted) return 0;
  if (normalizedAnswer === normalizedAccepted) return 1;
  const longest = Math.max(normalizedAnswer.length, normalizedAccepted.length);
  return Math.max(0, 1 - levenshtein(normalizedAnswer, normalizedAccepted) / longest);
}

export function evaluateTypedAnswer(
  answer: string,
  acceptedAnswers: string[],
): TypedAnswerResult {
  const results = acceptedAnswers.map((accepted) => ({
    accepted,
    score: answerSimilarity(answer, accepted),
  }));
  const best = results.sort((left, right) => right.score - left.score)[0] ?? {
    accepted: acceptedAnswers[0] ?? "",
    score: 0,
  };
  return {
    correct: best.score >= 0.9,
    score: best.score,
    bestMatch: best.accepted,
  };
}

export function isTypedAnswerCorrect(answer: string, acceptedAnswers: string[]): boolean {
  return evaluateTypedAnswer(answer, acceptedAnswers).correct;
}
