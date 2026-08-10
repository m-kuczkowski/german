export type CardSource = "starter" | "anki" | "manual" | "ai" | "import";
export type LearningStage = "new" | "learning" | "uncertain" | "known" | "mastered";
export type CurriculumTier = "core" | "extension" | "specialist";
export type WordFamilyRole = "base" | "derived" | "compound";

export interface WordPart {
  german: string;
  polish: string;
}
export type ReviewRating = "again" | "hard" | "good";
export type LeitnerBox = 1 | 2 | 3 | 4 | 5;
export type ExerciseMode =
  | "choice-de-pl"
  | "choice-pl-de"
  | "choice-article"
  | "type-de-pl"
  | "type-pl-de"
  | "type-listen-de"
  | "type-context-de";
export type KnowledgeSkill = "meaning" | "form" | "article" | "listening" | "context";

export interface LearningSkillProgress {
  attempts: number;
  successes: number;
  correctStreak: number;
  lapses: number;
  lastPracticedAt: string;
  needsWork: boolean;
}

export type LearningStats = Partial<Record<KnowledgeSkill, LearningSkillProgress>>;
export type ChallengeType = "article" | "listening" | "writing" | "meaning" | "mixed";
export type ChallengeSkill = "article" | "listening" | "writing" | "meaning";
export type ChallengeExerciseMode =
  | "choice-article"
  | "type-listen-de"
  | "type-pl-de"
  | "choice-de-pl";

export interface ChallengeSkillProgress {
  attempts: number;
  successes: number;
  lastPracticedAt: string;
  needsWork: boolean;
}

export type ChallengeStats = Partial<Record<ChallengeSkill, ChallengeSkillProgress>>;

export type GrammarLevel = "A1" | "A2" | "B1";
export type GrammarTopicStatus = "new" | "learning" | "review" | "mastered";
export type GrammarExerciseType =
  | "multiple-choice"
  | "gap-fill"
  | "word-order"
  | "typed-form"
  | "case-choice"
  | "error-correction"
  | "translation-pl-de";

export interface GrammarExample {
  german: string;
  polish: string;
  highlight?: string;
}

export interface GrammarTheoryUseCase {
  title: string;
  description: string;
}

export interface GrammarPracticalTheory {
  whenToUse: string;
  useCases: GrammarTheoryUseCase[];
  steps: string[];
}

export interface GrammarTheory {
  rules: string[];
  practical: GrammarPracticalTheory;
  memoryTip: string;
  commonMistake: {
    incorrect: string;
    correct: string;
    explanation: string;
  };
}

export interface GrammarExerciseOption {
  id: string;
  text: string;
}

export interface GrammarExercise {
  id: string;
  type: GrammarExerciseType;
  instruction: string;
  prompt: string;
  promptTranslation?: string;
  answer: string;
  acceptedAnswers?: string[];
  options?: GrammarExerciseOption[];
  tokens?: string[];
  explanation: string;
  targetSkill: string;
  contextGerman: string;
  contextPolish: string;
}

export interface GrammarTopic {
  id: string;
  level: GrammarLevel;
  sortOrder: number;
  titlePl: string;
  titleDe: string;
  goalPl: string;
  explanation: string;
  pattern?: string;
  theory?: GrammarTheory;
  examples: GrammarExample[];
  prerequisites: string[];
  published: boolean;
  exercises: GrammarExercise[];
}

export interface GrammarTopicProgress {
  topicId: string;
  status: GrammarTopicStatus;
  masteryScore: number;
  lessonCompletions: number;
  reviewStep: number;
  nextReviewAt: string | null;
  firstStartedAt: string | null;
  lastPracticedAt: string | null;
  masteredAt: string | null;
  successfulReviewDates: string[];
}

export interface GrammarSessionItem {
  topicId: string;
  exerciseId: string;
  retry: boolean;
}

export interface GrammarSessionAnswer {
  topicId: string;
  exerciseId: string;
  answerValue: string;
  correct: boolean;
  score: number;
  answeredAt: string;
}

export interface GrammarSession {
  version: 1;
  kind: "lesson" | "review";
  queue: GrammarSessionItem[];
  index: number;
  startedAt: string;
  correct: number;
  mistakes: number;
  answers: GrammarSessionAnswer[];
  pendingAnswer: GrammarSessionAnswer | null;
}

