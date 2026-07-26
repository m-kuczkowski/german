export type CardSource = "starter" | "manual" | "ai" | "import";

export interface CardContent {
  id: string;
  german: string;
  polish: string;
  article: "der" | "die" | "das" | null;
  plural: string | null;
  exampleGerman: string;
  examplePolish: string;
  category: string;
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
}

export interface LearningMeta {
  streak: number;
  lastStudyDate: string | null;
  completedToday: number;
  totalReviews: number;
  theme: "system" | "light" | "dark";
}

export interface BackupFile {
  version: 1;
  exportedAt: string;
  cards: Flashcard[];
  meta: LearningMeta;
}

export type TabId = "learn" | "review" | "collection" | "progress" | "settings";

export interface GeneratedCardsResponse {
  cards: CardContent[];
}
