import { toFlashcard } from "../lib/cards";
import type { Flashcard } from "../types";
import { applyCardCorrection } from "./cardCorrections";
import { goetheCategories, goetheContents } from "./goetheCards";

const seedDate = new Date("2026-01-01T08:00:00.000Z");

export const starterCards: Flashcard[] = goetheContents.map((content, index) =>
  toFlashcard(applyCardCorrection(content), "anki", new Date(seedDate.getTime() + index)),
);

export const starterCategories = goetheCategories;