export interface ReviewEvidence {
  mode: "introduction" | ExerciseMode;
  correct: boolean;
  score?: number;
}

export interface ReviewHistoryEntry {
  id: string;
  reviewedAt: string;
  mode: ReviewEvidence["mode"];
  rating: ReviewRating;
  correct: boolean;
  score: number | null;
  fromBox: LeitnerBox;
  toBox: LeitnerBox;
  scheduledFor: string;
  reason: string;
}

export interface CardContent {
  id: string;
  german: string;
  polish: string;
  article: "der" | "die" | "das" | null;
  plural: string | null;
  exampleGerman: string;
  examplePolish: string;
  category: string;
  curriculumTier?: CurriculumTier;
  curriculumOrder?: number;
  wordFamilyId?: string;
  wordFamilyRole?: WordFamilyRole;
  prerequisiteIds?: string[];
  wordParts?: WordPart[];
  level?: "A2" | "B1";
  goetheLevel?: "A2" | "B1";
  goetheSourceUrl?: string;
  sourceLabel?: string;
  sourceUrl?: string;
  sourceGloss?: string;
  sourceLanguage?: "de" | "en";
}

export interface Flashcard extends CardContent {
  source: CardSource;
  createdAt: string;
  repetitions: number;
  intervalDays: number;
  ease: number;
  dueAt: string;
  learned: boolean;
  lapses: number;
  stage: LearningStage;
  correctStreak: number;
  successfulModes: ExerciseMode[];
  firstActiveRecallAt: string | null;
  lastActiveRecallAt: string | null;
  lastReviewedAt: string | null;
  typedAttempts: number;
  typedSuccesses: number;
  leitnerBox: LeitnerBox;
  reviewHistory: ReviewHistoryEntry[];
  lastSchedulingReason: string;
  successfulReviewDays: string[];
  learningStats: LearningStats;
  challengeStats: ChallengeStats;
}

export interface SessionItem {
  id: string;
  kind: "introduction" | "guided-review" | "exercise";
  forcedMode?: ExerciseMode;
  round: number;
}

export interface LearningSession {
  version: 3;
  mode: "learn" | "review" | "hard";
  categoryId: string | null;
  plannedCount: number;
  queue: SessionItem[];
  index: number;
  startedAt: string;
  correct: number;
  mistakes: number;
  introduced: number;
  pendingAnswer: SessionAnswer | null;
}

export interface SessionAnswer {
  cardId: string;
  rating: ReviewRating;
  evidence: ReviewEvidence;
  answerValue: string | null;
  correctAnswer: string;
  fromBox: LeitnerBox;
  toBox: LeitnerBox;
  dueAt: string;
  reason: string;
  recordedAt: string;
}

export interface ChallengeItem {
  cardId: string;
  mode: ChallengeExerciseMode;
}

export interface ChallengeAnswer {
  cardId: string;
  mode: ChallengeExerciseMode;
  answerValue: string;
  correct: boolean;
  score: number;
  answeredAt: string;
}

export interface ChallengeSession {
  version: 1;
  type: ChallengeType;
  requestedCount: number;
  queue: ChallengeItem[];
  index: number;
  startedAt: string;
  updatedAt: string;
  correct: number;
  mistakes: number;
  answers: ChallengeAnswer[];
  pendingAnswer: ChallengeAnswer | null;
  retryOf: string | null;
}

export type LessonSize = 5 | 10 | 15 | 20;

export interface LearningMeta {
  streak: number;
  lastStudyDate: string | null;
  completedToday: number;
  totalReviews: number;
  lessonSize: LessonSize;
  theme: "system" | "light" | "dark";
  contentVersion: number;
  activeSession: LearningSession | null;
  activeChallenge: ChallengeSession | null;
  challengeUpdatedAt: string | null;
  activeGrammarSession: GrammarSession | null;
}

export interface BackupFile {
  version: 1;
  exportedAt: string;
  cards: Flashcard[];
  meta: LearningMeta;
  grammarProgress?: GrammarTopicProgress[];
}

export type TabId =
  | "learn"
  | "grammar"
  | "challenges"
  | "leitner"
  | "collection"
  | "settings";
