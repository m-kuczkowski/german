import { toFlashcard } from "../lib/cards";
import type { Flashcard } from "../types";
import { nicosWegCategories, nicosWegContents } from "./nicosWegCards";

const seedDate = new Date("2026-01-01T08:00:00.000Z");

export const starterCards: Flashcard[] = nicosWegContents.map((content, index) =>
  toFlashcard(content, "anki", new Date(seedDate.getTime() + index)),
);

export const starterCategories = nicosWegCategories;
