import type { ExerciseMode, Flashcard, KnowledgeSkill, LearningStage } from "../types";

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
  supportingText: string | null;
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

function normalizeGermanKeyboardVariants(value: string): string {
  return normalizeAnswer(value)
    .replace(/ß/g, "ss")
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue");
}

function polishAnswers(card: Flashcard): string[] {
  const variants = [card.polish, ...card.polish.split(/[;,/]/)];
  return [...new Set(variants.map((value) => value.trim()).filter(Boolean))];
}

function withoutParentheticalParts(value: string): string {
  return value
    .replace(/\s*\([^()]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function germanAnswers(card: Flashcard): string[] {
  const fullAnswer = germanLabel(card);
  return [...new Set([fullAnswer, withoutParentheticalParts(fullAnswer)])];
}

export interface KnowledgeFacet {
  id: KnowledgeSkill;
  label: string;
  achieved: boolean;
  applicable: boolean;
}

export function knowledgeFacets(card: Flashcard): KnowledgeFacet[] {
  const modes = new Set(card.successfulModes);
  const achieved = (skill: KnowledgeSkill, legacy: boolean) => {
    const progress = card.learningStats?.[skill];
    return progress ? progress.successes > 0 && !progress.needsWork : legacy;
  };
  return [
    {
      id: "meaning",
      label: "Znaczenie",
      achieved: achieved("meaning", modes.has("choice-de-pl") || modes.has("type-de-pl")),
      applicable: true,
    },
    {
      id: "form",
      label: "Forma",
      achieved: achieved("form", modes.has("type-pl-de") || modes.has("type-listen-de")),
      applicable: true,
    },
    {
      id: "article",
      label: "Rodzajnik",
      achieved: achieved(
        "article",
        modes.has("choice-article") || modes.has("type-pl-de") ||
          modes.has("type-listen-de"),
      ),
      applicable: Boolean(card.article),
    },
    {
      id: "listening",
      label: "Słuch",
      achieved: achieved("listening", modes.has("type-listen-de")),
      applicable: true,
    },
    {
      id: "context",
      label: "Kontekst",
      achieved: achieved("context", modes.has("type-context-de")),
      applicable: Boolean(contextCloze(card)),
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
  learning: ["type-listen-de", "type-pl-de"],
  uncertain: ["type-listen-de", "type-pl-de"],
  known: ["type-pl-de", "type-de-pl", "choice-pl-de"],
  mastered: ["type-pl-de", "type-de-pl", "choice-de-pl", "choice-pl-de"],
};

interface ContextCloze {
  prompt: string;
  answer: string;
}

export function contextCloze(card: Flashcard): ContextCloze | null {
  const target = withoutParentheticalParts(card.german)
    .replace(/^(der|die|das)\s+/i, "")
    .trim();
  if (!target || target.length < 2 || !card.exampleGerman) return null;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = card.exampleGerman.match(
    new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "iu"),
  );
  if (!match || match.index === undefined) return null;
  return {
    prompt: `${card.exampleGerman.slice(0, match.index)}_____${
      card.exampleGerman.slice(match.index + match[0].length)
    }`,
    answer: match[0],
  };
}

export function preferredExerciseMode(card: Flashcard, sessionIndex: number): ExerciseMode {
  const stage = card.stage === "new" ? "learning" : card.stage;
  const candidates = [...stageModes[stage]];
  if ((stage === "known" || stage === "mastered") && card.article) {
    candidates.splice(Math.min(1, candidates.length), 0, "choice-article");
  }
  if (stage === "known" || stage === "mastered") {
    candidates.splice(Math.min(card.article ? 2 : 1, candidates.length), 0, "type-listen-de");
  }
  if ((stage === "known" && card.leitnerBox >= 4) || stage === "mastered") {
    if (contextCloze(card)) candidates.unshift("type-context-de");
  }
  const unseen = candidates.find((mode) => {
    const skill = exerciseSkill(mode);
    const progress = card.learningStats?.[skill];
    return progress ? progress.successes === 0 || progress.needsWork : !card.successfulModes.includes(mode);
  });
  return unseen ?? candidates[sessionIndex % candidates.length];
}

export function exerciseSkill(mode: ExerciseMode): KnowledgeSkill {
  if (mode === "choice-article") return "article";
  if (mode === "type-listen-de") return "listening";
  if (mode === "type-context-de") return "context";
  if (mode === "type-pl-de" || mode === "choice-pl-de") return "form";
  return "meaning";
}

export function createExercise(
  card: Flashcard,
  cards: Flashcard[],
  sessionIndex: number,
  forcedMode?: ExerciseMode,
): Exercise {
  const requestedMode = forcedMode ?? preferredExerciseMode(card, sessionIndex);
  const mode = requestedMode === "type-context-de" && !contextCloze(card)
    ? "type-pl-de"
    : requestedMode;
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
      supportingText: null,
    };
  }

  if (mode === "type-context-de") {
    const cloze = contextCloze(card);
    if (cloze) {
      return {
        mode,
        prompt: cloze.prompt,
        instruction: "Uzupełnij zdanie po niemiecku",
        answerLabel: cloze.answer,
        acceptedAnswers: [cloze.answer],
        options: [],
        answerLanguage: "de",
        promptLanguage: "de",
        speechPrompt: null,
        inputPlaceholder: "Wpisz brakujące słowo…",
        supportingText: card.examplePolish,
      };
    }
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
    supportingText: null,
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

export function answerSimilarity(
  answer: string,
  accepted: string,
  language: "de" | "pl" = "de",
): number {
  const normalize = language === "de" ? normalizeGermanKeyboardVariants : normalizeAnswer;
  const normalizedAnswer = normalize(answer);
  const normalizedAccepted = normalize(accepted);
  if (!normalizedAnswer || !normalizedAccepted) return 0;
  if (normalizedAnswer === normalizedAccepted) return 1;
  const longest = Math.max(normalizedAnswer.length, normalizedAccepted.length);
  return Math.max(0, 1 - levenshtein(normalizedAnswer, normalizedAccepted) / longest);
}

export function evaluateTypedAnswer(
  answer: string,
  acceptedAnswers: string[],
  language: "de" | "pl" = "de",
): TypedAnswerResult {
  const results = acceptedAnswers.map((accepted) => ({
    accepted,
    score: answerSimilarity(answer, accepted, language),
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

export function isTypedAnswerCorrect(
  answer: string,
  acceptedAnswers: string[],
  language: "de" | "pl" = "de",
): boolean {
  return evaluateTypedAnswer(answer, acceptedAnswers, language).correct;
}
