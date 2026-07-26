import type { CardContent } from "../../src/types";

const allowedArticles = new Set(["der", "die", "das", null]);

export function validateTopic(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const topic = value.trim().replace(/\s+/g, " ");
  if (topic.length < 2 || topic.length > 80) return null;
  if (!/[\p{L}\p{N}]/u.test(topic)) return null;
  return topic;
}

export function validateCount(value: unknown): 5 | 10 | 20 | null {
  return value === 5 || value === 10 || value === 20 ? value : null;
}

export function validateGeneratedCards(
  value: unknown,
  expectedCount: number,
): Omit<CardContent, "id">[] | null {
  if (!value || typeof value !== "object") return null;
  const cards = (value as { cards?: unknown }).cards;
  if (!Array.isArray(cards) || cards.length !== expectedCount) return null;

  const validated: Omit<CardContent, "id">[] = [];
  for (const candidate of cards) {
    if (!candidate || typeof candidate !== "object") return null;
    const card = candidate as Record<string, unknown>;
    if (
      typeof card.german !== "string" ||
      card.german.trim().length < 1 ||
      card.german.length > 100 ||
      typeof card.polish !== "string" ||
      card.polish.trim().length < 1 ||
      card.polish.length > 160 ||
      !allowedArticles.has(card.article as "der" | "die" | "das" | null) ||
      (card.plural !== null && typeof card.plural !== "string") ||
      typeof card.exampleGerman !== "string" ||
      card.exampleGerman.trim().length < 3 ||
      card.exampleGerman.length > 220 ||
      typeof card.examplePolish !== "string" ||
      card.examplePolish.trim().length < 3 ||
      card.examplePolish.length > 260 ||
      typeof card.category !== "string" ||
      card.category.trim().length < 2 ||
      card.category.length > 60
    ) {
      return null;
    }

    validated.push({
      german: card.german.trim(),
      polish: card.polish.trim(),
      article: card.article as "der" | "die" | "das" | null,
      plural: typeof card.plural === "string" ? card.plural.trim() || null : null,
      exampleGerman: card.exampleGerman.trim(),
      examplePolish: card.examplePolish.trim(),
      category: card.category.trim(),
    });
  }
  return validated;
}

export function extractResponseText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}
