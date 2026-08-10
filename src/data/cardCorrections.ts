import corrections from "../../data/card-corrections.json";
import type { CardContent } from "../types";

type CardCorrection = Partial<Pick<
  CardContent,
  "german" | "polish" | "article" | "plural" | "exampleGerman" | "examplePolish"
>>;

const cardCorrections = corrections as Record<string, CardCorrection>;

export function applyCardCorrection<T extends CardContent>(card: T): T {
  const correction = cardCorrections[card.id];
  return correction ? { ...card, ...correction } : card;
}
