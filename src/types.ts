export type CardSource = "starter" | "anki" | "manual" | "ai" | "import";
export type LearningStage = "new" | "learning" | "uncertain" | "known" | "mastered";
export type ReviewRating = "again" | "hard" | "good";
export type ExerciseMode =
  | "choice-de-pl"
  | "choice-pl-de"
  | "type-de-pl"
  | "type-pl-de";

export interface CardContent {
  id: string;
  german: string;
  polish: string;
  article: "der" | "die" | "das" | null;
  plural: string | null;
  exampleGerman: string;
  examplePolish: string;
  category: string;
  level?: "A2" | "B1";
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
}

export interface SessionItem {
  id: string;
  kind: "introduction" | "exercise";
  forcedMode?: ExerciseMode;
  round: number;
}

export interface LearningSession {
  version: 1;
  mode: "learn" | "review" | "hard";
  categoryId: string | null;
  queue: SessionItem[];
  index: number;
  startedAt: string;
  correct: number;
  mistakes: number;
  introduced: number;
}

export interface LearningMeta {
  streak: number;
  lastStudyDate: string | null;
  completedToday: number;
  totalReviews: number;
  theme: "system" | "light" | "dark";
  contentVersion: number;
  activeSession: LearningSession | null;
}

export interface BackupFile {
  version: 1;
  exportedAt: string;
  cards: Flashcard[];
  meta: LearningMeta;
}

export type TabId = "learn" | "review" | "collection" | "progress" | "settings";
